from __future__ import annotations

import argparse
import hashlib
import json
import os
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError


ROOT = Path(__file__).resolve().parents[1]
ENV_PATHS = (
    ROOT / ".env.supabase.local",
    ROOT / ".env.supabase",
)
PAGE_SIZE = 1000


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
) -> Any:
    query = ""
    if params:
        query = "?" + urlencode(params, quote_via=quote, safe="*,():")
    headers = {
        "apikey": supa_key,
        "Authorization": f"Bearer {supa_key}",
    }
    if prefer:
        headers["Prefer"] = prefer
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


def fetch_all(supa_url: str, supa_key: str, table: str, select: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        batch = request_json(
            supa_url,
            supa_key,
            "GET",
            table,
            {"select": select},
            prefer=f"count=exact",
        )
        # PostgREST ignores Range in query params, so page by explicit range headers only
        # in simple scripts would require a lower-level fetch. Current table is small enough
        # for the default API page, but keep the loop shape for future replacement.
        rows.extend(batch or [])
        break
    return rows


def fetch_rows(supa_url: str, supa_key: str, table: str, select: str) -> list[dict[str, Any]]:
    headers = {"apikey": supa_key, "Authorization": f"Bearer {supa_key}"}
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        request = Request(
            f"{supa_url}/rest/v1/{table}?select={quote(select, safe='*,():')}",
            headers={**headers, "Range": f"{start}-{start + PAGE_SIZE - 1}"},
        )
        with urlopen(request, timeout=60) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


def parse_memo(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, json.JSONDecodeError):
        return {}


def clean_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item or "").strip()]


def stable_relation_id(source_id: str, related_id: str, relation_type: str = "related") -> str:
    digest = hashlib.sha1(f"{source_id}:{related_id}:{relation_type}".encode("utf-8")).hexdigest()
    return str(uuid.UUID(digest[:32]))


def strip_memo_related(song: dict[str, Any]) -> str | None:
    memo = parse_memo(song.get("memo"))
    memo.pop("related_song_ids", None)
    memo.pop("relatedSongIds", None)
    return json.dumps(memo, ensure_ascii=False, separators=(",", ":")) if memo else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill mindex_song_relations from mindex_songs.memo.related_song_ids.")
    parser.add_argument("--apply", action="store_true", help="Write rows to Supabase. Without this flag, dry-run only.")
    parser.add_argument("--clear-memo-related", action="store_true", help="Remove related_song_ids from mindex_songs.memo after writing relations.")
    args = parser.parse_args()

    if args.clear_memo_related and not args.apply:
        raise SystemExit("--clear-memo-related requires --apply")

    supa_url, supa_key = read_config()
    songs = fetch_rows(supa_url, supa_key, "mindex_songs", "id,title,memo")
    song_ids = {song["id"] for song in songs}
    relation_rows: list[dict[str, Any]] = []
    songs_with_related: list[dict[str, Any]] = []
    missing_targets: list[dict[str, str]] = []

    for song in songs:
        related_ids = clean_list(parse_memo(song.get("memo")).get("related_song_ids") or parse_memo(song.get("memo")).get("relatedSongIds"))
        if not related_ids:
            continue
        songs_with_related.append(song)
        for related_id in related_ids:
            if related_id == song["id"]:
                continue
            if related_id not in song_ids:
                missing_targets.append({"source_song_id": song["id"], "related_song_id": related_id})
                continue
            relation_rows.append({
                "id": stable_relation_id(song["id"], related_id),
                "source_song_id": song["id"],
                "related_song_id": related_id,
                "relation_type": "related",
                "note": "",
            })

    if args.apply and relation_rows:
        request_json(
            supa_url,
            supa_key,
            "POST",
            "mindex_song_relations",
            {"on_conflict": "source_song_id,related_song_id,relation_type"},
            relation_rows,
            "resolution=merge-duplicates,return=minimal",
        )
        if args.clear_memo_related:
            for song in songs_with_related:
                request_json(
                    supa_url,
                    supa_key,
                    "PATCH",
                    "mindex_songs",
                    {"id": f"eq.{song['id']}"},
                    {"memo": strip_memo_related(song)},
                    "return=minimal",
                )

    print(json.dumps({
        "songs_with_related": len(songs_with_related),
        "relations": len(relation_rows),
        "missing_targets": missing_targets,
        "apply": args.apply,
        "clear_memo_related": args.clear_memo_related,
    }, ensure_ascii=False, indent=2))
    if not args.apply:
        print("dry-run only. Add --apply to write; add --clear-memo-related only after verifying relation rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
