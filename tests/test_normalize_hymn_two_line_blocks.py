from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from normalize_hymn_two_line_blocks import compact_text, two_line_blocks  # noqa: E402


class NormalizeHymnTwoLineBlocksTests(unittest.TestCase):
    def test_groups_even_lines_in_pairs(self) -> None:
        self.assertEqual(two_line_blocks("1\n2\n3\n4"), "1\n2\n\n3\n4")

    def test_groups_odd_final_line_as_its_own_block(self) -> None:
        self.assertEqual(two_line_blocks("1\n2\n3\n4\n5"), "1\n2\n\n3\n4\n\n5")

    def test_collapses_existing_blank_line_variants(self) -> None:
        self.assertEqual(two_line_blocks("\n1\n2\n\n\n3\n"), "1\n2\n\n3")

    def test_normalization_preserves_non_whitespace_characters(self) -> None:
        before = "첫째 줄\n둘째 줄\n셋째 줄"
        self.assertEqual(compact_text(before), compact_text(two_line_blocks(before)))


if __name__ == "__main__":
    unittest.main()
