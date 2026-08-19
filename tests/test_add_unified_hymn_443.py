from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from add_unified_hymn_443 import (  # noqa: E402
    EXPECTED_REFERENCE_TEXT,
    MODERN_PRIMARY_VERSE_4,
    OLD_PRIMARY_VERSE_4,
    PRIMARY_VERSE_4_ID,
    PRIMARY_VERSION_ID,
    SONG_ID,
    UNIFIED_FORMS,
    build_plan,
    comparison_text,
    verify_final,
)


class AddUnifiedHymn443Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.songs = [{"id": SONG_ID, "title": "시험 받을 때에", "hymn_no": "343"}]
        self.versions = [{
            "id": PRIMARY_VERSION_ID,
            "canonical_song_id": SONG_ID,
            "source_song_id": SONG_ID,
            "version_order": 1,
            "curated_version_name": "새찬송가",
            "praise_types": ["hymn"],
            "is_primary": True,
            "lyric_signature": "new-343",
        }]
        self.units = [{"id": PRIMARY_VERSE_4_ID, "version_id": PRIMARY_VERSION_ID, "text": OLD_PRIMARY_VERSE_4}]

    def test_plan_uses_modern_spacing_and_distinct_old_wording(self) -> None:
        plan = build_plan(self.songs, self.versions, self.units)
        self.assertEqual(plan["version"]["hymn_no"], "통 443")
        self.assertEqual(len(plan["units"]), 5)
        lyrics = "\n".join(row["text"] for row in plan["units"])
        self.assertIn("시험받을 때에", lyrics)
        self.assertIn("지켜 줍소서", lyrics)
        self.assertIn("맡아 줍소서", lyrics)
        self.assertEqual(comparison_text(lyrics), EXPECTED_REFERENCE_TEXT)

    def test_plan_corrects_new_hymn_spacing(self) -> None:
        plan = build_plan(self.songs, self.versions, self.units)
        self.assertNotIn("의지 하리니", plan["primary_verse_4_patch"]["text"])
        self.assertIn("의지하리니", MODERN_PRIMARY_VERSE_4)

    def test_plan_rejects_existing_union_443(self) -> None:
        existing = copy.deepcopy(self.versions[0])
        existing.update({"id": "old", "curated_version_name": "통일 443", "hymn_no": "통 443"})
        with self.assertRaisesRegex(RuntimeError, "already exists"):
            build_plan(self.songs, [*self.versions, existing], self.units)

    def test_verify_final_accepts_inserted_units_and_spacing_fix(self) -> None:
        plan = build_plan(self.songs, self.versions, self.units)
        corrected_units = copy.deepcopy(self.units)
        corrected_units[0]["text"] = MODERN_PRIMARY_VERSE_4
        verify_final([*self.versions, plan["version"]], [*corrected_units, *plan["units"]])
        self.assertEqual(len(UNIFIED_FORMS), 5)


if __name__ == "__main__":
    unittest.main()
