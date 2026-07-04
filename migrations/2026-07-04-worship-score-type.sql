-- Allow score/sheet-music worship elements and slides in existing databases.
-- Run this once in Supabase SQL Editor after updating scripts/worship-schema.sql.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'mindex_worship_elements'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%element_type%'
  loop
    execute format('alter table public.mindex_worship_elements drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.mindex_worship_elements
  add constraint mindex_worship_elements_element_type_check
  check (element_type in (
    'blank',
    'plain_text',
    'title_person',
    'body',
    'praise',
    'scripture_reading',
    'scripture_body',
    'image',
    'video',
    'score',
    'editable',
    'ppt',
    'pdf'
  ));

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'mindex_worship_slides'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%slide_type%'
  loop
    execute format('alter table public.mindex_worship_slides drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.mindex_worship_slides
  add constraint mindex_worship_slides_slide_type_check
  check (slide_type in (
    'blank',
    'plain_text',
    'title_person',
    'body',
    'praise_title',
    'praise_body',
    'scripture_reading',
    'scripture_body',
    'image',
    'video',
    'score',
    'editable',
    'ppt',
    'pdf'
  ));
