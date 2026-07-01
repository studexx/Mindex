from __future__ import annotations

import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.youtube_live_source import (
    KST,
    clear_retry_marker,
    has_retry_marker,
    retry_marker_path,
    resolve_live_source,
    scheduled_start_at,
    target_date_from_args,
    this_or_next_sunday,
    today_from_args,
    write_retry_marker,
)


class FakeClient:
    def __init__(self, rows_by_table: dict[str, list[dict[str, object]]]) -> None:
        self.rows_by_table = rows_by_table

    def get(self, table: str, params: dict[str, str]) -> list[dict[str, object]]:
        rows = self.rows_by_table.get(table, [])
        if table == "mindex_services":
            service_type = params.get("type_id", "").removeprefix("eq.")
            service_date = params.get("date", "").removeprefix("eq.")
            return [
                row for row in rows
                if row.get("type_id") == service_type and row.get("date") == service_date
            ]
        if table == "mindex_service_items":
            service_id = params.get("service_id", "").removeprefix("eq.")
            return [
                row for row in rows
                if row.get("service_id") == service_id
            ]
        if table == "mindex_sunday_calendar":
            service_date = params.get("date", "").removeprefix("eq.")
            return [row for row in rows if row.get("date") == service_date]
        return rows


class YoutubeLiveSourceTests(unittest.TestCase):
    def test_this_week_sunday_uses_same_day_when_today_is_sunday(self) -> None:
        self.assertEqual(this_or_next_sunday(date(2026, 7, 5)), date(2026, 7, 5))

    def test_next_sunday_from_tuesday(self) -> None:
        self.assertEqual(this_or_next_sunday(date(2026, 6, 30)), date(2026, 7, 5))
        self.assertEqual(this_or_next_sunday(date(2026, 6, 30), weeks=1), date(2026, 7, 12))

    def test_default_target_date_is_based_on_utc_plus_9(self) -> None:
        utc_now = datetime(2026, 7, 4, 15, 30, tzinfo=timezone.utc)
        self.assertEqual(target_date_from_args(None, 0, now=utc_now), date(2026, 7, 5))

    def test_explicit_date_wins(self) -> None:
        self.assertEqual(target_date_from_args("2026-08-02", 3), date(2026, 8, 2))

    def test_today_uses_utc_plus_9_calendar_day(self) -> None:
        utc_now = datetime(2026, 7, 4, 15, 30, tzinfo=timezone.utc)
        self.assertEqual(today_from_args(None, now=utc_now), date(2026, 7, 5))

    def test_scheduled_start_time_is_1045_utc_plus_9(self) -> None:
        self.assertEqual(scheduled_start_at(date(2026, 7, 5)), "2026-07-05T10:45:00+09:00")
        self.assertEqual(KST.utcoffset(None), timedelta(hours=9))

    def test_retry_marker_lifecycle(self) -> None:
        service_date = date(2026, 7, 5)
        with TemporaryDirectory() as directory:
            state_dir = Path(directory)
            self.assertFalse(has_retry_marker(state_dir, service_date))
            write_retry_marker(state_dir, service_date, {"missing": ["service"]})
            self.assertTrue(has_retry_marker(state_dir, service_date))
            self.assertTrue(retry_marker_path(state_dir, service_date).read_text(encoding="utf-8"))
            clear_retry_marker(state_dir, service_date)
            self.assertFalse(has_retry_marker(state_dir, service_date))

    def test_resolve_live_source_uses_exact_sermon_label_only(self) -> None:
        client = FakeClient({
            "mindex_services": [{
                "id": "service-1",
                "type_id": "sunday-main",
                "date": "2026-07-05",
                "leader": "",
            }],
            "mindex_service_items": [
                {
                    "service_id": "service-1",
                    "sort_order": 10,
                    "label": "성경봉독",
                    "raw_title": "요 9:1-7",
                    "assignee": "",
                },
                {
                    "service_id": "service-1",
                    "sort_order": 20,
                    "label": "설교 전 찬양",
                    "raw_title": "주님 말씀하시면",
                    "assignee": "",
                },
                {
                    "service_id": "service-1",
                    "sort_order": 30,
                    "label": "설교",
                    "raw_title": "눈을 뜨시오",
                    "assignee": "김남영 목사",
                },
            ],
            "mindex_sunday_calendar": [],
        })

        result = resolve_live_source(client, date(2026, 7, 5))

        self.assertTrue(result["ready"])
        self.assertEqual(result["sermonTitle"], "눈을 뜨시오")
        self.assertEqual(result["passage"], "요 9:1-7")
        self.assertEqual(result["preacher"], "김남영 목사")

    def test_resolve_live_source_preacher_falls_back_to_service_then_calendar(self) -> None:
        rows = {
            "mindex_services": [{
                "id": "service-1",
                "type_id": "sunday-main",
                "date": "2026-07-05",
                "leader": "인도자 목사",
            }],
            "mindex_service_items": [
                {
                    "service_id": "service-1",
                    "sort_order": 10,
                    "label": "성경봉독",
                    "raw_title": "요 9:1-7",
                    "assignee": "",
                },
                {
                    "service_id": "service-1",
                    "sort_order": 20,
                    "label": "설교",
                    "raw_title": "눈을 뜨시오",
                    "assignee": "",
                },
            ],
            "mindex_sunday_calendar": [{
                "date": "2026-07-05",
                "preacher": "교회력 목사",
            }],
        }

        self.assertEqual(
            resolve_live_source(FakeClient(rows), date(2026, 7, 5))["preacher"],
            "인도자 목사",
        )
        rows["mindex_services"][0]["leader"] = ""
        self.assertEqual(
            resolve_live_source(FakeClient(rows), date(2026, 7, 5))["preacher"],
            "교회력 목사",
        )

    def test_resolve_live_source_ignores_title_fragment_assignee(self) -> None:
        client = FakeClient({
            "mindex_services": [{
                "id": "service-1",
                "type_id": "sunday-main",
                "date": "2026-06-28",
                "leader": "김석범 목사",
            }],
            "mindex_service_items": [
                {
                    "service_id": "service-1",
                    "sort_order": 10,
                    "label": "성경봉독",
                    "raw_title": "에 9:20-32",
                    "assignee": "",
                },
                {
                    "service_id": "service-1",
                    "sort_order": 20,
                    "label": "설교",
                    "raw_title": "역대급 감사",
                    "assignee": "‘ 역대급",
                },
            ],
            "mindex_sunday_calendar": [],
        })

        result = resolve_live_source(client, date(2026, 6, 28))

        self.assertTrue(result["ready"])
        self.assertEqual(result["preacher"], "김석범 목사")
        self.assertEqual(result["warnings"][0]["code"], "ignored_sermon_assignee")


if __name__ == "__main__":
    unittest.main()
