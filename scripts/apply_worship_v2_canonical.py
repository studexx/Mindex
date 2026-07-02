#!/usr/bin/env python3
"""Apply Worship v2 canonical rows from staged import previews.

Default mode is dry-run. `--apply` inserts into:

  mindex_worship_services
  mindex_worship_sections
  mindex_worship_elements
  mindex_worship_slides
  mindex_worship_import_mappings

It preserves legacy service tables and curated Praise/Scripture records.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from typing import Any

from build_worship_v2_canonical_preview import load_previews, summarize
from sync_worship_v2_taxonomy import read_config, request_json


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def normalize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = sorted({key for row in rows for key in row})
    return [{key: row.get(key) for key in keys} for row in rows]


def insert_rows(supa_url: str, supa_key: str, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    return request_json(
        supa_url,
        supa_key,
        table,
        method="POST",
        body=normalize_rows(rows),
        prefer="return=representation",
    )


def patch_row(supa_url: str, supa_key: str, table: str, row_id: str, body: dict[str, Any]) -> None:
    request_json(
        supa_url,
        supa_key,
        table,
        method="PATCH",
        query=f"id=eq.{row_id}",
        body=body,
        prefer="return=minimal",
    )


def fetch_existing_applied_sources(supa_url: str, supa_key: str) -> set[str]:
    rows = request_json(
        supa_url,
        supa_key,
        "mindex_worship_import_sources",
        select="id",
        query="&source_kind=eq.legacy&status=eq.applied",
    )
    return {clean_text(row.get("id")) for row in rows if row.get("id")}


def service_row(service: dict[str, Any]) -> dict[str, Any]:
    return {
        "service_type_id": service["service_type_id"],
        "service_date": service["service_date"],
        "service_date_end": service.get("service_date_end"),
        "title": clean_text(service.get("title")),
        "status": "draft",
        "worship_leader": clean_text(service.get("worship_leader")),
        "praise_leader": "",
        "tags": service.get("tags") if isinstance(service.get("tags"), list) else [],
        "source_kind": "legacy",
        "source_ref": {
            "import_source_id": service.get("source_id"),
            "source_hash": service.get("source_hash"),
            "service_candidate_id": service.get("service_candidate_id"),
            "review_flags": service.get("review_flags") or [],
        },
        "notes": "",
    }


def section_row(service_id: str, section: dict[str, Any]) -> dict[str, Any]:
    return {
        "service_id": service_id,
        "sort_order": section["sort_order"],
        "section_key": section["section_key"],
        "title": section["title"],
        "person": "",
        "source_kind": "legacy",
        "source_ref": {
            "guess_reason": section.get("guess_reason"),
            "guess_confidence": section.get("guess_confidence"),
        },
        "config": {},
    }


def element_row(section_id: str, element: dict[str, Any]) -> dict[str, Any]:
    flags = element.get("review_flags") or []
    element_type = element["element_type"]
    title = clean_text(element.get("title"))
    legacy_version_id = element.get("song_version_id")
    return {
        "section_id": section_id,
        "sort_order": element["sort_order"],
        "element_type": element_type,
        "title": title,
        "person": clean_text(element.get("person")),
        "body": "",
        "song_id": element.get("song_id"),
        "song_version_id": None,
        "scripture_id": element.get("scripture_id"),
        "scripture_reference": title if element_type == "scripture_reading" and not element.get("scripture_id") else "",
        "asset": {},
        "source_kind": "legacy",
        "source_ref": {
            "import_candidate_id": element.get("candidate_id"),
            "candidate_key": element.get("candidate_key"),
            "legacy_item_id": element.get("legacy_item_id"),
            "legacy_version_id": legacy_version_id,
            "label": element.get("label"),
            "review_flags": flags,
        },
        "review_status": "needs_review" if flags else "matched",
        "config": {},
    }


def slide_row(element_id: str, slide: dict[str, Any], element: dict[str, Any]) -> dict[str, Any]:
    return {
        "element_id": element_id,
        "sort_order": slide["sort_order"],
        "slide_type": slide["slide_type"],
        "output_context": "auto",
        "title": clean_text(slide.get("title")),
        "body": clean_text(slide.get("body")),
        "marker": "",
        "media": {},
        "layout": {},
        "source_kind": "legacy",
        "source_ref": {
            "import_candidate_id": slide.get("candidate_id"),
            "element_candidate_id": element.get("candidate_id"),
            "candidate_key": element.get("candidate_key"),
        },
    }


def mapping_row(
    source_id: str,
    candidate_id: str | None,
    target_level: str,
    target_id: str,
    review_status: str,
    confidence: float = 1,
    notes: str = "",
) -> dict[str, Any]:
    return {
        "import_source_id": source_id,
        "import_candidate_id": candidate_id,
        "target_level": target_level,
        "target_id": target_id,
        "review_status": review_status,
        "confidence": confidence,
        "raw_payload": {},
        "normalized_payload": {},
        "notes": notes,
    }


def apply_service(supa_url: str, supa_key: str, service: dict[str, Any]) -> dict[str, int]:
    counts = Counter()
    inserted_service = insert_rows(supa_url, supa_key, "mindex_worship_services", [service_row(service)])[0]
    service_id = inserted_service["id"]
    counts["services"] += 1

    mappings = [
        mapping_row(
            service["source_id"],
            service.get("service_candidate_id"),
            "service",
            service_id,
            "matched",
            1,
            "Applied legacy service candidate to Worship v2 service.",
        )
    ]

    for section in service["sections"]:
        inserted_section = insert_rows(supa_url, supa_key, "mindex_worship_sections", [section_row(service_id, section)])[0]
        section_id = inserted_section["id"]
        counts["sections"] += 1
        mappings.append(mapping_row(service["source_id"], None, "section", section_id, "matched", section.get("guess_confidence") or 0))

        element_rows = [element_row(section_id, element) for element in section["elements"]]
        inserted_elements = insert_rows(supa_url, supa_key, "mindex_worship_elements", element_rows)
        counts["elements"] += len(inserted_elements)

        for element, inserted_element in zip(section["elements"], inserted_elements):
            element_id = inserted_element["id"]
            review_status = "needs_review" if element.get("review_flags") else "matched"
            mappings.append(
                mapping_row(
                    service["source_id"],
                    element.get("candidate_id"),
                    "element",
                    element_id,
                    review_status,
                    0.5 if review_status == "needs_review" else 0.9,
                    ",".join(element.get("review_flags") or []),
                )
            )
            slide_rows = [slide_row(element_id, slide, element) for slide in element["slides"]]
            inserted_slides = insert_rows(supa_url, supa_key, "mindex_worship_slides", slide_rows)
            counts["slides"] += len(inserted_slides)
            for slide, inserted_slide in zip(element["slides"], inserted_slides):
                mappings.append(
                    mapping_row(
                        service["source_id"],
                        slide.get("candidate_id"),
                        "slide",
                        inserted_slide["id"],
                        review_status,
                        0.5 if review_status == "needs_review" else 0.9,
                    )
                )

    insert_rows(supa_url, supa_key, "mindex_worship_import_mappings", mappings)
    counts["mappings"] += len(mappings)
    patch_row(supa_url, supa_key, "mindex_worship_import_sources", service["source_id"], {"status": "applied"})
    return dict(counts)


def merge_counts(counts: list[dict[str, int]]) -> dict[str, int]:
    total = Counter()
    for count in counts:
        total.update(count)
    return dict(total)


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Worship v2 canonical rows from staged imports.")
    parser.add_argument("--apply", action="store_true", help="Actually insert canonical rows.")
    parser.add_argument("--limit", type=int, default=0, help="Limit services.")
    parser.add_argument("--service-date", default="", help="Apply one service date.")
    parser.add_argument("--service-type", default="", help="Apply one v2 service type id.")
    parser.add_argument("--json", action="store_true", help="Print JSON summary.")
    args = parser.parse_args()

    previews = load_previews(args)
    summary = summarize(previews)
    supa_url, supa_key = read_config()
    existing = fetch_existing_applied_sources(supa_url, supa_key)
    pending = [service for service in previews if str(service.get("source_id") or "") not in existing]

    result = {
        "preview": summary,
        "existing_applied_sources": len(existing),
        "pending_services": len(pending),
        "applied": {},
        "mode": "apply" if args.apply else "dry-run",
    }

    if args.apply:
        applied_counts = []
        for service in pending:
            applied_counts.append(apply_service(supa_url, supa_key, service))
        result["applied"] = merge_counts(applied_counts)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    totals = summary["totals"]
    print("Worship v2 canonical apply")
    print(
        f"  preview services={totals['services']} sections={totals['sections']} "
        f"elements={totals['elements']} slides={totals['slides']}"
    )
    print(f"  existing_applied_sources={len(existing)} pending_services={len(pending)}")
    print(f"  mode={result['mode']}")
    if args.apply:
        print(f"  applied={result['applied']}")
    else:
        print("  dry-run only. Re-run with --apply to insert canonical rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
