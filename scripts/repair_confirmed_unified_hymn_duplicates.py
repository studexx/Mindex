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


DELETE_EXPECTATIONS = {
    "8ee2f5a7-de00-4beb-93ea-51bb9414f43d": {
        "union_no": 132,
        "source_song_id": "e12a1934-5ffc-5916-b53d-8bd9625b99ad",
        "title": "통일 132 호산나 호산나",
    },
    "cce3d55f-6b36-4a7e-8a8d-70cc29a5e392": {
        "union_no": 549,
        "source_song_id": "c550210b-acc2-5616-b9b3-f5f12658ef7f",
        "title": "통일 549 우리 기도를",
    },
    "a3a956c0-8ba0-404a-955b-44b96bd65791": {
        "union_no": 550,
        "source_song_id": "abc72369-ee77-57dd-a8fb-25761e57d871",
        "title": "통일 550 주 너를 지키시고",
    },
    "3f43efd3-4bc5-4d5c-b8cd-41890e42e10f": {
        "union_no": 548,
        "source_song_id": "56793179-dd56-597c-a3a5-13f852c40fa2",
        "title": "통일 548 하늘에 계신",
    },
}
MOVE_VERSION_ID = "6d45dc72-1f8a-538b-822b-e7a65569117e"
MOVE_EXPECTATION = {
    "union_no": 548,
    "source_song_id": "56793179-dd56-597c-a3a5-13f852c40fa2",
    "canonical_song_id": "56793179-dd56-597c-a3a5-13f852c40fa2",
    "title": "통일 548 주 기도문 영창",
}
DESTINATION_SONG_ID = "468d591f-39c7-5a62-8cc3-1f240c6a537d"
EXPECTED_FINAL_SONG_HYMN_NUMBERS = {132: "141", 548: "636", 549: "631", 550: "638"}


def version_by_id(versions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(version.get("id")): version for version in versions}


def validate_expected_version(version: dict[str, Any], expected: dict[str, Any]) -> None:
    if unified_number(version) != expected["union_no"]:
        raise RuntimeError(f"Unexpected unified number for version {version.get('id')}")
    if version.get("source_song_id") != expected["source_song_id"]:
        raise RuntimeError(f"Unexpected source song for version {version.get('id')}")
    if version.get("curated_version_name") != expected["title"] or version.get("version_label") != expected["title"]:
        raise RuntimeError(f"Unexpected title for version {version.get('id')}")
    expected_canonical = expected.get("canonical_song_id")
    if expected_canonical and version.get("canonical_song_id") != expected_canonical:
        raise RuntimeError(f"Unexpected canonical song for version {version.get('id')}")


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    songs_by_id = {str(song.get("id")): song for song in songs}
    versions_by_id = version_by_id(versions)
    target_ids = {*DELETE_EXPECTATIONS, MOVE_VERSION_ID}
    linked_units = [unit for unit in units if str(unit.get("version_id")) in target_ids]
    if linked_units:
        raise RuntimeError(f"Expected target versions to have no units; found {len(linked_units)}")

    destination = songs_by_id.get(DESTINATION_SONG_ID)
    if not destination or str(destination.get("hymn_no") or "") != "636":
        raise RuntimeError("Expected destination to be 새찬송가 636")

    deletes: list[dict[str, Any]] = []
    for version_id, expected in DELETE_EXPECTATIONS.items():
        version = versions_by_id.get(version_id)
        if not version:
            raise RuntimeError(f"Expected delete version missing: {version_id}")
        validate_expected_version(version, expected)
        deletes.append({
            "version_id": version_id,
            "union_no": expected["union_no"],
            "source_song_id": expected["source_song_id"],
            "title": expected["title"],
        })

    move_version = versions_by_id.get(MOVE_VERSION_ID)
    if not move_version:
        raise RuntimeError(f"Expected move version missing: {MOVE_VERSION_ID}")
    validate_expected_version(move_version, MOVE_EXPECTATION)
    if any(
        unified_number(version) == 548 and version.get("source_song_id") == DESTINATION_SONG_ID
        for version in versions
    ):
        raise RuntimeError("Destination already has a 통일찬송가 548 version")
    move_patch = {
        "source_song_id": DESTINATION_SONG_ID,
        "canonical_song_id": DESTINATION_SONG_ID,
        "version_order": 2,
    }
    return {
        "delete": deletes,
        "move": {
            "version_id": MOVE_VERSION_ID,
            "union_no": 548,
            "from_song_id": MOVE_EXPECTATION["source_song_id"],
            "to_song_id": DESTINATION_SONG_ID,
            "patch": move_patch,
        },
    }


def verify_final(songs: list[dict[str, Any]], versions: list[dict[str, Any]]) -> None:
    songs_by_id = {str(song.get("id")): song for song in songs}
    versions_by_id = version_by_id(versions)
    remaining_wrong = sorted(version_id for version_id in DELETE_EXPECTATIONS if version_id in versions_by_id)
    if remaining_wrong:
        raise RuntimeError(f"Deleted versions still present: {remaining_wrong}")
    for union_no, expected_hymn_no in EXPECTED_FINAL_SONG_HYMN_NUMBERS.items():
        matches = [version for version in versions if unified_number(version) == union_no]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one final 통일찬송가 {union_no} version, found {len(matches)}")
        song = songs_by_id.get(str(matches[0].get("source_song_id")))
        if not song or str(song.get("hymn_no") or "") != expected_hymn_no:
            raise RuntimeError(f"통일찬송가 {union_no} is not linked to 새찬송가 {expected_hymn_no}")


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
    parser = argparse.ArgumentParser(description="Repair four confirmed duplicate 통일찬송가 mappings")
    parser.add_argument("--apply", action="store_true", help="Apply guarded delete/move operations")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    songs, versions, units = load_data(supa_url, supa_key)
    plan = build_plan(songs, versions, units)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", **plan}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    for row in plan["delete"]:
        result = request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"id": f"eq.{row['version_id']}"},
            prefer="return=representation",
        )
        if not isinstance(result, list) or len(result) != 1:
            raise RuntimeError(f"Delete failed for {row['version_id']}: {result!r}")

    move = plan["move"]
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
        raise RuntimeError(f"Move failed for {move['version_id']}: {result!r}")

    final_songs, final_versions, _ = load_data(supa_url, supa_key)
    verify_final(final_songs, final_versions)
    print(json.dumps({"status": "verified", "deleted": len(plan["delete"]), "moved": 1}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
