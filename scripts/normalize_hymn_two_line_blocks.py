from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import unified_number, version_units_by_version  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


EXPECTED_VERSION_COUNT = 121
EXPECTED_NEW_VERSION_COUNT = 115
EXPECTED_UNION_VERSION_COUNT = 6
EXPECTED_UNIT_COUNT = 366
REVIEW_NOTE = "Normalized hymn lyrics into two-line blocks; manual review required."


def two_line_blocks(value: str) -> str:
    lines = value.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lyric_lines = [line for line in lines if line.strip()]
    return "\n\n".join(
        "\n".join(lyric_lines[index:index + 2])
        for index in range(0, len(lyric_lines), 2)
    )


def compact_text(value: str) -> str:
    return re.sub(r"\s+", "", value)


def version_signature(book: str, number: int, texts: list[str]) -> str:
    digest = hashlib.sha256("\n".join(texts).encode()).hexdigest()[:16]
    label = "new" if book == "new" else "unified"
    return f"mindex-{label}-{number}-{digest}"


def hymn_identity(
    version: dict[str, Any], hymn_number_by_song: dict[str, int]
) -> tuple[str, int] | None:
    union_no = unified_number(version)
    if union_no is not None:
        return "union", union_no
    if version.get("curated_version_name") != "새찬송가":
        return None
    number = hymn_number_by_song.get(str(version.get("source_song_id")))
    return ("new", number) if number is not None else None


def build_plan(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    hymn_number_by_song = {
        str(song["id"]): int(song["hymn_no"])
        for song in songs
        if str(song.get("hymn_no") or "").isdigit()
    }
    units_by_version = version_units_by_version(units)
    signatures: dict[str, dict[str, str]] = {}
    for version in versions:
        signatures.setdefault(str(version.get("canonical_song_id")), {})[
            str(version.get("lyric_signature") or "")
        ] = str(version.get("id"))

    unit_patches: list[dict[str, Any]] = []
    version_patches: list[dict[str, Any]] = []
    affected_by_book = {"new": 0, "union": 0}
    for version in versions:
        identity = hymn_identity(version, hymn_number_by_song)
        if identity is None:
            continue
        current_units = units_by_version.get(str(version["id"]), [])
        texts = [str(unit.get("text") or "") for unit in current_units]
        normalized = [two_line_blocks(text) for text in texts]
        changed = [index for index, pair in enumerate(zip(texts, normalized)) if pair[0] != pair[1]]
        if not changed:
            continue

        book, number = identity
        affected_by_book[book] += 1
        for index in changed:
            unit = current_units[index]
            old_text = texts[index]
            new_text = normalized[index]
            if compact_text(old_text) != compact_text(new_text):
                raise RuntimeError(f"Non-whitespace lyric change blocked for {identity}, unit {unit['id']}")
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

        signature = version_signature(book, number, normalized)
        canonical_id = str(version.get("canonical_song_id"))
        owner = signatures.setdefault(canonical_id, {}).get(signature)
        if owner and owner != str(version["id"]):
            raise RuntimeError(f"Lyric signature collision: {signature}")
        patch = {"version_review_status": "pending", "lyric_signature": signature}
        version_patches.append({
            "id": str(version["id"]),
            "identity": identity,
            "old_signature": str(version.get("lyric_signature") or ""),
            "old": {field: version.get(field) for field in patch},
            "new": patch,
        })

    if (
        len(version_patches) != EXPECTED_VERSION_COUNT
        or affected_by_book["new"] != EXPECTED_NEW_VERSION_COUNT
        or affected_by_book["union"] != EXPECTED_UNION_VERSION_COUNT
        or len(unit_patches) != EXPECTED_UNIT_COUNT
    ):
        raise RuntimeError(
            f"Unexpected normalization plan: versions={len(version_patches)}, "
            f"new={affected_by_book['new']}, union={affected_by_book['union']}, "
            f"units={len(unit_patches)}"
        )
    return {
        "version_patches": version_patches,
        "unit_patches": unit_patches,
        "affected_by_book": affected_by_book,
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
        if (
            not actual
            or any(actual.get(field) != value for field, value in row["new"].items())
            or two_line_blocks(str(actual.get("text") or "")) != actual.get("text")
            or compact_text(str(actual.get("text") or "")) != compact_text(row["old_text"])
        ):
            raise RuntimeError(f"Post-check failed for unit {row['id']}")
    for row in plan["version_patches"]:
        actual = versions_by_id.get(row["id"])
        if not actual or any(actual.get(field) != value for field, value in row["new"].items()):
            raise RuntimeError(f"Post-check failed for version {row['identity']}")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return songs, versions, units


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize all hymn lyrics into two-line blocks")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    supa_url, supa_key = read_config()
    data = load_data(supa_url, supa_key)
    plan = build_plan(*data)
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "versions": len(plan["version_patches"]),
        "units": len(plan["unit_patches"]),
        "by_book": plan["affected_by_book"],
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
