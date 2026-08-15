begin;

alter table public.mindex_worship_services
  add column if not exists service_alias text not null default '';

-- Preserve user-facing values once, then remove the generic metadata bucket.
-- The guard keeps this migration safe when a restored/new database already
-- follows the tag-free schema.
do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mindex_worship_services'
      and column_name = 'tags'
  ) then
    execute $sql$
      update public.mindex_worship_sections section
      set person = tagged.section_assignee
      from (
        select
          svc.id as service_id,
          (
            select btrim(regexp_replace(tag, '^(찬양\s*(팀|단)|praise\s*team)\s*[:：]\s*', '', 'i'))
            from unnest(svc.tags) with ordinality as service_tag(tag, position)
            where tag ~* '^(찬양\s*(팀|단)|praise\s*team)\s*[:：]'
            order by position
            limit 1
          ) as section_assignee
        from public.mindex_worship_services svc
      ) tagged
      where section.service_id = tagged.service_id
        and section.section_key = 'praise'
        and nullif(btrim(section.person), '') is null
        and nullif(tagged.section_assignee, '') is not null
    $sql$;

    execute $sql$
      update public.mindex_worship_services svc
      set service_alias = coalesce(
        nullif(btrim(svc.service_alias), ''),
        case
          when btrim(svc.title) <> ''
            and regexp_replace(svc.title, '\s+', '', 'g') !~ '^(주일예배(\[(1부|2부|3부)\])?|주일오후예배|수요예배|금요기도회|월삭예배|어린이부예배|청소년부예배|청년부예배)$'
            then btrim(svc.title)
          else null
        end,
        case
          when exists (
            select 1
            from unnest(svc.tags) as tag
            where regexp_replace(tag, '\s+', '', 'g') = '2·3부통합'
          ) then '주일예배 [2·3부 통합]'
          else null
        end,
        (
          select btrim(tag)
          from unnest(svc.tags) with ordinality as tagged(tag, position)
          where tag !~* '^(찬양\s*(팀|단)|praise\s*team)\s*[:：]'
            and regexp_replace(tag, '\s+', '', 'g') !~ '^(PPT확인|집회없음|맥추감사주일|추수감사주일|종려주일|부활주일|성령강림주일)$'
          order by position
          limit 1
        ),
        ''
      )
    $sql$;

    execute $sql$
      update public.mindex_worship_services
      set source_ref = coalesce(source_ref, '{}'::jsonb)
        || case when exists (
          select 1 from unnest(tags) as tag where regexp_replace(tag, '\s+', '', 'g') = '집회없음'
        ) then '{"no_gathering": true}'::jsonb else '{}'::jsonb end
        || case when exists (
          select 1 from unnest(tags) as tag where regexp_replace(tag, '\s+', '', 'g') like '%헌신예배%'
        ) then '{"dedication_service": true}'::jsonb else '{}'::jsonb end
    $sql$;

    alter table public.mindex_worship_services drop column tags;
  end if;
end
$migration$;

comment on column public.mindex_worship_services.service_alias is
  'Optional human-facing worship alias such as 온세대 찬양예배 or 청소년부 제자헌신예배.';
commit;
