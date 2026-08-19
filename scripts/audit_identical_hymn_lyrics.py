from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import fetch_reference_hymn, unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config  # noqa: E402


def spacing_only_text(value: Any, *, reference: bool = False) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")
    if reference:
        text = re.sub(r"(?:^|\n)\s*\d+\s*[.)]\s*", "\n", text)
        text = re.sub(r"<\s*후렴\s*>", "", text)
    return re.sub(r"\s+", "", text).strip()


def text_digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def grouped_units(units: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for unit in units:
        grouped.setdefault(str(unit.get("version_id") or ""), []).append(unit)
    for rows in grouped.values():
        rows.sort(key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0))
    return grouped


def primary_new_version(song_id: str, versions: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = [
        version
        for version in versions
        if str(version.get("source_song_id")) == song_id
        and unified_number(version) is None
        and (version.get("curated_version_name") == "새찬송가" or version.get("version_label") == "새찬송가")
    ]
    primary = [version for version in candidates if version.get("is_primary")]
    selected = primary or candidates
    return sorted(selected, key=lambda row: row.get("version_order") or 0)[0] if selected else None


def empty_unified_targets(
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    by_version: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    song_by_id = {str(song.get("id")): song for song in songs}
    targets: list[dict[str, Any]] = []
    for version in versions:
        union_no = unified_number(version)
        song = song_by_id.get(str(version.get("source_song_id")))
        if union_no is None or not song or not str(song.get("hymn_no") or "").isdigit():
            continue
        new_no = int(song["hymn_no"])
        if not 1 <= new_no <= 645 or by_version.get(str(version.get("id"))):
            continue
        primary = primary_new_version(str(song["id"]), versions)
        targets.append({
            "new_no": new_no,
            "union_no": union_no,
            "song_id": str(song["id"]),
            "title": str(song.get("title") or ""),
            "new_version_id": str((primary or {}).get("id") or ""),
            "union_version_id": str(version.get("id") or ""),
        })
    return sorted(targets, key=lambda row: (row["new_no"], row["union_no"]))


def audit_target(
    target: dict[str, Any],
    by_version: dict[str, list[dict[str, Any]]],
    timeout: float,
    retries: int,
) -> dict[str, Any]:
    new_units = by_version.get(target["new_version_id"], [])
    if not new_units:
        return {**target, "eligible": False, "reason": "missing-new-db-lyrics"}
    db_text = spacing_only_text("\n".join(str(unit.get("text") or "") for unit in new_units))
    new_ref = fetch_reference_hymn("new", target["new_no"], timeout, retries)
    union_ref = fetch_reference_hymn("union", target["union_no"], timeout, retries)
    new_ref_text = spacing_only_text(new_ref.lyrics, reference=True)
    union_ref_text = spacing_only_text(union_ref.lyrics, reference=True)
    if db_text != new_ref_text:
        return {
            **target,
            "eligible": False,
            "reason": "new-db-reference-difference",
            "db_hash": text_digest(db_text),
            "new_reference_hash": text_digest(new_ref_text),
        }
    if new_ref_text != union_ref_text:
        return {
            **target,
            "eligible": False,
            "reason": "edition-lyric-difference",
            "new_reference_hash": text_digest(new_ref_text),
            "union_reference_hash": text_digest(union_ref_text),
        }
    return {
        **target,
        "eligible": True,
        "reason": "spacing-only-identical",
        "unit_count": len(new_units),
        "strict_hash": text_digest(db_text),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find empty 통일찬송가 versions whose lyrics strictly match 새찬송가")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--retries", type=int, default=1)
    parser.add_argument("--delay", type=float, default=0.03)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 1 <= args.workers <= 8:
        raise ValueError("--workers must be between 1 and 8")
    supa_url, supa_key = read_config()
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,version_order,version_label,curated_version_name,hymn_no,is_primary",
    )
    units = fetch_all(
        supa_url,
        supa_key,
        "mindex_version_units",
        "id,version_id,unit_order,curated_order,text",
    )
    by_version = grouped_units(units)
    targets = empty_unified_targets(songs, versions, by_version)

    def run(target: dict[str, Any]) -> dict[str, Any]:
        if args.delay:
            time.sleep(args.delay)
        try:
            return audit_target(target, by_version, args.timeout, args.retries)
        except Exception as error:
            return {**target, "eligible": False, "reason": "reference-fetch-failed", "error": str(error)}

    rows: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        for row in executor.map(run, targets):
            rows.append(row)
    rows.sort(key=lambda row: (row["new_no"], row["union_no"]))
    by_reason: dict[str, int] = {}
    for row in rows:
        by_reason[row["reason"]] = by_reason.get(row["reason"], 0) + 1
    candidates = [row for row in rows if row["eligible"]]
    report = {
        "policy": {
            "ignored": ["whitespace", "line_breaks", "verse_number_prefixes", "chorus_structure_labels"],
            "preserved": ["all_other_characters", "punctuation"],
            "example_difference": "노랫소리 != 노래 소리",
            "review_status_after_copy": "needs_review",
        },
        "summary": {
            "empty_unified_targets": len(targets),
            "eligible": len(candidates),
            "excluded": len(rows) - len(candidates),
            "by_reason": dict(sorted(by_reason.items())),
        },
        "candidate_digest": hashlib.sha256(
            "\n".join(f"{row['new_no']}:{row['union_no']}:{row['union_version_id']}:{row['strict_hash']}" for row in candidates).encode()
        ).hexdigest(),
        "candidates": candidates,
        "excluded": [row for row in rows if not row["eligible"]],
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
        print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
        print(f"Candidate digest: {report['candidate_digest']}")
        print(f"Report: {args.output}")
    else:
        print(rendered)
    return 1 if by_reason.get("reference-fetch-failed") else 0


if __name__ == "__main__":
    raise SystemExit(main())
