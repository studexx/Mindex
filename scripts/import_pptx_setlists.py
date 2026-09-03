#!/usr/bin/env python3
"""
Archive praise/setlist data extracted from local worship PPTX decks.

This stores review/archive rows only:
  mindex_worship_import_sources
  mindex_worship_import_candidates

It does not create or update canonical worship services.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_notion_setlist  # type: ignore


IMPORT_UUID_NAMESPACE = uuid.UUID("ec9743ab-53c7-43ac-b24c-3eeff1e24bc8")
SOURCE_NAME = "26-3층 PPT 찬양 데이터"
PPTX_NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
HEADING_TO_LABEL = (
    (re.compile(r"특송"), "특송", "special_song"),
    (re.compile(r"봉헌찬송|봉헌"), "봉헌", "offering"),
    (re.compile(r"송영"), "송영", "doxology"),
    (re.compile(r"파송"), "파송", "sending"),
    (re.compile(r"결단찬양|결단"), "결단", "response_song"),
    (re.compile(r"찬송"), "찬송", "hymn"),
    (re.compile(r"찬양"), "찬양", "praise"),
)
NON_MUSIC_HEADINGS = re.compile(
    r"^(?:사도신경|참회기도|사죄의 선언|기도|성경봉독|교회소식|설교|축도|주기도문|새가족|광고)(?:\s|$|[|])"
)
SERVICE_TYPE_BY_FILE_PREFIX = {
    "Wed": "wednesday",
    "Moon": "monthly",
}
SERVICE_TYPE_BY_SUNDAY_SUFFIX = {
    "1st": "sunday-first",
    "2nd": "sunday-second",
    "3rd": "sunday-main",
    "4th": "sunday-afternoon",
}
DB_SERVICE_TYPE_BY_SOURCE_ID = {
    "sunday-first": "sun_1st",
    "sunday-second": "sun_2nd",
    "sunday-main": "sun_3rd",
    "sunday-afternoon": "sunday-afternoon",
    "wednesday": "wed",
    "friday": "fri",
    "monthly": "monthly",
    "holy-week-dawn": "holy_week_dawn",
    "omer": "omer",
    "special": "special",
    "children": "children",
    "youth": "youth",
    "young-adult": "young_adult",
}


@dataclass(frozen=True)
class ExtractedEntry:
    label: str
    section_key: str
    title: str
    slide_number: int
    confidence: float
    review_status: str
    source: str


@dataclass(frozen=True)
class ExtractedDeck:
    path: Path
    relative_path: str
    service_date: date
    source_type_id: str
    slide_count: int
    entries: list[ExtractedEntry]
    excluded_count: int
    warning_count: int


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFC", value or "").strip()


def slide_sort_key(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 0


def extract_slide_texts(path: Path) -> list[list[str]]:
    with ZipFile(path) as deck:
        slide_names = sorted(
            [
                name
                for name in deck.namelist()
                if re.match(r"ppt/slides/slide\d+\.xml$", name)
            ],
            key=slide_sort_key,
        )
        slides: list[list[str]] = []
        for slide_name in slide_names:
            root = ET.fromstring(deck.read(slide_name))
            texts: list[str] = []
            for paragraph in root.findall(".//a:p", PPTX_NS):
                text = "".join(
                    node.text or ""
                    for node in paragraph.findall(".//a:t", PPTX_NS)
                ).strip()
                if text:
                    texts.append(normalize_text(text))
            slides.append(texts)
        return slides


def normalize_marker_title(raw: str) -> str:
    title = normalize_text(raw)
    title = re.sub(r"\s+", " ", title)
    title = title.strip(" '\"‘’“”")
    title = re.sub(r"\s*\|\s*.*$", "", title).strip()
    title = re.sub(r"^(?:찬송가|찬송)\s*", "찬 ", title).strip()
    title = re.sub(r"^찬\s*(\d{1,3})\s*장?$", r"찬 \1장", title)
    return title


def is_score_or_hymn_title(title: str) -> bool:
    normalized = normalize_marker_title(title)
    return bool(
        re.match(r"^찬\s*\d{1,3}장?$", normalized)
        or re.match(r"^\d{1,3}\s+\S+", normalized)
    )


def is_setlist_praise_entry(entry: ExtractedEntry) -> bool:
    if entry.section_key == "special_song":
        return True
    if entry.section_key not in {"praise", "response_song"}:
        return False
    return not is_score_or_hymn_title(entry.title)


def compact_title_key(title: str) -> str:
    return re.sub(r"\s+", " ", normalize_marker_title(title)).lower()


def compact_db_key(value: str) -> str:
    normalized = normalize_text(value).lower()
    normalized = re.sub(r"[‘’“”\"']", "", normalized)
    return re.sub(r"[^0-9a-z가-힣]+", "", normalized)


def db_title_variants(title: str) -> set[str]:
    normalized = normalize_marker_title(title).lower()
    compacted = compact_db_key(normalized)
    variants = {normalized, compacted}

    hymn_with_title = re.match(r"^(?:찬\s*)?(\d{1,3})(?:\s*장)?\s+(.+)$", normalized)
    if hymn_with_title:
        variants.add(f"hymn:{hymn_with_title.group(1)}")
        variants.add(hymn_with_title.group(2).strip())
        variants.add(compact_db_key(hymn_with_title.group(2)))

    hymn_only = re.match(r"^찬\s*(\d{1,3})\s*장?$", normalized)
    if hymn_only:
        variants.add(f"hymn:{hymn_only.group(1)}")

    for part in re.split(r"[()]", normalized):
        part = part.strip()
        if part:
            variants.add(part)
            variants.add(compact_db_key(part))
    return {variant for variant in variants if variant}


def fetch_all_rows(base_url: str, key: str, table: str, query: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    page_size = 1000
    while True:
        page_query = dict(query)
        page_query["limit"] = str(page_size)
        page_query["offset"] = str(offset)
        page = import_notion_setlist._api_request(base_url, key, "GET", table, page_query)
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows


def build_db_song_alias_index(base_url: str, key: str) -> dict[str, set[str]]:
    songs = fetch_all_rows(
        base_url,
        key,
        "mindex_songs",
        {"select": "id,title,subtitle,original_title,hymn_no"},
    )
    versions = fetch_all_rows(
        base_url,
        key,
        "mindex_song_versions",
        {"select": "canonical_song_id,hymn_no,subtitle,original_title,version_label,curated_version_name"},
    )
    alias: dict[str, set[str]] = {}

    def add(value: str, song_id: str | None) -> None:
        if not value or not song_id:
            return
        alias.setdefault(value, set()).add(song_id)

    for song in songs:
        song_id = str(song.get("id") or "")
        for field in ("title", "subtitle", "original_title"):
            for variant in db_title_variants(str(song.get(field) or "")):
                add(variant, song_id)
        hymn_no = str(song.get("hymn_no") or "").strip()
        if hymn_no:
            add(f"hymn:{hymn_no}", song_id)

    for version in versions:
        song_id = str(version.get("canonical_song_id") or "")
        for field in ("subtitle", "original_title", "version_label", "curated_version_name"):
            value = str(version.get(field) or "").strip()
            if value in {"새찬송가", "통일찬송가"}:
                continue
            for variant in db_title_variants(value):
                add(variant, song_id)
        hymn_no = str(version.get("hymn_no") or "").strip()
        if hymn_no:
            add(f"hymn:{hymn_no}", song_id)

    return alias


def resolve_db_song_ids(title: str, alias: dict[str, set[str]]) -> set[str]:
    matches: set[str] = set()
    for variant in db_title_variants(title):
        matches.update(alias.get(variant, set()))
    return matches


def db_candidate_keys(service_date: str, title: str, alias: dict[str, set[str]]) -> set[tuple[str, str]]:
    song_ids = resolve_db_song_ids(title, alias)
    if song_ids:
        return {(service_date, f"song:{song_id}") for song_id in song_ids}
    return {(service_date, f"title:{compact_db_key(title)}")}


def db_baseline_keys(base_url: str, key: str, alias: dict[str, set[str]]) -> set[tuple[str, str]]:
    sources = fetch_all_rows(
        base_url,
        key,
        "mindex_worship_import_sources",
        {"select": "id,source_name,service_date", "source_kind": "eq.setlist"},
    )
    source_by_id = {
        str(source.get("id")): source
        for source in sources
        if str(source.get("source_name") or "") != SOURCE_NAME
    }
    baseline: set[tuple[str, str]] = set()
    source_ids = list(source_by_id)
    for start in range(0, len(source_ids), 100):
        ids = ",".join(source_ids[start:start + 100])
        candidates = fetch_all_rows(
            base_url,
            key,
            "mindex_worship_import_candidates",
            {"select": "import_source_id,raw_title", "import_source_id": f"in.({ids})"},
        )
        for candidate in candidates:
            source = source_by_id.get(str(candidate.get("import_source_id")))
            if not source:
                continue
            service_date = str(source.get("service_date") or "")
            title = str(candidate.get("raw_title") or "")
            baseline.update(db_candidate_keys(service_date, title, alias))
    return baseline


def filter_missing_against_db_baseline(
    decks: list[ExtractedDeck],
    baseline_keys: set[tuple[str, str]],
    alias: dict[str, set[str]],
) -> list[ExtractedDeck]:
    filtered: list[ExtractedDeck] = []
    for deck in decks:
        entries = [
            entry
            for entry in deck.entries
            if db_candidate_keys(deck.service_date.isoformat(), entry.title, alias).isdisjoint(baseline_keys)
        ]
        if not entries:
            continue
        filtered.append(ExtractedDeck(
            path=deck.path,
            relative_path=deck.relative_path,
            service_date=deck.service_date,
            source_type_id=deck.source_type_id,
            slide_count=deck.slide_count,
            entries=entries,
            excluded_count=deck.excluded_count + len(deck.entries) - len(entries),
            warning_count=deck.warning_count,
        ))
    return filtered


def baseline_keys_from_setlist(path: Path, through: date | None) -> set[tuple[str, str, str]]:
    text = path.read_text(encoding="utf-8")
    sections = import_notion_setlist.parse_setlists.parse_text(text)
    plans = import_notion_setlist.build_service_plans(
        sections,
        source_path=str(path),
        source_name="2026 찬양 콘티",
    )
    keys: set[tuple[str, str, str]] = set()
    for plan in plans:
        source_type_id, service_date, _ = plan.source_id
        if through and service_date > through:
            continue
        db_type_id = DB_SERVICE_TYPE_BY_SOURCE_ID.get(source_type_id, source_type_id)
        for section in plan.sections:
            section_key = section.section_key or ""
            for item in section.items:
                title = normalize_text(str(item.get("title") or ""))
                label = normalize_text(str(item.get("label") or section.title))
                entry = ExtractedEntry(
                    label=label,
                    section_key=section_key,
                    title=title,
                    slide_number=0,
                    confidence=1,
                    review_status="approved",
                    source="baseline",
                )
                if is_setlist_praise_entry(entry):
                    keys.add((service_date.isoformat(), db_type_id, compact_title_key(title)))
    return keys


def filter_missing_against_baseline(
    decks: list[ExtractedDeck],
    baseline_keys: set[tuple[str, str, str]],
    through: date | None,
) -> list[ExtractedDeck]:
    filtered: list[ExtractedDeck] = []
    for deck in decks:
        if through and deck.service_date > through:
            continue
        db_type_id = DB_SERVICE_TYPE_BY_SOURCE_ID.get(deck.source_type_id, deck.source_type_id)
        entries = [
            entry
            for entry in deck.entries
            if (
                deck.service_date.isoformat(),
                db_type_id,
                compact_title_key(entry.title),
            )
            not in baseline_keys
        ]
        if not entries:
            continue
        filtered.append(ExtractedDeck(
            path=deck.path,
            relative_path=deck.relative_path,
            service_date=deck.service_date,
            source_type_id=deck.source_type_id,
            slide_count=deck.slide_count,
            entries=entries,
            excluded_count=deck.excluded_count + len(deck.entries) - len(entries),
            warning_count=deck.warning_count,
        ))
    return filtered


def label_from_text(text: str, fallback_label: str, fallback_key: str) -> tuple[str, str]:
    for pattern, label, section_key in HEADING_TO_LABEL:
        if pattern.search(text):
            return label, section_key
    return fallback_label, fallback_key


def extract_marker_titles(text: str) -> list[str]:
    titles: list[str] = []
    for fragment in re.split(r"\n+", text):
        if "♪" not in fragment:
            continue
        _, tail = fragment.split("♪", 1)
        title = normalize_marker_title(tail)
        if title:
            titles.append(title)
    return titles


def extract_choir_title(text: str) -> str:
    match = re.match(r"^[‘'](.+?)[’']\s*\|\s*(?:할렐루야\s*)?찬양대", text)
    return normalize_marker_title(match.group(1)) if match else ""


def extract_entries(slides: list[list[str]]) -> tuple[list[ExtractedEntry], int]:
    entries: list[ExtractedEntry] = []
    current_label = "찬양"
    current_key = "praise"
    warning_count = 0

    for slide_number, texts in enumerate(slides, start=1):
        merged = "\n".join(texts)
        if not merged:
            continue

        choir_title = extract_choir_title(merged)
        if choir_title:
            entries.append(ExtractedEntry(
                label="특송",
                section_key="special_song",
                title=choir_title,
                slide_number=slide_number,
                confidence=0.92,
                review_status="approved",
                source="choir-title",
            ))
            continue

        titles = extract_marker_titles(merged)
        if titles:
            label, section_key = label_from_text(merged, current_label, current_key)
            for title in titles:
                confidence = 0.82 if re.fullmatch(r"찬 \d{1,3}장", title) else 0.98
                status = "needs_review" if confidence < 0.9 else "approved"
                entries.append(ExtractedEntry(
                    label=label,
                    section_key=section_key,
                    title=title,
                    slide_number=slide_number,
                    confidence=confidence,
                    review_status=status,
                    source="music-marker",
                ))
            continue

        if NON_MUSIC_HEADINGS.match(merged):
            current_label = "찬양"
            current_key = "praise"
            continue

        next_label, next_key = label_from_text(merged, current_label, current_key)
        if (next_label, next_key) != (current_label, current_key):
            current_label, current_key = next_label, next_key
            continue

        if re.search(r"[가-힣]", merged) and len(re.sub(r"\W+", "", merged)) >= 30:
            warning_count += 1

    return dedupe_entries(entries), warning_count


def dedupe_entries(entries: list[ExtractedEntry]) -> list[ExtractedEntry]:
    deduped: list[ExtractedEntry] = []
    seen: set[tuple[str, str, str]] = set()
    for entry in entries:
        key = (entry.label, entry.section_key, entry.title)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    return deduped


def infer_source_type_id(path: Path) -> str:
    name = normalize_text(path.name)
    if name.startswith("Sun_"):
        match = re.search(r"_(1st|2nd|3rd|4th)(?:\.|_|$)", name)
        if not match:
            return "sunday-main"
        return SERVICE_TYPE_BY_SUNDAY_SUFFIX[match.group(1)]
    if name.startswith("PM_"):
        normalized_path = normalize_text(str(path))
        if "금요" in normalized_path or "_Fri" in name:
            return "friday"
        return "omer"
    for prefix, type_id in SERVICE_TYPE_BY_FILE_PREFIX.items():
        if name.startswith(f"{prefix}_"):
            return type_id
    return "special"


def infer_service_date(path: Path) -> date:
    match = re.search(r"_(20\d{2})-(\d{2})-(\d{2})", normalize_text(path.name))
    if not match:
        raise ValueError(f"날짜를 파일명에서 찾지 못했습니다: {path}")
    return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))


def iter_pptx(root: Path) -> list[Path]:
    return sorted(root.rglob("*.pptx"), key=lambda p: normalize_text(str(p)))


def extract_deck(root: Path, path: Path) -> ExtractedDeck:
    slides = extract_slide_texts(path)
    entries, warning_count = extract_entries(slides)
    setlist_entries = [entry for entry in entries if is_setlist_praise_entry(entry)]
    return ExtractedDeck(
        path=path,
        relative_path=normalize_text(str(path.relative_to(root))),
        service_date=infer_service_date(path),
        source_type_id=infer_source_type_id(path),
        slide_count=len(slides),
        entries=setlist_entries,
        excluded_count=len(entries) - len(setlist_entries),
        warning_count=warning_count,
    )


def file_hash(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def source_identity(deck: ExtractedDeck, db_type_id: str) -> str:
    return "|".join([
        SOURCE_NAME,
        db_type_id,
        deck.service_date.isoformat(),
        deck.relative_path,
    ])


def build_rows(
    decks: list[ExtractedDeck],
    service_type_ids: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    source_rows: list[dict[str, Any]] = []
    candidate_rows: list[dict[str, Any]] = []

    for deck in decks:
        db_type_id = service_type_ids[deck.source_type_id]
        identity = source_identity(deck, db_type_id)
        source_id = str(uuid.uuid5(IMPORT_UUID_NAMESPACE, f"pptx-setlist|{identity}"))
        deck_hash = file_hash(deck.path)
        payload = {
            "schema_version": 1,
            "import_identity": identity,
            "source_ref": {
                "created_from": "pptx",
                "source_name": SOURCE_NAME,
                "source_path": str(deck.path),
                "relative_path": deck.relative_path,
                "file_sha256": deck_hash,
            },
            "service": {
                "service_type_id": db_type_id,
                "service_date": deck.service_date.isoformat(),
            },
            "songs": [
                {
                    "label": entry.label,
                    "section_key": entry.section_key,
                    "title": entry.title,
                    "slide_number": entry.slide_number,
                    "confidence": entry.confidence,
                    "source": entry.source,
                }
                for entry in deck.entries
            ],
        }
        encoded = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        source_rows.append({
            "id": source_id,
            "source_kind": "setlist",
            "source_name": SOURCE_NAME,
            "source_path": str(deck.path),
            "source_hash": hashlib.sha256(encoded).hexdigest(),
            "service_type_id": db_type_id,
            "service_date": deck.service_date.isoformat(),
            "status": "archived" if deck.entries else "parsed",
            "raw_payload": payload,
            "parse_report": {
                "schema_version": 1,
                "extractor": "import_pptx_setlists.py",
                "slide_count": deck.slide_count,
                "song_count": len(deck.entries),
                "excluded_non_setlist_count": deck.excluded_count,
                "warning_count": deck.warning_count,
                "file_sha256": deck_hash,
            },
        })

        for sort_order, entry in enumerate(deck.entries, start=1):
            candidate_rows.append({
                "id": str(uuid.uuid5(
                    IMPORT_UUID_NAMESPACE,
                    f"pptx-setlist|{identity}|{sort_order}|{entry.label}|{entry.title}",
                )),
                "import_source_id": source_id,
                "sort_order": sort_order,
                "candidate_level": "element",
                "candidate_key": entry.section_key,
                "raw_label": entry.label,
                "raw_title": entry.title,
                "raw_body": "",
                "normalized_label": entry.label,
                "normalized_title": entry.title,
                "normalized_body": "",
                "suggested_type": "praise",
                "suggested_template_id": None,
                "suggested_song_id": None,
                "suggested_scripture_id": None,
                "confidence": entry.confidence,
                "review_status": entry.review_status,
                "raw_payload": {
                    "slide_number": entry.slide_number,
                    "source": entry.source,
                    "relative_path": deck.relative_path,
                },
                "normalized_payload": {
                    "title": entry.title,
                    "label": entry.label,
                    "section_key": entry.section_key,
                },
                "notes": "PPTX 찬양 marker 추출 보존본",
            })

    return source_rows, candidate_rows


def summarize(decks: list[ExtractedDeck]) -> None:
    print(f"총 PPTX: {len(decks)}")
    print(f"콘티 찬양 항목: {sum(len(deck.entries) for deck in decks)}")
    print(f"제외한 악보/예배순서 항목: {sum(deck.excluded_count for deck in decks)}")
    print(f"곡 없음: {sum(1 for deck in decks if not deck.entries)}")
    print(f"검토 경고 lyric blocks: {sum(deck.warning_count for deck in decks)}")
    by_type: dict[str, int] = {}
    for deck in decks:
        by_type[deck.source_type_id] = by_type.get(deck.source_type_id, 0) + 1
    print("예배 타입:", json.dumps(by_type, ensure_ascii=False, sort_keys=True))
    empty = [deck.relative_path for deck in decks if not deck.entries]
    if empty:
        print("곡 marker 없는 파일:")
        for name in empty[:30]:
            print(f"  - {name}")
        if len(empty) > 30:
            print(f"  ... 외 {len(empty) - 30}개")


def apply_rows(base_url: str, key: str, source_rows: list[dict[str, Any]], candidate_rows: list[dict[str, Any]]) -> dict[str, int]:
    for rows in import_notion_setlist._chunks(source_rows):
        import_notion_setlist._api_request(
            base_url,
            key,
            "POST",
            "mindex_worship_import_sources",
            body=rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    for rows in import_notion_setlist._chunks(candidate_rows):
        import_notion_setlist._api_request(
            base_url,
            key,
            "POST",
            "mindex_worship_import_candidates",
            body=rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    return {"sources": len(source_rows), "songs": len(candidate_rows)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default="/Users/parkjihun/Downloads/26-3층")
    parser.add_argument("--baseline", help="기존 콘티 텍스트와 비교해 누락된 항목만 반영")
    parser.add_argument("--db-baseline", action="store_true", help="DB canonical song 기준으로 기존 archive와 비교")
    parser.add_argument("--through", help="이 날짜까지 비교/반영 (YYYY-MM-DD)")
    parser.add_argument("--apply", action="store_true", help="archive DB에 반영")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(args.root).expanduser()
    if not root.exists():
        raise SystemExit(f"폴더를 찾지 못했습니다: {root}")

    decks = [extract_deck(root, path) for path in iter_pptx(root)]
    if args.baseline:
        through = date.fromisoformat(args.through) if args.through else None
        baseline_keys = baseline_keys_from_setlist(Path(args.baseline), through)
        decks = filter_missing_against_baseline(decks, baseline_keys, through)
    if args.db_baseline:
        base_url, key = import_notion_setlist.read_config()
        alias = build_db_song_alias_index(base_url, key)
        decks = filter_missing_against_db_baseline(decks, db_baseline_keys(base_url, key, alias), alias)
    summarize(decks)
    if not args.apply:
        print("DRY-RUN: DB 반영하지 않았습니다.")
        return

    decks_to_store = [deck for deck in decks if deck.entries]
    base_url, key = import_notion_setlist.read_config()
    service_type_ids = import_notion_setlist.resolve_service_type_ids(
        [
            import_notion_setlist.ServiceImportPlan(
                service_row={},
                sections=[],
                source_id=(deck.source_type_id, deck.service_date, None),
            )
            for deck in decks_to_store
        ],
        import_notion_setlist.fetch_service_type_ids(base_url, key),
    )
    source_rows, candidate_rows = build_rows(decks_to_store, service_type_ids)
    result = apply_rows(base_url, key, source_rows, candidate_rows)
    print("\nArchive 적용 결과")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
