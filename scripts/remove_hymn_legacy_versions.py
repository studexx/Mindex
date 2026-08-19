from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import comparison_text, unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


SONG_ID = "e12a1934-5ffc-5916-b53d-8bd9625b99ad"
PRIMARY_VERSION_ID = "56a16d45-3fe4-42f7-a3ec-12f7a1b074b0"
OLD_UNIFIED_VERSION_ID = "c8364060-1960-58aa-aa12-9c71e1b9f5c3"
CLEAN_UNIFIED_VERSION_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "mindex:version:unified:141"))
CLEAN_LYRIC_SIGNATURE = "mindex-unified-141-94f41af47c86e5a4"
EXPECTED_HIDDEN_COUNT = 58
EXPECTED_HIDDEN_UNIT_COUNT = 231
EXPECTED_HIDDEN_ID_DIGEST = "dfc065f4dc053beac857ab3907b7623c80d92d7d7576b704767efbbb1786c6c9"
EXPECTED_LYRICS = (
    "웬말인가날위하여주돌아가셨나이벌레같은날위해큰해받으셨나"
    "내지은죄다지시고못박히셨으니웬일인가웬은혠가그사랑크셔라"
    "주십자가못박힐때그해도빛잃고그밝은빛가리워서캄캄케되었네"
    "나십자가대할때에그일이고마워내얼굴감히못들고눈물흘리도다"
    "늘울어도눈물로써못갚을줄알아몸밖에드릴것없어이몸바칩니다아멘"
)


def hidden_legacy_versions(
    songs: list[dict[str, Any]], versions: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    hymn_ids = {
        str(song.get("id"))
        for song in songs
        if str(song.get("hymn_no") or "").isdigit() and 1 <= int(song["hymn_no"]) <= 645
    }
    return [
        version
        for version in versions
        if str(version.get("canonical_song_id")) in hymn_ids
        and version.get("source_song_id") is None
        and (version.get("version_label") == "기본" or version.get("deck_key") == "public")
    ]


def validate_hidden_set(
    hidden: list[dict[str, Any]],
    units: list[dict[str, Any]],
    expected_count: int = EXPECTED_HIDDEN_COUNT,
    expected_unit_count: int = EXPECTED_HIDDEN_UNIT_COUNT,
    expected_digest: str = EXPECTED_HIDDEN_ID_DIGEST,
) -> list[str]:
    ids = sorted(str(version.get("id")) for version in hidden)
    digest = hashlib.sha256("\n".join(ids).encode()).hexdigest()
    linked_units = [unit for unit in units if str(unit.get("version_id")) in set(ids)]
    if len(ids) != expected_count or len(linked_units) != expected_unit_count or digest != expected_digest:
        raise RuntimeError(
            f"Unexpected hidden legacy set: versions={len(ids)}, units={len(linked_units)}, digest={digest}"
        )
    return ids


def clean_unit_id(source_unit_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mindex:version:unified:141:unit:{source_unit_id}"))


def clone_units(source_units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for source in source_units:
        rows.append({
            "id": clean_unit_id(str(source["id"])),
            "version_id": CLEAN_UNIFIED_VERSION_ID,
            "canonical_song_id": SONG_ID,
            "source_unit_id": None,
            "unit_order": source["unit_order"],
            "unit_label": source["unit_label"],
            "unit_kind": source["unit_kind"],
            "trigger": source.get("trigger") or "",
            "slide_numbers": source.get("slide_numbers") or [],
            "text": source["text"],
            "curated_unit_type": source.get("curated_unit_type"),
            "curated_unit_label": source.get("curated_unit_label"),
            "curated_order": source.get("curated_order"),
            "review_status": source.get("review_status") or "needs_review",
            "review_note": source.get("review_note"),
            "reviewed_at": source.get("reviewed_at"),
        })
    return rows


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
    worship_elements: list[dict[str, Any]],
) -> dict[str, Any]:
    hidden = hidden_legacy_versions(songs, versions)
    hidden_ids = validate_hidden_set(hidden, units)
    visible_by_canonical: dict[str, list[dict[str, Any]]] = {}
    for version in versions:
        if version.get("source_song_id"):
            visible_by_canonical.setdefault(str(version.get("canonical_song_id")), []).append(version)
    missing_replacements = [
        version["id"] for version in hidden if not visible_by_canonical.get(str(version.get("canonical_song_id")))
    ]
    if missing_replacements:
        raise RuntimeError(f"Hidden versions without formal replacements: {missing_replacements}")

    primary = next((row for row in versions if str(row.get("id")) == PRIMARY_VERSION_ID), None)
    old_unified = next((row for row in versions if str(row.get("id")) == OLD_UNIFIED_VERSION_ID), None)
    if not primary or primary.get("source_song_id") != SONG_ID or primary.get("curated_version_name") != "새찬송가":
        raise RuntimeError("Expected 새찬송가 143 primary version is missing")
    if (
        not old_unified
        or old_unified.get("source_song_id") != SONG_ID
        or unified_number(old_unified) != 141
        or old_unified.get("version_order") != 3
    ):
        raise RuntimeError("Expected legacy-backed 통일찬송가 141 version is missing")
    if any(str(row.get("id")) == CLEAN_UNIFIED_VERSION_ID for row in versions):
        raise RuntimeError("Clean 통일찬송가 141 version already exists")
    if any(row.get("canonical_song_id") == SONG_ID and row.get("version_order") == 4 for row in versions):
        raise RuntimeError("Temporary canonical version order 4 is occupied")

    source_units = sorted(
        (row for row in units if str(row.get("version_id")) == PRIMARY_VERSION_ID),
        key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0),
    )
    old_units = sorted(
        (row for row in units if str(row.get("version_id")) == OLD_UNIFIED_VERSION_ID),
        key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0),
    )
    if len(source_units) != 6 or len(old_units) != 6:
        raise RuntimeError("Expected six source and six legacy-backed 통일찬송가 141 units")
    if comparison_text("\n".join(str(row.get("text") or "") for row in source_units)) != EXPECTED_LYRICS:
        raise RuntimeError("새찬송가 143 lyrics changed")

    delete_ids = [*hidden_ids, OLD_UNIFIED_VERSION_ID]
    delete_set = set(delete_ids)
    references = [row for row in worship_elements if str(row.get("song_version_id")) in delete_set]
    if references:
        raise RuntimeError(f"Legacy versions are referenced by worship elements: {references}")

    version_row = {
        "id": CLEAN_UNIFIED_VERSION_ID,
        "canonical_song_id": SONG_ID,
        "source_song_id": SONG_ID,
        "version_order": 4,
        "version_label": "통일 141 웬말인가 날 위하여",
        "curated_version_name": "통일 141 웬말인가 날 위하여",
        "version_review_status": "reviewed",
        "deck_key": None,
        "raw_section_name": None,
        "subtitle": primary.get("subtitle"),
        "original_title": primary.get("original_title"),
        "hymn_no": "통 141",
        "praise_types": primary.get("praise_types") or ["hymn"],
        "lyric_signature": CLEAN_LYRIC_SIGNATURE,
        "source_count": 1,
        "is_primary": False,
    }
    return {
        "legacy_versions_to_delete": delete_ids,
        "legacy_units_removed": EXPECTED_HIDDEN_UNIT_COUNT + len(old_units),
        "clean_version": version_row,
        "clean_units": clone_units(source_units),
    }


def verify_final(
    songs: list[dict[str, Any]], versions: list[dict[str, Any]], units: list[dict[str, Any]]
) -> None:
    if hidden_legacy_versions(songs, versions):
        raise RuntimeError("Hidden hymn legacy versions remain")
    if any(str(row.get("id")) == OLD_UNIFIED_VERSION_ID for row in versions):
        raise RuntimeError("Legacy-backed 통일찬송가 141 version remains")
    clean = next((row for row in versions if str(row.get("id")) == CLEAN_UNIFIED_VERSION_ID), None)
    if (
        not clean
        or clean.get("source_song_id") != SONG_ID
        or clean.get("version_order") != 3
        or unified_number(clean) != 141
        or clean.get("deck_key") is not None
    ):
        raise RuntimeError("Clean 통일찬송가 141 version post-check failed")
    clean_units = sorted(
        (row for row in units if str(row.get("version_id")) == CLEAN_UNIFIED_VERSION_ID),
        key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0),
    )
    if len(clean_units) != 6 or comparison_text("\n".join(str(row.get("text") or "") for row in clean_units)) != EXPECTED_LYRICS:
        raise RuntimeError("Clean 통일찬송가 141 units post-check failed")


def load_data(
    supa_url: str, supa_key: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    worship_elements = fetch_all(supa_url, supa_key, "mindex_worship_elements", "id,song_version_id,title")
    return songs, versions, units, worship_elements


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove hidden hymn legacy versions and rebuild 통일찬송가 141 cleanly")
    parser.add_argument("--apply", action="store_true", help="Apply the guarded cleanup")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    songs, versions, units, worship_elements = load_data(supa_url, supa_key)
    plan = build_plan(songs, versions, units, worship_elements)
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "legacy_versions_removed": len(plan["legacy_versions_to_delete"]),
        "legacy_units_removed": plan["legacy_units_removed"],
        "clean_version_id": CLEAN_UNIFIED_VERSION_ID,
        "clean_units_added": len(plan["clean_units"]),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    inserted = request_json(
        supa_url, supa_key, "POST", "mindex_song_versions", payload=plan["clean_version"], prefer="return=representation"
    )
    if not isinstance(inserted, list) or len(inserted) != 1:
        raise RuntimeError(f"Clean version insert failed: {inserted!r}")
    try:
        inserted_units = request_json(
            supa_url, supa_key, "POST", "mindex_version_units", payload=plan["clean_units"], prefer="return=representation"
        )
        if not isinstance(inserted_units, list) or len(inserted_units) != 6:
            raise RuntimeError(f"Clean unit insert failed: {inserted_units!r}")
        delete_filter = f"in.({','.join(plan['legacy_versions_to_delete'])})"
        deleted = request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"id": delete_filter},
            prefer="return=representation",
        )
        if not isinstance(deleted, list) or len(deleted) != len(plan["legacy_versions_to_delete"]):
            raise RuntimeError(f"Legacy delete failed: expected {len(plan['legacy_versions_to_delete'])}, got {deleted!r}")
    except Exception:
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"id": f"eq.{CLEAN_UNIFIED_VERSION_ID}"},
            prefer="return=minimal",
        )
        raise

    updated = request_json(
        supa_url,
        supa_key,
        "PATCH",
        "mindex_song_versions",
        {"id": f"eq.{CLEAN_UNIFIED_VERSION_ID}", "version_order": "eq.4"},
        {"version_order": 3},
        prefer="return=representation",
    )
    if not isinstance(updated, list) or len(updated) != 1:
        raise RuntimeError(f"Clean version order update failed: {updated!r}")

    final_songs, final_versions, final_units, _ = load_data(supa_url, supa_key)
    verify_final(final_songs, final_versions, final_units)
    print(json.dumps({"status": "verified", **summary}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
