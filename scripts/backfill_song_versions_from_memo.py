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
PART_TYPES = {"Verse", "Pre-Chorus", "Chorus", "Bridge", "Coda", "Lyrics", "Amen"}


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
    url = os.environ.get("MINDEX_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("MINDEX_SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )
    if url and key:
        return url.rstrip("/"), key
    for path in ENV_PATHS:
        values = read_env_file(path)
        url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL", "")
        key = (
            values.get("SUPABASE_SERVICE_ROLE_KEY")
            or values.get("MINDEX_SUPABASE_ANON_KEY")
            or values.get("SUPABASE_ANON_KEY")
            or values.get("SUPABASE_KEY")
            or ""
        )
        if url and key:
            return url.rstrip("/"), key
    raise RuntimeError("Supabase config not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY.")


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
    try:
        with urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {table}{query} failed with HTTP {error.code}: {body}") from error
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
    text = "\n\n".join(str(form.get("lyrics") or "") for form in version.get("forms") or [])
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
            review_status = clean_text(form.get("review_status")) or "pending"
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
                "text": str(form.get("lyrics") or ""),
                "curated_unit_type": part_type,
                "curated_unit_label": label or part_type,
                "curated_order": unit_index,
                "review_status": review_status,
                "review_note": None,
            })
    return canonical, version_rows, unit_rows


def strip_memo_versions(song: dict[str, Any]) -> str | None:
    memo = parse_memo(song.get("memo"))
    memo.pop("versions", None)
    return json.dumps(memo, ensure_ascii=False, separators=(",", ":")) if memo else None


def assign_canonical_id_and_order(
    version_rows: list[dict[str, Any]],
    unit_rows: list[dict[str, Any]],
    canonical_id: str,
    first_order: int,
) -> None:
    for index, row in enumerate(version_rows):
        row["canonical_song_id"] = canonical_id
        row["version_order"] = first_order + index
    for row in unit_rows:
        row["canonical_song_id"] = canonical_id


def assign_unique_lyric_signatures(
    version_rows: list[dict[str, Any]],
    used_signatures_by_canonical: dict[str, set[str]],
) -> None:
    for index, row in enumerate(version_rows, start=1):
        canonical_id = row["canonical_song_id"]
        used = used_signatures_by_canonical.setdefault(canonical_id, set())
        signature = row["lyric_signature"]
        if signature in used:
            source = str(row.get("source_song_id") or row["id"]).replace("-", "")[:12]
            signature = f"{signature}:{source}:{index}"
            row["lyric_signature"] = signature
        used.add(signature)


def delete_version_units_by_version_ids(supa_url: str, supa_key: str, version_ids: list[str]) -> None:
    for batch in chunked([version_id for version_id in version_ids if version_id]):
        ids = ",".join(batch)
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_version_units",
            {"version_id": f"in.({ids})"},
            prefer="return=minimal",
        )


def delete_existing_source_versions(supa_url: str, supa_key: str, song_id: str) -> None:
    existing_versions = request_json(
        supa_url,
        supa_key,
        "GET",
        "mindex_song_versions",
        {"select": "id", "source_song_id": f"eq.{song_id}"},
    ) or []
    version_ids = [row["id"] for row in existing_versions if row.get("id")]
    delete_version_units_by_version_ids(supa_url, supa_key, version_ids)
    request_json(
        supa_url,
        supa_key,
        "DELETE",
        "mindex_song_versions",
        {"source_song_id": f"eq.{song_id}"},
        prefer="return=minimal",
    )


def delete_existing_source_versions_for_songs(
    supa_url: str,
    supa_key: str,
    song_ids: set[str],
    existing_version_rows: list[dict[str, Any]],
) -> None:
    source_version_ids = [
        row["id"]
        for row in existing_version_rows
        if row.get("id") and row.get("source_song_id") in song_ids
    ]
    delete_version_units_by_version_ids(supa_url, supa_key, source_version_ids)
    for batch in chunked(sorted(song_ids)):
        ids = ",".join(batch)
        request_json(
            supa_url,
            supa_key,
            "DELETE",
            "mindex_song_versions",
            {"source_song_id": f"in.({ids})"},
            prefer="return=minimal",
        )


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
    canonical_rows = fetch_all(
        supa_url,
        supa_key,
        "mindex_canonical_songs",
        "id,normalized_title",
    )
    canonical_by_normalized = {
        row["normalized_title"]: row["id"]
        for row in canonical_rows
        if row.get("id") and row.get("normalized_title")
    }
    source_song_ids = {song["id"] for song in songs_with_versions}
    existing_version_rows = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,canonical_song_id,source_song_id,version_order,lyric_signature",
    )
    if args.apply:
        delete_existing_source_versions_for_songs(
            supa_url,
            supa_key,
            source_song_ids,
            existing_version_rows,
        )
    next_version_order_by_canonical: dict[str, int] = {}
    for row in existing_version_rows:
        if row.get("source_song_id") in source_song_ids:
            continue
        canonical_id = row.get("canonical_song_id")
        if not canonical_id:
            continue
        order = int(row.get("version_order") or 0)
        next_version_order_by_canonical[canonical_id] = max(
            next_version_order_by_canonical.get(canonical_id, 0),
            order,
        )
    used_signatures_by_canonical: dict[str, set[str]] = {}
    for row in existing_version_rows:
        if row.get("source_song_id") in source_song_ids:
            continue
        canonical_id = row.get("canonical_song_id")
        signature = row.get("lyric_signature")
        if canonical_id and signature:
            used_signatures_by_canonical.setdefault(canonical_id, set()).add(signature)

    totals = {
        "songs": len(songs_with_versions),
        "versions": 0,
        "units": 0,
        "apply": args.apply,
        "clear_memo_versions": args.clear_memo_versions,
    }
    canonical_rows_to_insert: list[dict[str, Any]] = []
    all_version_rows: list[dict[str, Any]] = []
    all_unit_rows: list[dict[str, Any]] = []

    for song in songs_with_versions:
        try:
            canonical, version_rows, unit_rows = build_rows(song, has_version_praise_types)
            existing_canonical_id = canonical_by_normalized.get(canonical["normalized_title"])
            canonical_id = existing_canonical_id or canonical["id"]
            if not existing_canonical_id:
                canonical_rows_to_insert.append(canonical)
                canonical_by_normalized[canonical["normalized_title"]] = canonical_id
            first_order = next_version_order_by_canonical.get(canonical_id, 0) + 1
            assign_canonical_id_and_order(version_rows, unit_rows, canonical_id, first_order)
            assign_unique_lyric_signatures(version_rows, used_signatures_by_canonical)
            next_version_order_by_canonical[canonical_id] = first_order + len(version_rows) - 1
            totals["versions"] += len(version_rows)
            totals["units"] += len(unit_rows)
            all_version_rows.extend(version_rows)
            all_unit_rows.extend(unit_rows)
        except Exception as error:
            raise RuntimeError(f"Backfill failed for song {song.get('id')} {song.get('title')}") from error

    if args.apply:
        delete_version_units_by_version_ids(
            supa_url,
            supa_key,
            [row["id"] for row in all_version_rows],
        )
        for batch in chunked(canonical_rows_to_insert):
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_canonical_songs",
                {"on_conflict": "id"},
                batch,
                "resolution=merge-duplicates,return=minimal",
            )
        for batch in chunked(all_version_rows):
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_song_versions",
                {"on_conflict": "id"},
                batch,
                "resolution=merge-duplicates,return=minimal",
            )
        for batch in chunked(all_unit_rows):
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
            for song in songs_with_versions:
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
