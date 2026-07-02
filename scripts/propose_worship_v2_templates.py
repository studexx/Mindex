#!/usr/bin/env python3
"""Propose Worship v2 template drafts from canonical Worship rows.

This script does not write by default. It summarizes repeated service
structures so humans can decide which service/section/element templates should
be promoted. Existing PPT-derived content remains reference material only.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from sync_worship_v2_taxonomy import read_config, request_json


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
    order_query = f"&order={quote(order, safe='.,')}" if order else ""
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


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def stable_slug(value: str) -> str:
    normalized = clean_text(value).lower()
    normalized = re.sub(r"[^0-9a-z가-힣]+", "_", normalized)
    return normalized.strip("_") or "untitled"


def element_type_label(element_type: str, section_title: str = "") -> str:
    labels = {
        "praise": "찬양",
        "scripture_reading": "성경봉독",
        "scripture_body": "성경 본문",
        "title_person": clean_text(section_title) or "제목 / 담당자",
        "body": "본문",
        "plain_text": "일반 텍스트",
        "blank": "빈 화면",
        "video": "영상",
        "image": "이미지",
        "ppt": "PPT",
        "pptx": "PPT",
        "pdf": "PDF",
    }
    return labels.get(clean_text(element_type), clean_text(element_type) or "요소")


def element_slot_key(element_type: str, section_title: str) -> str:
    kind = clean_text(element_type) or "plain_text"
    if kind == "title_person":
        return f"title_person:{stable_slug(section_title)}"
    return kind


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


def section_required(count: int, service_count: int) -> bool:
    if service_count <= 0:
        return False
    return count / service_count >= 0.7


def build_proposal(
    service_types: list[dict[str, Any]],
    services: list[dict[str, Any]],
    sections: list[dict[str, Any]],
    elements: list[dict[str, Any]],
    *,
    max_sections: int,
    min_frequency: float,
) -> dict[str, Any]:
    type_by_id = {row["id"]: row for row in service_types}
    service_by_id = {row["id"]: row for row in services}
    services_by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for service in services:
        services_by_type[service.get("service_type_id") or ""].append(service)

    section_by_id = {row["id"]: row for row in sections}
    sections_by_type: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for section in sections:
        service = service_by_id.get(section.get("service_id"))
        if not service:
            continue
        type_id = service.get("service_type_id") or ""
        title = clean_text(section.get("title") or section.get("section_key") or "Section")
        bucket = sections_by_type[type_id].setdefault(title, {
            "title": title,
            "count": 0,
            "service_ids": set(),
            "order_total": 0,
            "element_types": Counter(),
        })
        bucket["count"] += 1
        bucket["service_ids"].add(service.get("id"))
        bucket["order_total"] += int(section.get("sort_order") or 0)

    for element in elements:
        section = section_by_id.get(element.get("section_id"))
        if not section:
            continue
        service = service_by_id.get(section.get("service_id"))
        if not service:
            continue
        type_id = service.get("service_type_id") or ""
        title = clean_text(section.get("title") or section.get("section_key") or "Section")
        if title in sections_by_type[type_id]:
            sections_by_type[type_id][title]["element_types"][clean_text(element.get("element_type")) or "plain_text"] += 1

    service_templates = []
    for type_id, type_services in sorted(
        services_by_type.items(),
        key=lambda item: int(type_by_id.get(item[0], {}).get("sort_order") or 999),
    ):
        service_count = len(type_services)
        threshold = max(1, math.ceil(service_count * min_frequency))
        section_candidates = [
            data for data in sections_by_type[type_id].values()
            if len(data["service_ids"]) >= threshold
        ]
        section_candidates.sort(key=lambda data: (
            data["order_total"] / max(1, data["count"]),
            -data["count"],
            data["title"],
        ))
        section_templates = []
        for index, section in enumerate(section_candidates[:max_sections], start=1):
            service_coverage = len(section["service_ids"])
            element_slots = []
            for element_type, count in section["element_types"].most_common(5):
                element_slots.append({
                    "stable_key": f"element:{element_slot_key(element_type, section['title'])}",
                    "name": element_type_label(element_type, section["title"]),
                    "element_type": element_type,
                    "count": count,
                    "repeatable": element_type == "praise" or section["title"] in ("찬양", "기도"),
                    "flexible": not section_required(service_coverage, service_count),
                })
            section_templates.append({
                "stable_key": f"section:{stable_slug(section['title'])}",
                "name": section["title"],
                "sort_order": index * 100,
                "service_count": service_coverage,
                "occurrences": section["count"],
                "frequency": round(service_coverage / service_count, 3) if service_count else 0,
                "required": section_required(service_coverage, service_count),
                "repeatable": section["title"] in ("찬양", "기도", "통성기도"),
                "element_slots": element_slots,
            })

        type_row = type_by_id.get(type_id, {})
        service_templates.append({
            "stable_key": f"service:{type_id}",
            "name": type_row.get("display_name") or type_id,
            "service_type_id": type_id,
            "service_count": service_count,
            "section_templates": section_templates,
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "mindex_worship canonical rows",
        "counts": {
            "service_types": len(service_types),
            "services": len(services),
            "sections": len(sections),
            "elements": len(elements),
            "service_templates": len(service_templates),
            "section_templates": sum(len(item["section_templates"]) for item in service_templates),
        },
        "service_templates": service_templates,
    }


def existing_template_keys(supa_url: str, supa_key: str) -> set[tuple[str, int]]:
    rows = fetch_all(supa_url, supa_key, "mindex_worship_templates", select="stable_key,version")
    return {(clean_text(row.get("stable_key")), int(row.get("version") or 1)) for row in rows}


def draft_template_row(
    *,
    level: str,
    stable_key: str,
    name: str,
    service_type_id: str | None = None,
    element_type: str | None = None,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "template_level": level,
        "stable_key": stable_key,
        "version": 1,
        "name": name,
        "service_type_id": service_type_id,
        "parent_template_id": None,
        "element_type": element_type,
        "slide_type": None,
        "output_context": "auto",
        "is_active": False,
        "is_default": False,
        "description": "Draft from Worship v2 canonical patterns. Review before activation.",
        "config": config or {},
    }


def apply_draft_templates(supa_url: str, supa_key: str, proposal: dict[str, Any]) -> dict[str, Any]:
    if len(proposal["service_templates"]) != 1:
        raise RuntimeError("--apply-draft requires exactly one --service-type.")

    service_template = proposal["service_templates"][0]
    type_id = service_template["service_type_id"]
    service_key = f"draft:service:{type_id}"
    template_rows = [
        draft_template_row(
            level="service",
            stable_key=service_key,
            name=service_template["name"],
            service_type_id=type_id,
            config={
                "source": "canonical_pattern_proposal",
                "service_count": service_template["service_count"],
            },
        )
    ]

    section_keys: list[tuple[str, dict[str, Any]]] = []
    element_keys: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for section in service_template["section_templates"]:
        section_slug = stable_slug(section["name"])
        section_key = f"draft:section:{type_id}:{section_slug}"
        section_keys.append((section_key, section))
        template_rows.append(draft_template_row(
            level="section",
            stable_key=section_key,
            name=section["name"],
            service_type_id=type_id,
            config={
                "source": "canonical_pattern_proposal",
                "service_count": section["service_count"],
                "occurrences": section["occurrences"],
                "frequency": section["frequency"],
            },
        ))
        for element in section["element_slots"]:
            element_key = f"draft:element:{type_id}:{section_slug}:{stable_slug(element['stable_key'])}"
            element_keys.append((element_key, section, element))
            template_rows.append(draft_template_row(
                level="element",
                stable_key=element_key,
                name=element["name"],
                service_type_id=type_id,
                element_type=element["element_type"],
                config={
                    "source": "canonical_pattern_proposal",
                    "section": section["name"],
                    "count": element["count"],
                },
            ))

    existing = existing_template_keys(supa_url, supa_key)
    collisions = [row["stable_key"] for row in template_rows if (row["stable_key"], int(row["version"])) in existing]
    if collisions:
        raise RuntimeError(f"Draft template keys already exist: {', '.join(collisions[:8])}")

    inserted_templates = insert_rows(supa_url, supa_key, "mindex_worship_templates", template_rows)
    id_by_key = {row["stable_key"]: row["id"] for row in inserted_templates}
    item_rows: list[dict[str, Any]] = []
    service_template_id = id_by_key[service_key]

    for section_key, section in section_keys:
        item_rows.append({
            "template_id": service_template_id,
            "child_template_id": id_by_key[section_key],
            "sort_order": section["sort_order"],
            "slot_key": section_key,
            "default_title": section["name"],
            "default_person": "",
            "default_body": "",
            "required": bool(section["required"]),
            "flexible": not bool(section["required"]),
            "repeatable": bool(section["repeatable"]),
            "config": {
                "frequency": section["frequency"],
                "service_count": section["service_count"],
                "occurrences": section["occurrences"],
            },
        })

    element_index_by_section: Counter[str] = Counter()
    for element_key, section, element in element_keys:
        section_key = f"draft:section:{type_id}:{stable_slug(section['name'])}"
        element_index_by_section[section_key] += 1
        required = element["count"] >= max(1, math.ceil(section["service_count"] * 0.7))
        item_rows.append({
            "template_id": id_by_key[section_key],
            "child_template_id": id_by_key[element_key],
            "sort_order": element_index_by_section[section_key] * 100,
            "slot_key": element["stable_key"],
            "default_title": "",
            "default_person": "",
            "default_body": "",
            "required": required,
            "flexible": not required,
            "repeatable": bool(element["repeatable"]),
            "config": {
                "count": element["count"],
                "element_type": element["element_type"],
            },
        })

    inserted_items = insert_rows(supa_url, supa_key, "mindex_worship_template_items", item_rows)
    return {
        "service_type_id": type_id,
        "templates_inserted": len(inserted_templates),
        "template_items_inserted": len(inserted_items),
        "service_template_id": service_template_id,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Propose Worship v2 template drafts.")
    parser.add_argument("--service-type", help="Limit proposal to a v2 service_type_id such as sun_3rd or fri.")
    parser.add_argument("--max-sections", type=int, default=14, help="Maximum section slots per service template.")
    parser.add_argument("--min-frequency", type=float, default=0.25, help="Minimum service frequency for a section slot.")
    parser.add_argument("--apply-draft", action="store_true", help="Insert inactive draft template rows for one service type.")
    parser.add_argument("--json", action="store_true", help="Print full proposal JSON.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    type_query = f"&id=eq.{quote(args.service_type)}" if args.service_type else ""
    service_query = f"&service_type_id=eq.{quote(args.service_type)}" if args.service_type else ""
    service_types = fetch_all(supa_url, supa_key, "mindex_worship_service_types", query=type_query, order="sort_order.asc")
    services = fetch_all(supa_url, supa_key, "mindex_worship_services", query=service_query, order="service_date.asc,service_type_id.asc")
    sections = fetch_all(supa_url, supa_key, "mindex_worship_sections", order="service_id.asc,sort_order.asc")
    elements = fetch_all(supa_url, supa_key, "mindex_worship_elements", order="section_id.asc,sort_order.asc")
    if args.service_type:
        service_ids = {row["id"] for row in services}
        sections = [row for row in sections if row.get("service_id") in service_ids]
        section_ids = {row["id"] for row in sections}
        elements = [row for row in elements if row.get("section_id") in section_ids]

    proposal = build_proposal(
        service_types,
        services,
        sections,
        elements,
        max_sections=args.max_sections,
        min_frequency=args.min_frequency,
    )

    if args.apply_draft:
        applied = apply_draft_templates(supa_url, supa_key, proposal)
        print(json.dumps({"applied": applied, "proposal_counts": proposal["counts"]}, ensure_ascii=False, indent=2))
        return 0

    if args.json:
        print(json.dumps(proposal, ensure_ascii=False, indent=2))
        return 0

    print("Worship v2 template proposal")
    print(f"  services: {proposal['counts']['services']}")
    print(f"  sections: {proposal['counts']['sections']}")
    print(f"  elements: {proposal['counts']['elements']}")
    print(f"  service templates: {proposal['counts']['service_templates']}")
    print(f"  section templates: {proposal['counts']['section_templates']}")
    for template in proposal["service_templates"]:
        print(f"  - {template['name']}: {len(template['section_templates'])} sections from {template['service_count']} services")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
