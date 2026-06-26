from __future__ import annotations

import json
import os
import re
import argparse
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError


ROOT = Path(__file__).resolve().parents[1]
HANDOFF_PATH = ROOT / "HANDOFF.md"
ENV_PATHS = (
    ROOT / ".env.supabase",
    ROOT.parent / "INDEX" / ".env.supabase",
    Path.home() / "Documents" / "INDEX" / ".env.supabase",
)
TEST_PATTERNS = re.compile(r"\b(test|dummy|sample|probe|debug)\b", re.IGNORECASE)


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def read_config() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY", "")
    if url and key:
        return url, key

    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("SUPABASE_URL", "")
        key = values.get("SUPABASE_ANON_KEY") or values.get("SUPABASE_KEY") or values.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if url and key:
            return url, key

    text = HANDOFF_PATH.read_text()
    url_match = re.search(r"https://[a-z]+\.supabase\.co", text)
    if not url_match:
        raise RuntimeError("Supabase config not found. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    raise RuntimeError("Supabase key not found. Set SUPABASE_ANON_KEY, SUPABASE_KEY, or use a local .env.supabase file.")


def fetch_rows(supa_url: str, supa_key: str, table: str, select: str = "*") -> list[dict[str, Any]]:
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
    rows: list[dict[str, Any]] = []
    start = 0
    step = 1000
    while True:
        req = Request(
            f"{supa_url}/rest/v1/{table}?select={quote(select, safe='*,():')}",
            headers={**headers, "Range": f"{start}-{start + step - 1}"},
        )
        with urlopen(req, timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < step:
            return rows
        start += step


def table_count(supa_url: str, supa_key: str, table: str) -> int:
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Range": "0-0",
        "Prefer": "count=exact",
    }
    req = Request(f"{supa_url}/rest/v1/{table}?select=id", headers=headers)
    with urlopen(req, timeout=30) as response:
        content_range = response.headers.get("Content-Range", "")
    match = re.search(r"/(\d+)$", content_range)
    return int(match.group(1)) if match else 0


def column_exists(supa_url: str, supa_key: str, table: str, column: str) -> bool:
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
    req = Request(
        f"{supa_url}/rest/v1/{table}?select=id,{quote(column)}&limit=1",
        headers=headers,
    )
    try:
        with urlopen(req, timeout=30):
            return True
    except HTTPError as error:
        if error.code == 400:
            return False
        raise


def edge_text_issues(row: dict[str, Any], row_id: str, fields: tuple[str, ...]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for field in fields:
        value = row.get(field)
        if not isinstance(value, str):
            continue
        if value != value.strip():
            issues.append({"type": "edge-space", "id": row_id, "field": field, "value": value})
        if re.search(r"[ \t]{2,}", value):
            issues.append({"type": "double-space", "id": row_id, "field": field, "value": value})
        if "\ufffd" in value:
            issues.append({"type": "replacement-char", "id": row_id, "field": field})
    return issues


def block_text_issues(row: dict[str, Any], row_id: str, fields: tuple[str, ...]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for field in fields:
        value = row.get(field)
        if not isinstance(value, str):
            continue
        if re.search(r"[ \t]{2,}", value):
            issues.append({"type": "double-space", "id": row_id, "field": field, "value": value})
        if "\ufffd" in value:
            issues.append({"type": "replacement-char", "id": row_id, "field": field})
    return issues


def audit(supa_url: str, supa_key: str) -> tuple[dict[str, int], list[dict[str, Any]], list[dict[str, Any]]]:
    songs = fetch_rows(supa_url, supa_key, "mindex_songs")
    scriptures = fetch_rows(supa_url, supa_key, "mindex_scriptures")
    books = fetch_rows(supa_url, supa_key, "mindex_scripture_books")
    service_types = fetch_rows(supa_url, supa_key, "mindex_service_types")
    services = fetch_rows(supa_url, supa_key, "mindex_services")
    service_items = fetch_rows(supa_url, supa_key, "mindex_service_items")
    translations = fetch_rows(supa_url, supa_key, "mindex_bible_translations")
    verse_count = table_count(supa_url, supa_key, "mindex_bible_verses")

    issues: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    song_ids = {row["id"] for row in songs}
    service_ids = {row["id"] for row in services}
    service_type_ids = {row["id"] for row in service_types}
    book_codes = {row["code"] for row in books}
    translation_ids = {row["id"] for row in translations}

    expected_columns = (
        ("mindex_song_versions", "praise_types"),
        ("mindex_service_items", "assignee"),
        ("mindex_service_items", "version_id"),
    )
    for table, column in expected_columns:
        if not column_exists(supa_url, supa_key, table, column):
            warnings.append({"type": "missing-expected-column", "table": table, "column": column})

    seen_song_titles: dict[str, list[str]] = {}
    for row in songs:
        row_id = row["id"]
        title = row.get("title") or ""
        normalized = title.strip().casefold()
        if normalized:
            seen_song_titles.setdefault(normalized, []).append(row_id)
        if TEST_PATTERNS.search(title):
            issues.append({"type": "testish-song-title", "id": row_id, "title": title})
        if row.get("hymn_no") and re.match(r"^\s*(?:통\s*)?\d{1,3}\s+\S+", title):
            warnings.append({"type": "song-title-contains-hymn-no", "id": row_id, "title": title, "hymn_no": row.get("hymn_no")})
        issues.extend(edge_text_issues(row, row_id, ("title", "subtitle", "original_title", "hymn_no")))
        warnings.extend(edge_text_issues(row, row_id, ("memo",)))

    for title, ids in seen_song_titles.items():
        if len(ids) > 1:
            warnings.append({"type": "duplicate-song-title", "title": title, "ids": ids, "count": len(ids)})

    for row in scriptures:
        row_id = row["id"]
        if row.get("book_code") and row.get("book_code") not in book_codes:
            issues.append({"type": "scripture-missing-book", "id": row_id, "book_code": row.get("book_code")})
        issues.extend(edge_text_issues(row, row_id, ("title", "book", "reference", "translation")))
        warnings.extend(edge_text_issues(row, row_id, ("text", "memo")))

    for row in books:
        code = row["code"]
        if not row.get("korean_name") or not row.get("english_name"):
            issues.append({"type": "book-name-missing", "code": code})
        issues.extend(edge_text_issues(row, code, ("korean_name", "english_name", "short_name", "division", "testament")))

    for row in services:
        row_id = row["id"]
        if row.get("type_id") not in service_type_ids:
            issues.append({"type": "service-missing-type", "id": row_id, "type_id": row.get("type_id")})
        issues.extend(edge_text_issues(row, row_id, ("leader",)))
        warnings.extend(block_text_issues(row, row_id, ("raw_text",)))

    for row in service_items:
        row_id = row["id"]
        if row.get("service_id") not in service_ids:
            issues.append({"type": "service-item-missing-service", "id": row_id, "service_id": row.get("service_id")})
        if row.get("song_id") and row.get("song_id") not in song_ids:
            issues.append({"type": "service-item-missing-song", "id": row_id, "song_id": row.get("song_id"), "raw_title": row.get("raw_title")})
        issues.extend(edge_text_issues(row, row_id, ("label", "raw_title")))

    for row in translations:
        row_id = row["id"]
        if not row.get("translation_key") or not row.get("name"):
            issues.append({"type": "translation-name-missing", "id": row_id})
        issues.extend(edge_text_issues(row, row_id, ("translation_key", "name", "language", "abbreviation", "source", "license")))

    counts = {
        "songs": len(songs),
        "scriptures": len(scriptures),
        "scripture_books": len(books),
        "service_types": len(service_types),
        "services": len(services),
        "service_items": len(service_items),
        "bible_translations": len(translations),
        "bible_verses": verse_count,
        "linked_translation_ids": len(translation_ids),
    }
    return counts, issues, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit Mindex Supabase content for residue and reference issues.")
    parser.add_argument("--json", action="store_true", help="Print all issues and warnings as JSON.")
    args = parser.parse_args()

    counts, issues, warnings = audit(*read_config())
    if args.json:
        print(json.dumps({"counts": counts, "issues": issues, "warnings": warnings}, ensure_ascii=False, indent=2))
    else:
        print("counts:", json.dumps(counts, ensure_ascii=False, sort_keys=True))
        print(f"issues: {len(issues)}")
        for issue in issues[:50]:
            print(json.dumps(issue, ensure_ascii=False))
        if len(issues) > 50:
            print(f"... {len(issues) - 50} more issues")
        print(f"warnings: {len(warnings)}")
        warning_types: dict[str, int] = {}
        for warning in warnings:
            warning_types[warning["type"]] = warning_types.get(warning["type"], 0) + 1
        if warning_types:
            print("warning_types:", json.dumps(warning_types, ensure_ascii=False, sort_keys=True))
        for warning in warnings[:20]:
            print(json.dumps(warning, ensure_ascii=False))
        if len(warnings) > 20:
            print(f"... {len(warnings) - 20} more warnings")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
