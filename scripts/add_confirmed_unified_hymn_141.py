from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import comparison_text, unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


SONG_ID = "e12a1934-5ffc-5916-b53d-8bd9625b99ad"
PRIMARY_VERSION_ID = "56a16d45-3fe4-42f7-a3ec-12f7a1b074b0"
UNIFIED_VERSION_ID = "c8364060-1960-58aa-aa12-9c71e1b9f5c3"
EXPECTED_PRIMARY = {
    "canonical_song_id": SONG_ID,
    "source_song_id": SONG_ID,
    "version_order": 2,
    "version_label": "새찬송가",
    "curated_version_name": "새찬송가",
    "hymn_no": "143",
    "is_primary": True,
}
EXPECTED_HIDDEN = {
    "canonical_song_id": SONG_ID,
    "source_song_id": None,
    "version_order": 1,
    "version_label": "기본",
    "curated_version_name": None,
    "version_review_status": "pending",
    "deck_key": "public",
    "raw_section_name": "143 웬말인가 날 위하여",
    "hymn_no": "143",
    "praise_types": [],
    "is_primary": True,
}
EXPECTED_UNIT_IDS = {
    "58023beb-84ba-5129-a0d0-b0d01d66a13d",
    "fe9ac666-dda4-59fe-8677-83a180a4dcc9",
    "bdae1fca-8ffc-50d5-88f4-86e21eb0ba14",
    "31b1d9a3-e7b0-53a7-a0b2-22b8faaf7eb4",
    "da1e54b4-5ba0-5cf6-bc49-bd3e62a0d2f3",
    "1bfb0e78-bfda-549c-8db3-72061476f74d",
}
EXPECTED_LYRICS = (
    "웬말인가날위하여주돌아가셨나이벌레같은날위해큰해받으셨나"
    "내지은죄다지시고못박히셨으니웬일인가웬은혠가그사랑크셔라"
    "주십자가못박힐때그해도빛잃고그밝은빛가리워서캄캄케되었네"
    "나십자가대할때에그일이고마워내얼굴감히못들고눈물흘리도다"
    "늘울어도눈물로써못갚을줄알아몸밖에드릴것없어이몸바칩니다아멘"
)
PATCH = {
    "source_song_id": SONG_ID,
    "version_order": 3,
    "version_label": "통일 141 웬말인가 날 위하여",
    "curated_version_name": "통일 141 웬말인가 날 위하여",
    "version_review_status": "reviewed",
    "raw_section_name": None,
    "hymn_no": "통 141",
    "praise_types": ["hymn"],
    "is_primary": False,
}


def combined_unit_lyrics(rows: list[dict[str, Any]]) -> str:
    texts = [re.sub(r"^\s*\d+\s+", "", str(row.get("text") or "")) for row in rows]
    return comparison_text("\n".join(texts))


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    song = next((row for row in songs if str(row.get("id")) == SONG_ID), None)
    if not song or str(song.get("hymn_no")) != "143" or song.get("title") != "웬말인가 날 위하여":
        raise RuntimeError("Expected 새찬송가 143 song is missing")
    if any(str(row.get("id")) != UNIFIED_VERSION_ID and unified_number(row) == 141 for row in versions):
        raise RuntimeError("Another 통일찬송가 141 version already exists")

    primary = next((row for row in versions if str(row.get("id")) == PRIMARY_VERSION_ID), None)
    hidden = next((row for row in versions if str(row.get("id")) == UNIFIED_VERSION_ID), None)
    if not primary or not hidden:
        raise RuntimeError("Expected 새찬송가 143 versions are missing")
    for field, value in EXPECTED_PRIMARY.items():
        if primary.get(field) != value:
            raise RuntimeError(f"Unexpected primary {field}")
    for field, value in EXPECTED_HIDDEN.items():
        if hidden.get(field) != value:
            raise RuntimeError(f"Unexpected hidden version {field}")
    if any(
        row.get("canonical_song_id") == SONG_ID and row.get("version_order") == PATCH["version_order"]
        for row in versions
    ):
        raise RuntimeError("Target canonical version order is already occupied")

    hidden_units = sorted(
        (row for row in units if str(row.get("version_id")) == UNIFIED_VERSION_ID),
        key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0),
    )
    if {str(row.get("id")) for row in hidden_units} != EXPECTED_UNIT_IDS:
        raise RuntimeError("Unexpected hidden 새찬송가 143 unit set")
    lyrics = combined_unit_lyrics(hidden_units)
    if lyrics != EXPECTED_LYRICS:
        raise RuntimeError("Hidden lyrics changed from the verified 통일찬송가 141 text")

    return {"version_id": UNIFIED_VERSION_ID, "units_reused": len(hidden_units), "patch": PATCH}


def verify_applied(versions: list[dict[str, Any]], units: list[dict[str, Any]]) -> None:
    primary = next((row for row in versions if str(row.get("id")) == PRIMARY_VERSION_ID), None)
    unified = next((row for row in versions if str(row.get("id")) == UNIFIED_VERSION_ID), None)
    if not primary or primary.get("version_order") != 2 or not primary.get("is_primary"):
        raise RuntimeError("Post-check failed for 새찬송가 143 primary version")
    if not unified or any(unified.get(field) != value for field, value in PATCH.items()):
        raise RuntimeError("Post-check failed for 통일찬송가 141 metadata")
    if unified_number(unified) != 141:
        raise RuntimeError("Post-check failed for 통일찬송가 141 number")
    reused = sorted(
        (row for row in units if str(row.get("version_id")) == UNIFIED_VERSION_ID),
        key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0),
    )
    if len(reused) != 6 or combined_unit_lyrics(reused) != EXPECTED_LYRICS:
        raise RuntimeError("Post-check failed for reused 통일찬송가 141 units")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return songs, versions, units


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Expose the confirmed 통일찬송가 141 version on 새찬송가 143")
    parser.add_argument("--apply", action="store_true", help="Apply the guarded metadata update")
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
        {"id": f"eq.{UNIFIED_VERSION_ID}", "source_song_id": "is.null", "version_order": "eq.1"},
        PATCH,
        prefer="return=representation",
    )
    if not isinstance(result, list) or len(result) != 1:
        raise RuntimeError(f"통일찬송가 141 update failed: {result!r}")

    _, final_versions, final_units = load_data(supa_url, supa_key)
    verify_applied(final_versions, final_units)
    print(json.dumps({"status": "verified", "versions_exposed": 1, "units_reused": 6}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
