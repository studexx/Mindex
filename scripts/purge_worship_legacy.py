#!/usr/bin/env python3
"""Backup and purge legacy Worship rows after Worship v2 staging.

Default mode is dry-run. `--apply` deletes legacy service items and services
only after verifying that all legacy services have import staging sources.
It never deletes Praise, Scripture, Activities, or v2 canonical Worship rows.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from sync_worship_v2_taxonomy import ENV_PATHS, read_config, read_env_file, request_json


ROOT = Path(__file__).resolve().parents[1]
BACKUP_DIR = ROOT / "backups"


def read_purge_config() -> tuple[str, str]:
    url = os.environ.get("MINDEX_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = (
        os.environ.get("MINDEX_SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    )
    if url and key:
        return url.rstrip("/"), key

    fallback_url = url
    for path in ENV_PATHS:
        values = read_env_file(path)
        fallback_url = fallback_url or values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL", "")
        key = values.get("MINDEX_SUPABASE_SERVICE_ROLE_KEY") or values.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        if fallback_url and key:
            return fallback_url.rstrip("/"), key

    return read_config()


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


def delete_by_in_filter(supa_url: str, supa_key: str, table: str, column: str, values: list[str]) -> int:
    deleted = 0
    for group in chunked(values):
        encoded = ",".join(group)
        request_json(
            supa_url,
            supa_key,
            table,
            method="DELETE",
            query=f"{column}=in.({encoded})",
            prefer="return=minimal",
        )
        deleted += len(group)
    return deleted


def patch_rows(supa_url: str, supa_key: str, table: str, rows: list[dict[str, Any]]) -> int:
    patched = 0
    for row in rows:
        row_id = row["id"]
        request_json(
            supa_url,
            supa_key,
            table,
            method="PATCH",
            query=f"id=eq.{quote(str(row_id), safe='')}",
            body={key: value for key, value in row.items() if key != "id"},
            prefer="return=minimal",
        )
        patched += 1
    return patched


def build_backup_payload(
    service_types: list[dict[str, Any]],
    services: list[dict[str, Any]],
    service_items: list[dict[str, Any]],
    import_sources: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scope": "legacy Worship service tables only",
        "tables": {
            "mindex_service_types": service_types,
            "mindex_services": services,
            "mindex_service_items": service_items,
            "mindex_worship_import_sources_for_legacy": import_sources,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Backup and purge legacy Worship service rows.")
    parser.add_argument("--apply", action="store_true", help="Actually delete legacy services/items.")
    parser.add_argument(
        "--reset-templates",
        action="store_true",
        help="Also clear legacy service type fixed_items/order_template.",
    )
    parser.add_argument("--backup", action="store_true", help="Write a JSON backup before applying.")
    parser.add_argument("--json", action="store_true", help="Print summary JSON.")
    args = parser.parse_args()

    supa_url, supa_key = read_purge_config()
    service_types = fetch_all(supa_url, supa_key, "mindex_service_types", order="sort_order.asc")
    services = fetch_all(supa_url, supa_key, "mindex_services", order="date.asc,type_id.asc")
    service_items = fetch_all(supa_url, supa_key, "mindex_service_items", order="service_id.asc,sort_order.asc")
    import_sources = fetch_all(
        supa_url,
        supa_key,
        "mindex_worship_import_sources",
        query="&source_kind=eq.legacy",
        order="service_date.asc,service_type_id.asc",
    )

    legacy_service_ids = {str(service.get("id") or "") for service in services if service.get("id")}
    staged_legacy_ids = {
        str((source.get("parse_report") or {}).get("legacy_service_id") or "")
        for source in import_sources
    }
    unstaged = sorted(legacy_service_ids - staged_legacy_ids)
    canonical_counts = {
        table: len(fetch_all(supa_url, supa_key, table, select="id"))
        for table in (
            "mindex_worship_services",
            "mindex_worship_sections",
            "mindex_worship_elements",
            "mindex_worship_slides",
        )
    }
    summary = {
        "legacy_service_types": len(service_types),
        "legacy_services": len(services),
        "legacy_service_items": len(service_items),
        "legacy_import_sources": len(import_sources),
        "unstaged_legacy_services": len(unstaged),
        "canonical_counts": canonical_counts,
        "will_delete_services": len(services) if args.apply else 0,
        "will_delete_service_items": len(service_items) if args.apply else 0,
        "will_reset_templates": bool(args.apply and args.reset_templates),
        "remaining_legacy_services": len(services),
        "remaining_legacy_service_items": len(service_items),
        "backup_path": "",
    }

    if unstaged:
        raise RuntimeError(f"Refusing purge: {len(unstaged)} legacy services are not staged.")

    if args.backup:
        BACKUP_DIR.mkdir(exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = BACKUP_DIR / f"worship-legacy-purge-{stamp}.json"
        backup_path.write_text(
            json.dumps(build_backup_payload(service_types, services, service_items, import_sources), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        summary["backup_path"] = str(backup_path)

    if args.apply:
        delete_by_in_filter(supa_url, supa_key, "mindex_service_items", "service_id", sorted(legacy_service_ids))
        delete_by_in_filter(supa_url, supa_key, "mindex_services", "id", sorted(legacy_service_ids))
        if args.reset_templates:
            patch_rows(
                supa_url,
                supa_key,
                "mindex_service_types",
                [{"id": row["id"], "fixed_items": [], "order_template": []} for row in service_types],
            )
        remaining_services = fetch_all(supa_url, supa_key, "mindex_services", select="id")
        remaining_items = fetch_all(supa_url, supa_key, "mindex_service_items", select="id")
        summary["remaining_legacy_services"] = len(remaining_services)
        summary["remaining_legacy_service_items"] = len(remaining_items)
        if remaining_services or remaining_items:
            raise RuntimeError(
                "Legacy Worship purge did not complete: "
                f"{len(remaining_services)} services and {len(remaining_items)} service items remain."
            )

    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print("Legacy Worship purge plan")
        print(f"  legacy service types: {summary['legacy_service_types']}")
        print(f"  legacy services: {summary['legacy_services']}")
        print(f"  legacy service items: {summary['legacy_service_items']}")
        print(f"  staged legacy import sources: {summary['legacy_import_sources']}")
        print(f"  unstaged legacy services: {summary['unstaged_legacy_services']}")
        print(f"  canonical v2 counts: {summary['canonical_counts']}")
        print(f"  remaining legacy services: {summary['remaining_legacy_services']}")
        print(f"  remaining legacy service items: {summary['remaining_legacy_service_items']}")
        if summary["backup_path"]:
            print(f"  backup: {summary['backup_path']}")
        print("  mode:", "APPLIED" if args.apply else "dry-run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
