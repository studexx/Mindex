#!/usr/bin/env python3
"""Resolve the read-only Mindex source data needed for YouTube live scheduling."""
from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ENV_PATHS = (
    ROOT / ".env.supabase.local",
    ROOT / ".env.supabase",
)
KST = timezone(timedelta(hours=9))
SERVICE_TYPE = "sunday-main"
START_TIME = time(10, 45)
REQUIRED_FIELDS = ("sermonTitle", "passage", "preacher")
DEFAULT_STATE_DIR = ROOT / "output" / "youtube-live-source"
DEFAULT_PREACHER = "김남영 위임목사"
DEFAULT_PREACHER_ALIASES = {"김남영목사", "김남영위임목사"}
SUNDAY_MAIN_SERVICE_TYPE_IDS = ("sun_3rd", "sunday-main")


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    anon_key: str


class RestClient:
    def __init__(self, config: SupabaseConfig):
        self.url = config.url.rstrip("/")
        self.headers = {
            "apikey": config.anon_key,
            "Authorization": f"Bearer {config.anon_key}",
            "Accept": "application/json",
        }

    def get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        query = urlencode(params, safe="*,.():-")
        request = Request(f"{self.url}/rest/v1/{table}?{query}", headers=self.headers)
        try:
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode() or "[]")
        except HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"GET {table} failed ({error.code}): {detail}") from error

    def rpc(self, name: str, payload: dict[str, Any]) -> Any:
        data = json.dumps(payload).encode("utf-8")
        request = Request(
            f"{self.url}/rest/v1/rpc/{name}",
            data=data,
            headers={
                **self.headers,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode() or "null")
        except HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"RPC {name} failed ({error.code}): {detail}") from error


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def read_config() -> SupabaseConfig:
    values: dict[str, str] = {}
    for path in ENV_PATHS:
        values.update(read_env_file(path))
    values.update(os.environ)

    url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL") or ""
    anon_key = (
        values.get("MINDEX_SUPABASE_ANON_KEY")
        or values.get("SUPABASE_ANON_KEY")
        or values.get("SUPABASE_KEY")
        or ""
    )
    if not url or not anon_key:
        raise RuntimeError("Supabase anon config not found.")
    return SupabaseConfig(url=url, anon_key=anon_key)


def parse_date(raw: str) -> date:
    return datetime.strptime(raw, "%Y-%m-%d").date()


def this_or_next_sunday(today: date, weeks: int = 0) -> date:
    days_until_sunday = (6 - today.weekday()) % 7
    return today + timedelta(days=days_until_sunday + weeks * 7)


def target_date_from_args(raw_date: str | None, weeks: int, now: datetime | None = None) -> date:
    if raw_date:
        return parse_date(raw_date)
    base = (now or datetime.now(KST)).astimezone(KST).date()
    return this_or_next_sunday(base, weeks)


def today_from_args(raw_date: str | None, now: datetime | None = None) -> date:
    if raw_date:
        return parse_date(raw_date)
    return (now or datetime.now(KST)).astimezone(KST).date()


def scheduled_start_at(service_date: date) -> str:
    return datetime.combine(service_date, START_TIME, tzinfo=KST).isoformat()


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def preacher_key(value: Any) -> str:
    return "".join(ch for ch in clean_text(value).lower() if ch.isalnum())


def is_default_preacher_alias(value: Any) -> bool:
    return preacher_key(value) in DEFAULT_PREACHER_ALIASES


def is_title_fragment_assignee(assignee: Any, title: Any) -> bool:
    assignee_key = preacher_key(assignee)
    title_key = preacher_key(title)
    assignee_text = clean_text(assignee)
    return (
        assignee_text.startswith(("\"", "'", "“", "”", "‘", "’"))
        or (
            title_key != ""
            and len(assignee_key) >= 2
            and (assignee_key in title_key or title_key in assignee_key)
        )
    )


def preacher_from_assignee(assignee: Any, title: Any) -> tuple[str, str, list[dict[str, str]]]:
    assignee_text = clean_text(assignee)
    if not assignee_text or is_default_preacher_alias(assignee_text):
        return DEFAULT_PREACHER, "default_senior_pastor", []
    if is_title_fragment_assignee(assignee_text, title):
        return DEFAULT_PREACHER, "default_senior_pastor", [
            {"code": "ignored_sermon_assignee", "value": assignee_text}
        ]
    return assignee_text, "sermon_assignee", []


def first_text(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = clean_text(row.get(key))
        if value:
            return value
    return ""


def retry_marker_path(state_dir: Path, service_date: date) -> Path:
    return state_dir / f"{service_date.isoformat()}.retry.json"


def has_retry_marker(state_dir: Path, service_date: date) -> bool:
    return retry_marker_path(state_dir, service_date).exists()


def write_retry_marker(state_dir: Path, service_date: date, result: dict[str, Any]) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    marker = {
        "date": service_date.isoformat(),
        "createdAt": datetime.now(KST).isoformat(),
        "missing": result.get("missing", []),
    }
    retry_marker_path(state_dir, service_date).write_text(
        json.dumps(marker, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def clear_retry_marker(state_dir: Path, service_date: date) -> None:
    retry_marker_path(state_dir, service_date).unlink(missing_ok=True)


def build_source_payload(
    service_date: date,
    service_id: Any,
    sermon_title: Any,
    passage: Any,
    preacher: Any,
    preacher_source: Any,
    warnings: list[dict[str, Any]] | None = None,
    service_type: str = SERVICE_TYPE,
) -> dict[str, Any]:
    service_date_text = service_date.isoformat()
    sermon_title_text = clean_text(sermon_title)
    passage_text = clean_text(passage)
    preacher_text = clean_text(preacher)
    missing = []
    if not sermon_title_text:
        missing.append("sermonTitle")
    if not passage_text:
        missing.append("passage")
    if not preacher_text:
        missing.append("preacher")
    return {
        "ready": len(missing) == 0,
        "serviceType": service_type,
        "date": service_date_text,
        "serviceDate": service_date_text,
        "timezone": "UTC+09:00",
        "startTime": START_TIME.isoformat(),
        "scheduledStartTime": scheduled_start_at(service_date),
        "sermonTitle": sermon_title_text,
        "passage": passage_text,
        "preacher": preacher_text,
        "preacherSource": clean_text(preacher_source),
        "serviceId": service_id,
        "missing": missing,
        "warnings": warnings or [],
    }


def resolve_live_source_from_worship_tables(
    client: RestClient,
    service_date: date,
    service_type: str = SERVICE_TYPE,
) -> dict[str, Any]:
    date_text = service_date.isoformat()
    warnings: list[dict[str, Any]] = [{"code": "used_worship_table_fallback"}]
    services = client.get(
        "mindex_worship_services",
        {
            "select": "id,service_date,service_type_id,title,worship_leader,created_at",
            "service_date": f"eq.{date_text}",
            "order": "created_at.asc",
        },
    )
    matching_services = [
        service
        for service in services
        if service.get("service_type_id") in SUNDAY_MAIN_SERVICE_TYPE_IDS
    ]
    if len(matching_services) > 1:
        warnings.append({"code": "multiple_services", "count": len(matching_services)})
    service = matching_services[0] if matching_services else None
    if not service:
        warnings.append({"code": "service_not_found"})
        return build_source_payload(
            service_date,
            None,
            "",
            "",
            DEFAULT_PREACHER,
            "default_senior_pastor",
            warnings,
            service_type,
        )

    service_id = service["id"]
    sections = client.get(
        "mindex_worship_sections",
        {
            "select": "id,section_key,title,person,sort_order",
            "service_id": f"eq.{service_id}",
            "order": "sort_order.asc",
        },
    )
    section_map = {section["id"]: section for section in sections}
    elements: list[dict[str, Any]] = []
    for section in sections:
        elements.extend(
            client.get(
                "mindex_worship_elements",
                {
                    "select": "id,section_id,element_type,title,body,scripture_reference,person,sort_order",
                    "section_id": f"eq.{section['id']}",
                    "order": "sort_order.asc",
                },
            )
        )

    passage = ""
    for element in elements:
        section = section_map.get(element.get("section_id"), {})
        if (
            section.get("section_key") in ("scripture", "scripture_reading")
            or clean_text(section.get("title")) == "성경봉독"
            or element.get("element_type") in ("scripture_reading", "scripture_body")
        ):
            passage = first_text(element, "scripture_reference", "title", "body")
            if passage:
                break

    sermon_title = ""
    sermon_assignee = ""
    for element in elements:
        section = section_map.get(element.get("section_id"), {})
        if not (
            section.get("section_key") == "sermon"
            or clean_text(section.get("title")) == "설교"
        ):
            continue
        sermon_title = first_text(element, "title") or first_text(section, "title")
        sermon_assignee = first_text(element, "person") or first_text(section, "person")
        break

    preacher, preacher_source, preacher_warnings = preacher_from_assignee(
        sermon_assignee,
        sermon_title,
    )
    warnings.extend(preacher_warnings)
    return build_source_payload(
        service_date,
        service_id,
        sermon_title,
        passage,
        preacher,
        preacher_source,
        warnings,
        service_type,
    )


def should_try_worship_table_fallback(result: dict[str, Any]) -> bool:
    if result.get("ready"):
        return False
    missing = set(result.get("missing") or [])
    warning_codes = {warning.get("code") for warning in result.get("warnings") or []}
    return bool(missing.intersection({"sermonTitle", "passage"})) or "service_not_found" in warning_codes


def resolve_live_source(
    client: RestClient,
    service_date: date,
    service_type: str = SERVICE_TYPE,
) -> dict[str, Any]:
    date_text = service_date.isoformat()
    raw_result = client.rpc("get_youtube_live_source", {"service_date": date_text})
    if isinstance(raw_result, list):
        if not raw_result:
            raise RuntimeError("RPC get_youtube_live_source returned no rows.")
        raw_result = raw_result[0]
    if not isinstance(raw_result, dict):
        raise RuntimeError("RPC get_youtube_live_source returned an unexpected payload.")

    service_date_text = clean_text(raw_result.get("serviceDate") or raw_result.get("date") or date_text)
    warnings = raw_result.get("warnings") or []
    missing = raw_result.get("missing") or []
    raw_preacher = clean_text(raw_result.get("preacher"))
    preacher_source = clean_text(raw_result.get("preacherSource"))
    preacher = raw_preacher
    if preacher_source and is_default_preacher_alias(raw_preacher):
        preacher = DEFAULT_PREACHER
        preacher_source = "default_senior_pastor"
    elif not preacher_source:
        if raw_preacher and raw_preacher != DEFAULT_PREACHER:
            warnings = [
                *warnings,
                {
                    "code": "ignored_untrusted_preacher",
                    "value": raw_preacher,
                    "fallback": DEFAULT_PREACHER,
                },
            ]
        preacher = DEFAULT_PREACHER
        preacher_source = "default_senior_pastor"
        missing = [item for item in missing if item not in ("preacher", "preacherSource")]
    ready = len(missing) == 0
    result = {
        "ready": ready,
        "serviceType": service_type,
        "date": service_date_text,
        "serviceDate": service_date_text,
        "timezone": "UTC+09:00",
        "startTime": START_TIME.isoformat(),
        "scheduledStartTime": clean_text(raw_result.get("scheduledStartTime")) or scheduled_start_at(service_date),
        "sermonTitle": clean_text(raw_result.get("sermonTitle")),
        "passage": clean_text(raw_result.get("passage")),
        "preacher": preacher,
        "preacherSource": preacher_source,
        "serviceId": raw_result.get("serviceId"),
        "missing": missing,
        "warnings": warnings,
    }
    if should_try_worship_table_fallback(result):
        fallback = resolve_live_source_from_worship_tables(client, service_date, service_type)
        if fallback.get("ready"):
            fallback["warnings"] = [
                *warnings,
                {"code": "rpc_source_not_ready", "missing": missing},
                *fallback.get("warnings", []),
            ]
            return fallback
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Service date as YYYY-MM-DD. Defaults to this week's Sunday in UTC+9.")
    parser.add_argument("--weeks", type=int, default=0, help="0=this week's Sunday, 1=next week's Sunday.")
    parser.add_argument("--today", action="store_true", help="Use the current UTC+9 calendar date instead of calculating Sunday.")
    parser.add_argument("--state-dir", type=Path, default=DEFAULT_STATE_DIR)
    parser.add_argument("--mark-retry-if-not-ready", action="store_true")
    parser.add_argument("--retry-only-if-marked", action="store_true")
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()

    service_date = today_from_args(args.date) if args.today else target_date_from_args(args.date, args.weeks)
    if args.retry_only_if_marked and not has_retry_marker(args.state_dir, service_date):
        print(json.dumps({
            "ready": False,
            "skipped": True,
            "reason": "retry marker not found",
            "date": service_date.isoformat(),
            "timezone": "UTC+09:00",
            "scheduledStartTime": scheduled_start_at(service_date),
        }, ensure_ascii=False, indent=2))
        return 0

    result = resolve_live_source(RestClient(read_config()), service_date)
    if result["ready"]:
        clear_retry_marker(args.state_dir, service_date)
    elif args.mark_retry_if_not_ready:
        write_retry_marker(args.state_dir, service_date, result)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 2 if args.require_ready and not result["ready"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
