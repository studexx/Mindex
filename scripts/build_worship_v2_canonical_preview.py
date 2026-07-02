#!/usr/bin/env python3
"""Build a dry-run Worship v2 canonical preview from import candidates.

This script does not write to Supabase. It converts staged import candidates
into the shape that a later canonical apply step would insert:

  Service > Section > Element > Slide
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from typing import Any

from sync_worship_v2_taxonomy import read_config, request_json
from worship_v2_section_rules import SectionGuess, section_guess_for_candidate


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def fetch_all(
    supa_url: str,
    supa_key: str,
    table: str,
    *,
    select: str = "*",
    query: str = "",
    order: str = "",
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    step = 1000
    order_query = f"&order={order}" if order else ""
    while True:
        batch = request_json(
            supa_url,
            supa_key,
            table,
            select=select,
            query=f"{query}{order_query}&limit={step}&offset={start}",
        )
        rows.extend(batch)
        if len(batch) < step:
            return rows
        start += step


def legacy_item_id(candidate: dict[str, Any]) -> str:
    payload = candidate.get("normalized_payload") if isinstance(candidate.get("normalized_payload"), dict) else {}
    return clean_text(payload.get("legacy_item_id"))


def element_type_for_candidate(candidate: dict[str, Any]) -> str:
    suggested = clean_text(candidate.get("suggested_type"))
    return {
        "praise": "praise",
        "scripture_reading": "scripture_reading",
        "scripture_body": "scripture_body",
        "body": "body",
        "plain_text": "plain_text",
        "title_person": "title_person",
        "editable": "editable",
    }.get(suggested, "editable")


def slide_type_for_element(element_type: str) -> str:
    return {
        "praise": "praise_body",
        "scripture_reading": "scripture_reading",
        "scripture_body": "scripture_body",
        "body": "body",
        "plain_text": "plain_text",
        "title_person": "title_person",
        "editable": "editable",
    }.get(element_type, "editable")


def review_flags_for_element(candidate: dict[str, Any], guess: SectionGuess) -> list[str]:
    flags: list[str] = []
    element_type = element_type_for_candidate(candidate)
    if guess.confidence < 0.5:
        flags.append("section_review")
    if element_type == "praise" and not candidate.get("suggested_song_id"):
        flags.append("unlinked_praise")
    if element_type == "scripture_reading" and not candidate.get("suggested_scripture_id"):
        flags.append("unlinked_scripture")
    if clean_text(candidate.get("normalized_title") or candidate.get("raw_title")) in {"", "-", "—", "Default Section"}:
        flags.append("weak_title")
    return flags


def build_preview_for_source(
    source: dict[str, Any],
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    service_candidate = next((row for row in candidates if row.get("candidate_level") == "service"), {})
    element_candidates = [row for row in candidates if row.get("candidate_level") == "element"]
    slide_candidates = [row for row in candidates if row.get("candidate_level") == "slide"]

    slides_by_item: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for slide in sorted(slide_candidates, key=lambda row: row.get("sort_order") or 0):
        slides_by_item[legacy_item_id(slide)].append(slide)

    service_payload = (
        service_candidate.get("normalized_payload")
        if isinstance(service_candidate.get("normalized_payload"), dict)
        else {}
    )
    raw_source_payload = source.get("raw_payload") if isinstance(source.get("raw_payload"), dict) else {}
    legacy_service = raw_source_payload.get("legacy_service") if isinstance(raw_source_payload.get("legacy_service"), dict) else {}
    service_title = clean_text(legacy_service.get("title"))
    service_preview = {
        "source_id": source.get("id"),
        "source_hash": source.get("source_hash"),
        "service_candidate_id": service_candidate.get("id"),
        "service_type_id": source.get("service_type_id") or service_payload.get("service_type_id"),
        "service_date": source.get("service_date") or service_payload.get("service_date"),
        "service_date_end": service_payload.get("service_date_end"),
        "title": service_title,
        "worship_leader": clean_text(service_payload.get("worship_leader")),
        "tags": service_payload.get("tags") if isinstance(service_payload.get("tags"), list) else [],
        "sections": [],
        "review_flags": [],
    }

    current_section: dict[str, Any] | None = None
    previous_key = ""
    seen_item_ids: set[str] = set()
    assigned_slide_ids: set[str] = set()
    for candidate in sorted(element_candidates, key=lambda row: row.get("sort_order") or 0):
        guess = section_guess_for_candidate(candidate)
        if current_section is None or guess.key != previous_key:
            current_section = {
                "sort_order": len(service_preview["sections"]) + 1,
                "section_key": guess.key,
                "title": guess.title,
                "guess_reason": guess.reason,
                "guess_confidence": guess.confidence,
                "elements": [],
            }
            service_preview["sections"].append(current_section)
            previous_key = guess.key

        item_id = legacy_item_id(candidate)
        element_type = element_type_for_candidate(candidate)
        related_slides = [
            slide for slide in slides_by_item.get(item_id, [])
            if str(slide.get("id") or "") not in assigned_slide_ids
        ]
        flags = review_flags_for_element(candidate, guess)
        if item_id and item_id in seen_item_ids:
            flags.append("duplicate_legacy_item")
        if item_id:
            seen_item_ids.add(item_id)
        for slide in related_slides:
            assigned_slide_ids.add(str(slide.get("id") or ""))
        element_preview = {
            "sort_order": len(current_section["elements"]) + 1,
            "candidate_id": candidate.get("id"),
            "candidate_key": candidate.get("candidate_key"),
            "legacy_item_id": item_id,
            "element_type": element_type,
            "label": clean_text(candidate.get("normalized_label") or candidate.get("raw_label")),
            "title": clean_text(candidate.get("normalized_title") or candidate.get("raw_title")),
            "person": clean_text((candidate.get("normalized_payload") or {}).get("person") if isinstance(candidate.get("normalized_payload"), dict) else ""),
            "song_id": candidate.get("suggested_song_id"),
            "song_version_id": (candidate.get("normalized_payload") or {}).get("legacy_version_id") if isinstance(candidate.get("normalized_payload"), dict) else None,
            "scripture_id": candidate.get("suggested_scripture_id"),
            "review_flags": flags,
            "slides": [
                {
                    "sort_order": index,
                    "candidate_id": slide.get("id"),
                    "slide_type": slide_type_for_element(element_type),
                    "title": clean_text(slide.get("normalized_title") or slide.get("raw_title")),
                    "body": clean_text(slide.get("normalized_body") or slide.get("raw_body")),
                }
                for index, slide in enumerate(related_slides, start=1)
            ],
        }
        current_section["elements"].append(element_preview)
        if flags:
            service_preview["review_flags"].extend(flags)

    service_preview["review_flags"] = sorted(set(service_preview["review_flags"]))
    return service_preview


def summarize(previews: list[dict[str, Any]]) -> dict[str, Any]:
    section_counts: Counter[str] = Counter()
    review_flags: Counter[str] = Counter()
    sections_per_service: Counter[int] = Counter()
    elements_per_service: Counter[int] = Counter()
    totals = {
        "services": len(previews),
        "sections": 0,
        "elements": 0,
        "slides": 0,
        "linked_praise_elements": 0,
        "unlinked_praise_elements": 0,
        "scripture_elements": 0,
    }

    for service in previews:
        sections = service["sections"]
        sections_per_service[len(sections)] += 1
        element_count = 0
        for section in sections:
            totals["sections"] += 1
            section_counts[f"{section['section_key']}:{section['title']}"] += 1
            for element in section["elements"]:
                totals["elements"] += 1
                element_count += 1
                totals["slides"] += len(element["slides"])
                if element["element_type"] == "praise" and element["song_id"]:
                    totals["linked_praise_elements"] += 1
                if element["element_type"] == "praise" and not element["song_id"]:
                    totals["unlinked_praise_elements"] += 1
                if element["element_type"] == "scripture_reading":
                    totals["scripture_elements"] += 1
                for flag in element["review_flags"]:
                    review_flags[flag] += 1
        elements_per_service[element_count] += 1

    return {
        "totals": totals,
        "section_counts": dict(section_counts.most_common()),
        "review_flags": dict(review_flags.most_common()),
        "sections_per_service_distribution": dict(sorted(sections_per_service.items())),
        "elements_per_service_distribution": dict(sorted(elements_per_service.items())),
    }


def load_previews(args: argparse.Namespace) -> list[dict[str, Any]]:
    supa_url, supa_key = read_config()
    source_query = "&source_kind=eq.legacy"
    if args.service_date:
        source_query += f"&service_date=eq.{args.service_date}"
    if args.service_type:
        source_query += f"&service_type_id=eq.{args.service_type}"
    sources = fetch_all(
        supa_url,
        supa_key,
        "mindex_worship_import_sources",
        query=source_query,
        order="service_date.asc,service_type_id.asc",
    )
    if args.limit:
        sources = sources[:args.limit]

    source_ids = [str(source.get("id") or "") for source in sources]
    if not source_ids:
        return []

    candidates_by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for group_start in range(0, len(source_ids), 80):
        group = source_ids[group_start:group_start + 80]
        candidates = fetch_all(
            supa_url,
            supa_key,
            "mindex_worship_import_candidates",
            query=f"&import_source_id=in.({','.join(group)})",
            order="import_source_id.asc,sort_order.asc",
        )
        for candidate in candidates:
            candidates_by_source[str(candidate.get("import_source_id") or "")].append(candidate)

    return [
        build_preview_for_source(source, candidates_by_source.get(str(source.get("id") or ""), []))
        for source in sources
    ]


def compact_sample(service: dict[str, Any]) -> dict[str, Any]:
    return {
        "service_type_id": service["service_type_id"],
        "service_date": service["service_date"],
        "title": service["title"],
        "sections": [
            {
                "section_key": section["section_key"],
                "title": section["title"],
                "elements": [
                    {
                        "type": element["element_type"],
                        "label": element["label"],
                        "title": element["title"],
                        "slides": len(element["slides"]),
                        "review_flags": element["review_flags"],
                    }
                    for element in section["elements"][:8]
                ],
            }
            for section in service["sections"]
        ],
        "review_flags": service["review_flags"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build dry-run Worship v2 canonical preview.")
    parser.add_argument("--limit", type=int, default=0, help="Limit services.")
    parser.add_argument("--service-date", default="", help="Preview one service date.")
    parser.add_argument("--service-type", default="", help="Preview one v2 service type id.")
    parser.add_argument("--json", action="store_true", help="Print full JSON preview.")
    parser.add_argument("--sample", type=int, default=3, help="Number of compact sample services to print.")
    args = parser.parse_args()

    previews = load_previews(args)
    report = {"summary": summarize(previews), "samples": [compact_sample(row) for row in previews[:args.sample]]}
    if args.json:
        report["services"] = previews
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    totals = report["summary"]["totals"]
    print("Worship v2 canonical preview")
    print(
        f"  services={totals['services']} sections={totals['sections']} "
        f"elements={totals['elements']} slides={totals['slides']}"
    )
    print(
        f"  linked_praise={totals['linked_praise_elements']} "
        f"unlinked_praise={totals['unlinked_praise_elements']} "
        f"scripture={totals['scripture_elements']}"
    )
    print("  review_flags:", report["summary"]["review_flags"])
    print("  sections_per_service:", report["summary"]["sections_per_service_distribution"])
    print()
    print("Top section counts:")
    for key, count in list(report["summary"]["section_counts"].items())[:20]:
        print(f"  {count:>4} {key}")
    print()
    print("Samples:")
    for sample in report["samples"]:
        print(json.dumps(sample, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
