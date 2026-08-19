from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repair_confirmed_unified_hymn_amen_mapping import (  # noqa: E402
    EXPECTED,
    PATCH,
    SONG_ID,
    VERSION_ID,
    build_plan,
    verify_applied,
)


class RepairConfirmedUnifiedHymnAmenMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.songs = [{"id": SONG_ID, "title": "아멘", "hymn_no": "643"}]
        self.versions = [{"id": VERSION_ID, **EXPECTED}]
        self.units = [{"id": "unit-1", "version_id": VERSION_ID, "text": "아멘 아멘 아멘"}]

    def test_build_plan_changes_only_the_confirmed_number_metadata(self) -> None:
        plan = build_plan(self.songs, self.versions, self.units)
        self.assertEqual(plan["from_union_no"], 556)
        self.assertEqual(plan["to_union_no"], 555)
        self.assertEqual(plan["patch"], PATCH)

    def test_build_plan_rejects_unexpected_lyrics(self) -> None:
        self.units[0]["text"] = "아멘"
        with self.assertRaisesRegex(RuntimeError, "lyrics"):
            build_plan(self.songs, self.versions, self.units)

    def test_build_plan_rejects_existing_union_555(self) -> None:
        duplicate = copy.deepcopy(self.versions[0])
        duplicate.update({"id": "other", **PATCH})
        with self.assertRaisesRegex(RuntimeError, "already exists"):
            build_plan(self.songs, [*self.versions, duplicate], self.units)

    def test_verify_applied_accepts_corrected_metadata_and_unchanged_unit(self) -> None:
        corrected = copy.deepcopy(self.versions[0])
        corrected.update(PATCH)
        verify_applied([corrected], self.units)


if __name__ == "__main__":
    unittest.main()
