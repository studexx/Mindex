from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repair_confirmed_full_hymn_audit import (  # noqa: E402
    REVIEW_NOTE,
    corrected_texts,
    version_signature,
)


class RepairConfirmedFullHymnAuditTests(unittest.TestCase):
    def test_corrects_confirmed_typo_and_spacing(self) -> None:
        texts, occurrences = corrected_texts(
            ("new", 60),
            ["영혼이 햇빛 비춰주시고", "잠 깰 때"],
        )
        self.assertEqual(texts, ["영혼의 햇빛 비춰 주시고", "잠깰 때"])
        self.assertEqual(occurrences, 3)

    def test_rejects_changed_snapshot(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "Unexpected occurrence"):
            corrected_texts(("new", 348), ["싸울지라 예수"])

    def test_review_policy_remains_manual(self) -> None:
        self.assertIn("manual review required", REVIEW_NOTE)

    def test_signatures_are_edition_distinct(self) -> None:
        text = ["동일한 가사"]
        self.assertNotEqual(
            version_signature("new", 456, text),
            version_signature("union", 509, text),
        )


if __name__ == "__main__":
    unittest.main()
