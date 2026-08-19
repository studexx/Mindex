from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from mark_unified_hymn_443_needs_review import (  # noqa: E402
    EXPECTED_UNIT_IDS,
    NEW_NOTE,
    OLD_NOTE,
    VERSION_ID,
    build_plan,
    verify_final,
)


class MarkUnifiedHymn443NeedsReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.version = {
            "id": VERSION_ID,
            "curated_version_name": "통일 443 시험 받을 때에",
            "version_review_status": "reviewed",
        }
        self.units = [
            {
                "id": unit_id,
                "version_id": VERSION_ID,
                "review_status": "reviewed",
                "review_note": OLD_NOTE,
                "reviewed_at": None,
            }
            for unit_id in EXPECTED_UNIT_IDS
        ]

    def test_build_plan_marks_automated_data_for_manual_review(self) -> None:
        plan = build_plan(self.version, self.units)
        self.assertEqual(plan["version_patch"], {"version_review_status": "pending"})
        self.assertEqual(plan["unit_patch"]["review_status"], "needs_review")
        self.assertEqual(plan["unit_patch"]["review_note"], NEW_NOTE)

    def test_build_plan_rejects_partially_reviewed_unit_set(self) -> None:
        self.units[0]["review_status"] = "needs_review"
        with self.assertRaisesRegex(RuntimeError, "Unexpected.*unit review state"):
            build_plan(self.version, self.units)

    def test_verify_final_accepts_pending_state(self) -> None:
        version = copy.deepcopy(self.version)
        version["version_review_status"] = "pending"
        units = copy.deepcopy(self.units)
        for unit in units:
            unit.update({"review_status": "needs_review", "review_note": NEW_NOTE})
        verify_final(version, units)


if __name__ == "__main__":
    unittest.main()
