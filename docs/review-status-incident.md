# Review Status Incident

## Summary

During the hymn form restore work around 2026-06-19 and 2026-06-20, some hymn
form `review_status` values were lost. A restore path rebuilt form objects from
lyrics data without preserving every existing form-level review field. Some
forms that may already have been reviewed were then marked `needs_review`.

## Known Facts

- The affected work involved restoring hymn forms from a 2026-05-31 FreeShow
  export snapshot.
- The user specifically remembered that New Hymn 1-18 had already been fully
  reviewed before the incident.
- The exact pre-incident `review_status` state was not recovered from local
  files.
- If an exact reconstruction is ever needed, the best source would be Supabase
  point-in-time recovery for the relevant `mindex_songs` / version form rows.

## Current Guardrail

Current app and backfill paths should preserve or normalize review status rather
than silently dropping it. Any future bulk lyric/form restore should explicitly
carry over `review_status` and `reviewed_at` when rebuilding form objects.

## If This Comes Back

1. Check whether Supabase PITR can query the pre-incident state.
2. If PITR is unavailable, decide manually whether known reviewed ranges such as
   New Hymn 1-18 should be restored to `reviewed`.
3. Audit for forms whose `review_status` is missing or unexpectedly
   `needs_review` after any bulk restore.
