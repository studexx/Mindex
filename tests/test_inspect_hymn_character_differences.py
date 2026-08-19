from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from inspect_hymn_character_differences import difference_operations  # noqa: E402


class InspectHymnCharacterDifferencesTests(unittest.TestCase):
    def test_reports_only_compact_changed_segments(self) -> None:
        rows = difference_operations("찬양하는소리", "찬송하는소리")
        self.assertEqual(rows[0]["operation"], "replace")
        self.assertEqual(rows[0]["reference"], "양")
        self.assertEqual(rows[0]["database"], "송")
        self.assertEqual(rows[0]["reference_context"], "찬양하는소리")
        self.assertEqual(rows[0]["database_context"], "찬송하는소리")

    def test_limits_reported_fragments(self) -> None:
        rows = difference_operations("가" * 40, "나" * 40, limit=5)
        self.assertEqual(rows[0]["reference"], "가" * 5)
        self.assertEqual(rows[0]["database"], "나" * 5)


if __name__ == "__main__":
    unittest.main()
