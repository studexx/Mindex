#!/usr/bin/env python3
"""Import EasySlides XML Bible files into Mindex Supabase tables.

Usage:
  python3 scripts/import_bible_xml.py /path/to/bibles.zip --dry-run
  python3 scripts/import_bible_xml.py /path/to/bibles.zip

The script expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. It also reads
/Users/parkjihun/Documents/INDEX/.env.supabase when present.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


BIBLE_CODES = [
    "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
    "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
    "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
    "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
    "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
    "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
    "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
]

BOOK_RE = re.compile(r"<BIBLEBOOK\b([^>]*)>(.*?)</BIBLEBOOK>", re.IGNORECASE | re.DOTALL)
CHAPTER_RE = re.compile(r"<CHAPTER\b([^>]*)>(.*?)</CHAPTER>", re.IGNORECASE | re.DOTALL)
VERSE_RE = re.compile(r"<VERS\b([^>]*)>(.*?)</VERS>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r"([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(['\"])(.*?)\2", re.DOTALL)


def read_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def attrs(raw: str) -> dict[str, str]:
    return {match.group(1).lower(): html.unescape(match.group(3).strip()) for match in ATTR_RE.finditer(raw)}


def tag_text(xml: str, tag: str) -> str:
    match = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", xml, re.IGNORECASE | re.DOTALL)
    return clean_inline(match.group(1)) if match else ""


def clean_inline(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    value = value.replace("\ufeff", "")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\s*\n\s*", "\n", value)
    return unicodedata.normalize("NFC", value.strip())


def split_section_title(text: str) -> tuple[str, str]:
    match = re.match(r"^\s*<([^<>\n]{1,100})>\s*(.*)$", text, re.DOTALL)
    if not match:
        return "", text
    return match.group(1).strip(), match.group(2).strip()


def slug(value: str) -> str:
    value = unicodedata.normalize("NFC", value)
    value = re.sub(r"[^A-Za-z0-9가-힣ぁ-んァ-ン一-龥]+", "-", value).strip("-")
    return value.lower() or "translation"


def infer_language(title: str, language: str, filename: str) -> str:
    source = unicodedata.normalize("NFC", f"{title} {language} {filename}")
    if re.search(r"[ぁ-んァ-ン一-龥]", source):
        return "ja"
    if re.search(r"[가-힣]", source):
        return "ko"
    return "en"


def parse_xml_file(path: Path) -> dict:
    xml = path.read_text(encoding="utf-8-sig", errors="replace")
    title = tag_text(xml, "title") or path.stem
    identifier = tag_text(xml, "identifier") or title
    language_raw = tag_text(xml, "language") or ""
    description = tag_text(xml, "description")
    rights = tag_text(xml, "rights")
    verses = []
    chapter_count = 0
    book_count = 0

    for book_raw, book_body in BOOK_RE.findall(xml):
        book_attrs = attrs(book_raw)
        try:
            book_number = int(book_attrs.get("bnumber", "0"))
        except ValueError:
            book_number = 0
        if book_number < 1 or book_number > len(BIBLE_CODES):
            continue
        book_code = BIBLE_CODES[book_number - 1]
        book_count += 1

        for chapter_raw, chapter_body in CHAPTER_RE.findall(book_body):
            chapter_attrs = attrs(chapter_raw)
            try:
                chapter = int(chapter_attrs.get("cnumber", "0"))
            except ValueError:
                continue
            if chapter <= 0:
                continue
            chapter_count += 1

            for verse_raw, verse_body in VERSE_RE.findall(chapter_body):
                verse_attrs = attrs(verse_raw)
                try:
                    verse = int(verse_attrs.get("vnumber", "0"))
                except ValueError:
                    continue
                if verse <= 0:
                    continue
                text = clean_inline(verse_body)
                section_title, text = split_section_title(text)
                verses.append({
                    "book_code": book_code,
                    "chapter": chapter,
                    "verse": verse,
                    "text": text,
                    "section_title": section_title,
                    "metadata": {},
                    "is_active": True,
                })

    translation_key = slug(identifier or title)
    return {
        "translation": {
            "translation_key": translation_key,
            "name": title,
            "language": infer_language(title, language_raw, path.name),
            "abbreviation": identifier,
            "source": path.name,
            "license": rights,
            "metadata": {
                "description": description,
                "xml_language": language_raw,
                "format": "Easyslides XML Bible",
            },
            "is_active": True,
        },
        "verses": verses,
        "stats": {
            "file": path.name,
            "title": title,
            "translation_key": translation_key,
            "books": book_count,
            "chapters": chapter_count,
            "verses": len(verses),
        },
    }


def find_xml_files(source: Path) -> tuple[list[Path], tempfile.TemporaryDirectory | None]:
    temp_dir = None
    root = source
    if source.suffix.lower() == ".zip":
        temp_dir = tempfile.TemporaryDirectory(prefix="mindex-bible-xml-")
        try:
            subprocess.run(["unzip", "-q", str(source), "-d", temp_dir.name], check=True)
        except (FileNotFoundError, subprocess.CalledProcessError):
            with zipfile.ZipFile(source) as archive:
                archive.extractall(temp_dir.name)
        root = Path(temp_dir.name)
    files = sorted(path for path in root.rglob("*.xml") if "__MACOSX" not in path.parts and not path.name.startswith("._"))
    return files, temp_dir


class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    def request(self, method: str, path: str, body=None, prefer: str | None = None):
        data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(f"{self.url}/rest/v1/{path}", data=data, method=method)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        if prefer:
            req.add_header("Prefer", prefer)
        try:
            with urllib.request.urlopen(req) as response:
                payload = response.read().decode("utf-8")
                return json.loads(payload) if payload else None
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} failed: {error.code} {detail}") from error

    def upsert_translation(self, translation: dict) -> str:
        path = "mindex_bible_translations?on_conflict=translation_key"
        rows = self.request(
            "POST",
            path,
            [translation],
            prefer="resolution=merge-duplicates,return=representation",
        )
        return rows[0]["id"]

    def replace_verses(self, translation_id: str, verses: list[dict], batch_size: int) -> None:
        quoted_id = urllib.parse.quote(translation_id)
        self.request("DELETE", f"mindex_bible_verses?translation_id=eq.{quoted_id}", prefer="return=minimal")
        for start in range(0, len(verses), batch_size):
            batch = [{**verse, "translation_id": translation_id} for verse in verses[start:start + batch_size]]
            self.request("POST", "mindex_bible_verses", batch, prefer="return=minimal")


def main() -> int:
    parser = argparse.ArgumentParser(description="Import EasySlides XML Bible files into Mindex.")
    parser.add_argument("source", type=Path, help="XML file, directory, or zip archive")
    parser.add_argument("--dry-run", action="store_true", help="Parse and print stats without writing Supabase")
    parser.add_argument("--only", action="append", default=[], help="Import only files whose name or title contains this text")
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--env", type=Path, default=Path("/Users/parkjihun/Documents/INDEX/.env.supabase"))
    args = parser.parse_args()

    files, temp_dir = find_xml_files(args.source)
    if not files:
        print("No XML files found.", file=sys.stderr)
        return 1

    parsed = [parse_xml_file(path) for path in files]
    if args.only:
        needles = [item.casefold() for item in args.only]
        parsed = [
            item for item in parsed
            if any(needle in item["stats"]["file"].casefold() or needle in item["stats"]["title"].casefold() for needle in needles)
        ]
    if not parsed:
        print("No matching XML files found.", file=sys.stderr)
        return 1
    for item in parsed:
        stats = item["stats"]
        print(f"{stats['translation_key']:18} {stats['books']:2} books {stats['chapters']:4} chapters {stats['verses']:5} verses  {stats['file']}")

    if args.dry_run:
        if temp_dir:
            temp_dir.cleanup()
        return 0

    read_env_file(args.env)
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 1

    client = SupabaseClient(url, key)
    try:
        for item in parsed:
            translation_id = client.upsert_translation(item["translation"])
            client.replace_verses(translation_id, item["verses"], args.batch_size)
            print(f"imported {item['stats']['translation_key']} ({len(item['verses'])} verses)")
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        print("Run supabase-schema.sql first, then retry this import.", file=sys.stderr)
        return 1

    if temp_dir:
        temp_dir.cleanup()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
