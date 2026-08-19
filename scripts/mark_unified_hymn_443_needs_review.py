from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


VERSION_ID = "f5bb8333-14cb-5385-8af6-ab9f9b1bcf9c"
EXPECTED_UNIT_IDS = {
    "46667ad3-3bcd-52ca-b708-ac34e2af36fd",
    "d9af2233-c621-5d90-a5a3-fa9b94942e8e",
    "4a34615c-f4f4-5423-ad00-6ccb0ba9d0ec",
    "338cbd15-1cc1-5d36-8e00-2f93a4276af7",
    "49267934-725f-5250-a337-ea1472bdac7a",
}
OLD_NOTE = "Verified against 통일찬송가 443; spacing modernized."
NEW_NOTE = "Automated reference match; manual review required."


def build_plan(version: dict[str, Any], units: list[dict[str, Any]]) -> dict[str, Any]:
    if (
        str(version.get("id")) != VERSION_ID
        or version.get("curated_version_name") != "통일 443 시험 받을 때에"
        or version.get("version_review_status") != "reviewed"
    ):
        raise RuntimeError("Unexpected 통일찬송가 443 version review state")
    if {str(unit.get("id")) for unit in units} != EXPECTED_UNIT_IDS or len(units) != 5:
        raise RuntimeError("Unexpected 통일찬송가 443 unit set")
    if any(
        unit.get("version_id") != VERSION_ID
        or unit.get("review_status") != "reviewed"
        or unit.get("review_note") != OLD_NOTE
        or unit.get("reviewed_at") is not None
        for unit in units
    ):
        raise RuntimeError("Unexpected 통일찬송가 443 unit review state")
    return {
        "version_patch": {"version_review_status": "pending"},
        "unit_patch": {"review_status": "needs_review", "review_note": NEW_NOTE, "reviewed_at": None},
    }


def verify_final(version: dict[str, Any], units: list[dict[str, Any]]) -> None:
    if version.get("version_review_status") != "pending":
        raise RuntimeError("Post-check failed for 통일찬송가 443 version review state")
    if len(units) != 5 or any(
        unit.get("review_status") != "needs_review"
        or unit.get("review_note") != NEW_NOTE
        or unit.get("reviewed_at") is not None
        for unit in units
    ):
        raise RuntimeError("Post-check failed for 통일찬송가 443 unit review state")


def load_data(supa_url: str, supa_key: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    versions = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,curated_version_name,version_review_status",
    )
    version = next((row for row in versions if str(row.get("id")) == VERSION_ID), None)
    if not version:
        raise RuntimeError("통일찬송가 443 version is missing")
    units = [
        row
        for row in fetch_all(
            supa_url,
            supa_key,
            "mindex_version_units",
            "id,version_id,review_status,review_note,reviewed_at",
        )
        if str(row.get("version_id")) == VERSION_ID
    ]
    return version, units


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mark automated 통일찬송가 443 data for manual review")
    parser.add_argument("--apply", action="store_true", help="Apply guarded pending/needs_review updates")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supa_url, supa_key = read_config()
    version, units = load_data(supa_url, supa_key)
    plan = build_plan(version, units)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", "units": len(units), **plan}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    updated_version = request_json(
        supa_url,
        supa_key,
        "PATCH",
        "mindex_song_versions",
        {"id": f"eq.{VERSION_ID}", "version_review_status": "eq.reviewed"},
        plan["version_patch"],
        prefer="return=representation",
    )
    updated_units = request_json(
        supa_url,
        supa_key,
        "PATCH",
        "mindex_version_units",
        {"version_id": f"eq.{VERSION_ID}", "review_status": "eq.reviewed"},
        plan["unit_patch"],
        prefer="return=representation",
    )
    if not isinstance(updated_version, list) or len(updated_version) != 1:
        raise RuntimeError(f"Version review update failed: {updated_version!r}")
    if not isinstance(updated_units, list) or len(updated_units) != 5:
        raise RuntimeError(f"Unit review update failed: {updated_units!r}")

    final_version, final_units = load_data(supa_url, supa_key)
    verify_final(final_version, final_units)
    print(json.dumps({"status": "verified", "version": 1, "units": 5}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
