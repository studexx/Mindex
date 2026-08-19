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


SONG_ID = "8019cb21-34b8-5d46-8151-e770768586ed"
PRIMARY_VERSION_ID = "91ea92ff-733e-46a9-8f26-f70229e91d0a"
PRIMARY_VERSE_4_ID = "6753c208-984c-4032-a039-ebeec6af3b57"
UNIFIED_VERSION_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "mindex:version:unified:443"))
OLD_PRIMARY_VERSE_4 = (
    "이 땅 위의 삶을 모두 마치고\n"
    "흙과 같은 육신 무너질 때에\n\n"
    "오직 주의 은혜 의지 하리니\n"
    "영생하는 곳에 인도하소서"
)
MODERN_PRIMARY_VERSE_4 = OLD_PRIMARY_VERSE_4.replace("의지 하리니", "의지하리니")
UNIFIED_FORMS = [
    (
        "Verse 1",
        "Verse",
        "시험받을 때에 나를 도우사\n"
        "주를 멀리 떠나가게 맙소서\n\n"
        "떨며 주저할 때 나를 붙드사\n"
        "넘어지지 않게 지켜 줍소서",
    ),
    (
        "Verse 2",
        "Verse",
        "세상 부귀영화 나를 얽매고\n"
        "세상 헛된 재물 유혹할 때에\n\n"
        "겟세마네 피땀 생각케 하사\n"
        "십자가의 주를 보게 합소서",
    ),
    (
        "Verse 3",
        "Verse",
        "주의 자비하심 내게 임하사\n"
        "근심 걱정 고통 내가 당할 때\n\n"
        "주의 능한 손을 보게 하시며\n"
        "주여 나의 근심 맡아 줍소서",
    ),
    (
        "Verse 4",
        "Verse",
        "이 땅 위의 삶을 모두 마치고\n"
        "흙과 같은 육신 무너질 때에\n\n"
        "오직 주의 은혜 의지하리니\n"
        "영생하는 곳에 인도합소서",
    ),
    ("Coda", "Coda", "아멘"),
]
EXPECTED_REFERENCE_TEXT = (
    "시험받을때에나를도우사주를멀리떠나가게맙소서떨며주저할때나를붙드사"
    "넘어지지않게지켜줍소서세상부귀영화나를얽매고세상헛된재물유혹할때에"
    "겟세마네피땀생각케하사십자가의주를보게합소서주의자비하심내게임하사"
    "근심걱정고통내가당할때주의능한손을보게하시며주여나의근심맡아줍소서"
    "이땅위의삶을모두마치고흙과같은육신무너질때에오직주의은혜의지하리니"
    "영생하는곳에인도합소서아멘"
)


def unified_lyrics() -> str:
    return "\n".join(text for _, _, text in UNIFIED_FORMS)


def version_signature() -> str:
    digest = hashlib.sha1(unified_lyrics().encode()).hexdigest()[:16]
    return f"mindex-unified-443-{digest}"


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    song = next((row for row in songs if str(row.get("id")) == SONG_ID), None)
    if not song or str(song.get("hymn_no")) != "343" or song.get("title") != "시험 받을 때에":
        raise RuntimeError("Expected 새찬송가 343 song is missing")
    primary = next((row for row in versions if str(row.get("id")) == PRIMARY_VERSION_ID), None)
    if (
        not primary
        or primary.get("source_song_id") != SONG_ID
        or primary.get("version_order") != 1
        or primary.get("curated_version_name") != "새찬송가"
        or not primary.get("is_primary")
    ):
        raise RuntimeError("Expected 새찬송가 343 primary version is missing")
    if any(str(row.get("id")) == UNIFIED_VERSION_ID or unified_number(row) == 443 for row in versions):
        raise RuntimeError("A 통일찬송가 443 version already exists")
    if any(row.get("canonical_song_id") == SONG_ID and row.get("version_order") == 2 for row in versions):
        raise RuntimeError("Target canonical version order 2 is occupied")
    if any(row.get("canonical_song_id") == SONG_ID and row.get("lyric_signature") == version_signature() for row in versions):
        raise RuntimeError("Target lyric signature already exists")

    verse_4 = next((row for row in units if str(row.get("id")) == PRIMARY_VERSE_4_ID), None)
    if not verse_4 or verse_4.get("version_id") != PRIMARY_VERSION_ID or verse_4.get("text") != OLD_PRIMARY_VERSE_4:
        raise RuntimeError("Unexpected 새찬송가 343 Verse 4")
    if comparison_text(unified_lyrics()) != EXPECTED_REFERENCE_TEXT:
        raise RuntimeError("통일찬송가 443 text does not match the verified reference")

    version_row = {
        "id": UNIFIED_VERSION_ID,
        "canonical_song_id": SONG_ID,
        "source_song_id": SONG_ID,
        "version_order": 2,
        "version_label": "통일 443 시험 받을 때에",
        "curated_version_name": "통일 443 시험 받을 때에",
        "version_review_status": "pending",
        "deck_key": None,
        "raw_section_name": None,
        "subtitle": None,
        "original_title": None,
        "hymn_no": "통 443",
        "praise_types": primary.get("praise_types") or ["hymn"],
        "lyric_signature": version_signature(),
        "source_count": 1,
        "is_primary": False,
    }
    unit_rows = []
    for index, (label, part_type, text) in enumerate(UNIFIED_FORMS, start=1):
        unit_rows.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"mindex:version:unified:443:unit:{index}")),
            "version_id": UNIFIED_VERSION_ID,
            "canonical_song_id": SONG_ID,
            "source_unit_id": None,
            "unit_order": index,
            "unit_label": label,
            "unit_kind": part_type.lower(),
            "trigger": "",
            "slide_numbers": [],
            "text": text,
            "curated_unit_type": part_type,
            "curated_unit_label": label,
            "curated_order": index,
            "review_status": "needs_review",
            "review_note": "Automated reference match; manual review required.",
            "reviewed_at": None,
        })
    return {
        "version": version_row,
        "units": unit_rows,
        "primary_verse_4_patch": {"id": PRIMARY_VERSE_4_ID, "text": MODERN_PRIMARY_VERSE_4},
    }


def verify_final(versions: list[dict[str, Any]], units: list[dict[str, Any]]) -> None:
    unified = next((row for row in versions if str(row.get("id")) == UNIFIED_VERSION_ID), None)
    if not unified or unified_number(unified) != 443 or unified.get("source_song_id") != SONG_ID:
        raise RuntimeError("Post-check failed for 통일찬송가 443 version")
    unified_units = sorted(
        (row for row in units if str(row.get("version_id")) == UNIFIED_VERSION_ID),
        key=lambda row: row.get("curated_order") or row.get("unit_order") or 0,
    )
    if len(unified_units) != 5 or comparison_text("\n".join(row["text"] for row in unified_units)) != EXPECTED_REFERENCE_TEXT:
        raise RuntimeError("Post-check failed for 통일찬송가 443 units")
    verse_4 = next((row for row in units if str(row.get("id")) == PRIMARY_VERSE_4_ID), None)
    if not verse_4 or verse_4.get("text") != MODERN_PRIMARY_VERSE_4:
        raise RuntimeError("Post-check failed for 새찬송가 343 spacing")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return songs, versions, units


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Add 통일찬송가 443 with modern spacing to 새찬송가 343")
    parser.add_argument("--apply", action="store_true", help="Apply the guarded insert and spacing correction")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    songs, versions, units = load_data(supa_url, supa_key)
    plan = build_plan(songs, versions, units)
    print(json.dumps({
        "mode": "apply" if args.apply else "dry-run",
        "version_id": UNIFIED_VERSION_ID,
        "units_added": len(plan["units"]),
        "primary_spacing_fixes": 1,
    }, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    inserted = request_json(
        supa_url, supa_key, "POST", "mindex_song_versions", payload=plan["version"], prefer="return=representation"
    )
    if not isinstance(inserted, list) or len(inserted) != 1:
        raise RuntimeError(f"통일찬송가 443 version insert failed: {inserted!r}")
    try:
        inserted_units = request_json(
            supa_url, supa_key, "POST", "mindex_version_units", payload=plan["units"], prefer="return=representation"
        )
        if not isinstance(inserted_units, list) or len(inserted_units) != 5:
            raise RuntimeError(f"통일찬송가 443 unit insert failed: {inserted_units!r}")
        patched = request_json(
            supa_url,
            supa_key,
            "PATCH",
            "mindex_version_units",
            {"id": f"eq.{PRIMARY_VERSE_4_ID}"},
            {"text": MODERN_PRIMARY_VERSE_4},
            prefer="return=representation",
        )
        if not isinstance(patched, list) or len(patched) != 1:
            raise RuntimeError(f"새찬송가 343 spacing correction failed: {patched!r}")
    except Exception:
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"id": f"eq.{UNIFIED_VERSION_ID}"},
            prefer="return=minimal",
        )
        raise

    _, final_versions, final_units = load_data(supa_url, supa_key)
    verify_final(final_versions, final_units)
    print(json.dumps({"status": "verified", "versions_added": 1, "units_added": 5}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
