from __future__ import annotations

import argparse
import concurrent.futures
import difflib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import (  # noqa: E402
    combined_lyrics,
    fetch_reference_hymn,
    is_new_hymnal_version,
    strict_lyric_text,
    unified_number,
    version_units_by_version,
)
from audit_mindex_content import fetch_rows, read_config  # noqa: E402


def difference_operations(
    reference: str,
    database: str,
    limit: int = 24,
    context: int = 18,
) -> list[dict[str, str]]:
    operations: list[dict[str, str]] = []
    matcher = difflib.SequenceMatcher(None, reference, database)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        operations.append({
            "operation": tag,
            "reference": reference[i1:i2][:limit],
            "database": database[j1:j2][:limit],
            "reference_context": reference[max(0, i1 - context):min(len(reference), i2 + context)],
            "database_context": database[max(0, j1 - context):min(len(database), j2 + context)],
        })
    return operations


def selected_version(
    issue: dict[str, Any],
    songs: list[dict[str, Any]],
    versions_by_song: dict[str, list[dict[str, Any]]],
) -> dict[str, Any] | None:
    if issue["book"] == "new":
        song = next((row for row in songs if str(row.get("hymn_no") or "") == str(issue["number"])), None)
        if not song:
            return None
        candidates = [row for row in versions_by_song.get(str(song["id"]), []) if is_new_hymnal_version(row)]
    else:
        candidates = [
            version
            for rows in versions_by_song.values()
            for version in rows
            if unified_number(version) == int(issue["number"])
        ]
    primary = [row for row in candidates if row.get("is_primary")]
    return (primary or candidates)[0] if candidates else None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect compact edit operations for strict hymn mismatches")
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=2)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    issues = [row for row in audit["issues"] if row.get("code") == "lyric-character-mismatch"]
    supa_url, supa_key = read_config()
    songs = fetch_rows(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_rows(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,curated_version_name,version_label,raw_section_name,hymn_no,is_primary",
    )
    units = fetch_rows(
        supa_url,
        supa_key,
        "mindex_version_units",
        "id,version_id,unit_order,unit_label,text,curated_unit_label,curated_order",
    )
    versions_by_song: dict[str, list[dict[str, Any]]] = {}
    for version in versions:
        versions_by_song.setdefault(str(version.get("source_song_id") or ""), []).append(version)
    grouped = version_units_by_version(units)

    def inspect(issue: dict[str, Any]) -> dict[str, Any]:
        reference = fetch_reference_hymn(issue["book"], int(issue["number"]), args.timeout, args.retries)
        version = selected_version(issue, songs, versions_by_song)
        if not version:
            raise RuntimeError(f"Version missing during mismatch inspection: {issue}")
        reference_text = strict_lyric_text(reference.lyrics)
        database_text = strict_lyric_text(combined_lyrics(version, grouped))
        return {
            "book": issue["book"],
            "number": issue["number"],
            "title": issue["reference_title"],
            "similarity": issue["similarity"],
            "operations": difference_operations(reference_text, database_text),
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        rows = list(executor.map(inspect, issues))
    rows.sort(key=lambda row: (row["book"], row["number"]))
    report = {
        "source_audit": str(args.audit),
        "lyrics_persisted": False,
        "mismatch_count": len(rows),
        "rows": rows,
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"mismatch_count": len(rows), "output": str(args.output)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
