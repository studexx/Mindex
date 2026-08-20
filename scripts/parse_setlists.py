#!/usr/bin/env python3
"""
Parse worship setlist text into a reviewable JSON summary.

Usage:
  python3 scripts/parse_setlists.py path/to/setlist.txt

Content data should live in Supabase, not in generated seed files. Use this
script for review, then use import_services.py when the text should be written
to the database.
"""

import re
import sys
import json
from datetime import date
from typing import Any

# ─── Service type definitions ─────────────────────────────────────────────────
SERVICE_TYPES = [
    {"id": "sunday-first",     "name": "주일예배 (1부)", "sort_order": 1},
    {"id": "sunday-second",    "name": "주일예배 (2부)", "sort_order": 2},
    {"id": "sunday-main",      "name": "주일예배 (3부)", "sort_order": 3},
    {"id": "sunday-afternoon", "name": "주일오후예배",   "sort_order": 4},
    {"id": "wednesday",        "name": "수요예배",       "sort_order": 5},
    {"id": "friday",           "name": "금요기도회",     "sort_order": 6},
    {"id": "monthly",          "name": "월삭예배",       "sort_order": 7},
    {"id": "holy-week-dawn",   "name": "특별새벽기도회", "sort_order": 8},
    {"id": "omer",              "name": "오멜세기기도회", "sort_order": 9},
    {"id": "special",           "name": "특별예배",       "sort_order": 10},
    {"id": "children",          "name": "어린이부 예배",  "sort_order": 11},
    {"id": "youth",             "name": "청소년부 예배",  "sort_order": 12},
    {"id": "young-adult",       "name": "청년부 예배",    "sort_order": 13},
]
SECTION_NAME_TO_ID = {t["name"]: t["id"] for t in SERVICE_TYPES}
SECTION_NAME_TO_ID.update({
    "주일예배": "sunday-main",
    "새벽기도회": "holy-week-dawn",
    "특별새벽기도회": "holy-week-dawn",
    "오멜세기기도회": "omer",
})

def parse_date(mm_dd, base_year=2026):
    """Parse MM/DD → date. Guess year (Dec entries before a Jan sequence → 2025)."""
    parts = mm_dd.strip().split("/")
    m, d = int(parts[0]), int(parts[1])
    year = 2025 if m == 12 else base_year
    return date(year, m, d)

def normalize_leader(raw, type_id):
    raw = re.sub(r"\s+", " ", (raw or "").strip())
    if not raw:
        return None
    title_rules = [
        ("목사님", "목사"),
        ("목사", "목사"),
        ("전도사님", "전도사"),
        ("전도사", "전도사"),
        ("집사님", "집사"),
        ("집사", "집사"),
        ("장로님", "장로"),
        ("장로", "장로"),
        ("권사님", "권사"),
        ("권사", "권사"),
        ("선생님", "선생님"),
        ("선생", "선생님"),
        ("청년", "청년"),
    ]
    for suffix, title in title_rules:
        if raw.endswith(suffix):
            name = raw[:-len(suffix)].strip()
            return f"{name} {title}" if name else title
    default_title = "선생님" if type_id in ("children", "youth") else "청년"
    return f"{raw} {default_title}"

DATE_HEADER = re.compile(r"^\*\*(.+?)\*\*\s*$")
SECTION_HEADER = re.compile(r"^###\s+(.+)$")
ITEM_LABEL = re.compile(r"^(.+?)\s*/\s*(.*)")
DATE_RANGE = re.compile(r"^(\d{1,2}/\d{1,2})[–—-](\d{1,2}/\d{1,2})")
MULTI_DATES = re.compile(r"^(\d{1,2}/\d{1,2}(?:\s*,\s*\d{1,2}/\d{1,2})+)\s+(.*)")
SINGLE_DATE = re.compile(r"^(\d{1,2}/\d{1,2})\s+(.*)")
ITEM_SCOPE = re.compile(r"^(.*?)\((\d{1,2})\)\s*$")
FIXED_ITEM_CHANGE = re.compile(
    r"^(.*?)\s*→\s*(?:(.+?)\s*/\s*)?(.+?)\s*\[(\d{1,2})-(\d{1,2})[–—-]\]\s*$"
)

def parse_date_header(raw):
    """
    Parse date header text like:
      '01/04 이재희'
      '01/18 이재희 [온세대 찬양예배]'
      '02/01 사무총회 → 02/08 박수경 집사님'
      '04/05 김석범 목사님 [2·3부 통합]'
      '12/28–01/04 석재민'
    Returns dict with date, date_end, leader, tags.
    """
    # strip bold markers if any
    raw = raw.strip().strip("*").strip()

    tags = []
    tag_match = re.search(r"\[([^\]]+)\]", raw)
    if tag_match:
        tags = [t.strip() for t in tag_match.group(1).split(",")]
        raw = raw[:tag_match.start()].strip() + raw[tag_match.end():].strip()

    # single date with possible "→" redirect:
    #   02/01 사무총회 → 02/08 박수경 집사님  (use latter date)
    #   01/11 김윤서 → 박소영 전도사님       (same date, updated leader)
    if "→" in raw:
        parts = raw.split("→")
        latest = parts[-1].strip()
        if SINGLE_DATE.match(latest) or DATE_RANGE.match(latest):
            raw = latest
        else:
            original = SINGLE_DATE.match(parts[0].strip())
            if original:
                raw = f"{original.group(1)} {latest}"
            else:
                original_range = DATE_RANGE.match(parts[0].strip())
                raw = f"{original_range.group(0)} {latest}" if original_range else latest

    # date range?
    dr = DATE_RANGE.match(raw)
    if dr:
        d1 = parse_date(dr.group(1))
        d2 = parse_date(dr.group(2))
        # date_end year fix: if d2 < d1 it spans year boundary
        if d2 < d1:
            d2 = date(d1.year + 1, d2.month, d2.day)
        rest = raw[dr.end():].strip()
        leader = rest if rest else None
        return {"dates": [d1], "date_end": d2, "leader": leader, "tags": tags}

    # comma-separated dates:
    #   12/28, 01/04 석재민
    md = MULTI_DATES.match(raw)
    if md:
        raw_dates = [t.strip() for t in md.group(1).split(",")]
        leader = md.group(2).strip() or None
        parsed_dates = [parse_date(token) for token in raw_dates if SINGLE_DATE.match(f"{token} ")]
        if not parsed_dates:
            return None
        return {"dates": parsed_dates, "date_end": None, "leader": leader, "tags": tags}

    sd = SINGLE_DATE.match(raw)
    if sd:
        d = parse_date(sd.group(1))
        leader = sd.group(2).strip() or None
        return {"dates": [d], "date_end": None, "leader": leader, "tags": tags}

    return None

def parse_items(lines):
    """
    Parse item lines into list of {label, raw_title, scope_day}.
    Handles label/ format, blank lines, '-' entries, section separators '→'.
    """
    items = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line == "→":
            # separator between two halves of same service (오멜세기기도회 05/14)
            items.append({"label": "—", "raw_title": "", "scope_day": None})
            continue
        m = ITEM_LABEL.match(line)
        if m:
            label = m.group(1).strip()
            raw = m.group(2).strip()
            if raw or label:
                scope_match = ITEM_SCOPE.match(label)
                item_scope_day = int(scope_match.group(2)) if scope_match else None
                clean_label = scope_match.group(1).strip() if scope_match else label
                items.append({"label": clean_label if clean_label else None, "raw_title": raw, "scope_day": item_scope_day})
        else:
            items.append({"label": None, "raw_title": line, "scope_day": None})
    return items


def parse_fixed_item(label: str, raw_title: str, base_year: int = 2026) -> dict[str, Any]:
    fixed = {
        "label": label.strip(),
        "raw_title": raw_title.strip(),
        "changes": [],
    }
    match = FIXED_ITEM_CHANGE.match(raw_title.strip())
    if not match:
        return fixed

    previous_title, changed_label, changed_title, month, day = match.groups()
    fixed["raw_title"] = previous_title.strip()
    fixed["changes"].append({
        "effective_date": date(base_year, int(month), int(day)),
        "label": (changed_label or label).strip(),
        "raw_title": changed_title.strip(),
    })
    return fixed


def fixed_item_for_date(item: dict[str, Any], service_date: date) -> dict[str, str]:
    resolved = {
        "label": str(item.get("label") or "").strip(),
        "raw_title": str(item.get("raw_title") or "").strip(),
    }
    changes = sorted(item.get("changes") or [], key=lambda change: change["effective_date"])
    for change in changes:
        if change["effective_date"] <= service_date:
            resolved = {
                "label": str(change.get("label") or resolved["label"]).strip(),
                "raw_title": str(change.get("raw_title") or "").strip(),
            }
    return resolved


def item_applies_to_date(item: dict[str, Any], svc_date: date) -> bool:
    scope_day = item.get("scope_day")
    if scope_day is None:
        return True
    return scope_day == svc_date.day

# ─── Main parser ──────────────────────────────────────────────────────────────
def parse_text(text):
    """
    Returns list of:
      {type_id, fixed_items, services: [{date, date_end, leader, tags, raw_text, items}]}
    """
    sections = []
    current_section = None
    current_service_dates: list[date] | None = None
    current_service_meta: dict | None = None
    current_lines = []

    def flush_service():
        nonlocal current_service_dates, current_service_meta, current_lines
        if current_service_meta is not None and current_service_dates and current_section:
            raw = "\n".join(current_lines)
            items = parse_items(current_lines)
            for svc_date in current_service_dates:
                applicable_items = (
                    items
                    if len(current_service_dates) == 1
                    else [item for item in items if item_applies_to_date(item, svc_date)]
                )
                filtered_items = [{k: v for k, v in item.items() if k != "scope_day"} for item in applicable_items]
                filtered_raw = "\n".join(
                    item["raw_title"] for item in filtered_items if item.get("raw_title") is not None
                )
                current_section["services"].append(
                    {
                        "date": svc_date,
                        "date_end": current_service_meta.get("date_end"),
                        "leader": current_service_meta.get("leader"),
                        "tags": current_service_meta.get("tags", []),
                        "items": filtered_items,
                        "raw_text": filtered_raw,
                    }
                )
        current_service_meta = None
        current_service_dates = None
        current_lines = []

    for line in text.splitlines():
        # section header
        sh = SECTION_HEADER.match(line)
        if sh:
            flush_service()
            if current_section:
                sections.append(current_section)
            type_id = SECTION_NAME_TO_ID.get(sh.group(1).strip())
            current_section = {
                "type_id": type_id or sh.group(1).strip(),
                "name": sh.group(1).strip(),
                "fixed_items": [],
                "services": [],
            }
            continue

        if current_section is None:
            continue

        # date header
        dh = DATE_HEADER.match(line)
        if dh:
            flush_service()
            parsed = parse_date_header(dh.group(1))
            if not parsed:
                continue
            current_service_dates = parsed.get("dates", [])
            current_service_meta = {
                "date_end": parsed.get("date_end"),
                "leader": normalize_leader(parsed.get("leader"), current_section["type_id"]),
                "tags": parsed.get("tags", []),
            }
            current_lines = []
            continue

        # fixed items before any date header (파송/, 폐회/, 봉헌/)
        if current_service_meta is None:
            m = ITEM_LABEL.match(line.strip())
            if m and line.strip():
                fixed_item = parse_fixed_item(m.group(1), m.group(2))
                fixed_item["sort_order"] = len(current_section["fixed_items"]) + 1
                current_section["fixed_items"].append(fixed_item)
            continue

        current_lines.append(line)

    flush_service()
    if current_section:
        sections.append(current_section)

    return sections

# ─── Review output ────────────────────────────────────────────────────────────
def summarize(sections):
    result = []
    for section in sections:
        services = []
        for service in section["services"]:
            services.append({
                "date": service["date"].isoformat(),
                "date_end": service["date_end"].isoformat() if service.get("date_end") else None,
                "leader": service.get("leader"),
                "tags": service.get("tags", []),
                "item_count": len(service.get("items", [])),
                "items": service.get("items", []),
            })
        result.append({
            "type_id": section["type_id"],
            "name": section["name"],
            "fixed_items": section.get("fixed_items", []),
            "service_count": len(services),
            "services": services,
        })
    return result

# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        print("Usage: python3 parse_setlists.py <input.txt>", file=sys.stderr)
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    sections = parse_text(text)
    print(json.dumps(summarize(sections), ensure_ascii=False, indent=2))
