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

- Source RPC: `get_youtube_live_source(service_date date)`
- Service: `sunday-main`
- Service date: current UTC+9 calendar day for scheduled runs
- Start time: `10:45` UTC+9
- Passage: exact `성경봉독` item `raw_title`
- Sermon title: exact `설교` item `raw_title`
- Preacher: default `김남영 위임목사`; override only when the exact sermon item
  `assignee` contains a trusted preacher name
- Required fields: `sermonTitle`, `passage`, `preacher`

The labels are intentionally exact matches. A nearby label such as `설교 전 찬양`
must not be treated as the sermon item.

If the sermon item `assignee` looks like a sermon-title fragment instead of a
preacher name, the workflow ignores it, emits `ignored_sermon_assignee`, and
uses the default senior pastor. It intentionally does not use `service.leader`
or `mindex_sunday_calendar.preacher` as preacher fallbacks because those fields
can represent worship leaders or planning data.

## Stable DB Contract

The workflow reads only the stable RPC contract:

- `serviceDate`
- `scheduledStartTime`
- `sermonTitle`
- `passage`
- `preacher`
- `preacherSource`
- `serviceId`
- `ready`
- `missing`
- `warnings`

The RPC owns all table details and fallback rules so GitHub Actions does not
depend on the internal service table structure.

Apply the RPC with:

```text
scripts/youtube-live-source-rpc.sql
```

## YouTube Title

```text
설교 제목 (본문) | 설교자 | 검단우리교회 주일예배 | YYYY-MM-DD
```

The YouTube description is intentionally empty.

The default preacher is `김남영 위임목사`. `김남영 목사` and `김남영 위임목사`
are treated as senior pastor aliases for this automation and normalize to
`김남영 위임목사`. If the exact `설교` service item assignee contains a trusted
different preacher, that assignee overrides the default. This matches the normal
yearly pattern while still allowing guest preachers to be reflected when Mindex
has explicit data.

## GitHub Secrets

Required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `YOUTUBE_TOKEN_JSON` or `YOUTUBE_TOKEN_JSON_B64`

Optional:

- `YOUTUBE_LIVE_STREAM_ID`
- `YOUTUBE_LIVE_PLAYLIST_ID`, overrides playlist title lookup
- `YOUTUBE_LIVE_THUMBNAIL_B64`, fallback only when a committed thumbnail path is not used

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

The live thumbnail is committed as a repository asset because it is not
sensitive and is larger than the GitHub Actions secret size limit.

Current workflow path:

```text
assets/youtube_live_thumbnail.jpg
```

The workflow sets `YOUTUBE_LIVE_THUMBNAIL_PATH` to this file. The
`YOUTUBE_LIVE_THUMBNAIL_B64` secret remains supported as a fallback for other
deployments.

Thumbnail upload uses YouTube API quota. If quota is exhausted, reservation
creation can still succeed while thumbnail upload fails; retry thumbnail upload
after quota reset.

## Manual Test

Use the workflow dispatch button.

- `dry_run: true`: resolve Mindex data and print the YouTube plan without creating anything.
- `date: YYYY-MM-DD`: test a specific service date.

The first version only creates the YouTube reservation and prints the resulting URL.
It does not write the URL back to Mindex.
