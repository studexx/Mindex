from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import comparison_text, unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


VERSION_ID = "5a32dff2-8ab8-5ac8-b058-af5abb77246f"
SONG_ID = "849c28c9-6859-5262-9bc6-566e6befde3f"
EXPECTED = {
    "source_song_id": SONG_ID,
    "canonical_song_id": SONG_ID,
    "curated_version_name": "통일 556 세 번 아멘",
    "version_label": "통일 556 세 번 아멘",
    "hymn_no": "통 556",
    "version_order": 2,
    "is_primary": False,
}
PATCH = {
    "curated_version_name": "통일 555 세 번 아멘",
    "version_label": "통일 555 세 번 아멘",
    "hymn_no": "통 555",
}
EXPECTED_LYRICS = "아멘아멘아멘"


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    song = next((row for row in songs if str(row.get("id")) == SONG_ID), None)
    if not song or str(song.get("hymn_no")) != "643" or song.get("title") != "아멘":
        raise RuntimeError("Expected 새찬송가 643 아멘 song is missing")

    version = next((row for row in versions if str(row.get("id")) == VERSION_ID), None)
    if not version:
        raise RuntimeError(f"Expected version missing: {VERSION_ID}")
    for field, value in EXPECTED.items():
        if version.get(field) != value:
            raise RuntimeError(f"Unexpected {field} for version {VERSION_ID}")
    if unified_number(version) != 556:
        raise RuntimeError("Expected the existing version to be 통일찬송가 556")
    if any(unified_number(row) == 555 for row in versions):
        raise RuntimeError("A 통일찬송가 555 version already exists")

    linked_units = [row for row in units if str(row.get("version_id")) == VERSION_ID]
    lyrics = comparison_text("\n".join(str(row.get("text") or "") for row in linked_units))
    if lyrics != EXPECTED_LYRICS:
        raise RuntimeError("Existing version lyrics do not match the confirmed threefold Amen text")

    return {
        "version_id": VERSION_ID,
        "song_hymn_no": "643",
        "from_union_no": 556,
        "to_union_no": 555,
        "patch": PATCH,
    }


def verify_applied(versions: list[dict[str, Any]], units: list[dict[str, Any]]) -> None:
    version = next((row for row in versions if str(row.get("id")) == VERSION_ID), None)
    if not version:
        raise RuntimeError(f"Post-check version missing: {VERSION_ID}")
    if unified_number(version) != 555 or any(version.get(field) != value for field, value in PATCH.items()):
        raise RuntimeError("Post-check failed for 새찬송가 643 / 통일찬송가 555")
    if any(unified_number(row) == 556 for row in versions):
        raise RuntimeError("The incorrect 통일찬송가 556 mapping still exists")
    linked_units = [row for row in units if str(row.get("version_id")) == VERSION_ID]
    lyrics = comparison_text("\n".join(str(row.get("text") or "") for row in linked_units))
    if lyrics != EXPECTED_LYRICS:
        raise RuntimeError("Post-check lyrics changed unexpectedly")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,canonical_song_id,curated_version_name,version_label,hymn_no,version_order,is_primary",
    )
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "id,version_id,text")
    return songs, versions, units


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Correct the confirmed 새643 Amen mapping from 통556 to 통555")
    parser.add_argument("--apply", action="store_true", help="Apply the guarded metadata correction")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    songs, versions, units = load_data(supa_url, supa_key)
    plan = build_plan(songs, versions, units)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", **plan}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    result = request_json(
        supa_url,
        supa_key,
        "PATCH",
        "mindex_song_versions",
        {"id": f"eq.{VERSION_ID}"},
        PATCH,
        prefer="return=representation",
    )
    if not isinstance(result, list) or len(result) != 1:
        raise RuntimeError(f"Correction failed for {VERSION_ID}: {result!r}")

    _, final_versions, final_units = load_data(supa_url, supa_key)
    verify_applied(final_versions, final_units)
    print(json.dumps({"status": "verified", "corrected": 1}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
