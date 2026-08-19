from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_identical_hymn_lyrics import spacing_only_text  # noqa: E402


class AuditIdenticalHymnLyricsTests(unittest.TestCase):
    def test_spacing_and_line_breaks_are_ignored(self) -> None:
        self.assertEqual(spacing_only_text("노래 소리\n높여"), spacing_only_text("노래소리 높여"))

    def test_sai_siot_difference_is_preserved(self) -> None:
        self.assertNotEqual(spacing_only_text("노랫소리"), spacing_only_text("노래 소리"))

    def test_reference_verse_numbers_and_chorus_labels_are_structural(self) -> None:
        reference = "1. 첫 줄\n둘째 줄\n2) 셋째 줄\n<후렴> 후렴 가사"
        self.assertEqual(spacing_only_text(reference, reference=True), "첫줄둘째줄셋째줄후렴가사")

    def test_punctuation_is_not_ignored(self) -> None:
        self.assertNotEqual(spacing_only_text("아-멘"), spacing_only_text("아멘"))


if __name__ == "__main__":
    unittest.main()
