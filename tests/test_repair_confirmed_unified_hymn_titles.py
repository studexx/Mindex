from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repair_confirmed_unified_hymn_titles import build_plan, replacement_patch  # noqa: E402


class ConfirmedUnifiedHymnTitleRepairTest(unittest.TestCase):
    def test_replacement_patch_changes_only_matching_fields(self) -> None:
        version = {
            "curated_version_name": "통일 307 공중 나는 새르 보라",
            "version_label": "공중 나는 새르 보라 (통 307)",
            "raw_section_name": "unchanged",
            "hymn_no": "통 307",
        }
        self.assertEqual(replacement_patch(version, "공중 나는 새르 보라", "공중 나는 새를 보라"), {
            "curated_version_name": "통일 307 공중 나는 새를 보라",
            "version_label": "공중 나는 새를 보라 (통 307)",
        })

    def test_build_plan_requires_exactly_one_version(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "Expected one"):
            build_plan([])


if __name__ == "__main__":
    unittest.main()
