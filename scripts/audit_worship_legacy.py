#!/usr/bin/env python3
"""Audit legacy Worship service rows before rebuilding Worship from imports.

This script intentionally stays inside the Worship domain:

- public.mindex_service_types
- public.mindex_services
- public.mindex_service_items

It does not read or mutate Praise, Scripture, Activities, References, or other
Mindex resource tables. The report separates rows with explicit PPT/import
evidence from the broader set of all current Worship service rows.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ENV_PATHS = (
    ROOT / ".env.supabase.local",
    ROOT / ".env.supabase",
    ROOT.parent / "INDEX" / ".env.supabase.local",
    ROOT.parent / "INDEX" / ".env.supabase",
    Path.home() / "Documents" / "INDEX" / ".env.supabase.local",
    Path.home() / "Documents" / "INDEX" / ".env.supabase",
)
PPT_IMPORT_RE = re.compile(
    r"(ppt|pptx|powerpoint|imported\s+skeleton|PPT\s*확인|ppt-sections|from\s+.+\.pptx)",
    re.IGNORECASE,
)


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def read_config() -> tuple[str, str]:
    url = os.environ.get("MINDEX_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = (
        os.environ.get("MINDEX_SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    )
    if url and key:
        return url.rstrip("/"), key

    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL", "")
        key = (
            values.get("MINDEX_SUPABASE_ANON_KEY")
            or values.get("SUPABASE_ANON_KEY")
            or values.get("SUPABASE_KEY")
            or values.get("SUPABASE_SERVICE_ROLE_KEY")
            or ""
        )
        if url and key:
            return url.rstrip("/"), key

    raise RuntimeError("Supabase config not found for Mindex.")


def fetch_rows(supa_url: str, supa_key: str, table: str, select: str = "*") -> list[dict[str, Any]]:
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
    rows: list[dict[str, Any]] = []
    start = 0
    step = 1000
    while True:
        req = Request(
            f"{supa_url}/rest/v1/{table}?select={quote(select, safe='*,():')}",
            headers={**headers, "Range": f"{start}-{start + step - 1}"},
        )
        with urlopen(req, timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < step:
            return rows
        start += step


def evidence_from_text(value: Any, label: str) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    else:
        text = str(value)
    return [label] if PPT_IMPORT_RE.search(text) else []


def service_evidence(service: dict[str, Any], items: list[dict[str, Any]]) -> list[str]:
    evidence: list[str] = []
    evidence.extend(evidence_from_text(service.get("tags"), "service.tags"))
    evidence.extend(evidence_from_text(service.get("raw_text"), "service.raw_text"))
    evidence.extend(evidence_from_text(service.get("title"), "service.title"))
    for item in items:
        item_id = item.get("id") or "item"
        evidence.extend(evidence_from_text(item.get("memo"), f"item.memo:{item_id}"))
        evidence.extend(evidence_from_text(item.get("raw_title"), f"item.raw_title:{item_id}"))
    return sorted(set(evidence))


def template_evidence(type_row: dict[str, Any]) -> list[str]:
    evidence: list[str] = []
    evidence.extend(evidence_from_text(type_row.get("fixed_items"), "service_type.fixed_items"))
    evidence.extend(evidence_from_text(type_row.get("order_template"), "service_type.order_template"))
    return sorted(set(evidence))


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def chunked(values: list[str], size: int = 80) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def delete_sql(service_ids: list[str], *, reset_templates: bool) -> str:
    lines = [
        "-- Dry-run output from scripts/audit_worship_legacy.py",
        "-- Review this SQL before running. It only targets Worship service tables.",
        "begin;",
    ]
    for group in chunked(service_ids):
        id_list = ", ".join(sql_string(value) for value in group)
        lines.append(f"delete from public.mindex_service_items where service_id in ({id_list});")
    for group in chunked(service_ids):
        id_list = ", ".join(sql_string(value) for value in group)
        lines.append(f"delete from public.mindex_services where id in ({id_list});")
    if reset_templates:
        lines.append("update public.mindex_service_types set fixed_items = '[]'::jsonb, order_template = '[]'::jsonb;")
    lines.append("-- commit;")
    lines.append("rollback;")
    return "\n".join(lines) + "\n"


def audit() -> dict[str, Any]:
    supa_url, supa_key = read_config()
    service_types = fetch_rows(supa_url, supa_key, "mindex_service_types")
    services = fetch_rows(supa_url, supa_key, "mindex_services")
    service_items = fetch_rows(supa_url, supa_key, "mindex_service_items")
    items_by_service: dict[str, list[dict[str, Any]]] = {}
    for item in service_items:
        items_by_service.setdefault(str(item.get("service_id") or ""), []).append(item)

    strict_services = []
    service_summaries = []
    for service in sorted(services, key=lambda row: (str(row.get("date") or ""), str(row.get("type_id") or ""))):
        service_id = str(service.get("id") or "")
        items = items_by_service.get(service_id, [])
        evidence = service_evidence(service, items)
        summary = {
            "id": service_id,
            "type_id": service.get("type_id"),
            "date": service.get("date"),
            "date_end": service.get("date_end"),
            "title": service.get("title"),
            "item_count": len(items),
            "evidence": evidence,
        }
        service_summaries.append(summary)
        if evidence:
            strict_services.append(summary)

    template_summaries = []
    for type_row in sorted(service_types, key=lambda row: str(row.get("id") or "")):
        evidence = template_evidence(type_row)
        fixed_items = type_row.get("fixed_items") if isinstance(type_row.get("fixed_items"), list) else []
        order_template = type_row.get("order_template") if isinstance(type_row.get("order_template"), list) else []
        template_summaries.append({
            "id": type_row.get("id"),
            "name": type_row.get("name"),
            "fixed_items_count": len(fixed_items),
            "order_template_count": len(order_template),
            "evidence": evidence,
        })

    strict_ids = [row["id"] for row in strict_services]
    all_ids = [str(row.get("id") or "") for row in services if row.get("id")]
    return {
        "domain": "worship",
        "tables_scanned": ["mindex_service_types", "mindex_services", "mindex_service_items"],
        "tables_not_scanned": ["mindex_songs", "mindex_song_versions", "mindex_scriptures", "mindex_bible_*", "activities", "references"],
        "counts": {
            "service_types": len(service_types),
            "services": len(services),
            "service_items": len(service_items),
            "strict_ppt_services": len(strict_services),
            "all_worship_services": len(all_ids),
            "service_types_with_template_evidence": sum(1 for row in template_summaries if row["evidence"]),
        },
        "strict_ppt_services": strict_services,
        "all_worship_services": service_summaries,
        "service_type_templates": template_summaries,
        "delete_plan": {
            "strict_ppt_service_ids": strict_ids,
            "all_worship_service_ids": all_ids,
            "reset_service_type_templates": True,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit PPT-derived legacy Worship rows.")
    parser.add_argument("--json", action="store_true", help="Print full JSON report.")
    parser.add_argument(
        "--delete-sql",
        choices=("strict", "all"),
        help="Print rollback-protected SQL for strict PPT services or all Worship services.",
    )
    parser.add_argument("--no-reset-templates", action="store_true", help="Do not include service_type template reset SQL.")
    args = parser.parse_args()

    report = audit()
    if args.delete_sql:
        key = "strict_ppt_service_ids" if args.delete_sql == "strict" else "all_worship_service_ids"
        print(delete_sql(report["delete_plan"][key], reset_templates=not args.no_reset_templates))
        return 0

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    counts = report["counts"]
    print("Worship legacy audit")
    print(f"  tables: {', '.join(report['tables_scanned'])}")
    print(f"  service_types: {counts['service_types']}")
    print(f"  services: {counts['services']}")
    print(f"  service_items: {counts['service_items']}")
    print(f"  strict PPT/import services: {counts['strict_ppt_services']}")
    print(f"  service types with PPT/import template evidence: {counts['service_types_with_template_evidence']}")
    print()
    print("Strict PPT/import service samples:")
    for row in report["strict_ppt_services"][:20]:
        print(
            f"  {row['date']} {row['type_id']} items={row['item_count']} "
            f"evidence={','.join(row['evidence'])}"
        )
    if len(report["strict_ppt_services"]) > 20:
        print(f"  ... {len(report['strict_ppt_services']) - 20} more")
    print()
    print("Use --json for full report or --delete-sql strict/all for rollback-protected SQL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
