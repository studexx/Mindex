from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_identical_hymn_lyrics import grouped_units  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


EXPECTED_CANDIDATE_COUNT = 63
EXPECTED_CANDIDATE_DIGEST = "e5c398beb6af99cc9566f9d54f054abb51d7d16c4e43b94e71f33ae00d5ceba7"
REVIEW_NOTE = "Modern Korean spacing correction and identical-edition sync; manual review required."
SYNC_FIELDS = (
    "unit_order",
    "unit_label",
    "unit_kind",
    "trigger",
    "slide_numbers",
    "text",
    "curated_unit_type",
    "curated_unit_label",
    "curated_order",
)
CORRECTIONS: dict[int, tuple[tuple[str, str, int], ...]] = {
    68: (("지켜주시니", "지켜 주시니", 1),),
    89: (("간 데 마다", "간 데마다", 1),),
    222: (("품어주시기를", "품어 주시기를", 1), ("지켜주시기를", "지켜 주시기를", 1)),
    312: (("힘주시고", "힘 주시고", 1), ("지켜주시리", "지켜 주시리", 1)),
    337: (("구해주사", "구해 주사", 2),),
    366: (("녹여주사", "녹여 주사", 1),),
    368: (("풀어주사", "풀어 주사", 1), ("부어주사", "부어 주사", 1)),
    384: (("내 주안에", "내 주 안에", 1),),
    460: (("힘주시고", "힘 주시고", 1),),
    591: (("내려주니", "내려 주니", 1),),
    602: (("하나되는", "하나 되는", 1),),
}


def load_report(path: Path) -> dict[str, Any]:
    report = json.loads(path.read_text(encoding="utf-8"))
    candidates = report.get("candidates")
    if (
        not isinstance(candidates, list)
        or len(candidates) != EXPECTED_CANDIDATE_COUNT
        or report.get("candidate_digest") != EXPECTED_CANDIDATE_DIGEST
        or report.get("summary", {}).get("scope") != "all"
        or report.get("summary", {}).get("by_reason", {}).get("reference-fetch-failed", 0) != 0
    ):
        raise RuntimeError("Unexpected all-mapped identical-hymn audit report")
    return report


def apply_corrections(new_no: int, texts: list[str]) -> list[str]:
    corrected = list(texts)
    for old, new, expected_count in CORRECTIONS.get(new_no, ()):
        count = sum(text.count(old) for text in corrected)
        if count != expected_count:
            raise RuntimeError(
                f"Unexpected correction occurrence for 새찬송가 {new_no}: {old!r} count={count}"
            )
        corrected = [text.replace(old, new) for text in corrected]
    return corrected


def text_hash(texts: list[str]) -> str:
    return hashlib.sha256("\n".join(texts).encode()).hexdigest()[:16]


def version_signature(book: str, number: int, texts: list[str]) -> str:
    return f"mindex-{book}-{number}-{text_hash(texts)}"


def normalized_unit(source: dict[str, Any], text: str) -> dict[str, Any]:
    row = {field: source.get(field) for field in SYNC_FIELDS}
    row["trigger"] = row.get("trigger") or ""
    row["slide_numbers"] = row.get("slide_numbers") or []
    row["text"] = text
    row.update({
        "review_status": "needs_review",
        "review_note": REVIEW_NOTE,
        "reviewed_at": None,
    })
    return row


def changed_patch(current: dict[str, Any], desired: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in desired.items() if current.get(key) != value}


def build_plan(
    report: dict[str, Any],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> dict[str, Any]:
    versions_by_id = {str(row.get("id")): row for row in versions}
    by_version = grouped_units(units)
    signatures_by_canonical: dict[str, dict[str, str]] = {}
    for version in versions:
        signatures_by_canonical.setdefault(str(version.get("canonical_song_id")), {})[
            str(version.get("lyric_signature") or "")
        ] = str(version.get("id"))

    unit_patches: list[dict[str, Any]] = []
    version_patches: list[dict[str, Any]] = []
    corrected_occurrences = 0
    structurally_synced_pairs = 0
    for candidate in report["candidates"]:
        new_no = int(candidate["new_no"])
        union_no = int(candidate["union_no"])
        source = versions_by_id.get(str(candidate["new_version_id"]))
        target = versions_by_id.get(str(candidate["union_version_id"]))
        if not source or not target or source.get("canonical_song_id") != target.get("canonical_song_id"):
            raise RuntimeError(f"Version mapping changed for 새{new_no}↔통{union_no}")
        source_units = by_version.get(str(source["id"]), [])
        target_units = by_version.get(str(target["id"]), [])
        if not source_units or len(source_units) != len(target_units):
            raise RuntimeError(f"Unit structure changed for 새{new_no}↔통{union_no}")

        source_texts = [str(row.get("text") or "") for row in source_units]
        corrected_texts = apply_corrections(new_no, source_texts)
        corrected_occurrences += sum(
            expected_count for _, _, expected_count in CORRECTIONS.get(new_no, ())
        )
        pair_changed = False
        for source_unit, target_unit, corrected_text in zip(source_units, target_units, corrected_texts):
            source_desired = normalized_unit(source_unit, corrected_text)
            target_desired = normalized_unit(source_unit, corrected_text)
            source_change = changed_patch(
                source_unit,
                {field: source_desired[field] for field in SYNC_FIELDS},
            )
            target_change = changed_patch(
                target_unit,
                {field: target_desired[field] for field in SYNC_FIELDS},
            )
            if source_change:
                source_change.update(changed_patch(source_unit, {
                    "review_status": "needs_review",
                    "review_note": REVIEW_NOTE,
                    "reviewed_at": None,
                }))
            if target_change:
                target_change.update(changed_patch(target_unit, {
                    "review_status": "needs_review",
                    "review_note": REVIEW_NOTE,
                    "reviewed_at": None,
                }))
            if source_change:
                unit_patches.append({
                    "id": str(source_unit["id"]),
                    "version_id": str(source["id"]),
                    "old_text": source_unit["text"],
                    "old": {key: source_unit.get(key) for key in source_change},
                    "new": source_change,
                })
                pair_changed = True
            if target_change:
                unit_patches.append({
                    "id": str(target_unit["id"]),
                    "version_id": str(target["id"]),
                    "old_text": target_unit["text"],
                    "old": {key: target_unit.get(key) for key in target_change},
                    "new": target_change,
                })
                pair_changed = True
        if not pair_changed:
            continue
        structurally_synced_pairs += 1
        for version, book, number in ((source, "new", new_no), (target, "unified", union_no)):
            signature = version_signature(book, number, corrected_texts)
            canonical_id = str(version["canonical_song_id"])
            owner = signatures_by_canonical[canonical_id].get(signature)
            if owner and owner != str(version["id"]):
                raise RuntimeError(f"Lyric signature collision: {signature}")
            patch = {
                "version_review_status": "pending",
                "lyric_signature": signature,
            }
            change = changed_patch(version, patch)
            if change:
                version_patches.append({
                    "id": str(version["id"]),
                    "old_signature": str(version["lyric_signature"]),
                    "old": {key: version.get(key) for key in change},
                    "new": change,
                })

    if corrected_occurrences != 15 or structurally_synced_pairs != 12:
        raise RuntimeError(
            f"Unexpected sync plan: corrections={corrected_occurrences}, pairs={structurally_synced_pairs}"
        )
    return {
        "unit_patches": unit_patches,
        "version_patches": version_patches,
        "corrected_occurrences": corrected_occurrences,
        "synced_pairs": structurally_synced_pairs,
    }


def apply_plan(supa_url: str, supa_key: str, plan: dict[str, Any]) -> None:
    applied_units: list[dict[str, Any]] = []
    applied_versions: list[dict[str, Any]] = []
    try:
        for row in plan["unit_patches"]:
            result = request_json(
                supa_url,
                supa_key,
                "PATCH",
                "mindex_version_units",
                {"id": f"eq.{row['id']}", "text": f"eq.{row['old_text']}"},
                row["new"],
                "return=representation",
            )
            if not isinstance(result, list) or len(result) != 1:
                raise RuntimeError(f"Guarded unit patch failed: {row['id']}")
            applied_units.append(row)
        for row in plan["version_patches"]:
            result = request_json(
                supa_url,
                supa_key,
                "PATCH",
                "mindex_song_versions",
                {"id": f"eq.{row['id']}", "lyric_signature": f"eq.{row['old_signature']}"},
                row["new"],
                "return=representation",
            )
            if not isinstance(result, list) or len(result) != 1:
                raise RuntimeError(f"Guarded version patch failed: {row['id']}")
            applied_versions.append(row)
    except Exception:
        for row in reversed(applied_versions):
            request_json(
                supa_url, supa_key, "PATCH", "mindex_song_versions",
                {"id": f"eq.{row['id']}"}, row["old"], "return=minimal",
            )
        for row in reversed(applied_units):
            request_json(
                supa_url, supa_key, "PATCH", "mindex_version_units",
                {"id": f"eq.{row['id']}"}, row["old"], "return=minimal",
            )
        raise


def verify_final(
    report: dict[str, Any],
    versions: list[dict[str, Any]],
    units: list[dict[str, Any]],
) -> None:
    versions_by_id = {str(row.get("id")): row for row in versions}
    by_version = grouped_units(units)
    for candidate in report["candidates"]:
        new_no = int(candidate["new_no"])
        source = versions_by_id[str(candidate["new_version_id"])]
        target = versions_by_id[str(candidate["union_version_id"])]
        source_units = by_version[str(source["id"])]
        target_units = by_version[str(target["id"])]
        source_view = [{field: row.get(field) for field in SYNC_FIELDS} for row in source_units]
        target_view = [{field: row.get(field) for field in SYNC_FIELDS} for row in target_units]
        if source_view != target_view:
            raise RuntimeError(f"Post-sync unit mismatch for 새찬송가 {new_no}")
        text = "\n".join(str(row.get("text") or "") for row in source_units)
        for old, new, expected_count in CORRECTIONS.get(new_no, ()):
            if old in text or text.count(new) != expected_count:
                raise RuntimeError(f"Post-correction check failed for 새찬송가 {new_no}: {old!r}")
        if new_no in CORRECTIONS:
            if source.get("version_review_status") != "pending" or target.get("version_review_status") != "pending":
                raise RuntimeError(f"Review status check failed for 새찬송가 {new_no}")


def load_data(supa_url: str, supa_key: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    versions = fetch_all(supa_url, supa_key, "mindex_song_versions", "*")
    units = fetch_all(supa_url, supa_key, "mindex_version_units", "*")
    return versions, units


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Correct and synchronize strictly identical hymn editions")
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = load_report(args.report)
    supa_url, supa_key = read_config()
    versions, units = load_data(supa_url, supa_key)
    plan = build_plan(report, versions, units)
    summary = {
        "mode": "apply" if args.apply else "dry-run",
        "candidate_digest": report["candidate_digest"],
        "corrected_occurrences": plan["corrected_occurrences"],
        "synced_pairs": plan["synced_pairs"],
        "unit_patches": len(plan["unit_patches"]),
        "version_patches": len(plan["version_patches"]),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0
    apply_plan(supa_url, supa_key, plan)
    final_versions, final_units = load_data(supa_url, supa_key)
    verify_final(report, final_versions, final_units)
    print(json.dumps({"status": "verified", **summary}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
