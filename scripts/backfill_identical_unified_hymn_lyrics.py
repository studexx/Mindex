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

from audit_hbible_hymns import unified_number  # noqa: E402
from audit_identical_hymn_lyrics import grouped_units, spacing_only_text  # noqa: E402
from backfill_song_versions_from_memo import chunked, fetch_all, read_config, request_json  # noqa: E402


EXPECTED_CANDIDATE_COUNT = 50
EXPECTED_UNIT_COUNT = 226
EXPECTED_CANDIDATE_DIGEST = "00453870c4ee0d220e8b77345e6ccabd800f2f89b9bf9374a454aed56b27b285"
REVIEW_NOTE = "Automated spacing-only lyric match; manual review required."


def candidate_digest(candidates: list[dict[str, Any]]) -> str:
    lines = (
        f"{row['new_no']}:{row['union_no']}:{row['union_version_id']}:{row['strict_hash']}"
        for row in candidates
    )
    return hashlib.sha256("\n".join(lines).encode()).hexdigest()


def load_report(path: Path) -> dict[str, Any]:
    report = json.loads(path.read_text(encoding="utf-8"))
    candidates = report.get("candidates")
    summary = report.get("summary") or {}
    if not isinstance(candidates, list):
        raise RuntimeError("Audit report has no candidate list")
    digest = candidate_digest(candidates)
    if (
        len(candidates) != EXPECTED_CANDIDATE_COUNT
        or summary.get("eligible") != EXPECTED_CANDIDATE_COUNT
        or summary.get("by_reason", {}).get("reference-fetch-failed", 0) != 0
        or report.get("candidate_digest") != EXPECTED_CANDIDATE_DIGEST
        or digest != EXPECTED_CANDIDATE_DIGEST
    ):
        raise RuntimeError(
            f"Unexpected audit candidate set: count={len(candidates)}, digest={digest}"
        )
    return report


def cloned_unit_id(target_version_id: str, source_unit_id: str) -> str:
    return str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"mindex:identical-unified:{target_version_id}:unit:{source_unit_id}",
        )
    )


def lyric_signature(union_no: int, strict_hash: str) -> str:
    return f"mindex-unified-{union_no}-{strict_hash}"


def clone_units(
    source_units: list[dict[str, Any]],
    target_version: dict[str, Any],
) -> list[dict[str, Any]]:
    target_id = str(target_version["id"])
    canonical_id = str(target_version["canonical_song_id"])
    return [
        {
            "id": cloned_unit_id(target_id, str(source["id"])),
            "version_id": target_id,
            "canonical_song_id": canonical_id,
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
            "review_status": "needs_review",
            "review_note": REVIEW_NOTE,
            "reviewed_at": None,
        }
        for source in source_units
    ]


def build_plan(
    report: dict[str, Any],
    songs: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
    expected_candidate_count: int = EXPECTED_CANDIDATE_COUNT,
    expected_unit_count: int = EXPECTED_UNIT_COUNT,
) -> dict[str, Any]:
    songs_by_id = {str(row.get("id")): row for row in songs}
    versions_by_id = {str(row.get("id")): row for row in versions}
    by_version = grouped_units(units)
    existing_unit_ids = {str(row.get("id")) for row in units}
    signatures_by_canonical: dict[str, set[str]] = {}
    for version in versions:
        signatures_by_canonical.setdefault(str(version.get("canonical_song_id")), set()).add(
            str(version.get("lyric_signature") or "")
        )

    version_patches: list[dict[str, Any]] = []
    unit_rows: list[dict[str, Any]] = []
    for candidate in report["candidates"]:
        song = songs_by_id.get(str(candidate["song_id"]))
        source = versions_by_id.get(str(candidate["new_version_id"]))
        target = versions_by_id.get(str(candidate["union_version_id"]))
        if not song or str(song.get("hymn_no")) != str(candidate["new_no"]):
            raise RuntimeError(f"Song mapping changed for 새찬송가 {candidate['new_no']}")
        if (
            not source
            or str(source.get("source_song_id")) != str(song["id"])
            or source.get("curated_version_name") != "새찬송가"
        ):
            raise RuntimeError(f"Source version changed for 새찬송가 {candidate['new_no']}")
        if (
            not target
            or str(target.get("source_song_id")) != str(song["id"])
            or unified_number(target) != candidate["union_no"]
            or str(target.get("canonical_song_id")) != str(source.get("canonical_song_id"))
        ):
            raise RuntimeError(f"Target mapping changed for 통일찬송가 {candidate['union_no']}")
        target_id = str(target["id"])
        if by_version.get(target_id):
            raise RuntimeError(f"Target version is no longer empty: {target_id}")
        if target.get("version_review_status") != "reviewed":
            raise RuntimeError(f"Unexpected target review status: {target_id}")

        source_units = by_version.get(str(source["id"]), [])
        current_text = spacing_only_text("\n".join(str(row.get("text") or "") for row in source_units))
        current_hash = hashlib.sha256(current_text.encode()).hexdigest()[:16]
        if len(source_units) != candidate["unit_count"] or current_hash != candidate["strict_hash"]:
            raise RuntimeError(f"Source lyrics changed for 새찬송가 {candidate['new_no']}")

        signature = lyric_signature(candidate["union_no"], candidate["strict_hash"])
        used_signatures = signatures_by_canonical[str(target["canonical_song_id"])]
        if signature in used_signatures:
            raise RuntimeError(f"Target lyric signature already exists: {signature}")
        used_signatures.add(signature)
        cloned = clone_units(source_units, target)
        duplicate_ids = sorted(str(row["id"]) for row in cloned if str(row["id"]) in existing_unit_ids)
        if duplicate_ids:
            raise RuntimeError(f"Cloned unit IDs already exist: {duplicate_ids}")
        unit_rows.extend(cloned)
        version_patches.append({
            "id": target_id,
            "new_no": candidate["new_no"],
            "union_no": candidate["union_no"],
            "old_review_status": target["version_review_status"],
            "old_lyric_signature": target["lyric_signature"],
            "new_review_status": "pending",
            "new_lyric_signature": signature,
            "unit_count": len(cloned),
            "strict_hash": candidate["strict_hash"],
        })

    if len(version_patches) != expected_candidate_count or len(unit_rows) != expected_unit_count:
        raise RuntimeError(
            f"Unexpected backfill size: versions={len(version_patches)}, units={len(unit_rows)}"
        )
    return {"version_patches": version_patches, "unit_rows": unit_rows}


def verify_final(
    plan: dict[str, Any],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> None:
    versions_by_id = {str(row.get("id")): row for row in versions}
    by_version = grouped_units(units)
    for patch in plan["version_patches"]:
        version = versions_by_id.get(patch["id"])
        copied = by_version.get(patch["id"], [])
        current_text = spacing_only_text("\n".join(str(row.get("text") or "") for row in copied))
        current_hash = hashlib.sha256(current_text.encode()).hexdigest()[:16]
        if (
            not version
            or version.get("version_review_status") != "pending"
            or version.get("lyric_signature") != patch["new_lyric_signature"]
            or len(copied) != patch["unit_count"]
            or current_hash != patch["strict_hash"]
            or any(
                row.get("review_status") != "needs_review"
                or row.get("review_note") != REVIEW_NOTE
                or row.get("reviewed_at") is not None
                for row in copied
            )
        ):
            raise RuntimeError(f"Post-check failed for 통일찬송가 {patch['union_no']}")


def load_data(
    supa_url: str, supa_key: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no")
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return songs, versions, units


def rollback(
    supa_url: str,
    supa_key: str,
    plan: dict[str, Any],
    patched_ids: set[str],
) -> None:
    unit_ids = [str(row["id"]) for row in plan["unit_rows"]]
    for batch in chunked(unit_ids, 100):
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_version_units",
            {"id": f"in.({','.join(batch)})"},
            prefer="return=minimal",
        )
    for patch in plan["version_patches"]:
        if patch["id"] not in patched_ids:
            continue
        request_json(
            supa_url,
            supa_key,
            "PATCH",
            "mindex_song_versions",
            {"id": f"eq.{patch['id']}", "lyric_signature": f"eq.{patch['new_lyric_signature']}"},
            {
                "version_review_status": patch["old_review_status"],
                "lyric_signature": patch["old_lyric_signature"],
            },
            "return=minimal",
        )


def apply_plan(supa_url: str, supa_key: str, plan: dict[str, Any]) -> None:
    patched_ids: set[str] = set()
    try:
        for batch in chunked(plan["unit_rows"]):
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_version_units",
                payload=batch,
                prefer="return=minimal",
            )
        for patch in plan["version_patches"]:
            result = request_json(
                supa_url,
                supa_key,
                "PATCH",
                "mindex_song_versions",
                {
                    "id": f"eq.{patch['id']}",
                    "version_review_status": f"eq.{patch['old_review_status']}",
                    "lyric_signature": f"eq.{patch['old_lyric_signature']}",
                },
                {
                    "version_review_status": patch["new_review_status"],
                    "lyric_signature": patch["new_lyric_signature"],
                },
                "return=representation",
            )
            if not isinstance(result, list) or len(result) != 1:
                raise RuntimeError(f"Guarded version update failed: {patch['id']}")
            patched_ids.add(patch["id"])
    except Exception:
        rollback(supa_url, supa_key, plan, patched_ids)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy verified spacing-only identical lyrics into empty unified versions")
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", help="Apply the guarded backfill")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = load_report(args.report)
    supa_url, supa_key = read_config()
    songs, versions, units = load_data(supa_url, supa_key)
    plan = build_plan(report, songs, versions, units)
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "candidate_digest": report["candidate_digest"],
        "versions": len(plan["version_patches"]),
        "units": len(plan["unit_rows"]),
        "version_review_status": "pending",
        "unit_review_status": "needs_review",
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    apply_plan(supa_url, supa_key, plan)
    _, final_versions, final_units = load_data(supa_url, supa_key)
    verify_final(plan, final_versions, final_units)
    print(json.dumps({"status": "verified", **summary}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
