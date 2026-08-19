from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_hbible_hymns import HYMNLABEL_FIELDS, unified_number  # noqa: E402
from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


TITLE_REPAIRS = {
    307: ("공중 나는 새르 보라", "공중 나는 새를 보라"),
    326: ("죄집에 눌린 사람은", "죄짐에 눌린 사람은"),
    346: ("값비산 향율을 주께 드린", "값비싼 향유를 주께 드린"),
    438: ("예부터 도움 도시고", "예부터 도움 되시고"),
    455: ("주 안에 이는 나에게", "주 안에 있는 나에게"),
    474: ("이 세상에 금심된 일이 많고", "이 세상에 근심된 일이 많고"),
    486: ("주 에수여 은혜를", "주 예수여 은혜를"),
}


def replacement_patch(version: dict[str, Any], old_title: str, new_title: str) -> dict[str, str]:
    patch: dict[str, str] = {}
    for field in HYMNLABEL_FIELDS:
        value = version.get(field)
        if not isinstance(value, str) or old_title not in value:
            continue
        patch[field] = value.replace(old_title, new_title)
    return patch


def build_plan(versions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for number, (old_title, new_title) in TITLE_REPAIRS.items():
        matches = [version for version in versions if unified_number(version) == number]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one 통일찬송가 {number} version, found {len(matches)}")
        version = matches[0]
        patch = replacement_patch(version, old_title, new_title)
        if not patch:
            if any(new_title in str(version.get(field) or "") for field in HYMNLABEL_FIELDS):
                raise RuntimeError(f"통일찬송가 {number} is already repaired")
            raise RuntimeError(f"Expected title not found for 통일찬송가 {number}: {old_title}")
        plan.append({
            "number": number,
            "version_id": version["id"],
            "old_title": old_title,
            "new_title": new_title,
            "patch": patch,
        })
    return plan


def verify_applied(versions: list[dict[str, Any]]) -> None:
    for number, (old_title, new_title) in TITLE_REPAIRS.items():
        matches = [version for version in versions if unified_number(version) == number]
        if len(matches) != 1:
            raise RuntimeError(f"Post-check expected one 통일찬송가 {number} version, found {len(matches)}")
        values = [str(matches[0].get(field) or "") for field in HYMNLABEL_FIELDS]
        if any(old_title in value for value in values) or not any(new_title in value for value in values):
            raise RuntimeError(f"Post-check failed for 통일찬송가 {number}")


def load_versions(supa_url: str, supa_key: str) -> list[dict[str, Any]]:
    return fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,curated_version_name,version_label,raw_section_name,hymn_no,is_primary",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repair seven confirmed 통일찬송가 title typos")
    parser.add_argument("--apply", action="store_true", help="Apply guarded updates; default is dry-run")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    plan = build_plan(load_versions(supa_url, supa_key))
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", "repairs": plan}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    for repair in plan:
        result = request_json(
            supa_url,
            supa_key,
            "PATCH",
            "mindex_song_versions",
            {"id": f"eq.{repair['version_id']}"},
            repair["patch"],
            prefer="return=representation",
        )
        if not isinstance(result, list) or len(result) != 1:
            raise RuntimeError(f"Update failed for 통일찬송가 {repair['number']}: {result!r}")

    verify_applied(load_versions(supa_url, supa_key))
    print(json.dumps({"status": "verified", "updated": len(plan)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
