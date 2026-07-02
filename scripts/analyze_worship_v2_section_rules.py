#!/usr/bin/env python3
"""Analyze Worship v2 section grouping rules against staged import candidates."""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from typing import Any

from sync_worship_v2_taxonomy import read_config, request_json
from worship_v2_section_rules import section_guess_for_candidate


def fetch_candidates(supa_url: str, supa_key: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    step = 1000
    select = (
        "id,import_source_id,sort_order,candidate_key,candidate_level,"
        "raw_label,raw_title,normalized_label,normalized_title,"
        "suggested_type,review_status,confidence,normalized_payload"
    )
    while True:
        batch = request_json(
            supa_url,
            supa_key,
            "mindex_worship_import_candidates",
            select=select,
            query=f"&candidate_level=eq.element&order=import_source_id.asc,sort_order.asc&limit={step}&offset={start}",
        )
        rows.extend(batch)
        if len(batch) < step:
            return rows
        start += step


def build_report(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    section_counts: Counter[str] = Counter()
    reason_counts: Counter[str] = Counter()
    low_confidence: list[dict[str, Any]] = []
    review_labels: Counter[str] = Counter()
    source_sections: dict[str, list[str]] = defaultdict(list)

    for candidate in candidates:
        guess = section_guess_for_candidate(candidate)
        section_counts[f"{guess.key}:{guess.title}"] += 1
        reason_counts[guess.reason] += 1
        source_sections[str(candidate.get("import_source_id") or "")].append(guess.key)
        label = str(candidate.get("normalized_label") or candidate.get("raw_label") or "").strip()
        title = str(candidate.get("normalized_title") or candidate.get("raw_title") or "").strip()
        if guess.confidence < 0.5:
            review_labels[label or "(blank)"] += 1
            if len(low_confidence) < 80:
                low_confidence.append({
                    "label": label,
                    "title": title,
                    "suggested_type": candidate.get("suggested_type"),
                    "section_key": guess.key,
                    "section_title": guess.title,
                    "confidence": guess.confidence,
                    "reason": guess.reason,
                })

    sections_per_source = Counter()
    for keys in source_sections.values():
        compressed: list[str] = []
        for key in keys:
            if not compressed or compressed[-1] != key:
                compressed.append(key)
        sections_per_source[len(compressed)] += 1

    return {
        "element_candidates": len(candidates),
        "section_counts": dict(section_counts.most_common()),
        "reason_counts": dict(reason_counts.most_common()),
        "low_confidence_count": sum(review_labels.values()),
        "low_confidence_labels": dict(review_labels.most_common(40)),
        "sections_per_service_distribution": dict(sorted(sections_per_source.items())),
        "low_confidence_samples": low_confidence,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze Worship v2 section grouping rules.")
    parser.add_argument("--json", action="store_true", help="Print full JSON report.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    report = build_report(fetch_candidates(supa_url, supa_key))

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print(f"Element candidates: {report['element_candidates']}")
    print("Section guesses:")
    for key, count in report["section_counts"].items():
        print(f"  {count:>4}  {key}")
    print()
    print(f"Low-confidence candidates: {report['low_confidence_count']}")
    for label, count in report["low_confidence_labels"].items():
        print(f"  {count:>4}  {label}")
    print()
    print("Sections per service distribution:")
    for count, services in report["sections_per_service_distribution"].items():
        print(f"  {count:>2} sections: {services} services")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
