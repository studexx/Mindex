from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.youtube_live_source import (
    KST,
    DEFAULT_PREACHER,
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
    def __init__(self, result: object) -> None:
        self.result = result
        self.calls: list[tuple[str, dict[str, object]]] = []

    def rpc(self, name: str, payload: dict[str, object]) -> object:
        self.calls.append((name, payload))
        return self.result


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

    def test_resolve_live_source_uses_stable_rpc_contract(self) -> None:
        client = FakeClient({
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "눈을 뜨시오",
            "passage": "요 9:1-7",
            "preacher": "김남영 목사",
            "preacherSource": "sermon_assignee",
            "serviceId": "service-1",
            "ready": True,
            "missing": [],
            "warnings": [],
        })

        result = resolve_live_source(client, date(2026, 7, 5))

        self.assertEqual(client.calls, [("get_youtube_live_source", {"service_date": "2026-07-05"})])
        self.assertTrue(result["ready"])
        self.assertEqual(result["date"], "2026-07-05")
        self.assertEqual(result["serviceDate"], "2026-07-05")
        self.assertEqual(result["scheduledStartTime"], "2026-07-05T10:45:00+09:00")
        self.assertEqual(result["sermonTitle"], "눈을 뜨시오")
        self.assertEqual(result["passage"], "요 9:1-7")
        self.assertEqual(result["preacher"], DEFAULT_PREACHER)
        self.assertEqual(result["preacherSource"], "default_senior_pastor")
        self.assertEqual(result["serviceId"], "service-1")

    def test_resolve_live_source_normalizes_missing_and_warning_arrays(self) -> None:
        result = resolve_live_source(FakeClient({
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "",
            "passage": "",
            "preacher": "",
            "preacherSource": "",
            "serviceId": None,
            "ready": False,
            "missing": ["sermonTitle", "passage", "preacher"],
            "warnings": [{"code": "ignored_sermon_assignee", "value": "‘ 역대급"}],
        }), date(2026, 7, 5))

        self.assertFalse(result["ready"])
        self.assertEqual(result["missing"], ["sermonTitle", "passage"])
        self.assertEqual(result["warnings"][0]["code"], "ignored_sermon_assignee")
        self.assertEqual(result["preacher"], "김남영 위임목사")
        self.assertEqual(result["preacherSource"], "default_senior_pastor")

    def test_resolve_live_source_accepts_single_row_rpc_payloads(self) -> None:
        result = resolve_live_source(FakeClient([{
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "눈을 뜨시오",
            "passage": "요 9:1-7",
            "preacher": "김남영 목사",
            "preacherSource": "sermon_assignee",
            "serviceId": "service-1",
            "ready": True,
            "missing": [],
            "warnings": [],
        }]), date(2026, 7, 5))

        self.assertTrue(result["ready"])
        self.assertEqual(result["preacher"], DEFAULT_PREACHER)

    def test_resolve_live_source_allows_different_sermon_assignee(self) -> None:
        result = resolve_live_source(FakeClient({
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "눈을 뜨시오",
            "passage": "요 9:1-7",
            "preacher": "박천일 선교사",
            "preacherSource": "sermon_assignee",
            "serviceId": "service-1",
            "ready": True,
            "missing": [],
            "warnings": [],
        }), date(2026, 7, 5))

        self.assertTrue(result["ready"])
        self.assertEqual(result["preacher"], "박천일 선교사")
        self.assertEqual(result["preacherSource"], "sermon_assignee")

    def test_resolve_live_source_defaults_preacher_when_source_is_missing(self) -> None:
        result = resolve_live_source(FakeClient({
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "눈을 뜨시오",
            "passage": "요 9:1-7",
            "preacher": "김남영 목사",
            "serviceId": "service-1",
            "ready": True,
            "missing": [],
            "warnings": [],
        }), date(2026, 7, 5))

        self.assertTrue(result["ready"])
        self.assertEqual(result["preacher"], "김남영 위임목사")
        self.assertEqual(result["preacherSource"], "default_senior_pastor")

    def test_resolve_live_source_ignores_untrusted_preacher_without_source(self) -> None:
        result = resolve_live_source(FakeClient({
            "serviceDate": "2026-07-05",
            "scheduledStartTime": "2026-07-05T10:45:00+09:00",
            "sermonTitle": "눈을 뜨시오",
            "passage": "요 9:1-7",
            "preacher": "김석범 목사",
            "serviceId": "service-1",
            "ready": True,
            "missing": [],
            "warnings": [],
        }), date(2026, 7, 5))

        self.assertTrue(result["ready"])
        self.assertEqual(result["preacher"], "김남영 위임목사")
        self.assertEqual(result["preacherSource"], "default_senior_pastor")
        self.assertEqual(result["warnings"][0]["code"], "ignored_untrusted_preacher")


if __name__ == "__main__":
    unittest.main()
