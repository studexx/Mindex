-- Persistent media for presenter reference screens.
-- These files are rendered from a public URL so the same worship can run on another computer.

insert into storage.buckets (id, name, public, file_size_limit)
values ('mindex-worship-media', 'mindex-worship-media', true, 52428800)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "mindex worship media read" on storage.objects;
drop policy if exists "mindex worship media insert" on storage.objects;
drop policy if exists "mindex worship media update" on storage.objects;
drop policy if exists "mindex worship media delete" on storage.objects;

create policy "mindex worship media read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'mindex-worship-media');

create policy "mindex worship media insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'mindex-worship-media');

create policy "mindex worship media update"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'mindex-worship-media')
  with check (bucket_id = 'mindex-worship-media');

create policy "mindex worship media delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'mindex-worship-media');
