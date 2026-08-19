from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repair_confirmed_unified_hymn_mislinks import MOVES, build_plan, verify_applied  # noqa: E402


def fixtures() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    songs: list[dict[str, object]] = []
    versions: list[dict[str, object]] = []
    for version_id, move in MOVES.items():
        songs.extend([
            {"id": move["from_song_id"], "hymn_no": move["from_hymn_no"]},
            {"id": move["to_song_id"], "hymn_no": move["to_hymn_no"]},
        ])
        versions.append({
            "id": version_id,
            "source_song_id": move["from_song_id"],
            "canonical_song_id": move["from_song_id"],
            "curated_version_name": f"통일 {move['union_no']} 테스트",
            "version_label": f"통일 {move['union_no']} 테스트",
            "hymn_no": f"통 {move['union_no']}",
            "version_order": 4,
        })
    return songs, versions


class ConfirmedUnifiedHymnMislinkRepairTest(unittest.TestCase):
    def test_build_plan_moves_only_guarded_versions(self) -> None:
        songs, versions = fixtures()
        plan = build_plan(songs, versions)
        self.assertEqual([move["union_no"] for move in plan], [2, 36, 114])
        self.assertTrue(all(move["patch"]["version_order"] == 2 for move in plan))

    def test_build_plan_rejects_unexpected_source(self) -> None:
        songs, versions = fixtures()
        versions[0]["source_song_id"] = "unexpected"
        with self.assertRaisesRegex(RuntimeError, "Unexpected source song"):
            build_plan(songs, versions)

    def test_verify_applied_requires_destination(self) -> None:
        songs, versions = fixtures()
        with self.assertRaisesRegex(RuntimeError, "Post-check failed"):
            verify_applied(songs, versions)


if __name__ == "__main__":
    unittest.main()
