#!/usr/bin/env python3
"""Create missing Mindex service skeletons from existing worship PPT files.

This is intentionally conservative:
  - it never updates or deletes existing service items;
  - it creates a service only when that type/date is missing;
  - with --fill-empty it may insert items only into an existing service that has
    zero items;
  - PPT files are read-only source hints, not canonical storage.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from zipfile import BadZipFile, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PPT_ROOT = Path("/Users/parkjihun/Library/CloudStorage/OneDrive-Personal/02_Church/11_예배")
ENV_PATHS = (
    ROOT / ".env.supabase",
    ROOT / ".env.supabase.local",
    Path("/Users/parkjihun/Documents/INDEX/.env.supabase"),
)

TEXT_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
SLIDE_RE = re.compile(r"slide(\d+)\.xml$")

SERVICE_FILE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^Sun_(\d{4}-\d{2}-\d{2})_1st\.pptx$"), "sunday-first"),
    (re.compile(r"^Sun_(\d{4}-\d{2}-\d{2})_2nd\.pptx$"), "sunday-second"),
    (re.compile(r"^Sun_(\d{4}-\d{2}-\d{2})_3rd\.pptx$"), "sunday-main"),
    (re.compile(r"^Sun_(\d{4}-\d{2}-\d{2})_4th\.pptx$"), "sunday-afternoon"),
    (re.compile(r"^Wed_(\d{4}-\d{2}-\d{2})\.pptx$"), "wednesday"),
    (re.compile(r"^Fri_(\d{4}-\d{2}-\d{2})\.pptx$"), "friday"),
    (re.compile(r"^Moon_(\d{4}-\d{2}-\d{2})\.pptx$"), "monthly"),
    (re.compile(r"^Elem_(\d{4}-\d{2}-\d{2})\.pptx$"), "children"),
    (re.compile(r"^TOV_(\d{4}-\d{2}-\d{2})\.pptx$"), "youth"),
    (re.compile(r"^RIA_(\d{4}-\d{2}-\d{2})\.pptx$"), "young-adult"),
]

SERVICE_SKELETONS: dict[str, list[str]] = {
    "sunday-first": ["사도신경", "찬송", "참회기도", "기도", "성경봉독", "특송", "설교", "결단기도", "봉헌", "봉헌기도", "교회소식", "송영", "축도"],
    "sunday-second": ["사도신경", "찬송", "참회기도", "기도", "성경봉독", "특송", "설교", "결단기도", "봉헌", "봉헌기도", "교회소식", "송영", "축도"],
    "sunday-main": ["사도신경", "찬양", "성경봉독", "특송", "설교", "결단기도", "봉헌", "봉헌기도", "교회소식", "송영", "축도"],
    "sunday-afternoon": ["찬양", "묵도", "찬송", "기도", "성경봉독", "설교", "결단기도", "교회소식", "송영", "축도"],
    "wednesday": ["찬양", "기도", "교회소식", "성경봉독", "설교", "결단찬양", "결단기도", "축도"],
    "friday": ["찬양", "기도", "특송", "교회소식", "성경봉독", "설교", "결단찬양", "기도회", "통성기도", "자율기도"],
    "monthly": ["찬양", "기도", "성경봉독", "특송", "설교", "결단찬양", "기도", "봉헌", "봉헌기도", "교회소식", "축도"],
    "children": ["사도신경", "찬양", "예배의 부름", "성경봉독", "설교", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "나래파송", "주기도문", "광고", "교제"],
    "youth": ["사도신경", "찬양", "통성기도", "대표기도", "봉헌", "봉헌찬양", "봉헌기도", "성경봉독", "설교", "결단찬양", "결단기도", "주기도문", "광고", "교제"],
    "young-adult": ["사도신경", "대표기도", "찬양", "통성기도", "성경봉독", "설교", "결단찬양", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "광고", "파송찬양", "축도", "교제"],
}

STRUCTURAL_LABELS = [
    "사도신경", "참회기도", "대표기도", "기도", "성경봉독", "설교", "결단기도",
    "봉헌기도", "교회소식", "광고", "송영", "축도", "묵도", "주기도문",
    "통성기도", "기도회", "자율기도", "파송기도", "파송사", "파송장 수여",
    "파송 선교사 인사", "공동체고백", "예배의 부름", "나래파송", "교제",
]
SONG_LABELS = ["결단찬양", "파송찬양", "봉헌찬양", "파송찬송", "폐회찬송", "봉헌찬송", "송영", "찬양", "찬송", "특송", "봉헌", "파송", "폐회", "결단", "기도"]


@dataclass
class PptService:
    path: Path
    service_type: str
    service_date: str
    items: list[dict[str, str]]
    confidence: str


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def read_config() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
    if url and key:
        return url.rstrip("/"), key
    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("SUPABASE_URL", "")
        key = values.get("SUPABASE_SERVICE_ROLE_KEY") or values.get("SUPABASE_KEY") or ""
        if url and key:
            return url.rstrip("/"), key
    raise RuntimeError("Supabase config not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")


class RestClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        }

    def request(self, method: str, table: str, params: dict[str, str] | None = None, data: Any = None, prefer: str = "return=representation"):
        query = f"?{urlencode(params or {}, safe='*,.():-')}" if params else ""
        headers = dict(self.headers)
        body = None
        if data is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(data, ensure_ascii=False).encode()
            headers["Prefer"] = prefer
        req = Request(f"{self.url}/rest/v1/{table}{query}", data=body, headers=headers, method=method)
        try:
            with urlopen(req, timeout=30) as response:
                raw = response.read()
                return json.loads(raw.decode()) if raw else None
        except HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"{method} {table} failed ({error.code}): {detail}") from error

    def get(self, table: str, params: dict[str, str]):
        return self.request("GET", table, params=params)

    def insert(self, table: str, rows: Any):
        return self.request("POST", table, data=rows)

    def delete(self, table: str, params: dict[str, str]):
        return self.request("DELETE", table, params=params, prefer="return=minimal")


def ppt_to_service(path: Path) -> PptService | None:
    for pattern, service_type in SERVICE_FILE_PATTERNS:
        match = pattern.match(path.name)
        if match:
            items = infer_items_from_slides(extract_slide_texts(path), service_type)
            confidence = "ppt" if items else "template"
            if should_use_template_skeleton(service_type, items):
                items = [{"label": label, "raw_title": ""} for label in SERVICE_SKELETONS.get(service_type, [])]
                confidence = "template"
            return PptService(path, service_type, match.group(1), items, confidence)
    return None


def extract_slide_texts(path: Path) -> list[str]:
    try:
        with ZipFile(path) as archive:
            slides = sorted(
                [name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")],
                key=slide_sort_key,
            )
            return [tokens_to_text(extract_text_tokens(archive.read(name))) for name in slides]
    except (BadZipFile, ET.ParseError) as error:
        print(f"  ! could not read {path.name}: {error}", file=sys.stderr)
        return []


def slide_sort_key(name: str) -> int:
    match = SLIDE_RE.search(name)
    return int(match.group(1)) if match else 0


def extract_text_tokens(xml_bytes: bytes) -> list[str]:
    root = ET.fromstring(xml_bytes)
    tokens = []
    for node in root.iter(TEXT_NS + "t"):
        text = (node.text or "").strip()
        if text:
            tokens.append(text)
    return tokens


def tokens_to_text(tokens: list[str]) -> str:
    text = " ".join(tokens)
    text = re.sub(r"\s+([,.;:?!])", r"\1", text)
    text = re.sub(r"([(\[])\s+", r"\1", text)
    text = re.sub(r"\s+([)\]])", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def infer_items_from_slides(slides: list[str], service_type: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for text in slides:
        if not text:
            continue
        candidate = infer_song_item(text) or infer_structural_item(text)
        if not candidate:
            continue
        key = (candidate.get("label", ""), candidate.get("raw_title", ""))
        if key in seen:
            continue
        seen.add(key)
        items.append(candidate)

    if service_type in ("sunday-first", "sunday-second") and not any(item.get("label") == "사도신경" for item in items):
        items.insert(0, {"label": "사도신경", "raw_title": ""})
    return normalize_contextual_roles(compact_song_labels(items), service_type)


def infer_song_item(text: str) -> dict[str, str] | None:
    if "♪" not in text:
        return None
    cleaned = strip_spaced_english_heading(text).replace("♪", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return None

    label = ""
    for known in SONG_LABELS:
        pattern = rf"(?:^|\s){re.escape(known)}(?:\s|$)"
        if re.search(pattern, cleaned):
            label = {"파송찬송": "파송", "폐회찬송": "폐회", "봉헌찬송": "봉헌"}.get(known, known)
            cleaned = re.sub(pattern, " ", cleaned, count=1).strip()
            break
    cleaned = cleanup_title(cleaned)
    if not cleaned:
        return None
    if len(cleaned) > 80:
        return None
    return {"label": label, "raw_title": cleaned}


def infer_structural_item(text: str) -> dict[str, str] | None:
    plain = strip_spaced_english_heading(text)
    for label in STRUCTURAL_LABELS:
        if not structural_label_present(plain, label):
            continue
        raw_title = ""
        assignee = ""
        if label == "성경봉독":
            raw_title = infer_scripture_reference(plain)
        elif label == "설교":
            raw_title = infer_quoted_title(plain)
            assignee = infer_person_after_label(plain, label)
        elif label == "송영":
            raw_title = infer_component_song_title(plain, label)
        elif label in ("대표기도", "기도", "봉헌기도", "축도", "파송기도", "파송사"):
            assignee = infer_person_after_label(plain, label)
        return {"label": label, "raw_title": raw_title, "assignee": assignee}
    if "♪" not in plain:
        assigned = infer_assigned_component(plain)
        if assigned:
            return assigned
    return None


def infer_assigned_component(text: str) -> dict[str, str] | None:
    if "봉헌기도" in text or "파송기도" in text:
        return None
    for label in ("특송", "봉헌", "파송", "폐회"):
        if label not in text:
            continue
        raw_title = infer_component_song_title(text, label)
        if raw_title:
            return {"label": label, "raw_title": raw_title, "assignee": ""}
        return {"label": label, "raw_title": "", "assignee": infer_person_after_label(text, label)}
    return None


def infer_component_song_title(text: str, label: str) -> str:
    after = text.split(label, 1)[-1]
    after = re.sub(r"^[\s/:·-]+", "", after).strip()
    if re.search(r"(?:찬\s*)?\d{1,3}\s*장", after):
        return cleanup_title(after)
    if "♪" in after:
        return cleanup_title(after.replace("♪", " "))
    return ""


def structural_label_present(text: str, label: str) -> bool:
    if label not in text:
        return False
    if label == "기도회" and "시작" in text:
        return False
    if label in ("기도", "교제", "묵도", "통성기도", "자율기도"):
        return bool(re.search(rf"(?:^|\s){re.escape(label)}(?:\s|$)", text)) and len(text) < 90
    if label == "기도회":
        return bool(re.search(rf"(?:^|\s){re.escape(label)}(?:\s|$)", text)) and len(text) < 90
    if label == "봉헌기도":
        return "봉헌기도" in text
    return True


def strip_spaced_english_heading(text: str) -> str:
    return re.sub(r"(?:\b[A-Z]\s+){2,}[A-Z]\b", " ", text)


def cleanup_title(text: str) -> str:
    text = text.replace("♬", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^찬\s*(\d{1,3})\s*장\s*$", r"\1", text)
    text = re.sub(r"^찬\s*(\d{1,3})\s*장\s+", r"\1 ", text).strip()
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\[\s+", "[", text)
    text = re.sub(r"\s+\]", "]", text)
    text = re.sub(r"\s*([+＋])\s*", r" + ", text)
    text = re.sub(r"^\s*[/:·-]\s*", "", text)
    return text.strip()


def infer_scripture_reference(text: str) -> str:
    match = re.search(r"([가-힣]{1,5})\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[–—-]\s*(\d{1,3}))?", text)
    return match.group(0).replace(" ", "") if match else ""


def infer_quoted_title(text: str) -> str:
    match = re.search(r"[‘'“\"]\s*([^’'”\"]+?)\s*[’'”\"]", text)
    return cleanup_title(match.group(1)) if match else ""


def infer_person_after_label(text: str, label: str) -> str:
    after = text.split(label, 1)[-1].strip()
    after = re.sub(r"\b(청년|목사님?|전도사님?|집사님?|선생님?|학생|장로|안수집사)\b.*$", lambda m: m.group(0), after).strip()
    parts = after.split()
    if not parts:
        return ""
    if len(parts) >= 3 and parts[2] == "안수집사":
        return " ".join(parts[:3])
    return " ".join(parts[:2])


def compact_song_labels(items: list[dict[str, str]]) -> list[dict[str, str]]:
    output = []
    for item in items:
        label = item.get("label", "")
        if label in ("찬양", "") and item.get("raw_title"):
            item = {**item, "label": "찬양"}
        output.append(item)
    return output


def normalize_contextual_roles(items: list[dict[str, str]], service_type: str) -> list[dict[str, str]]:
    if service_type not in ("sunday-first", "sunday-second", "sunday-main"):
        return items
    saw_benediction = False
    output = []
    for item in items:
        label = item.get("label", "")
        if label == "축도":
            saw_benediction = True
            output.append(item)
            continue
        if saw_benediction and label in ("찬양", "찬송") and item.get("raw_title"):
            output.append({**item, "label": "폐회"})
            saw_benediction = False
            continue
        output.append(item)
    return output


def should_use_template_skeleton(service_type: str, items: list[dict[str, str]]) -> bool:
    if service_type not in SERVICE_SKELETONS:
        return False
    return not items


def discover_ppt_services(root: Path, start: str | None, end: str | None) -> list[PptService]:
    services = []
    for path in sorted(root.rglob("*.pptx")):
        if path.name.startswith("~$"):
            continue
        parsed = ppt_to_service(path)
        if not parsed:
            continue
        if start and parsed.service_date < start:
            continue
        if end and parsed.service_date > end:
            continue
        services.append(parsed)
    return services


def fetch_existing_service(client: RestClient, service_type: str, service_date: str) -> dict[str, Any] | None:
    rows = client.get("mindex_services", {
        "select": "*",
        "type_id": f"eq.{service_type}",
        "date": f"eq.{service_date}",
        "limit": "1",
    }) or []
    return rows[0] if rows else None


def fetch_service_items(client: RestClient, service_id: str) -> list[dict[str, Any]]:
    return client.get("mindex_service_items", {
        "select": "*",
        "service_id": f"eq.{service_id}",
        "order": "sort_order.asc",
    }) or []


def create_service(client: RestClient, service: PptService) -> str:
    rows = client.insert("mindex_services", {
        "type_id": service.service_type,
        "date": service.service_date,
        "date_end": None,
        "leader": None,
        "tags": ["PPT 확인"],
        "raw_text": f"Imported skeleton from {service.path.name}",
    }) or []
    if not rows:
        raise RuntimeError(f"Service insert returned no row for {service.path.name}")
    return rows[0]["id"]


def insert_items(client: RestClient, service_id: str, items: list[dict[str, str]]) -> None:
    rows = []
    for index, item in enumerate(items):
        rows.append({
            "service_id": service_id,
            "sort_order": index + 1,
            "label": item.get("label") or None,
            "assignee": item.get("assignee") or "",
            "raw_title": item.get("raw_title") or "",
        })
    if rows:
        client.insert("mindex_service_items", rows)


def summarize_items(items: list[dict[str, str]], limit: int = 5) -> str:
    parts = []
    for item in items[:limit]:
        label = item.get("label") or ""
        title = item.get("raw_title") or ""
        parts.append(f"{label}/{title}" if label and title else label or title)
    suffix = f" +{len(items) - limit}" if len(items) > limit else ""
    return "; ".join(parts) + suffix


PUNCT_RE = re.compile(r"[^\w\s가-힣]", re.UNICODE)


def norm_item_text(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"^(송영|파송찬송|폐회찬송|봉헌찬송|봉헌|찬송)\s+", "", text)
    text = re.sub(r"^(?:찬\s*)?(\d{1,3})\s*장\s*$", r"\1", text)
    text = re.sub(r"^(?:찬\s*)?(\d{1,3})\s*장\s+", r"\1 ", text)
    text = re.sub(r"^찬\s*(\d{1,3})$", r"\1", text)
    text = PUNCT_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def item_is_songish(item: dict[str, Any]) -> bool:
    label = item.get("label") or ""
    if not item.get("raw_title"):
        return False
    return (
        label in SONG_LABELS
        or not label
        or re.match(r"^기도\s*\d+$", label)
        or label in ("결단", "봉헌", "파송", "폐회")
    )


def item_label(item: dict[str, Any]) -> str:
    return item.get("label") or ""


def item_title_key(item: dict[str, Any]) -> str:
    return norm_item_text(item.get("raw_title") or "")


def title_key_already_present(title_key: str, existing_keys: set[str]) -> bool:
    if not title_key:
        return False
    if title_key in existing_keys:
        return True
    if re.fullmatch(r"\d{1,3}", title_key):
        return any(key.startswith(f"{title_key} ") for key in existing_keys)
    return False


def item_to_insert_payload(item: dict[str, Any], service_id: str, sort_order: int) -> dict[str, Any]:
    return {
        "service_id": service_id,
        "sort_order": sort_order,
        "label": item.get("label") or None,
        "assignee": item.get("assignee") or "",
        "raw_title": item.get("raw_title") or "",
        "song_id": item.get("song_id") or None,
        "version_id": item.get("version_id") or None,
    }


def merge_ppt_item_with_existing(ppt_item: dict[str, Any], existing_item: dict[str, Any] | None) -> dict[str, Any]:
    if not existing_item:
        return {
            "label": ppt_item.get("label") or None,
            "assignee": ppt_item.get("assignee") or "",
            "raw_title": ppt_item.get("raw_title") or "",
        }
    raw_title = ppt_item.get("raw_title") or existing_item.get("raw_title") or ""
    return {
        "label": ppt_item.get("label") or existing_item.get("label") or None,
        "assignee": ppt_item.get("assignee") or existing_item.get("assignee") or "",
        "raw_title": raw_title,
        "song_id": existing_item.get("song_id") if raw_title == (existing_item.get("raw_title") or "") else None,
        "version_id": existing_item.get("version_id") if raw_title == (existing_item.get("raw_title") or "") else None,
    }


def find_matching_existing(ppt_item: dict[str, Any], existing_items: list[dict[str, Any]], used_ids: set[str]) -> dict[str, Any] | None:
    title_key = item_title_key(ppt_item)
    if title_key:
        for item in existing_items:
            if item.get("id") in used_ids:
                continue
            if item_title_key(item) == title_key:
                return item
    label = item_label(ppt_item)
    if label in ("특송", "봉헌", "파송", "폐회", "결단찬양", "파송찬양", "봉헌찬양") and not title_key:
        for item in existing_items:
            if item.get("id") in used_ids:
                continue
            if item_label(item) == label and item.get("raw_title"):
                return item
    return None


def placeholder_index(items: list[dict[str, Any]], *labels: str) -> int | None:
    for index, item in enumerate(items):
        if item_label(item) in labels and not item.get("raw_title"):
            return index
    return None


def first_label_index(items: list[dict[str, Any]], *labels: str) -> int | None:
    for index, item in enumerate(items):
        if item_label(item) in labels:
            return index
    return None


def opening_insert_index(items: list[dict[str, Any]], service_type: str) -> int:
    if service_type == "young-adult":
        index = first_label_index(items, "성경봉독")
        if index is not None:
            return index
        index = first_label_index(items, "대표기도")
        return index + 1 if index is not None else 0
    if service_type in ("children", "youth"):
        index = first_label_index(items, "예배의 부름", "통성기도", "대표기도", "성경봉독")
        if index is not None:
            return index
        index = first_label_index(items, "사도신경")
        return index + 1 if index is not None else 0
    index = first_label_index(items, "참회기도", "기도", "묵도", "교회소식", "성경봉독")
    return index if index is not None else 0


def merge_labeled_song(items: list[dict[str, Any]], song: dict[str, Any]) -> bool:
    label = item_label(song)
    candidate_labels = [label]
    if label == "결단":
        candidate_labels = ["결단찬양", "결단"]
    for candidate in candidate_labels:
        index = placeholder_index(items, candidate)
        if index is not None:
            items[index] = merge_ppt_item_with_existing(items[index], song)
            return True
    if label in ("특송", "봉헌", "파송", "폐회", "결단찬양", "파송찬양", "봉헌찬양"):
        index = first_label_index(items, "교회소식", "성경봉독", "결단기도", "봉헌기도", "송영", "축도", "자율기도")
        items.insert(index if index is not None else len(items), {
            "label": label,
            "assignee": song.get("assignee") or "",
            "raw_title": song.get("raw_title") or "",
            "song_id": song.get("song_id"),
            "version_id": song.get("version_id"),
        })
        return True
    if label.startswith("기도"):
        index = first_label_index(items, "자율기도")
        items.insert(index if index is not None else len(items), {
            "label": label,
            "assignee": song.get("assignee") or "",
            "raw_title": song.get("raw_title") or "",
            "song_id": song.get("song_id"),
            "version_id": song.get("version_id"),
        })
        return True
    return False


def merge_items_from_ppt(service: PptService, existing_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    used_ids: set[str] = set()
    merged: list[dict[str, Any]] = []
    for ppt_item in service.items:
        match = find_matching_existing(ppt_item, existing_items, used_ids)
        if match:
            used_ids.add(match["id"])
        merged.append(merge_ppt_item_with_existing(ppt_item, match))

    merged_title_keys = {item_title_key(item) for item in merged if item_title_key(item)}
    leftovers = [
        item for item in existing_items
        if item.get("id") not in used_ids
        and item_is_songish(item)
        and not title_key_already_present(item_title_key(item), merged_title_keys)
    ]
    opening_songs = [
        item for item in leftovers
        if item_label(item) in ("", "찬양", "찬송") or item_label(item) is None
    ]
    labeled_songs = [item for item in leftovers if item not in opening_songs]

    if opening_songs:
        placeholder = placeholder_index(merged, "찬양", "찬송")
        if placeholder is not None:
            merged.pop(placeholder)
        insert_at = opening_insert_index(merged, service.service_type)
        for offset, item in enumerate(opening_songs):
            merged.insert(insert_at + offset, {
                "label": item.get("label") or "찬양",
                "assignee": item.get("assignee") or "",
                "raw_title": item.get("raw_title") or "",
                "song_id": item.get("song_id"),
                "version_id": item.get("version_id"),
            })

    for item in labeled_songs:
        if not merge_labeled_song(merged, item):
            merged.append({
                "label": item.get("label") or None,
                "assignee": item.get("assignee") or "",
                "raw_title": item.get("raw_title") or "",
                "song_id": item.get("song_id"),
                "version_id": item.get("version_id"),
            })

    return dedupe_adjacent_items(merged)


def dedupe_adjacent_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    skip_next = False
    for index, item in enumerate(items):
        if skip_next:
            skip_next = False
            continue
        title = (item.get("raw_title") or "").strip()
        next_item = items[index + 1] if index + 1 < len(items) else None
        next_title = (next_item.get("raw_title") or "").strip() if next_item else ""
        if re.fullmatch(r"\d{1,3}", title) and next_title.startswith(f"{title} "):
            merged = {**item, "raw_title": next_title}
            if next_item:
                merged["song_id"] = item.get("song_id") or next_item.get("song_id")
                merged["version_id"] = item.get("version_id") or next_item.get("version_id")
            output.append(merged)
            skip_next = True
            continue
        key = (item.get("label") or "", item.get("raw_title") or "", item.get("assignee") or "")
        prev = output[-1] if output else None
        prev_key = (prev.get("label") or "", prev.get("raw_title") or "", prev.get("assignee") or "") if prev else None
        if prev and item_title_key(prev) and item_title_key(prev) == item_title_key(item):
            continue
        if key == prev_key:
            continue
        output.append(item)
    return output


def comparable_items(items: list[dict[str, Any]]) -> list[tuple[str, str, str, str, str]]:
    return [
        (
            item.get("label") or "",
            item.get("assignee") or "",
            item.get("raw_title") or "",
            item.get("song_id") or "",
            item.get("version_id") or "",
        )
        for item in items
    ]


def replace_service_items(client: RestClient, service_id: str, items: list[dict[str, Any]]) -> None:
    client.delete("mindex_service_items", {"service_id": f"eq.{service_id}"})
    rows = [item_to_insert_payload(item, service_id, index + 1) for index, item in enumerate(items)]
    if rows:
        client.insert("mindex_service_items", rows)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(DEFAULT_PPT_ROOT), help="Worship PPT root folder")
    parser.add_argument("--from", dest="start", default="2026-06-01", help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="end", default="", help="End date YYYY-MM-DD")
    parser.add_argument("--apply", action="store_true", help="Write missing/empty service skeletons")
    parser.add_argument("--fill-empty", action="store_true", help="Insert items into existing services only when they have zero items")
    parser.add_argument("--sync-existing", action="store_true", help="Replace existing service items with PPT-confirmed components while preserving matched song links")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of PPT services processed")
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        raise SystemExit(f"PPT root not found: {root}")

    supa_url, supa_key = read_config()
    client = RestClient(supa_url, supa_key)
    services = discover_ppt_services(root, args.start or None, args.end or None)
    if args.limit:
        services = services[:args.limit]

    created = filled = replaced = unchanged = skipped = 0
    backup_rows: list[dict[str, Any]] = []
    print(f"Found {len(services)} PPT service files")
    for service in services:
        existing = fetch_existing_service(client, service.service_type, service.service_date)
        status = "missing"
        existing_count = 0
        existing_items: list[dict[str, Any]] = []
        if existing:
            existing_items = fetch_service_items(client, existing["id"])
            existing_count = len(existing_items)
            status = "empty" if not existing_items else "has-items"

        target_items = merge_items_from_ppt(service, existing_items) if existing_items and args.sync_existing else service.items
        will_replace = bool(existing and existing_items and args.sync_existing and comparable_items(existing_items) != comparable_items(target_items))
        marker = " replace" if will_replace else ""
        preview = summarize_items(target_items)
        print(f"{service.service_date} {service.service_type:16} {status:9}{marker:8} {service.path.name} [{service.confidence}] {len(target_items)} items :: {preview}")

        if not args.apply:
            if will_replace:
                replaced += 1
            else:
                skipped += 1
            continue
        if existing and existing_count and args.sync_existing:
            if not will_replace:
                unchanged += 1
                continue
            backup_rows.append({
                "service": service.__dict__ | {"path": str(service.path)},
                "service_id": existing["id"],
                "before": existing_items,
                "after": target_items,
            })
            replace_service_items(client, existing["id"], target_items)
            replaced += 1
            continue
        if existing and existing_count:
            skipped += 1
            continue
        if existing and not args.fill_empty:
            skipped += 1
            continue

        service_id = existing["id"] if existing else create_service(client, service)
        insert_items(client, service_id, service.items)
        if existing:
            filled += 1
        else:
            created += 1

    if args.apply:
        if backup_rows:
            backup_dir = ROOT / "backups"
            backup_dir.mkdir(exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup_path = backup_dir / f"service-ppt-sync-{stamp}.json"
            backup_path.write_text(json.dumps(backup_rows, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"Backup written: {backup_path}")
        print(f"Done. created={created}, filled_empty={filled}, replaced={replaced}, unchanged={unchanged}, skipped={skipped}")
    else:
        print("Dry run. Pass --apply to create missing services; add --fill-empty for empty services; add --sync-existing to rewrite existing components.")
        if args.sync_existing:
            print(f"Would replace existing services: {replaced}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
