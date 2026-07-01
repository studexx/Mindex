#!/usr/bin/env python3
"""Create the weekly YouTube live reservation from Mindex source data."""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

try:
    from youtube_live_source import (
        DEFAULT_STATE_DIR,
        KST,
        RestClient,
        clear_retry_marker,
        has_retry_marker,
        read_config,
        resolve_live_source,
        scheduled_start_at,
        target_date_from_args,
        today_from_args,
        write_retry_marker,
    )
except ModuleNotFoundError:
    from scripts.youtube_live_source import (
        DEFAULT_STATE_DIR,
        KST,
        RestClient,
        clear_retry_marker,
        has_retry_marker,
        read_config,
        resolve_live_source,
        scheduled_start_at,
        target_date_from_args,
        today_from_args,
        write_retry_marker,
    )


SCOPES = ["https://www.googleapis.com/auth/youtube"]
SERVICE_LABEL = "검단우리교회 주일예배"
DEFAULT_PLAYLIST_TEMPLATE = "주일예배 LIVE {year}"
DEFAULT_PRIVACY_STATUS = "public"
DEFAULT_DURATION_MINUTES = 90


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def normalize_passage(value: Any) -> str:
    passage = clean_text(value)
    passage = passage.replace("~", "–")
    passage = re.sub(r"(?<=\d)\s*-\s*(?=\d)", "–", passage)
    return passage


def live_title(source: dict[str, Any]) -> str:
    title = clean_text(source.get("sermonTitle"))
    passage = normalize_passage(source.get("passage"))
    preacher = clean_text(source.get("preacher"))
    service_date = clean_text(source.get("date"))
    return f"{title} ({passage}) | {preacher} | {SERVICE_LABEL} | {service_date}"


def live_description(source: dict[str, Any]) -> str:
    return ""


def parse_rfc3339(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def scheduled_end_time(source: dict[str, Any], duration_minutes: int) -> str:
    start = parse_rfc3339(source["scheduledStartTime"])
    return (start + timedelta(minutes=duration_minutes)).isoformat()


def playlist_title_for_source(source: dict[str, Any]) -> str:
    template = os.environ.get("YOUTUBE_LIVE_PLAYLIST_TITLE_TEMPLATE", DEFAULT_PLAYLIST_TEMPLATE)
    service_date = clean_text(source.get("date"))
    year = service_date[:4]
    return template.format(year=year, date=service_date)


def validate_title(title: str) -> None:
    if not title.strip():
        raise ValueError("YouTube live title is empty.")
    if len(title) > 100:
        raise ValueError(f"YouTube live title is {len(title)} characters; limit is 100.")
    if "~" in title:
        raise ValueError("YouTube live title still contains '~'.")
    if re.search(r"\[[^\]]+\]", title):
        raise ValueError("YouTube live title still contains old bracket text.")


def read_json_secret(name: str, path_name: str | None = None) -> dict[str, Any]:
    path_value = os.environ.get(path_name or f"{name}_PATH", "")
    if path_value:
        return json.loads(Path(path_value).read_text(encoding="utf-8"))

    raw = os.environ.get(name, "")
    raw_b64 = os.environ.get(f"{name}_B64", "")
    if raw_b64:
        raw = base64.b64decode(raw_b64).decode("utf-8")
    if not raw:
        raise RuntimeError(f"{name} secret was not provided.")
    return json.loads(raw)


def youtube_service():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError as error:
        raise RuntimeError(
            "YouTube dependencies are missing. Install requirements-youtube-live.txt."
        ) from error

    token_info = read_json_secret("YOUTUBE_TOKEN_JSON")
    creds = Credentials.from_authorized_user_info(token_info, SCOPES)

    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds.valid:
        raise RuntimeError("YouTube OAuth token is invalid or expired without refresh token.")

    return build("youtube", "v3", credentials=creds)


def broadcast_body(
    source: dict[str, Any],
    privacy_status: str,
    duration_minutes: int,
) -> dict[str, Any]:
    title = live_title(source)
    validate_title(title)
    return {
        "snippet": {
            "title": title,
            "description": live_description(source),
            "scheduledStartTime": source["scheduledStartTime"],
            "scheduledEndTime": scheduled_end_time(source, duration_minutes),
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False,
        },
        "contentDetails": {
            "enableAutoStart": False,
            "enableAutoStop": False,
            "enableDvr": True,
            "recordFromStart": True,
        },
    }


def is_same_service_date(broadcast: dict[str, Any], service_date: str) -> bool:
    snippet = broadcast.get("snippet", {})
    title = snippet.get("title", "")
    scheduled_start = snippet.get("scheduledStartTime", "")
    if SERVICE_LABEL not in title:
        return False
    if not scheduled_start:
        return False
    try:
        date_text = parse_rfc3339(scheduled_start).astimezone(KST).date().isoformat()
    except ValueError:
        return False
    return date_text == service_date


def find_existing_broadcast(youtube, service_date: str) -> dict[str, Any] | None:
    request = youtube.liveBroadcasts().list(
        part="id,snippet,status",
        broadcastStatus="upcoming",
        mine=True,
        maxResults=50,
    )
    while request is not None:
        response = request.execute()
        for item in response.get("items", []):
            if is_same_service_date(item, service_date):
                return item
        request = youtube.liveBroadcasts().list_next(request, response)
    return None


def thumbnail_path_from_env() -> str | None:
    direct_path = os.environ.get("YOUTUBE_LIVE_THUMBNAIL_PATH", "")
    if direct_path:
        return direct_path

    raw_b64 = os.environ.get("YOUTUBE_LIVE_THUMBNAIL_B64", "")
    if not raw_b64:
        return None

    suffix = os.environ.get("YOUTUBE_LIVE_THUMBNAIL_EXT", ".jpg")
    if not suffix.startswith("."):
        suffix = f".{suffix}"
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    handle.write(base64.b64decode(raw_b64))
    handle.close()
    return handle.name


def set_thumbnail(youtube, video_id: str, thumbnail_path: str) -> None:
    from googleapiclient.http import MediaFileUpload

    youtube.thumbnails().set(
        videoId=video_id,
        media_body=MediaFileUpload(thumbnail_path, resumable=False),
    ).execute()


def add_to_playlist(youtube, video_id: str, playlist_id: str) -> None:
    youtube.playlistItems().insert(
        part="snippet",
        body={
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id,
                },
            }
        },
    ).execute()


def find_playlist_by_title(youtube, title: str) -> dict[str, Any] | None:
    request = youtube.playlists().list(
        part="id,snippet",
        mine=True,
        maxResults=50,
    )
    while request is not None:
        response = request.execute()
        for playlist in response.get("items", []):
            if clean_text(playlist.get("snippet", {}).get("title")) == title:
                return playlist
        request = youtube.playlists().list_next(request, response)
    return None


def playlist_contains_video(youtube, playlist_id: str, video_id: str) -> bool:
    request = youtube.playlistItems().list(
        part="contentDetails",
        playlistId=playlist_id,
        maxResults=50,
    )
    while request is not None:
        response = request.execute()
        for item in response.get("items", []):
            if item.get("contentDetails", {}).get("videoId") == video_id:
                return True
        request = youtube.playlistItems().list_next(request, response)
    return False


def resolve_playlist_id(youtube, source: dict[str, Any]) -> tuple[str, str, str]:
    configured_id = os.environ.get("YOUTUBE_LIVE_PLAYLIST_ID", "")
    if configured_id:
        return configured_id, "", "configured_id"

    title = playlist_title_for_source(source)
    playlist = find_playlist_by_title(youtube, title)
    if not playlist:
        raise RuntimeError(f"YouTube live playlist not found: {title}")
    return playlist["id"], title, "title_lookup"


def add_to_live_playlist(youtube, video_id: str, source: dict[str, Any]) -> dict[str, str | bool]:
    playlist_id, playlist_title, mode = resolve_playlist_id(youtube, source)
    if playlist_contains_video(youtube, playlist_id, video_id):
        return {
            "playlistId": playlist_id,
            "playlistTitle": playlist_title,
            "playlistMode": mode,
            "playlistAlreadyContainedVideo": True,
        }

    add_to_playlist(youtube, video_id, playlist_id)
    return {
        "playlistId": playlist_id,
        "playlistTitle": playlist_title,
        "playlistMode": mode,
        "playlistAlreadyContainedVideo": False,
    }


def bind_stream(youtube, broadcast_id: str, stream_id: str) -> None:
    youtube.liveBroadcasts().bind(
        part="id,contentDetails",
        id=broadcast_id,
        streamId=stream_id,
    ).execute()


def create_or_find_live(youtube, source: dict[str, Any], apply: bool) -> dict[str, Any]:
    privacy_status = os.environ.get("YOUTUBE_LIVE_PRIVACY_STATUS", DEFAULT_PRIVACY_STATUS)
    duration_minutes = int(os.environ.get("YOUTUBE_LIVE_DURATION_MINUTES", DEFAULT_DURATION_MINUTES))
    stream_id = os.environ.get("YOUTUBE_LIVE_STREAM_ID", "")
    thumbnail_path = thumbnail_path_from_env()
    body = broadcast_body(source, privacy_status, duration_minutes)
    playlist_title = playlist_title_for_source(source)

    plan = {
        "ready": True,
        "apply": apply,
        "title": body["snippet"]["title"],
        "scheduledStartTime": body["snippet"]["scheduledStartTime"],
        "scheduledEndTime": body["snippet"]["scheduledEndTime"],
        "privacyStatus": privacy_status,
        "streamConfigured": bool(stream_id),
        "playlistConfigured": True,
        "playlistTitle": playlist_title,
        "playlistLookupMode": "configured_id" if os.environ.get("YOUTUBE_LIVE_PLAYLIST_ID", "") else "title_lookup",
        "thumbnailConfigured": bool(thumbnail_path),
    }
    if not apply:
        return {"status": "dry_run", **plan}

    resolve_playlist_id(youtube, source)
    existing = find_existing_broadcast(youtube, source["date"])
    if existing:
        video_id = existing["id"]
        playlist_result = add_to_live_playlist(youtube, video_id, source)
        return {
            "status": "exists",
            **plan,
            **playlist_result,
            "videoId": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
        }

    response = youtube.liveBroadcasts().insert(
        part="snippet,status,contentDetails",
        body=body,
    ).execute()
    video_id = response["id"]

    if stream_id:
        bind_stream(youtube, video_id, stream_id)
    if thumbnail_path:
        set_thumbnail(youtube, video_id, thumbnail_path)
    playlist_result = add_to_live_playlist(youtube, video_id, source)

    return {
        "status": "created",
        **plan,
        **playlist_result,
        "videoId": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
    }


def resolve_source_from_args(args: argparse.Namespace) -> dict[str, Any]:
    service_date = today_from_args(args.date) if args.today else target_date_from_args(args.date, args.weeks)
    if args.retry_only_if_marked and not has_retry_marker(args.state_dir, service_date):
        return {
            "ready": False,
            "skipped": True,
            "reason": "retry marker not found",
            "date": service_date.isoformat(),
            "timezone": "UTC+09:00",
            "scheduledStartTime": scheduled_start_at(service_date),
        }

    result = resolve_live_source(RestClient(read_config()), service_date)
    if result["ready"]:
        clear_retry_marker(args.state_dir, service_date)
    elif args.mark_retry_if_not_ready:
        write_retry_marker(args.state_dir, service_date, result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Service date as YYYY-MM-DD. Defaults to this week's Sunday in UTC+9.")
    parser.add_argument("--weeks", type=int, default=0, help="0=this week's Sunday, 1=next week's Sunday.")
    parser.add_argument("--today", action="store_true", help="Use the current UTC+9 calendar date.")
    parser.add_argument("--state-dir", type=Path, default=DEFAULT_STATE_DIR)
    parser.add_argument("--mark-retry-if-not-ready", action="store_true")
    parser.add_argument("--retry-only-if-marked", action="store_true")
    parser.add_argument("--require-ready", action="store_true")
    parser.add_argument("--apply", action="store_true", help="Create the YouTube live reservation.")
    args = parser.parse_args()

    source = resolve_source_from_args(args)
    if not source.get("ready"):
        print(json.dumps(source, ensure_ascii=False, indent=2))
        return 2 if args.require_ready and not source.get("skipped") else 0

    youtube = youtube_service() if args.apply else None
    result = create_or_find_live(youtube, source, args.apply)
    result["source"] = {
        "date": source.get("date"),
        "sermonTitle": source.get("sermonTitle"),
        "passage": source.get("passage"),
        "preacher": source.get("preacher"),
        "preacherSource": source.get("preacherSource"),
        "serviceId": source.get("serviceId"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
