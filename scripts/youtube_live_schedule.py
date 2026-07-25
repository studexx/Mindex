#!/usr/bin/env python3
"""Create the next Sunday YouTube live reservation."""
from __future__ import annotations

import argparse
import base64
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any


SCOPES = ["https://www.googleapis.com/auth/youtube"]
KST = timezone(timedelta(hours=9))
SERVICE_LABEL = "검단우리교회 주일예배"
DEFAULT_PLAYLIST_TEMPLATE = "주일예배 LIVE {year}"
DEFAULT_PRIVACY_STATUS = "public"
DEFAULT_DURATION_MINUTES = 90
START_TIME = time(10, 45)


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def parse_date(raw: str) -> date:
    return datetime.strptime(raw, "%Y-%m-%d").date()


def next_sunday(today: date, weeks: int = 0) -> date:
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7
    return today + timedelta(days=days_until_sunday + weeks * 7)


def target_date_from_args(raw_date: str | None, weeks: int, now: datetime | None = None) -> date:
    if raw_date:
        return parse_date(raw_date)
    base = (now or datetime.now(KST)).astimezone(KST).date()
    return next_sunday(base, weeks)


def scheduled_start_at(service_date: date) -> str:
    return datetime.combine(service_date, START_TIME, tzinfo=KST).isoformat()


def reservation_source(service_date: date) -> dict[str, Any]:
    date_text = service_date.isoformat()
    return {
        "date": date_text,
        "serviceDate": date_text,
        "scheduledStartTime": scheduled_start_at(service_date),
    }


def live_title(source: dict[str, Any]) -> str:
    service_date = clean_text(source.get("date"))
    return f"[LIVE] {SERVICE_LABEL} | {service_date}"


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
        maxResults=50,
    )
    while request is not None:
        response = request.execute()
        for item in response.get("items", []):
            if is_same_service_date(item, service_date):
                return item
        request = youtube.liveBroadcasts().list_next(request, response)
    return None


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
    matches = []
    request = youtube.playlists().list(
        part="id,snippet",
        mine=True,
        maxResults=50,
    )
    while request is not None:
        response = request.execute()
        for playlist in response.get("items", []):
            if clean_text(playlist.get("snippet", {}).get("title")) == title:
                matches.append(playlist)
        request = youtube.playlists().list_next(request, response)
    if not matches:
        return None
    return sorted(
        matches,
        key=lambda playlist: playlist.get("snippet", {}).get("publishedAt", ""),
    )[-1]


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
    playlist_result = add_to_live_playlist(youtube, video_id, source)

    return {
        "status": "created",
        **plan,
        **playlist_result,
        "videoId": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Service date as YYYY-MM-DD. Defaults to the next Sunday in UTC+9.")
    parser.add_argument("--weeks", type=int, default=0, help="0=next Sunday, 1=the Sunday after that.")
    parser.add_argument("--apply", action="store_true", help="Create the YouTube live reservation.")
    args = parser.parse_args()

    source = reservation_source(target_date_from_args(args.date, args.weeks))
    youtube = youtube_service() if args.apply else None
    result = create_or_find_live(youtube, source, args.apply)
    result["source"] = {
        "date": source.get("date"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
