-- Mindex RLS audit.
--
-- Run in Supabase SQL Editor after schema/policy changes. This script does not
-- mutate data; it only reports whether public Mindex tables have RLS enabled
-- and whether anon still has write grants or write policies.

with mindex_tables as (
  select schemaname, tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
    and tablename like 'mindex_%'
)
select
  'rls_disabled' as issue,
  tablename
from mindex_tables
where not rowsecurity
order by tablename;

with anon_table_privileges as (
  select table_schema, table_name, privilege_type
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and table_name like 'mindex_%'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
)
select
  'anon_write_grant' as issue,
  table_name,
  privilege_type
from anon_table_privileges
order by table_name, privilege_type;

select
  'anon_write_policy' as issue,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename like 'mindex_%'
  and (
    cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and ('anon' = any(roles) or 'public' = any(roles))
  )
order by tablename, policyname;
