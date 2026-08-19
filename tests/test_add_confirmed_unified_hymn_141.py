from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from add_confirmed_unified_hymn_141 import (  # noqa: E402
    EXPECTED_HIDDEN,
    EXPECTED_PRIMARY,
    EXPECTED_UNIT_IDS,
    PATCH,
    PRIMARY_VERSION_ID,
    SONG_ID,
    UNIFIED_VERSION_ID,
    build_plan,
    verify_applied,
)


LYRIC_PARTS = [
    "웬말인가 날 위하여 주 돌아가셨나 이 벌레 같은 날 위해 큰 해 받으셨나",
    "내 지은 죄 다 지시고 못 박히셨으니 웬일인가 웬 은혠가 그 사랑 크셔라",
    "주 십자가 못 박힐 때 그 해도 빛 잃고 그 밝은 빛 가리워서 캄캄케 되었네",
    "나 십자가 대할 때에 그 일이 고마워 내 얼굴 감히 못 들고 눈물 흘리도다",
    "늘 울어도 눈물로써 못 갚을 줄 알아 몸밖에 드릴 것 없어 이 몸 바칩니다",
    "아멘",
]


class AddConfirmedUnifiedHymn141Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.songs = [{"id": SONG_ID, "title": "웬말인가 날 위하여", "hymn_no": "143"}]
        self.primary = {"id": PRIMARY_VERSION_ID, **EXPECTED_PRIMARY}
        self.hidden = {"id": UNIFIED_VERSION_ID, **EXPECTED_HIDDEN}
        self.units = []
        for index, (source_id, text) in enumerate(zip(sorted(EXPECTED_UNIT_IDS), LYRIC_PARTS), start=1):
            self.units.append({
                "id": source_id,
                "version_id": UNIFIED_VERSION_ID,
                "unit_order": index,
                "curated_order": index,
                "text": text if index == 6 else f"{index} {text}",
            })

    def test_build_plan_reuses_hidden_version_and_six_units(self) -> None:
        plan = build_plan(self.songs, [self.hidden, self.primary], self.units)
        self.assertEqual(plan["version_id"], UNIFIED_VERSION_ID)
        self.assertEqual(plan["units_reused"], 6)
        self.assertEqual(plan["patch"], PATCH)

    def test_build_plan_rejects_changed_lyrics(self) -> None:
        self.units[0]["text"] = "다른 가사"
        with self.assertRaisesRegex(RuntimeError, "lyrics changed"):
            build_plan(self.songs, [self.hidden, self.primary], self.units)

    def test_build_plan_rejects_occupied_target_order(self) -> None:
        occupied = {"id": "other", "canonical_song_id": SONG_ID, "version_order": 3}
        with self.assertRaisesRegex(RuntimeError, "order is already occupied"):
            build_plan(self.songs, [self.hidden, self.primary, occupied], self.units)

    def test_verify_applied_checks_metadata_and_reused_lyrics(self) -> None:
        unified = copy.deepcopy(self.hidden)
        unified.update(PATCH)
        verify_applied([unified, self.primary], self.units)


if __name__ == "__main__":
    unittest.main()
