from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repair_confirmed_unified_hymn_duplicates import (  # noqa: E402
    DESTINATION_SONG_ID,
    build_plan,
)


class ConfirmedUnifiedHymnDuplicateRepairTest(unittest.TestCase):
    def test_build_plan_rejects_linked_units(self) -> None:
        songs = [{"id": DESTINATION_SONG_ID, "title": "하늘에 계신 (주기도문)", "hymn_no": "636"}]
        with self.assertRaisesRegex(RuntimeError, "no units"):
            build_plan(songs, [], [{"version_id": "8ee2f5a7-de00-4beb-93ea-51bb9414f43d"}])

    def test_build_plan_requires_destination_song(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "destination"):
            build_plan([], [], [])


if __name__ == "__main__":
    unittest.main()
