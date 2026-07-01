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
    scheduled_start_at,
    target_date_from_args,
    this_or_next_sunday,
    today_from_args,
    write_retry_marker,
)


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


if __name__ == "__main__":
    unittest.main()
