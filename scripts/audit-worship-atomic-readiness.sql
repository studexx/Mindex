-- Read-only catalog audit. No user content, credentials, DDL or DML.
-- Run before drafting executable atomic-save migrations. Never infer deployed
-- constraints or privileges from schema files alone.

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('mindex_worship_services', 'mindex_worship_sections',
    'mindex_worship_elements', 'mindex_worship_slides',
    'mindex_songs', 'mindex_canonical_songs', 'mindex_song_versions')
ORDER BY table_name, ordinal_position;

SELECT c.conrelid::regclass AS relation, c.conname, c.contype,
       pg_get_constraintdef(c.oid) AS definition, c.convalidated
FROM pg_constraint c
WHERE c.conrelid IN (
  'public.mindex_worship_services'::regclass,
  'public.mindex_worship_sections'::regclass,
  'public.mindex_worship_elements'::regclass,
  'public.mindex_worship_slides'::regclass,
  'public.mindex_song_versions'::regclass)
ORDER BY c.conrelid::regclass::text, c.conname;

SELECT t.tgrelid::regclass AS relation, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgrelid IN ('public.mindex_worship_services'::regclass,
    'public.mindex_worship_sections'::regclass,
    'public.mindex_worship_elements'::regclass,
    'public.mindex_worship_slides'::regclass)
ORDER BY t.tgrelid::regclass::text, t.tgname;

SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname LIKE 'mindex_worship_%'
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'mindex_worship_%'
ORDER BY tablename, policyname;

-- Effective privileges include inherited and PUBLIC grants.
SELECT r.rolname, c.relname,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS can_read,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete
FROM pg_roles r CROSS JOIN pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE r.rolname IN ('anon', 'authenticated') AND n.nspname = 'public'
  AND c.relname IN ('mindex_worship_services', 'mindex_worship_sections',
    'mindex_worship_elements', 'mindex_worship_slides')
ORDER BY r.rolname, c.relname;

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner,
       p.provolatile, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE '%worship%'
ORDER BY p.proname, arguments;
