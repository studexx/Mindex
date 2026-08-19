from __future__ import annotations

import argparse
import concurrent.futures
import difflib
import hashlib
import json
import re
import sys
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_mindex_content import fetch_rows, read_config  # noqa: E402


SOURCE_NAME = "하나성경"
SOURCE_BASE_URL = "https://www.hbible.co.kr/hb/hymn/view"
USER_AGENT = "Mindex hymn audit/1.0 (read-only verification)"
BOOK_LIMITS = {"new": 645, "union": 558}
BOOK_LABELS = {"new": "새찬송가", "union": "통일찬송가"}
UNION_ID_OFFSET = 645
HYMNLABEL_FIELDS = ("curated_version_name", "version_label", "raw_section_name", "hymn_no")


@dataclass(frozen=True)
class ReferenceHymn:
    book: str
    number: int
    title: str
    lyrics: str
    verse_count: int
    has_chorus: bool
    has_amen: bool
    lyric_hash: str


class HbibleHymnParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._title_depth = 0
        self._lyrics_depth = 0
        self._title_parts: list[str] = []
        self._lyric_parts: list[str] = []
        self._captured_lyrics = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("id") == "id_hymn_title":
            self._title_depth = 1
            return
        if self._title_depth:
            self._title_depth += 1

        classes = set((attributes.get("class") or "").split())
        if not self._captured_lyrics and "textSpacing" in classes:
            self._lyrics_depth = 1
            return
        if self._lyrics_depth:
            if tag == "br":
                self._lyric_parts.append("\n")
                return
            self._lyrics_depth += 1

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._lyrics_depth and tag == "br":
            self._lyric_parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._title_depth:
            self._title_depth -= 1
        if self._lyrics_depth:
            self._lyrics_depth -= 1
            if self._lyrics_depth == 0:
                self._captured_lyrics = True

    def handle_data(self, data: str) -> None:
        if self._title_depth:
            self._title_parts.append(data)
        if self._lyrics_depth:
            self._lyric_parts.append(data)

    def parsed_text(self) -> tuple[str, str]:
        return clean_inline_text(" ".join(self._title_parts)), clean_lyrics("".join(self._lyric_parts))


def clean_inline_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def clean_lyrics(value: Any) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line).strip()


def comparison_text(value: Any) -> str:
    text = clean_lyrics(value).casefold()
    text = re.sub(r"\[\s*(?:verse|chorus|pre-chorus|bridge|coda|lyrics)(?:\s+\d+)?\s*]", "", text)
    text = re.sub(r"<\s*후렴\s*>", "", text)
    text = re.sub(r"(?:^|\n)\s*\d+\s*[.)]\s*", "", text)
    return re.sub(r"[^0-9a-z가-힣]", "", text)


def structural_text(value: Any) -> str:
    text = clean_lyrics(value)
    text = re.sub(r"\[\s*(?:verse|chorus|pre-chorus|bridge|coda|lyrics)(?:\s+\d+)?\s*]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*후렴\s*>", "", text)
    text = re.sub(r"(?:^|\n)\s*\d+\s*[.)]\s*", "\n", text)
    return re.sub(r"\s+", " ", text).strip()


def strict_lyric_text(value: Any) -> str:
    return re.sub(r"\s+", "", structural_text(value))


def normalize_title(value: Any) -> str:
    return re.sub(r"[^0-9a-z가-힣]", "", clean_inline_text(value).casefold())


def lyric_structure(value: Any) -> tuple[int, bool, bool]:
    text = clean_lyrics(value)
    verse_numbers = {int(match) for match in re.findall(r"(?:^|\n)\s*(\d+)\s*[.)]", text)}
    verse_numbers.update(int(match) for match in re.findall(r"\[\s*Verse\s+(\d+)\s*]", text, re.IGNORECASE))
    has_chorus = bool(re.search(r"(?:<\s*후렴\s*>|\bchorus\b)", text, re.IGNORECASE))
    has_amen = bool(re.search(r"아\s*[-—]*\s*멘\s*$", text))
    return len(verse_numbers), has_chorus, has_amen


def parse_hbible_hymn(html: str, expected_book: str, expected_number: int) -> ReferenceHymn:
    parser = HbibleHymnParser()
    parser.feed(html)
    raw_title, lyrics = parser.parsed_text()
    match = re.search(r"(새찬송가|통일찬송가)\s*(\d+)장\s+(.+)$", raw_title)
    if not match:
        raise ValueError("Could not parse hymn title")
    actual_book = "new" if match.group(1) == "새찬송가" else "union"
    actual_number = int(match.group(2))
    if (actual_book, actual_number) != (expected_book, expected_number):
        raise ValueError(
            f"Unexpected hymn identity: {actual_book} {actual_number}; "
            f"expected {expected_book} {expected_number}"
        )
    if not lyrics:
        raise ValueError("Could not parse hymn lyrics")
    verse_count, has_chorus, has_amen = lyric_structure(lyrics)
    digest = hashlib.sha256(comparison_text(lyrics).encode("utf-8")).hexdigest()[:16]
    return ReferenceHymn(
        book=actual_book,
        number=actual_number,
        title=clean_inline_text(match.group(3)),
        lyrics=lyrics,
        verse_count=verse_count,
        has_chorus=has_chorus,
        has_amen=has_amen,
        lyric_hash=digest,
    )


def source_id(book: str, number: int) -> int:
    return number if book == "new" else UNION_ID_OFFSET + number


def fetch_reference_hymn(book: str, number: int, timeout: float, retries: int) -> ReferenceHymn:
    url = f"{SOURCE_BASE_URL}/{source_id(book, number)}/"
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout) as response:
                html = response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
            return parse_hbible_hymn(html, book, number)
        except (HTTPError, URLError, TimeoutError, ValueError) as error:
            if attempt >= retries:
                raise RuntimeError(f"{book} {number}: {error}") from error
            time.sleep(0.5 * (attempt + 1))
    raise AssertionError("unreachable")


def version_units_by_version(units: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for unit in units:
        grouped.setdefault(str(unit.get("version_id") or ""), []).append(unit)
    for rows in grouped.values():
        rows.sort(key=lambda row: (row.get("curated_order") or row.get("unit_order") or 0, row.get("unit_order") or 0))
    return grouped


def version_label(version: dict[str, Any]) -> str:
    return " | ".join(clean_inline_text(version.get(field)) for field in HYMNLABEL_FIELDS if version.get(field))


def is_new_hymnal_version(version: dict[str, Any]) -> bool:
    label = version_label(version)
    return "새찬송가" in label or not re.search(r"(?:^|[ (])통(?:일)?\s*\d+", label)


def unified_number(version: dict[str, Any]) -> int | None:
    label = version_label(version)
    match = re.search(r"(?:^|[ (])통(?:일)?\s*(\d{1,3})(?:\D|$)", label)
    return int(match.group(1)) if match else None


def title_from_unified_version(version: dict[str, Any], fallback: str) -> str:
    for field in ("curated_version_name", "version_label", "raw_section_name"):
        value = clean_inline_text(version.get(field))
        leading = re.match(r"^통(?:일)?\s*\d+\s+(.+?)(?:\s*\)|$)", value)
        if leading:
            return leading.group(1).strip()
        trailing = re.match(r"^(.+?)\s*\(\s*통(?:일)?\s*\d+\s*\)$", value)
        if trailing:
            return trailing.group(1).strip()
    return fallback


def combined_lyrics(version: dict[str, Any], grouped_units: dict[str, list[dict[str, Any]]]) -> str:
    blocks: list[str] = []
    for unit in grouped_units.get(str(version.get("id") or ""), []):
        text = clean_lyrics(unit.get("text"))
        if not text:
            continue
        label = clean_inline_text(unit.get("curated_unit_label") or unit.get("unit_label"))
        if label and not re.match(r"^lyrics$", label, re.IGNORECASE):
            blocks.append(f"[{label}]\n{text}")
        else:
            blocks.append(text)
    return "\n".join(blocks)


def audit_reference(
    reference: ReferenceHymn,
    songs: list[dict[str, Any]],
    versions_by_song: dict[str, list[dict[str, Any]]],
    grouped_units: dict[str, list[dict[str, Any]]],
    similarity_threshold: float,
) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    if reference.book == "new":
        matches = [row for row in songs if str(row.get("hymn_no") or "").strip() == str(reference.number)]
        if not matches:
            return [issue(reference, "missing-db-song", "error")]
        if len(matches) > 1:
            issues.append(issue(reference, "duplicate-db-song", "error", count=len(matches)))
        song = matches[0]
        if normalize_title(song.get("title")) != normalize_title(reference.title):
            issues.append(issue(reference, "title-mismatch", "warning", db_title=clean_inline_text(song.get("title"))))
        versions = [row for row in versions_by_song.get(str(song.get("id")), []) if is_new_hymnal_version(row)]
    else:
        candidates: list[tuple[dict[str, Any], dict[str, Any]]] = []
        song_by_id = {str(row.get("id")): row for row in songs}
        for song_id, song_versions in versions_by_song.items():
            for candidate in song_versions:
                if unified_number(candidate) == reference.number and song_id in song_by_id:
                    candidates.append((song_by_id[song_id], candidate))
        if not candidates:
            return [issue(reference, "missing-db-version", "error")]
        if len(candidates) > 1:
            issues.append(issue(reference, "duplicate-db-version", "error", count=len(candidates)))
        song, selected = candidates[0]
        versions = [selected]
        db_title = title_from_unified_version(selected, clean_inline_text(song.get("title")))
        if normalize_title(db_title) != normalize_title(reference.title):
            issues.append(issue(reference, "title-mismatch", "warning", db_title=db_title))

    if not versions:
        return issues + [issue(reference, "missing-db-version", "error")]
    if len(versions) > 1:
        issues.append(issue(reference, "duplicate-db-version", "error", count=len(versions)))
    db_lyrics = combined_lyrics(versions[0], grouped_units)
    if not comparison_text(db_lyrics):
        return issues + [issue(reference, "empty-db-lyrics", "error")]

    db_verse_count, db_has_chorus, db_has_amen = lyric_structure(db_lyrics)
    if reference.verse_count and db_verse_count and reference.verse_count != db_verse_count:
        issues.append(issue(
            reference,
            "verse-count-mismatch",
            "warning",
            reference_count=reference.verse_count,
            db_count=db_verse_count,
        ))
    if reference.has_chorus != db_has_chorus:
        issues.append(issue(
            reference,
            "chorus-structure-mismatch",
            "warning",
            reference_has_chorus=reference.has_chorus,
            db_has_chorus=db_has_chorus,
        ))
    if reference.has_amen != db_has_amen:
        issues.append(issue(
            reference,
            "amen-structure-mismatch",
            "warning",
            reference_has_amen=reference.has_amen,
            db_has_amen=db_has_amen,
        ))

    reference_strict = strict_lyric_text(reference.lyrics)
    db_strict = strict_lyric_text(db_lyrics)
    if reference_strict != db_strict:
        issues.append(issue(
            reference,
            "lyric-character-mismatch",
            "warning",
            reference_hash=hashlib.sha256(reference_strict.encode()).hexdigest()[:16],
            db_hash=hashlib.sha256(db_strict.encode()).hexdigest()[:16],
            similarity=round(difflib.SequenceMatcher(None, reference_strict, db_strict).ratio(), 4),
        ))
    elif structural_text(reference.lyrics) != structural_text(db_lyrics):
        issues.append(issue(reference, "lyric-spacing-only-difference", "warning"))

    ratio = difflib.SequenceMatcher(None, comparison_text(reference.lyrics), comparison_text(db_lyrics)).ratio()
    if ratio < similarity_threshold:
        issues.append(issue(reference, "low-lyric-similarity", "warning", similarity=round(ratio, 4)))
    return issues


def issue(reference: ReferenceHymn, code: str, severity: str, **details: Any) -> dict[str, Any]:
    return {
        "severity": severity,
        "code": code,
        "book": reference.book,
        "book_label": BOOK_LABELS[reference.book],
        "number": reference.number,
        "reference_title": reference.title,
        **details,
    }


def requested_numbers(book: str, selected: list[int]) -> list[int]:
    limit = BOOK_LIMITS[book]
    if not selected:
        return list(range(1, limit + 1))
    invalid = [number for number in selected if number < 1 or number > limit]
    if invalid:
        raise ValueError(f"{BOOK_LABELS[book]} number out of range: {invalid}")
    return sorted(set(selected))


def make_report(
    references: list[ReferenceHymn],
    issues: list[dict[str, Any]],
    fetch_errors: list[dict[str, Any]],
) -> dict[str, Any]:
    by_code: dict[str, int] = {}
    for row in [*issues, *fetch_errors]:
        code = str(row.get("code") or "unknown")
        by_code[code] = by_code.get(code, 0) + 1
    return {
        "source": SOURCE_NAME,
        "source_base_url": SOURCE_BASE_URL,
        "read_only": True,
        "lyrics_persisted": False,
        "summary": {
            "reference_rows_checked": len(references),
            "issue_count": len(issues),
            "fetch_error_count": len(fetch_errors),
            "by_code": dict(sorted(by_code.items())),
        },
        "issues": issues,
        "fetch_errors": fetch_errors,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only MINDEX hymn audit against hbible.co.kr")
    parser.add_argument("--book", choices=("new", "union", "both"), default="both")
    parser.add_argument("--number", action="append", type=int, default=[], help="Repeat for selected hymn numbers")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--delay", type=float, default=0.05, help="Delay between source requests")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent source requests (1-8)")
    parser.add_argument("--similarity-threshold", type=float, default=0.92)
    parser.add_argument("--output", type=Path, help="Write JSON report to this path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    books = ("new", "union") if args.book == "both" else (args.book,)
    if args.book == "both" and args.number:
        raise ValueError("--number requires --book new or --book union")
    if not 1 <= args.workers <= 8:
        raise ValueError("--workers must be between 1 and 8")

    supa_url, supa_key = read_config()
    songs = fetch_rows(supa_url, supa_key, "mindex_songs", "id,title,hymn_no,praise_types")
    versions = fetch_rows(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,source_song_id,curated_version_name,version_label,raw_section_name,hymn_no,is_primary",
    )
    units = fetch_rows(
        supa_url,
        supa_key,
        "mindex_version_units",
        "id,version_id,unit_order,unit_label,text,curated_unit_label,curated_order",
    )
    versions_by_song: dict[str, list[dict[str, Any]]] = {}
    for version in versions:
        versions_by_song.setdefault(str(version.get("source_song_id") or ""), []).append(version)
    grouped_units = version_units_by_version(units)

    references: list[ReferenceHymn] = []
    issues: list[dict[str, Any]] = []
    fetch_errors: list[dict[str, Any]] = []
    targets = [(book, number) for book in books for number in requested_numbers(book, args.number)]

    def fetch_target(target: tuple[str, int]) -> tuple[tuple[str, int], ReferenceHymn | None, str | None]:
        book, number = target
        if args.delay:
            time.sleep(max(0.0, args.delay))
        try:
            return target, fetch_reference_hymn(book, number, args.timeout, args.retries), None
        except RuntimeError as error:
            return target, None, str(error)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_by_target = {executor.submit(fetch_target, target): target for target in targets}
        for future in concurrent.futures.as_completed(future_by_target):
            (book, number), reference, fetch_error = future.result()
            if fetch_error:
                fetch_errors.append({
                    "severity": "error",
                    "code": "source-fetch-failed",
                    "book": book,
                    "book_label": BOOK_LABELS[book],
                    "number": number,
                    "error": fetch_error,
                })
                continue
            if reference is None:
                continue
            references.append(reference)
            issues.extend(audit_reference(
                reference,
                songs,
                versions_by_song,
                grouped_units,
                args.similarity_threshold,
            ))

    references.sort(key=lambda row: (row.book, row.number))
    issues.sort(key=lambda row: (str(row.get("book")), int(row.get("number") or 0), str(row.get("code"))))
    fetch_errors.sort(key=lambda row: (str(row.get("book")), int(row.get("number") or 0)))

    report = make_report(references, issues, fetch_errors)
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
        print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
        print(f"Report: {args.output}")
    else:
        print(rendered)
    return 2 if fetch_errors else (1 if any(row["severity"] == "error" for row in issues) else 0)


if __name__ == "__main__":
    raise SystemExit(main())
