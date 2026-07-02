#!/usr/bin/env python3
"""Stage legacy Worship services into Worship v2 import review tables.

This does not create canonical Worship v2 services, sections, elements, or
slides. It writes only import sources/candidates so legacy PPT-derived material
can be reviewed before becoming Mindex-owned Worship data.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from sync_worship_v2_taxonomy import SERVICE_TYPE_MAP, read_config, request_json


ROOT = Path(__file__).resolve().parents[1]


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_memo(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    text = str(value or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {"text": text}
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def fetch_all(supa_url: str, supa_key: str, table: str, select: str = "*") -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    step = 1000
    while True:
        batch = request_json(
            supa_url,
            supa_key,
            table,
            select=select,
            query=f"&order=created_at.asc&limit={step}&offset={start}",
        )
        rows.extend(batch)
        if len(batch) < step:
            return rows
        start += step


def legacy_type_to_v2(type_id: str) -> str:
    mapping = SERVICE_TYPE_MAP.get(type_id)
    return str(mapping["id"]) if mapping else type_id


def infer_candidate_type(item: dict[str, Any]) -> str:
    label = clean_text(item.get("label"))
    title = clean_text(item.get("raw_title"))
    haystack = f"{label} {title}"
    if item.get("song_id"):
        return "praise"
    if re.search(r"성경|봉독|말씀", haystack):
        return "scripture_reading"
    if re.search(r"사도신경|신앙고백", haystack):
        return "body"
    if re.search(r"기도", haystack):
        return "title_person"
    if re.search(r"설교", haystack):
        return "title_person"
    if re.search(r"찬양|찬송|송영|특송|봉헌찬양|결단찬양|파송찬양", haystack):
        return "praise"
    if re.search(r"준비|폐회|묵도|교회소식|광고", haystack):
        return "plain_text"
    return "editable"


def item_normalized_title(item: dict[str, Any]) -> str:
    title = clean_text(item.get("raw_title"))
    if title:
        return title
    return clean_text(item.get("label"))


def build_source(service: dict[str, Any], item_count: int) -> dict[str, Any]:
    service_type_id = legacy_type_to_v2(str(service.get("type_id") or ""))
    service_date = str(service.get("date") or "")
    source_name = clean_text(f"{service_date} {service_type_id}")
    return {
        "source_kind": "legacy",
        "source_name": source_name,
        "source_path": "",
        "source_hash": f"legacy-service:{service.get('id')}",
        "service_type_id": service_type_id,
        "service_date": service_date or None,
        "status": "parsed",
        "raw_payload": {
            "legacy_service": service,
        },
        "parse_report": {
            "legacy_service_id": service.get("id"),
            "legacy_type_id": service.get("type_id"),
            "legacy_item_count": item_count,
        },
    }


def build_candidates(import_source_id: str, service: dict[str, Any], items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    service_title = clean_text(service.get("title")) or clean_text(f"{service.get('date')} {legacy_type_to_v2(str(service.get('type_id') or ''))}")
    candidates.append({
        "import_source_id": import_source_id,
        "sort_order": 0,
        "candidate_level": "service",
        "candidate_key": f"legacy-service:{service.get('id')}",
        "raw_label": clean_text(service.get("type_id")),
        "raw_title": service_title,
        "raw_body": clean_text(service.get("raw_text")),
        "normalized_label": legacy_type_to_v2(str(service.get("type_id") or "")),
        "normalized_title": service_title,
        "normalized_body": clean_text(service.get("raw_text")),
        "suggested_type": "worship_service",
        "confidence": 1,
        "review_status": "needs_review",
        "raw_payload": {"legacy_service": service},
        "normalized_payload": {
            "service_type_id": legacy_type_to_v2(str(service.get("type_id") or "")),
            "service_date": service.get("date"),
            "service_date_end": service.get("date_end"),
            "worship_leader": service.get("leader") or "",
            "tags": service.get("tags") or [],
            "source_kind": "legacy",
        },
        "notes": "Legacy service staged for Worship v2 review.",
    })

    for item in sorted(items, key=lambda row: row.get("sort_order") or 0):
        item_order = int(item.get("sort_order") or 0)
        memo = parse_memo(item.get("memo"))
        normalized_title = item_normalized_title(item)
        suggested_type = infer_candidate_type(item)
        candidates.append({
            "import_source_id": import_source_id,
            "sort_order": item_order * 100,
            "candidate_level": "element",
            "candidate_key": f"legacy-item:{item.get('id')}",
            "raw_label": clean_text(item.get("label")),
            "raw_title": clean_text(item.get("raw_title")),
            "raw_body": clean_text(memo.get("text")),
            "normalized_label": clean_text(item.get("label")),
            "normalized_title": normalized_title,
            "normalized_body": clean_text(memo.get("text")),
            "suggested_type": suggested_type,
            "suggested_song_id": item.get("song_id"),
            "confidence": 0.85 if item.get("song_id") else 0.45,
            "review_status": "matched" if item.get("song_id") else "needs_review",
            "raw_payload": {"legacy_item": item, "memo": memo},
            "normalized_payload": {
                "legacy_service_id": service.get("id"),
                "legacy_item_id": item.get("id"),
                "legacy_version_id": item.get("version_id"),
                "person": item.get("assignee") or "",
                "source_kind": "legacy",
            },
            "notes": "Legacy flat item staged as element candidate.",
        })

        slides = memo.get("slides") if isinstance(memo.get("slides"), list) else []
        for index, slide_text in enumerate(slides, start=1):
            body = clean_text(slide_text)
            candidates.append({
                "import_source_id": import_source_id,
                "sort_order": item_order * 100 + index,
                "candidate_level": "slide",
                "candidate_key": f"legacy-item:{item.get('id')}:slide:{index}",
                "raw_label": clean_text(item.get("label")),
                "raw_title": normalized_title,
                "raw_body": body,
                "normalized_label": clean_text(item.get("label")),
                "normalized_title": normalized_title,
                "normalized_body": body,
                "suggested_type": suggested_type,
                "suggested_song_id": item.get("song_id"),
                "confidence": 0.8 if item.get("song_id") else 0.4,
                "review_status": "matched" if item.get("song_id") else "needs_review",
                "raw_payload": {
                    "legacy_item_id": item.get("id"),
                    "slide_index": index,
                    "text": slide_text,
                },
                "normalized_payload": {
                    "legacy_service_id": service.get("id"),
                    "legacy_item_id": item.get("id"),
                    "legacy_slide_index": index,
                    "source_kind": "legacy",
                },
                "notes": "Legacy memo slide staged as slide candidate.",
            })
    return candidates


def existing_source_hashes(supa_url: str, supa_key: str) -> set[str]:
    rows = request_json(
        supa_url,
        supa_key,
        "mindex_worship_import_sources",
        select="source_hash",
        query="&source_kind=eq.legacy",
    )
    return {str(row.get("source_hash") or "") for row in rows}


def insert_rows(supa_url: str, supa_key: str, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    keys = sorted({key for row in rows for key in row})
    normalized_rows = [{key: row.get(key) for key in keys} for row in rows]
    return request_json(
        supa_url,
        supa_key,
        table,
        method="POST",
        body=normalized_rows,
        prefer="return=representation",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage legacy Worship rows into Worship v2 import review tables.")
    parser.add_argument("--apply", action="store_true", help="Insert import sources and candidates.")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of legacy services processed.")
    parser.add_argument("--service-id", default="", help="Stage only one legacy service id.")
    parser.add_argument("--json", action="store_true", help="Print dry-run plan as JSON.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    services = fetch_all(supa_url, supa_key, "mindex_services")
    items = fetch_all(supa_url, supa_key, "mindex_service_items")
    items_by_service: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        items_by_service[str(item.get("service_id") or "")].append(item)

    selected = [service for service in services if not args.service_id or service.get("id") == args.service_id]
    selected.sort(key=lambda row: (str(row.get("date") or ""), str(row.get("type_id") or "")))
    if args.limit:
        selected = selected[:args.limit]

    staged = []
    for service in selected:
        service_items = items_by_service.get(str(service.get("id") or ""), [])
        source = build_source(service, len(service_items))
        candidates = build_candidates("DRY_RUN_IMPORT_SOURCE_ID", service, service_items)
        staged.append({"source": source, "candidate_count": len(candidates), "candidates": candidates})

    summary = {
        "services": len(staged),
        "candidates": sum(row["candidate_count"] for row in staged),
        "candidate_levels": {},
    }
    for row in staged:
        for candidate in row["candidates"]:
            level = candidate["candidate_level"]
            summary["candidate_levels"][level] = summary["candidate_levels"].get(level, 0) + 1

    if args.json:
        print(json.dumps({"summary": summary, "staged": staged}, ensure_ascii=False, indent=2))
    else:
        print(f"Legacy Worship staging plan: {summary['services']} services, {summary['candidates']} candidates")
        print("Candidate levels:", ", ".join(f"{key}={value}" for key, value in sorted(summary["candidate_levels"].items())))
        for row in staged[:10]:
            source = row["source"]
            print(f"  {source['service_date']} {source['service_type_id']} candidates={row['candidate_count']}")
        if len(staged) > 10:
            print(f"  ... {len(staged) - 10} more services")

    if not args.apply:
        print("Dry run only. Re-run with --apply to insert import review rows.")
        return 0

    existing_hashes = existing_source_hashes(supa_url, supa_key)
    inserted_sources = 0
    inserted_candidates = 0
    skipped_sources = 0
    for row in staged:
        source = row["source"]
        if source["source_hash"] in existing_hashes:
            skipped_sources += 1
            continue
        inserted = insert_rows(supa_url, supa_key, "mindex_worship_import_sources", [source])
        import_source_id = inserted[0]["id"]
        candidates = build_candidates(import_source_id, source["raw_payload"]["legacy_service"], items_by_service.get(str(source["parse_report"]["legacy_service_id"]), []))
        insert_rows(supa_url, supa_key, "mindex_worship_import_candidates", candidates)
        inserted_sources += 1
        inserted_candidates += len(candidates)

    print(
        f"Applied legacy staging: sources={inserted_sources}, "
        f"candidates={inserted_candidates}, skipped_existing={skipped_sources}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
