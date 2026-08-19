from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from sync_identical_hymn_lyrics import (  # noqa: E402
    REVIEW_NOTE,
    apply_corrections,
    changed_patch,
    normalized_unit,
    version_signature,
)


class SyncIdenticalHymnLyricsTests(unittest.TestCase):
    def test_corrections_use_modern_principle_spacing(self) -> None:
        self.assertEqual(apply_corrections(384, ["내 주안에 있는 긍휼"]), ["내 주 안에 있는 긍휼"])
        self.assertEqual(apply_corrections(602, ["하나되는 이 시간"]), ["하나 되는 이 시간"])

    def test_correction_rejects_changed_source_snapshot(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "Unexpected correction occurrence"):
            apply_corrections(89, ["간 데마다 풍겨 나게"])

    def test_normalized_unit_preserves_structure_and_requires_review(self) -> None:
        source = {
            "unit_order": 1,
            "unit_label": "Verse 1",
            "unit_kind": "verse",
            "trigger": "",
            "slide_numbers": [1],
            "text": "교정 전",
            "curated_unit_type": "Verse",
            "curated_unit_label": "Verse 1",
            "curated_order": 1,
        }
        row = normalized_unit(source, "교정 후")
        self.assertEqual(row["text"], "교정 후")
        self.assertEqual(row["review_status"], "needs_review")
        self.assertEqual(row["review_note"], REVIEW_NOTE)
        self.assertIsNone(row["reviewed_at"])

    def test_changed_patch_only_returns_differences(self) -> None:
        self.assertEqual(changed_patch({"a": 1, "b": 2}, {"a": 1, "b": 3}), {"b": 3})

    def test_signatures_keep_editions_distinct(self) -> None:
        texts = ["같은 가사"]
        self.assertNotEqual(version_signature("new", 1, texts), version_signature("unified", 1, texts))


if __name__ == "__main__":
    unittest.main()
