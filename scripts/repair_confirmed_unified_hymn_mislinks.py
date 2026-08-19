from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


MOVES = {
    "6a623764-40e5-5211-890d-119df960c7ec": {
        "union_no": 2,
        "from_song_id": "52acb9c6-cbe0-58ad-ab4b-b6bd948b3a0e",
        "from_hymn_no": "4",
        "to_song_id": "2847099e-901c-5aec-8745-1f0698cf87a7",
        "to_hymn_no": "3",
    },
    "bebc4d18-2dd0-591e-b9fb-83524b8b7f83": {
        "union_no": 36,
        "from_song_id": "dc4db4f5-587f-5e07-90bc-1b436cea3152",
        "from_hymn_no": "37",
        "to_song_id": "dfe67eb9-9ff5-51d3-af95-795cbc7073b1",
        "to_hymn_no": "36",
    },
    "aed33d76-5881-5d2b-a004-daebea4036d0": {
        "union_no": 114,
        "from_song_id": "cd85930e-f045-5793-8b5b-4c448c51406f",
        "from_hymn_no": "108",
        "to_song_id": "c1b75f68-ad02-5c3b-b2e5-de07c6c5dcfd",
        "to_hymn_no": "114",
    },
}


def build_plan(songs: list[dict[str, Any]], versions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    songs_by_id = {str(song.get("id")): song for song in songs}
    versions_by_id = {str(version.get("id")): version for version in versions}
    plan: list[dict[str, Any]] = []

    for version_id, expected in MOVES.items():
        version = versions_by_id.get(version_id)
        if not version:
            raise RuntimeError(f"Expected version missing: {version_id}")
        if unified_number(version) != expected["union_no"]:
            raise RuntimeError(f"Unexpected unified number for version {version_id}")
        if version.get("source_song_id") != expected["from_song_id"]:
            raise RuntimeError(f"Unexpected source song for version {version_id}")
        source = songs_by_id.get(expected["from_song_id"])
        destination = songs_by_id.get(expected["to_song_id"])
        if not source or str(source.get("hymn_no")) != expected["from_hymn_no"]:
            raise RuntimeError(f"Unexpected source hymn for version {version_id}")
        if not destination or str(destination.get("hymn_no")) != expected["to_hymn_no"]:
            raise RuntimeError(f"Unexpected destination hymn for version {version_id}")
        if any(
            other.get("source_song_id") == expected["to_song_id"]
            and unified_number(other) == expected["union_no"]
            for other in versions
        ):
            raise RuntimeError(f"Destination already has 통일찬송가 {expected['union_no']}")

        plan.append({
            "version_id": version_id,
            "union_no": expected["union_no"],
            "from_hymn_no": expected["from_hymn_no"],
            "to_hymn_no": expected["to_hymn_no"],
            "patch": {
                "source_song_id": expected["to_song_id"],
                "canonical_song_id": expected["to_song_id"],
                "version_order": 2,
            },
        })
    return plan


def verify_applied(songs: list[dict[str, Any]], versions: list[dict[str, Any]]) -> None:
    songs_by_id = {str(song.get("id")): song for song in songs}
    for version_id, expected in MOVES.items():
        matches = [version for version in versions if str(version.get("id")) == version_id]
        if len(matches) != 1:
            raise RuntimeError(f"Post-check expected one version {version_id}, found {len(matches)}")
        version = matches[0]
        destination = songs_by_id.get(str(version.get("source_song_id")))
        if (
            unified_number(version) != expected["union_no"]
            or version.get("source_song_id") != expected["to_song_id"]
            or version.get("canonical_song_id") != expected["to_song_id"]
            or str((destination or {}).get("hymn_no")) != expected["to_hymn_no"]
            or version.get("version_order") != 2
        ):
            raise RuntimeError(f"Post-check failed for 통일찬송가 {expected['union_no']}")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,canonical_song_id,curated_version_name,version_label,hymn_no,version_order,is_primary",
    )
    return songs, versions


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Move three confirmed misplaced 통일찬송가 versions")
    parser.add_argument("--apply", action="store_true", help="Apply guarded updates; default is dry-run")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    songs, versions = load_data(supa_url, supa_key)
    plan = build_plan(songs, versions)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", "moves": plan}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    for move in plan:
        result = request_json(
            supa_url,
            supa_key,
            "PATCH",
            "mindex_song_versions",
            {"id": f"eq.{move['version_id']}"},
            move["patch"],
            prefer="return=representation",
        )
        if not isinstance(result, list) or len(result) != 1:
            raise RuntimeError(f"Move failed for 통일찬송가 {move['union_no']}: {result!r}")

    final_songs, final_versions = load_data(supa_url, supa_key)
    verify_applied(final_songs, final_versions)
    print(json.dumps({"status": "verified", "moved": len(plan)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
