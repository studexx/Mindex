from __future__ import annotations

import re
import unittest
from pathlib import Path


APP_JS = Path(__file__).resolve().parents[1] / "app.js"


def read_app_js() -> str:
    return APP_JS.read_text(encoding="utf-8")


def block(source: str, name: str, end_marker: str = "\n};") -> str:
    match = re.search(rf"const\s+{re.escape(name)}\s*=\s*(?:Object\.freeze\()?[\[{{]", source)
    if not match:
        raise AssertionError(f"{name} block not found")
    start = match.start()
    end = source.find(end_marker, match.end())
    if end == -1:
        raise AssertionError(f"{name} block end not found")
    return source[start:end]


def function_block(source: str, name: str) -> str:
    match = re.search(rf"function\s+{re.escape(name)}\s*\([^)]*\)\s*{{", source)
    if not match:
        raise AssertionError(f"{name} function not found")
    depth = 0
    started = False
    for index in range(match.end() - 1, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
            started = True
        elif char == "}":
            depth -= 1
            if started and depth == 0:
                return source[match.start():index + 1]
    raise AssertionError(f"{name} function end not found")


class WorshipRuleGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = read_app_js()

    def test_praise_input_modes_match_database_allowed_values(self) -> None:
        ui_block = block(self.source, "SERVICE_PRAISE_INPUT_MODES", "\n];")
        db_block = self.source[
            self.source.index("const WORSHIP_DB_ELEMENT_INPUT_MODES")
            : self.source.index("const WORSHIP_DB_ELEMENT_TYPES")
        ]
        expected = {
            "score_db": "악보 불러오기",
            "lyrics_db": "가사 불러오기",
            "manual_praise": "직접 입력하기",
        }
        for value, label in expected.items():
            self.assertIn(f'"{value}"', ui_block)
            self.assertIn(label, ui_block)
            self.assertIn(f'"{value}"', db_block)

    def test_media_element_types_remain_supported(self) -> None:
        source = self.source
        for value in ("image", "video", "audio", "score", "file"):
            self.assertRegex(source, rf'\["{value}",')
            self.assertRegex(source, rf'SERVICE_ASSET_KINDS = new Set\(\[[^\]]*"{value}"')

    def test_minister_defaults_for_public_and_young_adult_services(self) -> None:
        defaults = block(self.source, "SERVICE_MINISTER_DEFAULTS", "\n});")
        expectations = [
            ('"sunday-second"', "offeringPrayer", "김남영 목사"),
            ('"sunday-main"', "offeringPrayer", "김남영 목사"),
            ('"young-adult"', "sermon", "김석범 목사"),
            ('"young-adult"', "offeringPrayer", "김석범 목사"),
            ('"young-adult"', "benediction", "김석범 목사"),
        ]
        for service_type, key, value in expectations:
            pattern = rf"{re.escape(service_type)}:[^}}]+{key}:\s*\"{re.escape(value)}\""
            self.assertRegex(defaults, pattern)

    def test_department_announcement_defaults_stay_seeded(self) -> None:
        youth = function_block(self.source, "youthWorshipAnnouncementsStep")
        young_adult = function_block(self.source, "youngAdultWorshipAnnouncementsStep")
        self.assertIn("청소년부 광고", youth)
        self.assertIn("오늘도 청소년부 예배에 오신 여러분을 환영하고 축복합니다 :)", youth)
        self.assertIn("1. 오늘 2부 활동은 반별 모임으로 진행합니다.", youth)
        self.assertIn("청년부 광고", young_adult)
        self.assertIn("오늘도 청년부 예배에 오신 여러분을 환영하고 축복합니다 :)", young_adult)
        self.assertIn("1. 오늘 2부 활동은 셀 모임으로 진행합니다.", young_adult)

    def test_sunday_shared_content_contract_stays_linked(self) -> None:
        shared = function_block(self.source, "sundaySharedContentTypesForItem")
        sync_after_save = function_block(self.source, "syncSharedSundayContentAfterSave")
        sync_to_service = function_block(self.source, "syncSharedSundayContentToService")
        source_lookup = function_block(self.source, "sharedSundayContentSourceItem")
        participant_guard = function_block(self.source, "worshipServiceParticipatesInSharedSundayContent")
        self.assertIn("!isAllGenerationsWorshipService(service)", participant_guard)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(service)", shared)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(sourceService)", sync_after_save)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(service)", sync_after_save)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(targetService)", sync_to_service)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(service)", source_lookup)
        self.assertIn("worshipServiceParticipatesInSharedSundayContent(candidate)", source_lookup)
        self.assertIn('key === "main-praise:3"', shared)
        self.assertIn('["sunday-first", "sunday-second", "sunday-main"]', shared)
        self.assertRegex(shared, r'"scripture-reading",\s*"sermon-title",\s*"sermon-scripture"')
        self.assertIn('key.startsWith("sermon-citation:")', shared)
        self.assertRegex(shared, r'"sunday-second",\s*"sunday-main"')
        self.assertIn('key === "offering-hymn"', shared)

    def test_fixed_doxology_scope_does_not_absorb_sunday_main(self) -> None:
        fixed = function_block(self.source, "publicFixedDoxologySpec")
        self.assertIn('"sunday-first"', fixed)
        self.assertIn('"sunday-second"', fixed)
        self.assertIn('"sunday-afternoon"', fixed)
        self.assertNotIn('"sunday-main": { hymnNo: "5"', fixed)

    def test_public_service_time_windows_are_stable(self) -> None:
        windows = block(self.source, "SERVICE_TIME_WINDOWS")
        expected = {
            "wednesday": ("19:10", "20:30"),
            "friday": ("20:00", "22:00"),
            "monthly": ("20:00", "22:00"),
            "sunday-first": ("07:00", "08:00"),
            "sunday-second": ("08:50", "10:00"),
            "sunday-main": ("10:50", "12:00"),
            "sunday-afternoon": ("13:20", "14:30"),
        }
        for key, (start, end) in expected.items():
            self.assertRegex(windows, rf'"?{re.escape(key)}"?:\s*{{\s*start:\s*"{start}",\s*end:\s*"{end}"')

    def test_persistence_rows_are_sanitized_before_validation(self) -> None:
        save = function_block(self.source, "saveWorshipServiceInstance")
        shared = function_block(self.source, "persistSharedSundayServiceItems")
        sanitizer = function_block(self.source, "sanitizeWorshipPersistenceRows")
        for save_path in (save, shared):
            self.assertIn("sanitizeWorshipPersistenceRows(rows", save_path)
            self.assertLess(
                save_path.index("sanitizeWorshipPersistenceRows(rows"),
                save_path.index("validateWorshipPersistenceRows(rows"),
            )
        self.assertIn("worshipDbInputModeForSave", sanitizer)
        self.assertIn("element.song_version_id = null", sanitizer)
        self.assertIn("section.created_at = section.created_at || persistedAt", sanitizer)
        self.assertIn("sanitizeSongContentStateWithoutSong(element.content_state", sanitizer)
        self.assertIn("sanitizeSongContentStateWithoutSong(element.config.contentState", sanitizer)

    def test_shared_sunday_sync_loads_and_replaces_target_rows(self) -> None:
        helper = function_block(self.source, "ensureWorshipServiceRowsLoadedForPersistence")
        shared = function_block(self.source, "persistSharedSundayServiceItems")
        self.assertIn("fetchWorshipRowsForServiceIds([id])", helper)
        self.assertIn("state.loadedWorshipServiceIds.add(id)", helper)
        self.assertLess(
            shared.index("await ensureWorshipServiceRowsLoadedForPersistence(serviceId)"),
            shared.index("const existingSections"),
        )
        self.assertIn("removedElementIds", shared)
        self.assertIn("removedSectionIds", shared)
        self.assertIn('.from("mindex_worship_elements")', shared)
        self.assertIn('.from("mindex_worship_sections")', shared)

    def test_calendar_load_precedes_auto_worship_generation(self) -> None:
        load_worship = function_block(self.source, "loadWorshipData")
        self.assertLess(
            load_worship.index("await loadCalendarData({ silent: true })"),
            load_worship.index("await ensureUpcomingPublicWorshipServices()"),
        )

if __name__ == "__main__":
    unittest.main()
