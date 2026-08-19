from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from backfill_identical_unified_hymn_lyrics import (  # noqa: E402
    REVIEW_NOTE,
    build_plan,
    clone_units,
    lyric_signature,
    verify_final,
)


class BackfillIdenticalUnifiedHymnLyricsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source_text = "노래 소리\n높여"
        strict_hash = hashlib.sha256("노래소리높여".encode()).hexdigest()[:16]
        self.candidate = {
            "new_no": 1,
            "union_no": 1,
            "song_id": "song",
            "new_version_id": "new",
            "union_version_id": "union",
            "unit_count": 1,
            "strict_hash": strict_hash,
        }
        self.report = {"candidates": [self.candidate]}
        self.songs = [{"id": "song", "hymn_no": "1"}]
        self.versions = [
            {
                "id": "new",
                "source_song_id": "song",
                "canonical_song_id": "song",
                "curated_version_name": "새찬송가",
                "lyric_signature": "new-signature",
            },
            {
                "id": "union",
                "source_song_id": "song",
                "canonical_song_id": "song",
                "curated_version_name": "통일 1 테스트",
                "version_label": "통일 1 테스트",
                "hymn_no": "통 1",
                "version_review_status": "reviewed",
                "lyric_signature": "empty-signature",
            },
        ]
        self.units = [{
            "id": "11111111-1111-4111-8111-111111111111",
            "version_id": "new",
            "unit_order": 1,
            "unit_label": "Verse 1",
            "unit_kind": "verse",
            "trigger": "",
            "slide_numbers": [1],
            "text": self.source_text,
            "curated_unit_type": "Verse",
            "curated_unit_label": "Verse 1",
            "curated_order": 1,
        }]

    def test_clone_preserves_text_and_marks_review_needed(self) -> None:
        cloned = clone_units(self.units, self.versions[1])[0]
        self.assertEqual(cloned["text"], self.source_text)
        self.assertEqual(cloned["slide_numbers"], [1])
        self.assertEqual(cloned["review_status"], "needs_review")
        self.assertEqual(cloned["review_note"], REVIEW_NOTE)
        self.assertIsNone(cloned["source_unit_id"])

    def test_build_plan_rejects_nonempty_target(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "no longer empty"):
            build_plan(
                self.report,
                self.songs,
                self.versions,
                [*self.units, {**self.units[0], "id": "existing", "version_id": "union"}],
                1,
                1,
            )

    def test_build_plan_rejects_changed_source_text(self) -> None:
        changed = [{**self.units[0], "text": "노랫소리\n높여"}]
        with self.assertRaisesRegex(RuntimeError, "Source lyrics changed"):
            build_plan(self.report, self.songs, self.versions, changed, 1, 1)

    def test_verify_final_requires_pending_and_needs_review(self) -> None:
        target = self.versions[1]
        copied = clone_units(self.units, target)
        signature = lyric_signature(1, self.candidate["strict_hash"])
        plan = {"version_patches": [{
            "id": "union",
            "union_no": 1,
            "new_lyric_signature": signature,
            "unit_count": 1,
            "strict_hash": self.candidate["strict_hash"],
        }]}
        final_versions = [{**target, "version_review_status": "pending", "lyric_signature": signature}]
        verify_final(plan, final_versions, copied)
        copied[0]["review_status"] = "reviewed"
        with self.assertRaisesRegex(RuntimeError, "Post-check failed"):
            verify_final(plan, final_versions, copied)


if __name__ == "__main__":
    unittest.main()
