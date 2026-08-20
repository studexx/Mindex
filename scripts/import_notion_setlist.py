#!/usr/bin/env python3
"""
Import formatted Notion setlist text into Supabase worship tables.

Usage:
  python3 scripts/import_notion_setlist.py <path/to/text>
  python3 scripts/import_notion_setlist.py <path/to/text> --apply

Dry-run is default. Use --apply to write data.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from sys import path as _sys_path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

_sys_path.insert(0, str(Path(__file__).resolve().parent))
import parse_setlists  # type: ignore


ENV_PATHS = (
    Path(__file__).resolve().parents[1] / ".env.supabase.local",
    Path(__file__).resolve().parents[1] / ".env.supabase",
)


SERVICE_LABELS_BY_ID = {
    item["id"]: item["name"]
    for item in parse_setlists.SERVICE_TYPES
}
SECTION_KEY_BY_LABEL = {
    "파송": "sending",
    "폐회": "closing_visual",
    "봉헌": "offering",
    "특송": "special_song",
    "2부 특송": "special_song",
    "3부 특송": "special_song",
    "결단": "response_song",
    "찬양": "praise",
    "기도": "prayer",
}
SERVICE_TYPE_ID_CANDIDATES = {
    "sunday-first": ("sun_1st", "sunday-first"),
    "sunday-second": ("sun_2nd", "sunday-second"),
    "sunday-main": ("sun_3rd", "sunday-main"),
    "sunday-afternoon": ("sunday-afternoon",),
    "wednesday": ("wed", "wednesday"),
    "friday": ("fri", "friday"),
    "monthly": ("monthly",),
    "holy-week-dawn": ("holy_week_dawn", "holy-week-dawn"),
    "omer": ("omer",),
    "special": ("special",),
    "children": ("children",),
    "youth": ("youth",),
    "young-adult": ("young_adult", "young-adult"),
}


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    data: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip("\"'")
    return data


def read_config() -> tuple[str, str]:
    env: dict[str, str] = {}
    for p in ENV_PATHS:
        env.update(_read_env_file(p))

    url = env.get("MINDEX_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = (
        env.get("MINDEX_SUPABASE_ANON_KEY")
        or env.get("SUPABASE_ANON_KEY")
        or env.get("SUPABASE_KEY")
        or env.get("SUPABASE_SERVICE_ROLE_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Supabase config not found. Set MINDEX_SUPABASE_URL and "
            "MINDEX_SUPABASE_ANON_KEY in .env.supabase.local/.env.supabase."
        )
    return url.rstrip("/"), key


def _api_request(
    base_url: str,
    key: str,
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    body: Any | None = None,
    prefer: str | None = None,
) -> Any:
    url = f"{base_url}/rest/v1/{path}"
    if query:
        params = [f"{k}={quote(str(v), safe=',()')}" for k, v in query.items()]
        url = f"{url}?{'&'.join(params)}"

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    if method in {"POST", "PATCH", "PUT", "DELETE"}:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer

    request_data = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(url, data=request_data, headers=headers, method=method)

    try:
        with urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            if not payload:
                return {}
            return json.loads(payload)
    except HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed: {err.code} {detail}") from err


def normalize_label(raw_label: str | None) -> str | None:
    if not raw_label:
        return None
    if raw_label == "—":
        return None
    text = raw_label.strip()
    text = re.sub(r"\([^)]*\)$", "", text).strip()
    text = re.sub(r"\(\d+\)$", "", text).strip()
    if text.startswith("기도"):
        text = "기도"
    return text or None


def section_key_for_label(raw_label: str | None) -> str:
    normalized = normalize_label(raw_label) or ""
    if not normalized:
        return ""
    return SECTION_KEY_BY_LABEL.get(normalized, normalized)


def service_title_for_type(type_id: str, fallback: str) -> str:
    if type_id == "special":
        return fallback
    return SERVICE_LABELS_BY_ID.get(type_id, fallback)


@dataclass
class PlannedSection:
    title: str
    section_key: str
    items: list[dict[str, Any]]


@dataclass
class ServiceImportPlan:
    service_row: dict[str, Any]
    sections: list[PlannedSection]
    source_id: tuple[str, date, date | None]


def service_plan_signature(plan: ServiceImportPlan) -> str:
    payload = {
        "service_row": plan.service_row,
        "sections": [
            {
                "title": section.title,
                "section_key": section.section_key,
                "items": section.items,
            }
            for section in plan.sections
        ],
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)


def deduplicate_service_plans(plans: list[ServiceImportPlan]) -> list[ServiceImportPlan]:
    unique: list[ServiceImportPlan] = []
    by_source_id: dict[tuple[str, date, date | None], ServiceImportPlan] = {}
    conflicts: list[tuple[str, date, date | None]] = []

    for plan in plans:
        existing = by_source_id.get(plan.source_id)
        if existing is None:
            by_source_id[plan.source_id] = plan
            unique.append(plan)
            continue
        if service_plan_signature(existing) != service_plan_signature(plan):
            conflicts.append(plan.source_id)

    if conflicts:
        labels = [
            f"{type_id} {svc_date.isoformat()}"
            + (f"~{svc_end.isoformat()}" if svc_end else "")
            for type_id, svc_date, svc_end in conflicts
        ]
        raise ValueError(
            "같은 예배 종류/날짜에 서로 다른 원문이 있습니다: " + ", ".join(labels)
        )
    return unique


def resolve_service_type_ids(
    plans: list[ServiceImportPlan],
    available_ids: set[str],
) -> dict[str, str]:
    resolved: dict[str, str] = {}
    missing: list[str] = []
    for type_id in sorted({plan.source_id[0] for plan in plans}):
        candidates = SERVICE_TYPE_ID_CANDIDATES.get(type_id, (type_id,))
        matched = next((candidate for candidate in candidates if candidate in available_ids), None)
        if matched:
            resolved[type_id] = matched
        else:
            missing.append(f"{type_id} ({', '.join(candidates)})")
    if missing:
        raise ValueError("DB에서 예배 종류 ID를 찾지 못했습니다: " + "; ".join(missing))
    return resolved


def fetch_service_type_ids(base_url: str, key: str) -> set[str]:
    rows = _api_request(
        base_url,
        key,
        "GET",
        "mindex_worship_service_types",
        {"select": "id"},
    )
    return {
        str(row.get("id") or "").strip()
        for row in rows
        if isinstance(row, dict) and str(row.get("id") or "").strip()
    }


def build_service_plans(
    parsed_sections: list[dict[str, Any]],
    source_path: str,
    source_name: str,
) -> list[ServiceImportPlan]:
    plans: list[ServiceImportPlan] = []

    for section in parsed_sections:
        type_id = str(section.get("type_id") or "").strip()
        section_name = str(section.get("name") or "")
        fixed_items = list(section.get("fixed_items") or [])

        for svc in section.get("services", []):
            svc_date: date = svc["date"]
            svc_end: date | None = svc.get("date_end")
            leader = (svc.get("leader") or "").strip()
            tags = [str(t).strip() for t in (svc.get("tags") or []) if str(t).strip()]
            raw_items = list(svc.get("items") or [])

            # section title/body builder
            sections: list[PlannedSection] = []
            index_by_label: dict[str, int] = {}

            def get_section(label: str) -> PlannedSection:
                if label in index_by_label:
                    return sections[index_by_label[label]]
                idx = len(sections)
                planned = PlannedSection(title=label, section_key=section_key_for_label(label), items=[])
                sections.append(planned)
                index_by_label[label] = idx
                return planned

            # Fixed roles are resolved to the value active on this service date.
            for fixed in fixed_items:
                resolved_fixed = parse_setlists.fixed_item_for_date(fixed, svc_date)
                fixed_label = normalize_label(resolved_fixed.get("label")) or str(resolved_fixed.get("label") or "기타")
                fixed_title = str(resolved_fixed.get("raw_title") or "").strip()
                if not fixed_title or fixed_title == "-":
                    continue
                sec = get_section(fixed_label)
                sec.items.append({"label": fixed_label, "title": fixed_title})

            for item in raw_items:
                raw_label = item.get("label")
                raw_title = (item.get("raw_title") or "").strip()
                if not raw_title or raw_title == "-":
                    continue

                if raw_label is None:
                    get_section("찬양").items.append({"label": "찬양", "title": raw_title})
                    continue

                if raw_label == "—":
                    continue

                normalized = normalize_label(raw_label) or str(raw_label).strip()
                get_section(normalized).items.append({
                    "label": str(raw_label).strip(),
                    "title": raw_title,
                })

            service_title = service_title_for_type(type_id, section_name)
            alias = ",".join(tags)

            service_row = {
                "service_type_id": type_id,
                "service_date": svc_date.isoformat(),
                "service_date_end": None if svc_end is None else svc_end.isoformat(),
                "title": service_title,
                "service_alias": alias,
                "status": "draft",
                "worship_leader": leader,
                "praise_leader": "",
                "template_id": None,
                "template_modified": False,
                "source_kind": "import",
                "source_ref": {
                    "created_from": "notion",
                    "source_path": source_path,
                    "source_name": source_name,
                },
                "notes": "",
            }

            plans.append(
                ServiceImportPlan(
                    service_row=service_row,
                    sections=sections,
                    source_id=(type_id, svc_date, svc_end),
                )
            )

    return plans


def get_existing_service_id(
    base_url: str,
    key: str,
    service_type_id: str,
    svc_date: date,
    svc_end: date | None,
) -> str | None:
    query = {
        "select": "id",
        "service_type_id": f"eq.{service_type_id}",
        "service_date": f"eq.{svc_date.isoformat()}",
    }
    if svc_end is None:
        query["service_date_end"] = "is.null"
    else:
        query["service_date_end"] = f"eq.{svc_end.isoformat()}"
    rows = _api_request(base_url, key, "GET", "mindex_worship_services", query)
    if isinstance(rows, list) and rows:
        return rows[0].get("id")
    return None


def apply_plans(base_url: str, key: str, plans: list[ServiceImportPlan], overwrite: bool = False) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    service_type_ids = resolve_service_type_ids(plans, fetch_service_type_ids(base_url, key))

    for plan in plans:
        svc_type, svc_date, svc_end = plan.source_id
        db_svc_type = service_type_ids[svc_type]
        existing = get_existing_service_id(base_url, key, db_svc_type, svc_date, svc_end)

        if existing and not overwrite:
            results.append({
                "status": "skipped",
                "reason": "already exists",
                "service_type_id": db_svc_type,
                "service_date": svc_date.isoformat(),
                "service_date_end": svc_end.isoformat() if svc_end else None,
                "service_id": existing,
            })
            continue

        if existing and overwrite:
            _api_request(
                base_url,
                key,
                "DELETE",
                "mindex_worship_services",
                query={"id": f"eq.{existing}"},
                prefer="return=minimal",
            )

        service_row = {**plan.service_row, "service_type_id": db_svc_type}
        inserted_service = _api_request(
            base_url,
            key,
            "POST",
            "mindex_worship_services",
            query={"select": "id,title"},
            body=[service_row],
            prefer="return=representation",
        )
        if not isinstance(inserted_service, list) or not inserted_service:
            raise RuntimeError(f"서비스 저장 실패: {svc_type} {svc_date}")

        service_id = inserted_service[0]["id"]

        section_id_by_order: dict[int, str] = {}
        for idx, section in enumerate(plan.sections):
            section_row = {
                "service_id": service_id,
                "sort_order": idx + 1,
                "section_key": section.section_key,
                "title": section.title,
                "person": "",
                "template_id": None,
                "template_modified": False,
                "source_kind": "import",
                "source_ref": {
                    "created_from": "notion",
                },
                "config": {},
            }
            inserted_sections = _api_request(
                base_url,
                key,
                "POST",
                "mindex_worship_sections",
                query={"select": "id"},
                body=[section_row],
                prefer="return=representation",
            )
            section_id_by_order[idx] = inserted_sections[0]["id"]

        element_rows: list[dict[str, Any]] = []
        for idx, section in enumerate(plan.sections):
            sec_id = section_id_by_order.get(idx)
            if not sec_id:
                continue
            for item_idx, item in enumerate(section.items, start=1):
                title = str(item.get("title") or "").strip()
                element_rows.append(
                    {
                        "section_id": sec_id,
                        "sort_order": item_idx,
                        "element_type": "praise",
                        "title": title,
                        "person": "",
                        "body": "",
                        "song_id": None,
                        "song_version_id": None,
                        "scripture_id": None,
                        "scripture_reference": "",
                        "asset": {"url": "", "kind": "", "name": ""},
                        # The DB enum stores praise modes as praise_db. The
                        # specific direct-entry mode lives in config/state.
                        "input_mode": "praise_db",
                        "content_state": {
                            "state": "filled" if title else "missing",
                            "reason": "import_payload",
                            "required": False,
                            "inputMode": "manual_praise",
                            "elementType": "praise",
                        },
                        "template_id": None,
                        "template_modified": False,
                        "source_kind": "import",
                        "source_ref": {
                            "created_from": "notion",
                            "section": section.title,
                            "label": str(item.get("label") or section.title).strip(),
                        },
                        "review_status": "draft",
                        "config": {
                            "inputMode": "manual_praise",
                            "outputMode": "lyrics",
                            "elementType": "praise",
                        },
                    }
                )

        if element_rows:
            _api_request(
                base_url,
                key,
                "POST",
                "mindex_worship_elements",
                query={"select": "id"},
                body=element_rows,
                prefer="return=representation",
            )

        results.append(
            {
                "status": "inserted",
                "service_type_id": db_svc_type,
                "service_date": svc_date.isoformat(),
                "service_date_end": svc_end.isoformat() if svc_end else None,
                "service_id": service_id,
                "sections": len(plan.sections),
            }
        )

    return results


def summarize(plans: list[ServiceImportPlan]) -> None:
    service_count = len(plans)
    section_count = sum(len(plan.sections) for plan in plans)
    item_count = sum(sum(len(sec.items) for sec in plan.sections) for plan in plans)
    print(f"총 서비스: {service_count}")
    print(f"총 섹션: {section_count}")
    print(f"총 항목: {item_count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path", help="Notion 붙여넣기 텍스트 파일 경로")
    parser.add_argument("--apply", action="store_true", help="DB 반영")
    parser.add_argument("--overwrite", action="store_true", help="기존 동일 타입/날짜면 덮어쓰기")
    parser.add_argument("--source-name", default="2026 찬양 콘티", help="source_ref에 남길 이름")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    source_path = str(Path(args.input_path).resolve())
    text = Path(args.input_path).read_text(encoding="utf-8")
    parsed_sections = parse_setlists.parse_text(text)

    raw_plans = build_service_plans(parsed_sections, source_path=source_path, source_name=args.source_name)
    try:
        plans = deduplicate_service_plans(raw_plans)
    except ValueError as err:
        summarize(raw_plans)
        raise SystemExit(f"검증 실패: {err}") from err
    summarize(plans)
    duplicate_count = len(raw_plans) - len(plans)
    if duplicate_count:
        print(f"동일 중복 제외: {duplicate_count}")

    if not args.apply:
        print("DRY-RUN: DB 반영하지 않았습니다.")
        return

    base_url, key = read_config()
    results = apply_plans(base_url, key, plans, overwrite=args.overwrite)
    print("\n적용 결과")
    for row in results:
        print(json.dumps(row, ensure_ascii=False))


if __name__ == "__main__":
    main()
