from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from remove_hymn_legacy_versions import (  # noqa: E402
    CLEAN_LYRIC_SIGNATURE,
    CLEAN_UNIFIED_VERSION_ID,
    OLD_UNIFIED_VERSION_ID,
    clone_units,
    hidden_legacy_versions,
    validate_hidden_set,
)


class RemoveHymnLegacyVersionsTests(unittest.TestCase):
    def test_hidden_legacy_versions_only_selects_hidden_hymn_basics(self) -> None:
        songs = [{"id": "hymn", "hymn_no": "143"}, {"id": "ccm", "hymn_no": None}]
        versions = [
            {"id": "a", "canonical_song_id": "hymn", "source_song_id": None, "version_label": "기본"},
            {"id": "b", "canonical_song_id": "hymn", "source_song_id": "hymn", "version_label": "기본"},
            {"id": "c", "canonical_song_id": "ccm", "source_song_id": None, "version_label": "기본"},
        ]
        self.assertEqual([row["id"] for row in hidden_legacy_versions(songs, versions)], ["a"])

    def test_validate_hidden_set_checks_count_units_and_digest(self) -> None:
        hidden = [{"id": "a"}]
        units = [{"id": "u", "version_id": "a"}]
        digest = hashlib.sha256(b"a").hexdigest()
        self.assertEqual(validate_hidden_set(hidden, units, 1, 1, digest), ["a"])
        with self.assertRaisesRegex(RuntimeError, "Unexpected hidden legacy set"):
            validate_hidden_set(hidden, units, 2, 1, digest)

    def test_clone_units_uses_clean_version_and_preserves_curated_text(self) -> None:
        source = [{
            "id": "11111111-1111-4111-8111-111111111111",
            "unit_order": 1,
            "unit_label": "Verse 1",
            "unit_kind": "verse",
            "trigger": "",
            "slide_numbers": [],
            "text": "교정된\n줄바꿈",
            "curated_unit_type": "Verse",
            "curated_unit_label": "Verse 1",
            "curated_order": 1,
            "review_status": "needs_review",
            "review_note": None,
            "reviewed_at": None,
        }]
        cloned = clone_units(source)
        self.assertEqual(cloned[0]["version_id"], CLEAN_UNIFIED_VERSION_ID)
        self.assertEqual(cloned[0]["text"], "교정된\n줄바꿈")
        self.assertIsNone(cloned[0]["source_unit_id"])

    def test_clean_and_old_unified_ids_are_distinct(self) -> None:
        self.assertNotEqual(CLEAN_UNIFIED_VERSION_ID, OLD_UNIFIED_VERSION_ID)
        self.assertTrue(CLEAN_LYRIC_SIGNATURE.startswith("mindex-unified-141-"))


if __name__ == "__main__":
    unittest.main()
