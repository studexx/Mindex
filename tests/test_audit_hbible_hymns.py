from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import (  # noqa: E402
    audit_reference,
    comparison_text,
    parse_hbible_hymn,
    strict_lyric_text,
    structural_text,
    unified_number,
    version_units_by_version,
)


class HbibleHymnAuditTest(unittest.TestCase):
    def test_comparison_ignores_mindex_unit_labels(self) -> None:
        self.assertEqual(comparison_text("[Verse 1]\n첫째 절\n[Chorus]\n후렴"), "첫째절후렴")

    def test_strict_comparison_preserves_characters_but_ignores_structure(self) -> None:
        reference = "1. 노래 소리\n<후렴> 아-멘"
        database = "[Verse 1]\n노래 소리\n[Chorus]\n아-멘"
        self.assertEqual(structural_text(reference), structural_text(database))
        self.assertEqual(strict_lyric_text(reference), strict_lyric_text(database))
        self.assertNotEqual(strict_lyric_text("노랫소리"), strict_lyric_text("노래 소리"))

    def test_parses_reference_without_persisting_page_noise(self) -> None:
        html = """
        <div id="id_hymn_title"><h4><span>새찬송가</span> 202장 하나님 아버지 주신 책은</h4></div>
        <div class="textSpacing">
          1. 첫째 절 첫 줄<br/>첫째 절 둘째 줄<br/>
          2. 둘째 절<br/>&lt;후렴&gt; 후렴 가사<br/>아멘
        </div>
        <div class="textSpacing">성경 본문은 포함하면 안 됨</div>
        """
        hymn = parse_hbible_hymn(html, "new", 202)
        self.assertEqual(hymn.title, "하나님 아버지 주신 책은")
        self.assertEqual(hymn.verse_count, 2)
        self.assertTrue(hymn.has_chorus)
        self.assertTrue(hymn.has_amen)
        self.assertNotIn("성경 본문", hymn.lyrics)

    def test_union_internal_label_number(self) -> None:
        self.assertEqual(unified_number({"version_label": "예수로 나의 구주 삼고 (통 204)"}), 204)
        self.assertEqual(unified_number({"curated_version_name": "통일 558 일곱 번 아멘"}), 558)
        self.assertIsNone(unified_number({"hymn_no": "288", "version_label": "새찬송가"}))

    def test_db_unit_labels_count_as_verses(self) -> None:
        html = """
        <div id="id_hymn_title"><h4>새찬송가 10장 기준 제목</h4></div>
        <div class="textSpacing">1. 첫째 절<br>2. 둘째 절</div>
        """
        reference = parse_hbible_hymn(html, "new", 10)
        songs = [{"id": "song-1", "title": "기준 제목", "hymn_no": "10"}]
        versions = {"song-1": [{"id": "version-1", "source_song_id": "song-1", "version_label": "새찬송가"}]}
        units = version_units_by_version([
            {"version_id": "version-1", "unit_order": 1, "unit_label": "Verse 1", "text": "첫째 절"},
            {"version_id": "version-1", "unit_order": 2, "unit_label": "Verse 2", "text": "둘째 절"},
        ])
        codes = {row["code"] for row in audit_reference(reference, songs, versions, units, 0.5)}
        self.assertNotIn("verse-count-mismatch", codes)

    def test_reports_title_and_structure_differences_without_lyrics(self) -> None:
        html = """
        <div id="id_hymn_title"><h4>새찬송가 10장 기준 제목</h4></div>
        <div class="textSpacing">1. 첫째 절<br/>2. 둘째 절<br/>&lt;후렴&gt; 후렴<br/>아멘</div>
        """
        reference = parse_hbible_hymn(html, "new", 10)
        songs = [{"id": "song-1", "title": "다른 제목", "hymn_no": "10"}]
        versions = {"song-1": [{"id": "version-1", "source_song_id": "song-1", "version_label": "새찬송가"}]}
        units = version_units_by_version([
            {"version_id": "version-1", "unit_order": 1, "unit_label": "Verse", "text": "1. 첫째 절"},
        ])
        issues = audit_reference(reference, songs, versions, units, 0.92)
        codes = {row["code"] for row in issues}
        self.assertIn("title-mismatch", codes)
        self.assertIn("verse-count-mismatch", codes)
        self.assertIn("chorus-structure-mismatch", codes)
        self.assertIn("amen-structure-mismatch", codes)
        self.assertIn("low-lyric-similarity", codes)
        self.assertIn("lyric-character-mismatch", codes)
        self.assertTrue(all("lyrics" not in row for row in issues))


if __name__ == "__main__":
    unittest.main()
