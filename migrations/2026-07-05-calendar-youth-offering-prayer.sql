-- Split youth offering prayer leaders out of youth prayer in Mindex Calendar.
-- Safe to rerun.

alter table public.mindex_sunday_calendar
  add column if not exists youth_offering_prayer text not null default '';

with split_people as (
  select
    calendar.id,
    trim(person.value) as name,
    person.ordinality
  from public.mindex_sunday_calendar as calendar
  cross join lateral regexp_split_to_table(coalesce(calendar.youth_prayer, ''), '\s*[,，、]\s*')
    with ordinality as person(value, ordinality)
  where trim(person.value) <> ''
),
grouped_people as (
  select
    id,
    string_agg(name, ', ' order by ordinality) filter (where name !~* 'T$') as youth_prayer_next,
    string_agg(name, ', ' order by ordinality) filter (where name ~* 'T$') as youth_offering_prayer_next
  from split_people
  group by id
)
update public.mindex_sunday_calendar as calendar
set
  youth_prayer = coalesce(grouped_people.youth_prayer_next, ''),
  youth_offering_prayer = case
    when nullif(trim(calendar.youth_offering_prayer), '') is not null then calendar.youth_offering_prayer
    else coalesce(grouped_people.youth_offering_prayer_next, '')
  end
from grouped_people
where calendar.id = grouped_people.id
  and coalesce(grouped_people.youth_offering_prayer_next, '') <> '';
