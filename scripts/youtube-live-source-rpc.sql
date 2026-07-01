-- Stable read-only contract for YouTube live reservation automation.
-- Run this in the Supabase SQL editor before enabling the GitHub Actions workflow.

create or replace function public.get_youtube_live_source(service_date date)
returns jsonb
language plpgsql
stable
as $$
declare
  v_service_date date := $1;
  v_service public.mindex_services%rowtype;
  v_service_count integer := 0;
  v_calendar public.mindex_sunday_calendar%rowtype;
  v_scripture_item public.mindex_service_items%rowtype;
  v_sermon_item public.mindex_service_items%rowtype;
  v_sermon_title text := '';
  v_passage text := '';
  v_sermon_assignee text := '';
  v_preacher text := '김남영 위임목사';
  v_preacher_source text := 'default_senior_pastor';
  v_assignee_key text := '';
  v_title_key text := '';
  v_missing jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
begin
  select count(*)
    into v_service_count
  from public.mindex_services s
  where s.type_id = 'sunday-main'
    and s.date = v_service_date;

  select *
    into v_service
  from public.mindex_services s
  where s.type_id = 'sunday-main'
    and s.date = v_service_date
  order by s.created_at asc
  limit 1;

  select *
    into v_calendar
  from public.mindex_sunday_calendar c
  where c.date = v_service_date
  limit 1;

  if v_service.id is not null then
    select *
      into v_scripture_item
    from public.mindex_service_items i
    where i.service_id = v_service.id
      and i.label = '성경봉독'
    order by i.sort_order asc
    limit 1;

    select *
      into v_sermon_item
    from public.mindex_service_items i
    where i.service_id = v_service.id
      and i.label = '설교'
    order by i.sort_order asc
    limit 1;
  end if;

  v_passage := btrim(regexp_replace(coalesce(v_scripture_item.raw_title, ''), '[[:space:]]+', ' ', 'g'));
  v_sermon_title := btrim(regexp_replace(coalesce(v_sermon_item.raw_title, ''), '[[:space:]]+', ' ', 'g'));
  v_sermon_assignee := btrim(regexp_replace(coalesce(v_sermon_item.assignee, ''), '[[:space:]]+', ' ', 'g'));

  if v_sermon_assignee <> '' then
    v_assignee_key := regexp_replace(lower(v_sermon_assignee), '[^0-9a-z가-힣]', '', 'g');
    v_title_key := regexp_replace(lower(v_sermon_title), '[^0-9a-z가-힣]', '', 'g');

    if v_sermon_assignee ~ '^[\"''“”‘’]'
      or (
        v_title_key <> ''
        and length(v_assignee_key) >= 2
        and (position(v_assignee_key in v_title_key) > 0 or position(v_title_key in v_assignee_key) > 0)
      )
    then
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'ignored_sermon_assignee',
        'value', v_sermon_assignee
      ));
    else
      v_preacher := v_sermon_assignee;
      v_preacher_source := 'sermon_assignee';
    end if;
  end if;

  if v_preacher = ''
    and btrim(regexp_replace(coalesce(v_service.leader, ''), '[[:space:]]+', ' ', 'g')) <> ''
  then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'ignored_service_leader_for_preacher',
      'value', btrim(regexp_replace(coalesce(v_service.leader, ''), '[[:space:]]+', ' ', 'g'))
    ));
  end if;

  if v_preacher = ''
    and btrim(regexp_replace(coalesce(v_calendar.preacher, ''), '[[:space:]]+', ' ', 'g')) <> ''
  then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'ignored_calendar_preacher_for_preacher',
      'value', btrim(regexp_replace(coalesce(v_calendar.preacher, ''), '[[:space:]]+', ' ', 'g'))
    ));
  end if;

  if v_service_count > 1 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'multiple_services',
      'count', v_service_count
    ));
  end if;

  if v_service.id is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'service_not_found'
    ));
  end if;
  if v_sermon_title = '' then
    v_missing := v_missing || jsonb_build_array('sermonTitle');
  end if;
  if v_passage = '' then
    v_missing := v_missing || jsonb_build_array('passage');
  end if;
  if v_preacher = '' then
    v_missing := v_missing || jsonb_build_array('preacher');
  end if;

  return jsonb_build_object(
    'serviceDate', v_service_date::text,
    'scheduledStartTime', v_service_date::text || 'T10:45:00+09:00',
    'sermonTitle', v_sermon_title,
    'passage', v_passage,
    'preacher', v_preacher,
    'preacherSource', v_preacher_source,
    'serviceId', v_service.id,
    'ready', jsonb_array_length(v_missing) = 0,
    'missing', v_missing,
    'warnings', v_warnings
  );
end;
$$;

grant execute on function public.get_youtube_live_source(date) to anon;
