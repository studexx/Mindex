from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import unified_number, version_units_by_version  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


EXPECTED_VERSION_COUNT = 20
EXPECTED_UNIT_COUNT = 28
EXPECTED_OCCURRENCE_COUNT = 34
REVIEW_NOTE = "Confirmed full-hymnal typo/spacing repair; manual review required."

# Every replacement was checked against the surrounding verse. Edition wording
# and refrain-repeat differences are deliberately excluded.
CORRECTIONS: dict[tuple[str, int], tuple[tuple[str, str, int], ...]] = {
    ("new", 38): (("종들s", "종들", 1),),
    ("new", 60): (("영혼이 햇빛", "영혼의 햇빛", 1), ("비춰주시고", "비춰 주시고", 1), ("잠 깰 때", "잠깰 때", 1)),
    ("new", 63): (("만 백성이", "만백성이", 1), ("온 천하게", "온 천하에", 1)),
    ("new", 70): (("나라를 모여서", "나라들 모여서", 1), ("한번만", "한 번만", 1), ("쓸데 없네", "쓸데없네", 1)),
    ("new", 184): (("주의 계단 불", "주의 제단 불", 1),),
    ("new", 208): (("베추신", "베푸신", 1),),
    ("new", 220): (("내 주 예수 복을 받아", "내 주 예수 본을 받아", 1),),
    ("new", 223): (("살아 가리라", "살아가리라", 1), ("따라 가리라", "따라가리라", 1), ("우리의 귀하신 분", "우리의 귀한 신분", 1)),
    ("new", 235): (("이 세상 떠나 때", "이 세상 떠날 때", 1),),
    ("new", 280): (("전부터 계시 주께서", "전부터 계신 주께서", 1),),
    ("new", 311): (("내 몸을 희생 했건만", "내 몸을 희생했건만", 1), ("네 몸을 희생 했건만", "내 몸을 희생했건만", 1), ("네 죄를 대속 했건만", "네 죄를 대속했건만", 2), ("한 없는 용서", "한없는 용서", 1)),
    ("new", 329): (("힘주소서", "힘 주소서", 1), ("네 손을 펴", "내 손을 펴", 1)),
    ("new", 348): (("싸우맂라", "싸울지라", 1), ("예쑤", "예수", 1)),
    ("new", 370): (("내 궁핍함을 아끼고", "내 궁핍함을 아시고", 1),),
    ("new", 398): (("참 모습 보시이고", "참 모습 보이시고", 1),),
    ("new", 399): (("하늘의 땅의", "하늘과 땅의", 1),),
    ("new", 456): (("그 속 못 자국", "그 손 못 자국", 1),),
    ("new", 601): (("감싸주네", "감싸 주네", 1), ("하나되고", "하나 되고", 1)),
    ("union", 182): (("내 기쁨 정성을", "내 기쁜 정성을", 1),),
    ("union", 509): (("그 속 못 자국", "그 손 못 자국", 1),),
}


def version_signature(book: str, number: int, texts: list[str]) -> str:
    digest = hashlib.sha256("\n".join(texts).encode()).hexdigest()[:16]
    label = "new" if book == "new" else "unified"
    return f"mindex-{label}-{number}-{digest}"


def indexed_versions(
    songs: list[dict[str, Any]], versions: list[dict[str, Any]]
) -> dict[tuple[str, int], dict[str, Any]]:
    hymn_number_by_song = {
        str(song["id"]): int(song["hymn_no"])
        for song in songs
        if str(song.get("hymn_no") or "").isdigit()
    }
    result: dict[tuple[str, int], dict[str, Any]] = {}
    for version in versions:
        union_no = unified_number(version)
        if union_no is not None:
            key = ("union", union_no)
        elif version.get("curated_version_name") == "새찬송가":
            number = hymn_number_by_song.get(str(version.get("source_song_id")))
            if number is None:
                continue
            key = ("new", number)
        else:
            continue
        if key in result:
            raise RuntimeError(f"Duplicate hymn version identity: {key}")
        result[key] = version
    return result


def corrected_texts(key: tuple[str, int], texts: list[str]) -> tuple[list[str], int]:
    corrected = list(texts)
    occurrences = 0
    for old, new, expected in CORRECTIONS[key]:
        count = sum(text.count(old) for text in corrected)
        if count != expected:
            raise RuntimeError(f"Unexpected occurrence for {key}: {old!r} count={count}, expected={expected}")
        corrected = [text.replace(old, new) for text in corrected]
        occurrences += count
    return corrected, occurrences


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    versions_by_key = indexed_versions(songs, versions)
    units_by_version = version_units_by_version(units)
    signatures: dict[str, dict[str, str]] = {}
    for version in versions:
        signatures.setdefault(str(version.get("canonical_song_id")), {})[
            str(version.get("lyric_signature") or "")
        ] = str(version.get("id"))

    unit_patches: list[dict[str, Any]] = []
    version_patches: list[dict[str, Any]] = []
    occurrences = 0
    for key in sorted(CORRECTIONS):
        version = versions_by_key.get(key)
        if version is None:
            raise RuntimeError(f"Missing hymn version: {key}")
        current_units = units_by_version.get(str(version["id"]), [])
        if not current_units:
            raise RuntimeError(f"Hymn version has no lyric units: {key}")
        old_texts = [str(unit.get("text") or "") for unit in current_units]
        new_texts, count = corrected_texts(key, old_texts)
        occurrences += count
        for unit, old_text, new_text in zip(current_units, old_texts, new_texts):
            if old_text == new_text:
                continue
            patch = {
                "text": new_text,
                "review_status": "needs_review",
                "review_note": REVIEW_NOTE,
                "reviewed_at": None,
            }
            unit_patches.append({
                "id": str(unit["id"]),
                "version_id": str(version["id"]),
                "old_text": old_text,
                "old": {field: unit.get(field) for field in patch},
                "new": patch,
            })

        book, number = key
        signature = version_signature(book, number, new_texts)
        canonical_id = str(version.get("canonical_song_id"))
        owner = signatures.setdefault(canonical_id, {}).get(signature)
        if owner and owner != str(version["id"]):
            raise RuntimeError(f"Lyric signature collision: {signature}")
        patch = {"version_review_status": "pending", "lyric_signature": signature}
        version_patches.append({
            "id": str(version["id"]),
            "key": key,
            "old_signature": str(version.get("lyric_signature") or ""),
            "old": {field: version.get(field) for field in patch},
            "new": patch,
        })

    if (
        len(version_patches) != EXPECTED_VERSION_COUNT
        or len(unit_patches) != EXPECTED_UNIT_COUNT
        or occurrences != EXPECTED_OCCURRENCE_COUNT
    ):
        raise RuntimeError(
            f"Unexpected repair plan: versions={len(version_patches)}, "
            f"units={len(unit_patches)}, occurrences={occurrences}"
        )
    return {
        "version_patches": version_patches,
        "unit_patches": unit_patches,
        "corrected_occurrences": occurrences,
    }


def apply_plan(supa_url: str, supa_key: str, plan: dict[str, Any]) -> None:
    applied_units: list[dict[str, Any]] = []
    applied_versions: list[dict[str, Any]] = []
    try:
        for row in plan["unit_patches"]:
            result = request_json(
                supa_url, supa_key, "PATCH", "mindex_version_units",
                {"id": f"eq.{row['id']}", "text": f"eq.{row['old_text']}"},
                row["new"], "return=representation",
            )
            if not isinstance(result, list) or len(result) != 1:
                raise RuntimeError(f"Guarded unit patch failed: {row['id']}")
            applied_units.append(row)
        for row in plan["version_patches"]:
            result = request_json(
                supa_url, supa_key, "PATCH", "mindex_song_versions",
                {"id": f"eq.{row['id']}", "lyric_signature": f"eq.{row['old_signature']}"},
                row["new"], "return=representation",
            )
            if not isinstance(result, list) or len(result) != 1:
                raise RuntimeError(f"Guarded version patch failed: {row['id']}")
            applied_versions.append(row)
    except Exception:
        for row in reversed(applied_versions):
            request_json(supa_url, supa_key, "PATCH", "mindex_song_versions", {"id": f"eq.{row['id']}"}, row["old"], "return=minimal")
        for row in reversed(applied_units):
            request_json(supa_url, supa_key, "PATCH", "mindex_version_units", {"id": f"eq.{row['id']}"}, row["old"], "return=minimal")
        raise


def verify_final(plan: dict[str, Any], versions: list[dict[str, Any]], units: list[dict[str, Any]]) -> None:
    versions_by_id = {str(row["id"]): row for row in versions}
    units_by_id = {str(row["id"]): row for row in units}
    for row in plan["unit_patches"]:
        actual = units_by_id.get(row["id"])
        if not actual or any(actual.get(field) != value for field, value in row["new"].items()):
            raise RuntimeError(f"Post-check failed for unit {row['id']}")
    for row in plan["version_patches"]:
        actual = versions_by_id.get(row["id"])
        if not actual or any(actual.get(field) != value for field, value in row["new"].items()):
            raise RuntimeError(f"Post-check failed for version {row['key']}")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return songs, versions, units


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair only confirmed findings from the full hymn audit")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    supa_url, supa_key = read_config()
    data = load_data(supa_url, supa_key)
    plan = build_plan(*data)
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "versions": len(plan["version_patches"]),
        "units": len(plan["unit_patches"]),
        "corrected_occurrences": plan["corrected_occurrences"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0
    apply_plan(supa_url, supa_key, plan)
    _, versions, units = load_data(supa_url, supa_key)
    verify_final(plan, versions, units)
    print(json.dumps({"status": "verified", **summary}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
