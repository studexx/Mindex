#!/usr/bin/env python3
"""Ensure worship template default songs exist as persisted song/version rows."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from backfill_song_versions_from_memo import fetch_all, read_config, request_json  # noqa: E402


DEFAULT_SONGS = (
    {
        "key": "youth-offering-dae-dan-han-mid-eum-eopseo-do",
        "title": "대단한 믿음 없어도",
        "praise_types": ["ccm"],
        "version_label": "기본",
        "curated_version_name": "기본",
    },
)


def normalize_title(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).lower()
    text = re.sub(r"[\[\](){}/:;,.!?·ㆍ'\"`~\-–—_+*=|\\<>]", "", text)
    return re.sub(r"\s+", "", text).strip()


def stable_uuid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://mindex.local/default-song/{name}"))


def empty_signature(key: str) -> str:
    digest = hashlib.sha1(f"default-song:{key}:empty".encode("utf-8")).hexdigest()[:16]
    return f"mindex-empty-{digest}"


def first_by_normalized(rows: list[dict[str, Any]], title: str) -> dict[str, Any] | None:
    target = normalize_title(title)
    for row in rows:
        if normalize_title(row.get("title")) == target:
            return row
    return None


def version_for_song(versions: list[dict[str, Any]], song_id: str) -> dict[str, Any] | None:
    candidates = [row for row in versions if row.get("source_song_id") == song_id]
    if not candidates:
        return None
    candidates.sort(key=lambda row: (not bool(row.get("is_primary")), int(row.get("version_order") or 9999)))
    return candidates[0]


def canonical_for_song(
    canonical_rows: list[dict[str, Any]],
    versions: list[dict[str, Any]],
    song: dict[str, Any],
) -> dict[str, Any] | None:
    version = version_for_song(versions, song["id"])
    if version:
        canonical_id = version.get("canonical_song_id")
        for row in canonical_rows:
            if row.get("id") == canonical_id:
                return row
    return first_by_normalized(canonical_rows, song.get("title") or "")


def build_plan(supa_url: str, supa_key: str) -> list[dict[str, Any]]:
    songs = fetch_all(supa_url, supa_key, "mindex_songs", "id,title,hymn_no,praise_types,memo")
    canonical_rows = fetch_all(supa_url, supa_key, "mindex_canonical_songs", "id,title,normalized_title,hymn_no,source_count")
    versions = fetch_all(
        supa_url,
        supa_key,
        "mindex_song_versions",
        "id,canonical_song_id,source_song_id,version_order,version_label,curated_version_name,lyric_signature,is_primary,praise_types",
    )
    plan: list[dict[str, Any]] = []
    for spec in DEFAULT_SONGS:
        song = first_by_normalized(songs, spec["title"])
        song_id = song["id"] if song else stable_uuid(f"{spec['key']}/song")
        canonical = canonical_for_song(canonical_rows, versions, song) if song else None
        canonical_id = canonical["id"] if canonical else stable_uuid(f"{spec['key']}/canonical")
        version = version_for_song(versions, song_id)
        version_id = version["id"] if version else stable_uuid(f"{spec['key']}/version/default")
        plan.append({
            "key": spec["key"],
            "title": spec["title"],
            "song_id": song_id,
            "canonical_id": canonical_id,
            "version_id": version_id,
            "needs_song": song is None,
            "needs_canonical": canonical is None,
            "needs_version": version is None,
            "song_title": song.get("title") if song else None,
            "version_label": version.get("version_label") if version else None,
            "praise_types": spec["praise_types"],
            "target_version_label": spec["version_label"],
            "target_curated_version_name": spec["curated_version_name"],
            "lyric_signature": empty_signature(spec["key"]),
        })
    return plan


def apply_plan(supa_url: str, supa_key: str, plan: list[dict[str, Any]]) -> None:
    for item in plan:
        if item["needs_song"]:
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_songs",
                {"on_conflict": "id"},
                [{
                    "id": item["song_id"],
                    "title": item["title"],
                    "praise_types": item["praise_types"],
                    "memo": json.dumps({"seed": "worship-template-default"}, ensure_ascii=False, separators=(",", ":")),
                }],
                "resolution=merge-duplicates,return=minimal",
            )
        if item["needs_canonical"]:
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_canonical_songs",
                {"on_conflict": "id"},
                [{
                    "id": item["canonical_id"],
                    "title": item["title"],
                    "normalized_title": normalize_title(item["title"]),
                    "source_count": 1,
                }],
                "resolution=merge-duplicates,return=minimal",
            )
        if item["needs_version"]:
            request_json(
                supa_url,
                supa_key,
                "POST",
                "mindex_song_versions",
                {"on_conflict": "id"},
                [{
                    "id": item["version_id"],
                    "canonical_song_id": item["canonical_id"],
                    "source_song_id": item["song_id"],
                    "version_order": 1,
                    "version_label": item["target_version_label"],
                    "curated_version_name": item["target_curated_version_name"],
                    "version_review_status": "needs_review",
                    "praise_types": item["praise_types"],
                    "lyric_signature": item["lyric_signature"],
                    "source_count": 1,
                    "is_primary": True,
                }],
                "resolution=merge-duplicates,return=minimal",
            )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write missing rows to Supabase. Default is dry-run.")
    args = parser.parse_args()

    supa_url, supa_key = read_config()
    before = build_plan(supa_url, supa_key)
    print(json.dumps({"apply": args.apply, "before": before}, ensure_ascii=False, indent=2))
    if args.apply:
        apply_plan(supa_url, supa_key, before)
        after = build_plan(supa_url, supa_key)
        print(json.dumps({"after": after}, ensure_ascii=False, indent=2))
        incomplete = [item for item in after if item["needs_song"] or item["needs_canonical"] or item["needs_version"]]
        if incomplete:
            raise RuntimeError(f"default song repair incomplete: {incomplete}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
