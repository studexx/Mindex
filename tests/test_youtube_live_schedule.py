from __future__ import annotations

import unittest

from scripts.youtube_live_schedule import (
    is_same_service_date,
    live_description,
    live_title,
    playlist_title_for_source,
    scheduled_end_time,
    validate_title,
)


SOURCE = {
    "date": "2026-07-05",
    "scheduledStartTime": "2026-07-05T10:45:00+09:00",
    "sermonTitle": "눈을 뜨시오",
    "passage": "요 9:1–7",
    "preacher": "김남영 목사",
}


class YoutubeLiveScheduleTests(unittest.TestCase):
    def test_live_title_uses_channel_format(self) -> None:
        self.assertEqual(
            live_title(SOURCE),
            "눈을 뜨시오 (요 9:1–7) | 김남영 목사 | 검단우리교회 주일예배 | 2026-07-05",
        )

    def test_live_description_contains_required_fields(self) -> None:
        description = live_description(SOURCE)
        self.assertIn("설교: 눈을 뜨시오", description)
        self.assertIn("본문: 요 9:1–7", description)
        self.assertIn("설교자: 김남영 목사", description)

    def test_scheduled_end_time_defaults_from_start(self) -> None:
        self.assertEqual(scheduled_end_time(SOURCE, 90), "2026-07-05T12:15:00+09:00")

    def test_playlist_title_uses_service_year(self) -> None:
        self.assertEqual(playlist_title_for_source(SOURCE), "주일예배 LIVE 2026")

    def test_validate_title_rejects_youtube_limit_overflow(self) -> None:
        with self.assertRaises(ValueError):
            validate_title("가" * 101)

    def test_existing_broadcast_match_uses_kst_service_date(self) -> None:
        broadcast = {
            "snippet": {
                "title": "눈을 뜨시오 (요 9:1–7) | 김남영 목사 | 검단우리교회 주일예배 | 2026-07-05",
                "scheduledStartTime": "2026-07-05T01:45:00Z",
            }
        }
        self.assertTrue(is_same_service_date(broadcast, "2026-07-05"))

    def test_existing_broadcast_match_requires_service_label(self) -> None:
        broadcast = {
            "snippet": {
                "title": "기타 영상 | 2026-07-05",
                "scheduledStartTime": "2026-07-05T01:45:00Z",
            }
        }
        self.assertFalse(is_same_service_date(broadcast, "2026-07-05"))


if __name__ == "__main__":
    unittest.main()
