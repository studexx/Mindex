from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError


ROOT = Path(__file__).resolve().parents[1]
ENV_PATHS = (
    ROOT / ".env.supabase.local",
    ROOT / ".env.supabase",
)
PAGE_SIZE = 1000
PART_TYPES = {"Verse", "Pre-Chorus", "Chorus", "Bridge", "Coda", "Lyrics"}


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
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")
    if url and key:
        return url.rstrip("/"), key
    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("SUPABASE_URL", "")
        key = values.get("SUPABASE_SERVICE_ROLE_KEY") or values.get("SUPABASE_KEY", "")
        if url and key:
            return url.rstrip("/"), key
    raise RuntimeError("Supabase config not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")


def request_json(
    supa_url: str,
    supa_key: str,
    method: str,
    table: str,
    params: dict[str, str] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
    content_range: str | None = None,
) -> Any:
    query = f"?{urlencode(params or {}, safe='*,():.')}" if params else ""
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    if content_range:
        headers["Range"] = content_range
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(f"{supa_url}/rest/v1/{table}{query}", data=data, headers=headers, method=method)
    with urlopen(request, timeout=60) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else None


def fetch_all(supa_url: str, supa_key: str, table: str, select: str = "*") -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        batch = request_json(
            supa_url,
            supa_key,
            "GET",
            table,
            {"select": select},
            content_range=f"{start}-{start + PAGE_SIZE - 1}",
        )
        rows.extend(batch or [])
        if len(batch or []) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


def column_exists(supa_url: str, supa_key: str, table: str, column: str) -> bool:
    try:
        request_json(supa_url, supa_key, "GET", table, {"select": f"id,{column}", "limit": "1"})
        return True
    except HTTPError as error:
        if error.code == 400:
            return False
        raise


def is_uuid(value: Any) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False


def stable_uuid(value: Any | None = None) -> str:
    return str(value) if value and is_uuid(value) else str(uuid.uuid4())


def parse_memo(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def normalize_title(value: str) -> str:
    return re.sub(r"\s+", "", value or "").lower()


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def clean_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in (clean_text(item) for item in value) if item]


def lyric_signature(version: dict[str, Any]) -> str:
    text = "\n\n".join(clean_text(form.get("lyrics")) for form in version.get("forms") or [])
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    return f"mindex-{digest}"


def chunked(rows: list[dict[str, Any]], size: int = 500):
    for index in range(0, len(rows), size):
        yield rows[index:index + size]


def build_rows(song: dict[str, Any], has_version_praise_types: bool) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    memo = parse_memo(song.get("memo"))
    versions = memo.get("versions") if isinstance(memo.get("versions"), list) else []
    canonical = {
        "id": song["id"],
        "title": clean_text(song.get("title")) or "Untitled Song",
        "normalized_title": normalize_title(song.get("title") or ""),
        "subtitle": clean_text(song.get("subtitle")) or None,
        "original_title": clean_text(song.get("original_title")) or None,
        "hymn_no": clean_text(song.get("hymn_no")) or None,
        "source_count": 1,
    }

    version_rows: list[dict[str, Any]] = []
    unit_rows: list[dict[str, Any]] = []
    for version_index, version in enumerate(versions, start=1):
        version_id = stable_uuid(version.get("id"))
        form_rows = version.get("forms") if isinstance(version.get("forms"), list) else []
        version_name = clean_text(version.get("name")) or f"Version {version_index}"
        version_label = clean_text(version.get("raw_section_name")) or clean_text(version.get("version_label")) or version_name
        version_row = {
            "id": version_id,
            "canonical_song_id": song["id"],
            "source_song_id": song["id"],
            "version_order": version_index,
            "version_label": version_label,
            "curated_version_name": version_name,
            "version_review_status": "reviewed",
            "deck_key": clean_text(version.get("deck_key")) or None,
            "raw_section_name": clean_text(version.get("raw_section_name")) or clean_text(version.get("version_label")) or None,
            "subtitle": clean_text(version.get("subtitle")) or None,
            "original_title": clean_text(version.get("original_title")) or None,
            "hymn_no": clean_text(version.get("hymn_no")) or clean_text(song.get("hymn_no")) or None,
            "lyric_signature": lyric_signature(version),
            "source_count": int(version.get("source_count") or 1),
            "is_primary": bool(version.get("is_primary")) or version_index == 1,
        }
        if has_version_praise_types:
            version_row["praise_types"] = clean_list(version.get("praise_types")) or clean_list(song.get("praise_types"))
        version_rows.append(version_row)

        for unit_index, form in enumerate(form_rows, start=1):
            part_type = clean_text(form.get("part_type")) or "Lyrics"
            if part_type not in PART_TYPES:
                part_type = "Lyrics"
            label = clean_text(form.get("label")) or (
                part_type if not form.get("part_number") else f"{part_type} {form.get('part_number')}"
            )
            review_status = clean_text(form.get("review_status")) or "reviewed"
            unit_rows.append({
                "id": stable_uuid(form.get("id")),
                "version_id": version_id,
                "canonical_song_id": song["id"],
                "source_unit_id": None,
                "unit_order": unit_index,
                "unit_label": label or f"u{unit_index}",
                "unit_kind": part_type.lower(),
                "trigger": "",
                "slide_numbers": [],
                "text": clean_text(form.get("lyrics")),
                "curated_unit_type": part_type,
                "curated_unit_label": label or part_type,
                "curated_order": unit_index,
                "review_status": "reviewed" if review_status == "pending" else review_status,
                "review_note": None,
            })
    return canonical, version_rows, unit_rows


def strip_memo_versions(song: dict[str, Any]) -> str | None:
    memo = parse_memo(song.get("memo"))
    memo.pop("versions", None)
    return json.dumps(memo, ensure_ascii=False, separators=(",", ":")) if memo else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill mindex_song_versions/mindex_version_units from mindex_songs.memo.versions.")
    parser.add_argument("--apply", action="store_true", help="Write rows to Supabase. Without this flag, dry-run only.")
    parser.add_argument("--clear-memo-versions", action="store_true", help="After successful backfill, remove versions from mindex_songs.memo.")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of songs processed.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    has_version_praise_types = column_exists(supa_url, supa_key, "mindex_song_versions", "praise_types")
    if not has_version_praise_types:
        print("warning: mindex_song_versions.praise_types is missing. Run scripts/db-maintenance-2026-06-23.sql first.")

    songs = fetch_all(
        supa_url,
        supa_key,
        "mindex_songs",
        "id,title,subtitle,original_title,hymn_no,praise_types,memo",
    )
    songs_with_versions = [song for song in songs if parse_memo(song.get("memo")).get("versions")]
    if args.limit:
        songs_with_versions = songs_with_versions[: args.limit]

    totals = {
        "songs": len(songs_with_versions),
        "versions": 0,
        "units": 0,
        "apply": args.apply,
        "clear_memo_versions": args.clear_memo_versions,
    }

    for song in songs_with_versions:
        canonical, version_rows, unit_rows = build_rows(song, has_version_praise_types)
        totals["versions"] += len(version_rows)
        totals["units"] += len(unit_rows)
        if not args.apply:
            continue

        request_json(
            supa_url,
            supa_key,
            "POST",
            "mindex_canonical_songs",
            {"on_conflict": "id"},
            [canonical],
            "resolution=merge-duplicates,return=minimal",
        )
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"source_song_id": f"eq.{song['id']}"},
            prefer="return=minimal",
        )
        for batch in chunked(version_rows):
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_song_versions",
                {"on_conflict": "id"},
                batch,
                "resolution=merge-duplicates,return=minimal",
            )
        for batch in chunked(unit_rows):
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_version_units",
                {"on_conflict": "id"},
                batch,
                "resolution=merge-duplicates,return=minimal",
            )
        if args.clear_memo_versions:
            request_json(
                supa_url,
                supa_key,
                "PATCH",
                "mindex_songs",
                {"id": f"eq.{song['id']}"},
                {"memo": strip_memo_versions(song)},
                "return=minimal",
            )

    print(json.dumps(totals, ensure_ascii=False, indent=2))
    if not args.apply:
        print("dry-run only. Add --apply to write; add --clear-memo-versions only after verifying relational output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
