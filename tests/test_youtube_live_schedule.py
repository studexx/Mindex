from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.youtube_live_schedule import (
    KST,
    find_playlist_by_title,
    find_existing_broadcast,
    is_same_service_date,
    live_description,
    live_title,
    next_sunday,
    playlist_title_for_source,
    reservation_source,
    scheduled_end_time,
    target_date_from_args,
    validate_title,
)


SOURCE = {
    "date": "2026-07-05",
    "scheduledStartTime": "2026-07-05T10:45:00+09:00",
}


class YoutubeLiveScheduleTests(unittest.TestCase):
    def test_live_title_uses_channel_format(self) -> None:
        self.assertEqual(
            live_title(SOURCE),
            "[LIVE] 검단우리교회 주일예배 | 2026-07-05",
        )

    def test_live_description_is_empty(self) -> None:
        self.assertEqual(live_description(SOURCE), "")

    def test_next_sunday_skips_today_when_today_is_sunday(self) -> None:
        self.assertEqual(next_sunday(date(2026, 7, 26)), date(2026, 8, 2))
        self.assertEqual(next_sunday(date(2026, 7, 27)), date(2026, 8, 2))

    def test_default_target_date_is_next_sunday_in_utc_plus_9(self) -> None:
        utc_now = datetime(2026, 7, 26, 15, 30, tzinfo=timezone.utc)
        self.assertEqual(target_date_from_args(None, 0, now=utc_now), date(2026, 8, 2))
        self.assertEqual(KST.utcoffset(None).total_seconds(), 9 * 60 * 60)

    def test_reservation_source_uses_1045_utc_plus_9(self) -> None:
        source = reservation_source(date(2026, 8, 2))
        self.assertEqual(source["date"], "2026-08-02")
        self.assertEqual(source["scheduledStartTime"], "2026-08-02T10:45:00+09:00")

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
                "title": "[LIVE] 검단우리교회 주일예배 | 2026-07-05",
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

    def test_find_existing_broadcast_does_not_mix_mine_and_broadcast_status(self) -> None:
        class FakeLiveBroadcasts:
            def __init__(self) -> None:
                self.kwargs = None

            def list(self, **kwargs):
                self.kwargs = kwargs
                return self

            def list_next(self, request, response):
                return None

            def execute(self):
                return {"items": []}

        class FakeYoutube:
            def __init__(self) -> None:
                self.live_broadcasts = FakeLiveBroadcasts()

            def liveBroadcasts(self):
                return self.live_broadcasts

        youtube = FakeYoutube()
        self.assertIsNone(find_existing_broadcast(youtube, "2026-07-05"))
        self.assertNotIn("mine", youtube.live_broadcasts.kwargs)
        self.assertEqual(youtube.live_broadcasts.kwargs["broadcastStatus"], "upcoming")

    def test_find_playlist_by_title_uses_latest_duplicate(self) -> None:
        class FakePlaylists:
            def list(self, **kwargs):
                return self

            def list_next(self, request, response):
                return None

            def execute(self):
                return {
                    "items": [
                        {
                            "id": "old-playlist",
                            "snippet": {
                                "title": "주일예배 LIVE 2026",
                                "publishedAt": "2025-01-01T00:00:00Z",
                            },
                        },
                        {
                            "id": "new-playlist",
                            "snippet": {
                                "title": "주일예배 LIVE 2026",
                                "publishedAt": "2026-07-03T03:04:15Z",
                            },
                        },
                    ]
                }

        class FakeYoutube:
            def playlists(self):
                return FakePlaylists()

        playlist = find_playlist_by_title(FakeYoutube(), "주일예배 LIVE 2026")
        self.assertEqual(playlist["id"], "new-playlist")


if __name__ == "__main__":
    unittest.main()
