#!/usr/bin/env python3
"""Sync legacy Worship service type taxonomy into Worship v2.

This copies only stable service-type taxonomy. It intentionally does not copy
legacy fixed_items or order_template content because those rows are PPT/import
residue and should be rebuilt as reviewed Worship v2 templates.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
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

SERVICE_TYPE_MAP = {
    "sunday-first": {
        "id": "sun_1st",
        "display_name": "주일예배 (1부)",
        "short_name": "1부",
        "group_key": "public",
        "chromakey_enabled": False,
    },
    "sunday-second": {
        "id": "sun_2nd",
        "display_name": "주일예배 (2부)",
        "short_name": "2부",
        "group_key": "public",
        "chromakey_enabled": True,
    },
    "sunday-main": {
        "id": "sun_3rd",
        "display_name": "주일예배 (3부)",
        "short_name": "3부",
        "group_key": "public",
        "chromakey_enabled": True,
    },
    "sunday-afternoon": {
        "id": "sun_pm",
        "display_name": "주일오후예배",
        "short_name": "오후",
        "group_key": "public",
        "chromakey_enabled": True,
    },
    "wednesday": {
        "id": "wed",
        "display_name": "수요예배",
        "short_name": "수요",
        "group_key": "public",
        "chromakey_enabled": True,
    },
    "friday": {
        "id": "fri",
        "display_name": "금요기도회",
        "short_name": "금요",
        "group_key": "public",
        "chromakey_enabled": False,
    },
    "monthly": {
        "id": "monthly",
        "display_name": "월삭예배",
        "short_name": "월삭",
        "group_key": "public",
        "chromakey_enabled": True,
    },
    "children": {
        "id": "children",
        "display_name": "어린이부 예배",
        "short_name": "어린이",
        "group_key": "ministry",
        "chromakey_enabled": False,
    },
    "youth": {
        "id": "youth",
        "display_name": "청소년부 예배",
        "short_name": "청소년",
        "group_key": "ministry",
        "chromakey_enabled": False,
    },
    "young-adult": {
        "id": "young_adult",
        "display_name": "청년부 예배",
        "short_name": "청년",
        "group_key": "ministry",
        "chromakey_enabled": False,
    },
    "holy-week-dawn": {
        "id": "holy_week_dawn",
        "display_name": "특별새벽기도회",
        "short_name": "특새",
        "group_key": "special",
        "chromakey_enabled": False,
    },
    "omer": {
        "id": "omer",
        "display_name": "오멜세기기도회",
        "short_name": "오멜",
        "group_key": "special",
        "chromakey_enabled": False,
    },
}


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
        os.environ.get("MINDEX_SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("MINDEX_SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )
    if url and key:
        return url.rstrip("/"), key

    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL", "")
        key = (
            values.get("MINDEX_SUPABASE_SERVICE_ROLE_KEY")
            or values.get("SUPABASE_SERVICE_ROLE_KEY")
            or values.get("MINDEX_SUPABASE_ANON_KEY")
            or values.get("SUPABASE_ANON_KEY")
            or values.get("SUPABASE_KEY")
            or ""
        )
        if url and key:
            return url.rstrip("/"), key

    raise RuntimeError("Supabase config not found for Mindex.")


def request_json(
    supa_url: str,
    supa_key: str,
    table: str,
    *,
    method: str = "GET",
    select: str = "*",
    body: Any = None,
    query: str = "",
    prefer: str = "",
) -> Any:
    url = f"{supa_url}/rest/v1/{table}"
    if method == "GET":
        url += f"?select={quote(select, safe='*,():')}{query}"
    elif query:
        url += f"?{query.lstrip('?')}"
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode()
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(req, timeout=30) as response:
            raw = response.read().decode()
            return json.loads(raw) if raw else None
    except HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"{method} {table} failed: {error.code} {detail}") from error


def fetch_legacy_types(supa_url: str, supa_key: str) -> list[dict[str, Any]]:
    return request_json(
        supa_url,
        supa_key,
        "mindex_service_types",
        select="id,name,sort_order",
        query="&order=sort_order.asc",
    )


def build_rows(legacy_types: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for legacy in legacy_types:
        legacy_id = str(legacy.get("id") or "")
        mapping = SERVICE_TYPE_MAP.get(legacy_id)
        if not mapping:
            continue
        output_context = "chromakey" if mapping["chromakey_enabled"] else "fullscreen"
        rows.append({
            "id": mapping["id"],
            "display_name": mapping["display_name"],
            "short_name": mapping["short_name"],
            "group_key": mapping["group_key"],
            "sort_order": legacy.get("sort_order") or 0,
            "is_active": True,
            "default_output_context": output_context,
            "chromakey_enabled": mapping["chromakey_enabled"],
            "config": {
                "legacy_service_type_id": legacy_id,
                "legacy_name": legacy.get("name") or "",
            },
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Worship v2 service type taxonomy.")
    parser.add_argument("--apply", action="store_true", help="Write rows to Supabase.")
    parser.add_argument("--json", action="store_true", help="Print planned rows as JSON.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    legacy_types = fetch_legacy_types(supa_url, supa_key)
    rows = build_rows(legacy_types)

    missing = sorted(
        str(row.get("id") or "")
        for row in legacy_types
        if str(row.get("id") or "") and str(row.get("id") or "") not in SERVICE_TYPE_MAP
    )
    if args.json:
        print(json.dumps({"rows": rows, "missing_legacy_type_ids": missing}, ensure_ascii=False, indent=2))
    else:
        print(f"Worship v2 taxonomy plan: {len(rows)} rows")
        for row in rows:
            print(
                f"  {row['sort_order']:>2} {row['id']:<16} "
                f"{row['display_name']} group={row['group_key']} output={row['default_output_context']}"
            )
        if missing:
            print(f"Missing mappings: {', '.join(missing)}")

    if not args.apply:
        print("Dry run only. Re-run with --apply to upsert.")
        return 0

    request_json(
        supa_url,
        supa_key,
        "mindex_worship_service_types",
        method="POST",
        body=rows,
        query="on_conflict=id",
        prefer="resolution=merge-duplicates,return=representation",
    )
    print(f"Applied {len(rows)} Worship v2 service type rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
