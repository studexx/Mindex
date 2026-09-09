-- Manual maintenance: run ONLY after the preflight in
-- docs/supabase-capacity-maintenance.md succeeds on the target database.
-- Execute this statement alone, outside a transaction (no BEGIN/COMMIT).
-- Retain the UNIQUE constraint index, active lookup index and all table rows.
-- No CASCADE: refuse deletion if any dependent object exists.
DROP INDEX CONCURRENTLY IF EXISTS public.mindex_bible_verses_lookup_idx;
