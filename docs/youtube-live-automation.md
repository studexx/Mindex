# YouTube Live Automation

This workflow creates the next Sunday service YouTube live reservation. It does
not read Mindex worship data, sermon titles, scripture passages, or thumbnails.

## Schedule

- Monday 00:00 UTC+9, after Sunday has passed

GitHub cron uses UTC:

```text
0 15 * * 0
```

## Reservation Rules

- Default service date: the next Sunday in UTC+9
- Start time: `10:45` UTC+9
- Duration: `90` minutes by default
- Title:

```text
[LIVE] 검단우리교회 주일예배 | YYYY-MM-DD
```

- Description: empty
- Thumbnail: manual only

If a matching upcoming broadcast already exists for the same service date, the
workflow reuses it and only ensures playlist membership.

## GitHub Secrets

Required:

- `YOUTUBE_TOKEN_JSON` or `YOUTUBE_TOKEN_JSON_B64`

Optional:

- `YOUTUBE_LIVE_STREAM_ID`
- `YOUTUBE_LIVE_PLAYLIST_ID`, overrides playlist title lookup

## GitHub Variables

Optional:

- `YOUTUBE_LIVE_PRIVACY_STATUS`, default `public`
- `YOUTUBE_LIVE_DURATION_MINUTES`, default `90`
- `YOUTUBE_LIVE_PLAYLIST_TITLE_TEMPLATE`, default `주일예배 LIVE {year}`
- `YOUTUBE_LIVE_REQUIRE_PLAYLIST`, default `false`

## Playlist

The workflow tries to add the reservation to the yearly live playlist by
default.

For a 2026 service date, the default playlist title is:

```text
주일예배 LIVE 2026
```

If `YOUTUBE_LIVE_PLAYLIST_ID` is set, that ID is used directly. Otherwise, the
workflow looks up the playlist by `YOUTUBE_LIVE_PLAYLIST_TITLE_TEMPLATE`.

Playlist lookup or insertion is non-blocking by default so a playlist issue does
not prevent the live reservation itself. Set `YOUTUBE_LIVE_REQUIRE_PLAYLIST` to
`true` if playlist failure should fail the run.

## Failure Notifications

Scheduled runs log failures but intentionally exit green to avoid repeated
GitHub notification emails. Manual `workflow_dispatch` runs still fail normally
so setup issues are visible during testing.

## Manual Test

Use the workflow dispatch button.

- `dry_run: true`: print the YouTube plan without creating anything.
- `date: YYYY-MM-DD`: create or test a specific service date.

The workflow only creates the YouTube reservation and prints the resulting URL.
It does not write the URL back to Mindex.
