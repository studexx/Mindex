#!/usr/bin/env python3
"""Repair missing 새찬송가 song rows that were imported as extra versions."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "assets" / "hymn-scores" / "manifest.json"
MISSING_HYMN_NUMBERS = ("3", "36", "114", "636", "640", "641", "642", "643", "644")


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def normalize_title(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "").lower()
    text = re.sub(r"[\[\](){}/:;,.!?·ㆍ'\"`~\-–—_+*=|\\<>]", "", text)
    return re.sub(r"\s+", "", text).strip()


def stable_uuid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://mindex.local/{name}"))


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.url = url.rstrip("/")
        self.key = key

    def request(self, method: str, path: str, body: Any | None = None, headers: dict[str, str] | None = None) -> Any:
        data = None
        request_headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if headers:
            request_headers.update(headers)
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(f"{self.url}{path}", data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                raw = res.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} failed: HTTP {error.code} {detail}") from error
        return json.loads(raw) if raw else None

    def get(self, table: str, select: str = "*", **filters: str) -> list[dict[str, Any]]:
        params = {"select": select, **filters}
        return self.request("GET", f"/rest/v1/{table}?{urllib.parse.urlencode(params)}")

    def insert(self, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self.request(
            "POST",
            f"/rest/v1/{table}",
            rows,
            headers={"Prefer": "return=representation"},
        )

    def patch(self, table: str, filters: dict[str, str], payload: dict[str, Any]) -> list[dict[str, Any]]:
        return self.request(
            "PATCH",
            f"/rest/v1/{table}?{urllib.parse.urlencode(filters)}",
            payload,
            headers={"Prefer": "return=representation"},
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply the repair. Default is dry-run.")
    parser.add_argument("--env", default=str(ROOT / ".env.supabase.local"), help="Supabase env file.")
    args = parser.parse_args()

    load_dotenv(Path(args.env))
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_key:
        print("SUPABASE_URL and SUPABASE_ANON_KEY are required.", file=sys.stderr)
        return 2

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    client = SupabaseRest(supabase_url, supabase_key)

    existing_songs = client.get(
        "mindex_songs",
        select="id,title,hymn_no",
        hymn_no="not.is.null",
    )
    existing_hymn_numbers = {str(row.get("hymn_no") or "") for row in existing_songs}
    existing_normalized = {
        row["normalized_title"]
        for row in client.get("mindex_canonical_songs", select="normalized_title")
        if row.get("normalized_title")
    }

    planned: list[dict[str, Any]] = []
    for hymn_no in MISSING_HYMN_NUMBERS:
        entry = manifest.get(hymn_no) or {}
        title = str(entry.get("title") or "").strip()
        if not title:
            raise RuntimeError(f"Missing manifest title for hymn {hymn_no}")
        versions = client.get(
            "mindex_song_versions",
            select="id,source_song_id,canonical_song_id,hymn_no,version_order,curated_version_name",
            hymn_no=f"eq.{hymn_no}",
        )
        new_hymn_versions = [row for row in versions if row.get("curated_version_name") == "새찬송가"]
        if len(new_hymn_versions) != 1:
            raise RuntimeError(f"Expected one 새찬송가 version for hymn {hymn_no}, found {len(new_hymn_versions)}")

        song_id = stable_uuid(f"hymn/{hymn_no}/song")
        canonical_id = song_id
        base_normalized = normalize_title(title)
        normalized_title = base_normalized if base_normalized not in existing_normalized else f"{base_normalized}::{hymn_no}"
        planned.append({
            "hymn_no": hymn_no,
            "title": title,
            "song_id": song_id,
            "canonical_id": canonical_id,
            "normalized_title": normalized_title,
            "version_id": new_hymn_versions[0]["id"],
            "from_song_id": new_hymn_versions[0]["source_song_id"],
            "from_canonical_id": new_hymn_versions[0]["canonical_song_id"],
            "already_has_song": hymn_no in existing_hymn_numbers,
        })

    print(json.dumps({"apply": args.apply, "planned": planned}, ensure_ascii=False, indent=2))
    if not args.apply:
        return 0

    for item in planned:
        if not item["already_has_song"]:
            client.insert("mindex_songs", [{
                "id": item["song_id"],
                "title": item["title"],
                "hymn_no": item["hymn_no"],
                "praise_types": ["hymn"],
            }])
            client.insert("mindex_canonical_songs", [{
                "id": item["canonical_id"],
                "title": item["title"],
                "normalized_title": item["normalized_title"],
                "hymn_no": item["hymn_no"],
                "source_count": 1,
            }])

        client.patch(
            "mindex_song_versions",
            {"id": f"eq.{item['version_id']}"},
            {
                "source_song_id": item["song_id"],
                "canonical_song_id": item["canonical_id"],
                "version_order": 1,
                "is_primary": True,
                "version_label": "새찬송가",
                "curated_version_name": "새찬송가",
                "praise_types": ["hymn"],
            },
        )
        client.patch(
            "mindex_version_units",
            {"version_id": f"eq.{item['version_id']}"},
            {"canonical_song_id": item["canonical_id"]},
        )

    remaining = [
        number for number in MISSING_HYMN_NUMBERS
        if not client.get("mindex_songs", select="id", hymn_no=f"eq.{number}")
    ]
    if remaining:
        raise RuntimeError(f"Repair incomplete; still missing hymn rows: {remaining}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
