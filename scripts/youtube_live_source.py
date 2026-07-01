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


def first_exact_label(items: list[dict[str, Any]], label: str) -> dict[str, Any] | None:
    for item in sorted(items, key=lambda row: row.get("sort_order") or 0):
        if (item.get("label") or "") == label:
            return item
    return None


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def compact_identity(value: str) -> str:
    return "".join(ch for ch in value if ch.isalnum())


def looks_like_preacher(candidate: str, sermon_title: str) -> bool:
    if not candidate:
        return False
    if candidate[0] in "\"'“”‘’":
        return False

    candidate_key = compact_identity(candidate)
    title_key = compact_identity(sermon_title)
    if title_key and len(candidate_key) >= 2:
        if candidate_key in title_key or title_key in candidate_key:
            return False
    return True


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


def resolve_live_source(
    client: RestClient,
    service_date: date,
    service_type: str = SERVICE_TYPE,
) -> dict[str, Any]:
    date_text = service_date.isoformat()
    services = client.get(
        "mindex_services",
        {
            "select": "id,type_id,date,date_end,leader,tags,raw_text,created_at",
            "type_id": f"eq.{service_type}",
            "date": f"eq.{date_text}",
            "order": "created_at.asc",
        },
    )

    service = services[0] if services else None
    calendar_rows = client.get(
        "mindex_sunday_calendar",
        {
            "select": "date,preacher,church_schedule,note,liturgical",
            "date": f"eq.{date_text}",
            "limit": "1",
        },
    )
    calendar = calendar_rows[0] if calendar_rows else None
    items: list[dict[str, Any]] = []

    if service:
        items = client.get(
            "mindex_service_items",
            {
                "select": "sort_order,label,assignee,raw_title,memo",
                "service_id": f"eq.{service['id']}",
                "order": "sort_order.asc",
            },
        )

    scripture_item = first_exact_label(items, "성경봉독")
    sermon_item = first_exact_label(items, "설교")
    passage = clean_text(scripture_item.get("raw_title")) if scripture_item else ""
    sermon_title = clean_text(sermon_item.get("raw_title")) if sermon_item else ""
    warnings = []
    sermon_assignee = clean_text(sermon_item.get("assignee")) if sermon_item else ""
    preacher = ""
    if looks_like_preacher(sermon_assignee, sermon_title):
        preacher = sermon_assignee
    elif sermon_assignee:
        warnings.append({"code": "ignored_sermon_assignee", "value": sermon_assignee})
    preacher = preacher or clean_text(service.get("leader") if service else "")
    preacher = preacher or clean_text(calendar.get("preacher") if calendar else "")

    result = {
        "ready": False,
        "serviceType": service_type,
        "date": date_text,
        "timezone": "UTC+09:00",
        "startTime": START_TIME.isoformat(),
        "scheduledStartTime": scheduled_start_at(service_date),
        "sermonTitle": sermon_title,
        "passage": passage,
        "preacher": preacher,
        "serviceId": service.get("id") if service else None,
        "missing": [],
        "warnings": warnings,
        "source": {
            "service": service,
            "scriptureItem": scripture_item,
            "sermonItem": sermon_item,
            "calendar": calendar,
        },
    }

    if len(services) > 1:
        result["warnings"].append({"code": "multiple_services", "count": len(services)})
    if not service:
        result["missing"].append("service")
    for field in REQUIRED_FIELDS:
        if not result[field]:
            result["missing"].append(field)
    result["ready"] = not result["missing"]
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
