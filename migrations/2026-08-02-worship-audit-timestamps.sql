-- Ensure older Worship deployments have audit timestamp defaults/triggers.
-- The base schema already declares these, but some live databases predate that
-- definition and reject projected inserts when the client omits created_at.

create or replace function public.mindex_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.mindex_worship_services
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.mindex_worship_sections
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.mindex_worship_elements
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.mindex_worship_slides
  alter column created_at set default now(),
  alter column updated_at set default now();

drop trigger if exists mindex_worship_services_touch_updated_at on public.mindex_worship_services;
create trigger mindex_worship_services_touch_updated_at
before update on public.mindex_worship_services
for each row execute function public.mindex_touch_updated_at();

drop trigger if exists mindex_worship_sections_touch_updated_at on public.mindex_worship_sections;
create trigger mindex_worship_sections_touch_updated_at
before update on public.mindex_worship_sections
for each row execute function public.mindex_touch_updated_at();

drop trigger if exists mindex_worship_elements_touch_updated_at on public.mindex_worship_elements;
create trigger mindex_worship_elements_touch_updated_at
before update on public.mindex_worship_elements
for each row execute function public.mindex_touch_updated_at();

drop trigger if exists mindex_worship_slides_touch_updated_at on public.mindex_worship_slides;
create trigger mindex_worship_slides_touch_updated_at
before update on public.mindex_worship_slides
for each row execute function public.mindex_touch_updated_at();
