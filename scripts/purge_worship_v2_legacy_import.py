#!/usr/bin/env python3
"""Backup and purge legacy/PPT-derived Worship v2 rows.

This intentionally leaves Praise, Scripture, Activities, and Worship service
type taxonomy alone. It removes imported Worship instances, import staging, and
inactive draft templates derived from the legacy import so Worship can be
rebuilt from Mindex-owned templates.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from purge_worship_legacy import read_purge_config
from sync_worship_v2_taxonomy import request_json


ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "backups"


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


def chunked(values: list[str], size: int = 80) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def delete_by_filter(supa_url: str, supa_key: str, table: str, query: str) -> None:
    request_json(
        supa_url,
        supa_key,
        table,
        method="DELETE",
        query=query,
        prefer="return=minimal",
    )


def delete_by_in_filter(supa_url: str, supa_key: str, table: str, column: str, values: list[str]) -> None:
    for group in chunked(values):
        encoded = ",".join(group)
        delete_by_filter(supa_url, supa_key, table, f"{column}=in.({encoded})")


def backup_payload(tables: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scope": "legacy/PPT-derived Worship v2 rows only",
        "tables": tables,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge legacy/PPT-derived Worship v2 rows.")
    parser.add_argument("--apply", action="store_true", help="Actually delete rows. Default is dry-run.")
    parser.add_argument("--backup", action="store_true", help="Write a JSON backup before applying.")
    parser.add_argument("--json", action="store_true", help="Print summary JSON.")
    args = parser.parse_args()

    supa_url, supa_key = read_purge_config()

    services = fetch_all(supa_url, supa_key, "mindex_worship_services", query="&source_kind=eq.legacy")
    service_ids = sorted(str(row["id"]) for row in services)
    sections = fetch_all(supa_url, supa_key, "mindex_worship_sections")
    sections = [row for row in sections if str(row.get("service_id")) in set(service_ids) or row.get("source_kind") == "legacy"]
    section_ids = {str(row["id"]) for row in sections}
    elements = fetch_all(supa_url, supa_key, "mindex_worship_elements")
    elements = [row for row in elements if str(row.get("section_id")) in section_ids or row.get("source_kind") == "legacy"]
    element_ids = {str(row["id"]) for row in elements}
    slides = fetch_all(supa_url, supa_key, "mindex_worship_slides")
    slides = [row for row in slides if str(row.get("element_id")) in element_ids or row.get("source_kind") == "legacy"]

    import_sources = fetch_all(supa_url, supa_key, "mindex_worship_import_sources", query="&source_kind=eq.legacy")
    import_source_ids = {str(row["id"]) for row in import_sources}
    import_candidates = fetch_all(supa_url, supa_key, "mindex_worship_import_candidates")
    import_candidates = [row for row in import_candidates if str(row.get("import_source_id")) in import_source_ids]
    import_mappings = fetch_all(supa_url, supa_key, "mindex_worship_import_mappings")
    import_mappings = [row for row in import_mappings if str(row.get("import_source_id")) in import_source_ids]

    templates = fetch_all(supa_url, supa_key, "mindex_worship_templates", query="&stable_key=like.draft:*")
    template_ids = {str(row["id"]) for row in templates}
    template_items = fetch_all(supa_url, supa_key, "mindex_worship_template_items")
    template_items = [
        row for row in template_items
        if str(row.get("template_id")) in template_ids or str(row.get("child_template_id")) in template_ids
    ]

    tables = {
        "mindex_worship_services": services,
        "mindex_worship_sections": sections,
        "mindex_worship_elements": elements,
        "mindex_worship_slides": slides,
        "mindex_worship_import_sources": import_sources,
        "mindex_worship_import_candidates": import_candidates,
        "mindex_worship_import_mappings": import_mappings,
        "mindex_worship_templates": templates,
        "mindex_worship_template_items": template_items,
    }
    summary = {
        "will_delete": {table: len(rows) for table, rows in tables.items()},
        "backup_path": "",
        "applied": False,
    }

    if args.backup:
        BACKUP_DIR.mkdir(exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = BACKUP_DIR / f"worship-v2-legacy-purge-{stamp}.json"
        backup_path.write_text(json.dumps(backup_payload(tables), ensure_ascii=False, indent=2), encoding="utf-8")
        summary["backup_path"] = str(backup_path)

    if args.apply:
        if template_items:
            delete_by_in_filter(supa_url, supa_key, "mindex_worship_template_items", "id", sorted(str(row["id"]) for row in template_items))
        if templates:
            delete_by_in_filter(supa_url, supa_key, "mindex_worship_templates", "id", sorted(template_ids))
        if service_ids:
            delete_by_in_filter(supa_url, supa_key, "mindex_worship_services", "id", service_ids)
        if import_source_ids:
            delete_by_in_filter(supa_url, supa_key, "mindex_worship_import_sources", "id", sorted(import_source_ids))
        remaining = {
            "legacy_services": len(fetch_all(supa_url, supa_key, "mindex_worship_services", select="id", query="&source_kind=eq.legacy")),
            "legacy_import_sources": len(fetch_all(supa_url, supa_key, "mindex_worship_import_sources", select="id", query="&source_kind=eq.legacy")),
            "draft_templates": len(fetch_all(supa_url, supa_key, "mindex_worship_templates", select="id", query="&stable_key=like.draft:*")),
        }
        summary["remaining"] = remaining
        summary["applied"] = True
        if any(remaining.values()):
            raise RuntimeError(f"Purge incomplete: {remaining}")

    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print("Worship v2 legacy purge plan")
        for table, count in summary["will_delete"].items():
            print(f"  {table}: {count}")
        if summary["backup_path"]:
            print(f"  backup: {summary['backup_path']}")
        print("  mode:", "APPLIED" if args.apply else "dry-run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
