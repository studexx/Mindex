import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import import_notion_setlist  # type: ignore  # noqa: E402
import parse_setlists  # type: ignore  # noqa: E402


def build_plans(text: str):
    sections = parse_setlists.parse_text(text)
    return import_notion_setlist.build_service_plans(
        sections,
        source_path="/tmp/setlists.txt",
        source_name="2026 찬양 콘티",
    )


class SetlistImportTest(unittest.TestCase):
    def test_scoped_role_applies_only_to_matching_day(self):
        plans = build_plans(
            """### 청년부 예배
**02/01, 02/08 석재민**
오직 주의 사랑에 매여
주를 바라보며
결단(01)/ 예수 예수
"""
        )

        self.assertEqual([plan.source_id[1] for plan in plans], [date(2026, 2, 1), date(2026, 2, 8)])
        first_titles = [item["title"] for section in plans[0].sections for item in section.items]
        second_titles = [item["title"] for section in plans[1].sections for item in section.items]
        self.assertEqual(first_titles, ["오직 주의 사랑에 매여", "주를 바라보며", "예수 예수"])
        self.assertEqual(second_titles, ["오직 주의 사랑에 매여", "주를 바라보며"])

    def test_unlabeled_songs_become_separate_praise_items(self):
        plans = build_plans(
            """### 주일예배
**01/04 이재희**
2부 특송/ 502 빛의 사자들이여
온 맘 다해
주님의 영광 나타나셨네
나의 반석이신 하나님
주 여호와는 광대하시도다
나는 예배자입니다 + 소원
"""
        )

        self.assertEqual(len(plans), 1)
        by_title = {section.title: section for section in plans[0].sections}
        self.assertEqual(
            by_title["2부 특송"].items,
            [{"label": "2부 특송", "title": "502 빛의 사자들이여"}],
        )
        self.assertEqual(
            by_title["찬양"].items,
            [
                {"label": "찬양", "title": "온 맘 다해"},
                {"label": "찬양", "title": "주님의 영광 나타나셨네"},
                {"label": "찬양", "title": "나의 반석이신 하나님"},
                {"label": "찬양", "title": "주 여호와는 광대하시도다"},
                {"label": "찬양", "title": "나는 예배자입니다 + 소원"},
            ],
        )

    def test_fixed_role_change_resolves_by_service_date(self):
        plans = build_plans(
            """### 주일예배
송영/ 5 이 천지간 만물들아 → 파송/ 359 천성을 향해 가는 성도들아 [04-26–]
폐회/ 359 천성을 향해 가는 성도들아 → 352 십자가 군병들아 [04-26–]
**04/19 이재희**
은혜
**04/26 이재희**
감사
"""
        )

        before = {section.title: section.items for section in plans[0].sections}
        after = {section.title: section.items for section in plans[1].sections}
        self.assertEqual(before["송영"], [{"label": "송영", "title": "5 이 천지간 만물들아"}])
        self.assertEqual(before["폐회"], [{"label": "폐회", "title": "359 천성을 향해 가는 성도들아"}])
        self.assertEqual(after["파송"], [{"label": "파송", "title": "359 천성을 향해 가는 성도들아"}])
        self.assertEqual(after["폐회"], [{"label": "폐회", "title": "352 십자가 군병들아"}])

    def test_identical_duplicate_is_collapsed(self):
        text = """### 수요예배
**03/22 김석범 목사님**
은혜
**03/22 김석범 목사님**
은혜
"""
        plans = build_plans(text)
        self.assertEqual(len(import_notion_setlist.deduplicate_service_plans(plans)), 1)

    def test_conflicting_duplicate_is_rejected(self):
        text = """### 수요예배
**06/17 김석범 목사님**
주께 가까이
**06/17 김석범 목사님**
주 되심
"""
        plans = build_plans(text)
        with self.assertRaisesRegex(ValueError, "wednesday 2026-06-17"):
            import_notion_setlist.deduplicate_service_plans(plans)

    def test_service_type_ids_use_database_candidates(self):
        plans = build_plans(
            """### 주일예배
**01/04 이재희**
은혜
### 수요예배
**01/07 김석범 목사님**
감사
"""
        )
        resolved = import_notion_setlist.resolve_service_type_ids(plans, {"sun_3rd", "wed"})
        self.assertEqual(resolved, {"sunday-main": "sun_3rd", "wednesday": "wed"})

    def test_special_sections_keep_their_database_types(self):
        plans = build_plans(
            """### 새벽기도회
**03/30 김석범 목사님**
보혈을 지나
### 오멜세기기도회
**05/04 김석범 목사님**
우리 함께 기도해
"""
        )
        resolved = import_notion_setlist.resolve_service_type_ids(
            plans,
            {"holy_week_dawn", "omer"},
        )
        self.assertEqual(
            resolved,
            {"holy-week-dawn": "holy_week_dawn", "omer": "omer"},
        )

    def test_apply_stores_titles_as_unlinked_manual_praise(self):
        plan = build_plans(
            """### 주일예배
**01/04 이재희**
온 맘 다해
"""
        )[0]
        requests = []

        def fake_request(base_url, key, method, path, query=None, body=None, prefer=None):
            requests.append({"method": method, "path": path, "query": query, "body": body})
            if path == "mindex_worship_service_types":
                return [{"id": "sun_3rd"}]
            if method == "GET" and path == "mindex_worship_services":
                return []
            if path == "mindex_worship_services":
                return [{"id": "service-1", "title": "주일예배 (3부)"}]
            if path == "mindex_worship_sections":
                return [{"id": "section-1"}]
            if path == "mindex_worship_elements":
                return [{"id": "element-1"}]
            raise AssertionError(f"unexpected request: {method} {path}")

        with patch.object(import_notion_setlist, "_api_request", side_effect=fake_request):
            import_notion_setlist.apply_plans("https://example.invalid", "key", [plan])

        service_payload = next(
            request["body"][0]
            for request in requests
            if request["method"] == "POST" and request["path"] == "mindex_worship_services"
        )
        element_payload = next(
            request["body"][0]
            for request in requests
            if request["method"] == "POST" and request["path"] == "mindex_worship_elements"
        )
        self.assertEqual(service_payload["service_type_id"], "sun_3rd")
        self.assertEqual(element_payload["element_type"], "praise")
        self.assertEqual(element_payload["title"], "온 맘 다해")
        self.assertIsNone(element_payload["song_id"])
        self.assertIsNone(element_payload["song_version_id"])
        self.assertEqual(element_payload["input_mode"], "praise_db")
        self.assertEqual(element_payload["config"]["inputMode"], "manual_praise")


if __name__ == "__main__":
    unittest.main()
