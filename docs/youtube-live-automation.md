# YouTube Live Automation

This workflow creates the weekly Sunday 3rd service YouTube live reservation from
read-only Mindex data.

## Schedule

- Sunday 00:00 UTC+9: first run
- Sunday 08:00 UTC+9: retry only when the first run created a retry marker

GitHub cron uses UTC:

- `0 15 * * 6`
- `0 23 * * 6`

## Source Rules

- Service: `mindex_services.type_id === "sunday-main"`
- Service date: current UTC+9 calendar day for scheduled runs
- Start time: `10:45` UTC+9
- Passage: `mindex_service_items.label === "성경봉독"` `raw_title`
- Sermon title: `mindex_service_items.label === "설교"` `raw_title`
- Preacher: sermon item `assignee`, then service `leader`, then Sunday calendar `preacher`
- Required fields: `sermonTitle`, `passage`, `preacher`

The labels are intentionally exact matches. A nearby label such as `설교 전 찬양`
must not be treated as the sermon item.

If the sermon item `assignee` looks like a sermon-title fragment instead of a
preacher name, the workflow ignores it, emits `ignored_sermon_assignee`, and
falls back to the service leader or Sunday calendar preacher.

## Stable DB Contract

The current workflow reads the service tables directly because the live source is
small and read-only. If the worship data model changes from flat service items to
typed service components, keep the workflow stable by moving this extraction into
one database contract, preferably:

- RPC: `get_youtube_live_source(service_date date)`
- or view: `mindex_youtube_live_source`

The contract should return:

- `serviceDate`
- `scheduledStartTime`
- `sermonTitle`
- `passage`
- `preacher`
- `serviceId`
- `ready`
- `missing`

## YouTube Title

```text
설교 제목 (본문) | 김남영 목사 | 검단우리교회 주일예배 | YYYY-MM-DD
```

## GitHub Secrets

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `YOUTUBE_TOKEN_JSON` or `YOUTUBE_TOKEN_JSON_B64`

Optional:

- `YOUTUBE_LIVE_STREAM_ID`
- `YOUTUBE_LIVE_PLAYLIST_ID`, overrides playlist title lookup
- `YOUTUBE_LIVE_THUMBNAIL_B64`

## GitHub Variables

Optional:

- `YOUTUBE_LIVE_PRIVACY_STATUS`, default `public`
- `YOUTUBE_LIVE_DURATION_MINUTES`, default `90`
- `YOUTUBE_LIVE_THUMBNAIL_EXT`, default `.jpg`
- `YOUTUBE_LIVE_PLAYLIST_TITLE_TEMPLATE`, default `주일예배 LIVE {year}`

## Playlist

The workflow adds the reservation to the yearly live playlist by default.

For a 2026 service date, the default playlist title is:

```text
주일예배 LIVE 2026
```

If `YOUTUBE_LIVE_PLAYLIST_ID` is set, that ID is used directly. Otherwise, the
workflow looks up the playlist by `YOUTUBE_LIVE_PLAYLIST_TITLE_TEMPLATE`.

## Thumbnail

The live thumbnail should be stored as a GitHub secret, not committed to the
repository.

Current prepared local files:

```text
assets/youtube/live_thumbnail.jpg
assets/youtube/live_thumbnail.b64
```

Set `YOUTUBE_LIVE_THUMBNAIL_B64` to the contents of
`assets/youtube/live_thumbnail.b64`.

Set `YOUTUBE_LIVE_THUMBNAIL_EXT` to:

```text
.jpg
```

## Manual Test

Use the workflow dispatch button.

- `dry_run: true`: resolve Mindex data and print the YouTube plan without creating anything.
- `date: YYYY-MM-DD`: test a specific service date.

The first version only creates the YouTube reservation and prints the resulting URL.
It does not write the URL back to Mindex.
