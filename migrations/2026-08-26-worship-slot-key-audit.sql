-- Audit Worship module/slot identity before adding DB-enforced slot_key columns.
-- Read-only. Run in Supabase SQL Editor against the shared church database.

with element_context as (
  select
    svc.id as service_id,
    svc.service_type_id,
    svc.service_date,
    svc.title as service_title,
    svc.service_alias,
    sec.id as section_id,
    sec.sort_order as section_order,
    sec.section_key,
    sec.title as section_title,
    el.id as element_id,
    el.sort_order as element_order,
    el.element_type,
    el.input_mode,
    el.title as element_title,
    el.person,
    el.body,
    el.song_id,
    el.song_version_id,
    el.scripture_id,
    el.scripture_reference,
    el.asset,
    el.source_kind,
    el.source_ref,
    el.config,
    el.content_state,
    coalesce(
      nullif(el.source_ref->>'slotKey', ''),
      nullif(el.source_ref->>'slot_key', ''),
      nullif(el.config->>'slotKey', ''),
      nullif(el.config->>'slot_key', '')
    ) as explicit_slot_key,
    regexp_replace(
      coalesce(nullif(el.source_ref->>'label', ''), nullif(el.title, ''), nullif(sec.title, ''), ''),
      '\s+',
      '',
      'g'
    ) as label_key,
    coalesce(
      nullif(el.input_mode, ''),
      nullif(el.content_state->>'inputMode', ''),
      nullif(el.content_state->>'input_mode', ''),
      nullif(el.config->>'inputMode', ''),
      nullif(el.config->>'input_mode', '')
    ) as normalized_input_mode,
    (
      nullif(coalesce(el.asset->>'url', ''), '') is not null
      or nullif(coalesce(el.config->'asset'->>'url', ''), '') is not null
      or nullif(coalesce(el.config->'media'->>'url', ''), '') is not null
      or nullif(coalesce(el.source_ref->'asset'->>'url', ''), '') is not null
    ) as has_asset
  from public.mindex_worship_services svc
  join public.mindex_worship_sections sec on sec.service_id = svc.id
  join public.mindex_worship_elements el on el.section_id = sec.id
),
derived as (
  select
    *,
    coalesce(
      nullif(explicit_slot_key, ''),
      case
        when section_key = 'ready' then 'ready.waiting'
        when section_key = 'silent_prayer' then 'prayer.silent'
        when section_key = 'creed' then 'faith.creed'
        when section_key = 'confession' and label_key = '사죄의선언' then 'confession.assurance'
        when section_key = 'confession' then 'confession.prayer'
        when section_key = 'scripture_reading'
          and (element_type = 'scripture_body' or label_key in ('성경본문', '본문'))
          then 'word.body'
        when section_key = 'scripture_reading' then 'word.reading'
        when section_key = 'praise' and label_key = '환영' then 'praise.welcome'
        when section_key = 'praise' and label_key in ('입례찬양', '입례 찬양') then 'praise.entrance'
        when section_key = 'praise' and label_key ~ '^찬양[0-9]+$'
          then 'praise.song.' || substring(label_key from '찬양([0-9]+)')
        when section_key = 'praise' and label_key = '찬양' and element_order > 0
          then 'praise.song.' || element_order::text
        when section_key = 'praise' then 'praise.main'
        when section_key in ('entrance_praise', 'pre_scripture_praise') then 'praise.entrance'
        when section_key = 'prayer' then 'prayer.representative'
        when section_key = 'hymn_praise' then 'hymn.main'
        when section_key = 'special_song' then 'special.song'
        when section_key = 'sermon' and label_key = '실시간성구송출' then 'sermon.live_scripture'
        when section_key = 'sermon' and label_key in ('설교', '설교제목') then 'sermon.title'
        when section_key = 'sermon' and label_key ~ '^인용구절[0-9]*$'
          then 'sermon.citation.' || coalesce(nullif(substring(label_key from '인용구절([0-9]+)'), ''), '1')
        when section_key = 'sermon'
          and (
            label_key in ('설교본문', '본문', '성경본문', '말씀본문', '말씀')
            or normalized_input_mode = 'scripture'
            or element_type = 'scripture_body'
          )
          then 'sermon.scripture'
        when section_key = 'sermon'
          and (has_asset or element_type in ('image', 'video', 'ppt', 'pdf') or normalized_input_mode = 'asset')
          then 'sermon.media'
        when section_key = 'response_song'
          and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise'))
          then 'response.song'
        when section_key in ('response_song', 'response_prayer') then 'response.prayer'
        when section_key = 'corporate_prayer' and label_key ~ '^공동기도[0-9]+$'
          then 'prayer.corporate.' || substring(label_key from '공동기도([0-9]+)')
        when section_key = 'corporate_prayer'
          and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise'))
          then 'prayer.corporate.song'
        when section_key = 'corporate_prayer' then 'prayer.corporate.1'
        when section_key = 'prayer_meeting_praise' and label_key ~ '^기도찬양[0-9]+$'
          then 'prayer.meeting.song.' || substring(label_key from '기도찬양([0-9]+)')
        when section_key = 'prayer_meeting_praise' and label_key = '자율기도' then 'prayer.meeting.free'
        when section_key = 'prayer_meeting_praise'
          and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise'))
          then 'prayer.meeting.song.1'
        when section_key = 'prayer_meeting_praise' then 'prayer.meeting.free'
        when section_key = 'offering'
          and (has_asset or element_type in ('image', 'video', 'ppt', 'pdf') or normalized_input_mode = 'asset')
          then 'offering.media'
        when section_key = 'offering' and (label_key in ('봉헌기도', '기도') or element_type = 'title_person')
          then 'offering.prayer'
        when section_key = 'offering' and label_key in ('특송', '봉헌특송') then 'offering.special'
        when section_key = 'offering' and (label_key in ('봉헌찬송', '찬송') or element_type = 'praise')
          then 'offering.praise'
        when section_key = 'new_family' then 'new_family.welcome'
        when section_key = 'announcements' and label_key = '새가족환영' then 'announcements.new_family'
        when section_key = 'announcements'
          and (
            label_key = '참고화면'
            or has_asset
            or element_type in ('image', 'video', 'ppt', 'pdf')
            or normalized_input_mode = 'asset'
          )
          then 'announcements.media'
        when section_key = 'announcements' and label_key in ('청소년부광고', '청년부광고') then 'announcements.department'
        when section_key = 'announcements' then 'announcements.main'
        when section_key = 'sending' and (label_key = '송영' or element_type = 'praise') then 'sending.doxology'
        when section_key = 'sending' and label_key = '축도' then 'sending.benediction'
        when section_key = 'sending' and label_key = '주기도문' then 'sending.lords_prayer'
        when section_key = 'lords_prayer' then 'sending.lords_prayer'
        when section_key = 'closing_visual' and (label_key = '폐회찬송' or element_type = 'praise') then 'closing.hymn'
        when section_key = 'closing_visual' then 'closing.visual'
        when section_key = 'community_confession' then 'community.confession'
        when section_key = 'fellowship' then 'fellowship.person'
        else ''
      end
    ) as derived_slot_key
  from element_context
),
classified as (
  select
    *,
    case
      when explicit_slot_key is not null and explicit_slot_key <> '' then 'explicit'
      when derived_slot_key = '' then 'needs_review'
      when section_key in (
        'ready',
        'silent_prayer',
        'creed',
        'confession',
        'scripture_reading',
        'prayer',
        'hymn_praise',
        'special_song',
        'corporate_prayer',
        'prayer_meeting_praise',
        'new_family',
        'announcements',
        'sending',
        'lords_prayer',
        'closing_visual',
        'community_confession',
        'fellowship'
      ) then 'high'
      when normalized_input_mode in ('scripture', 'asset') or has_asset then 'high'
      else 'medium'
    end as confidence
  from derived
)
select
  'slot_key_summary' as audit,
  derived_slot_key,
  confidence,
  count(*) as row_count
from classified
group by derived_slot_key, confidence
order by derived_slot_key, confidence;

-- Rows that need manual review before backfill.
with element_context as (
  select
    svc.id as service_id,
    svc.service_type_id,
    svc.service_date,
    svc.title as service_title,
    svc.service_alias,
    sec.id as section_id,
    sec.sort_order as section_order,
    sec.section_key,
    sec.title as section_title,
    el.id as element_id,
    el.sort_order as element_order,
    el.element_type,
    el.input_mode,
    el.title as element_title,
    el.source_ref,
    el.config,
    el.content_state,
    regexp_replace(coalesce(nullif(el.source_ref->>'label', ''), nullif(el.title, ''), nullif(sec.title, ''), ''), '\s+', '', 'g') as label_key,
    coalesce(nullif(el.input_mode, ''), nullif(el.content_state->>'inputMode', ''), nullif(el.config->>'inputMode', '')) as normalized_input_mode,
    (
      nullif(coalesce(el.asset->>'url', ''), '') is not null
      or nullif(coalesce(el.config->'asset'->>'url', ''), '') is not null
      or nullif(coalesce(el.config->'media'->>'url', ''), '') is not null
      or nullif(coalesce(el.source_ref->'asset'->>'url', ''), '') is not null
    ) as has_asset
  from public.mindex_worship_services svc
  join public.mindex_worship_sections sec on sec.service_id = svc.id
  join public.mindex_worship_elements el on el.section_id = sec.id
),
derived as (
  select
    *,
    coalesce(
      nullif(source_ref->>'slotKey', ''),
      case
        when section_key = 'ready' then 'ready.waiting'
        when section_key = 'silent_prayer' then 'prayer.silent'
        when section_key = 'creed' then 'faith.creed'
        when section_key = 'confession' and label_key = '사죄의선언' then 'confession.assurance'
        when section_key = 'confession' then 'confession.prayer'
        when section_key = 'scripture_reading' and (element_type = 'scripture_body' or label_key in ('성경본문', '본문')) then 'word.body'
        when section_key = 'scripture_reading' then 'word.reading'
        when section_key = 'praise' and label_key = '환영' then 'praise.welcome'
        when section_key = 'praise' and label_key in ('입례찬양', '입례 찬양') then 'praise.entrance'
        when section_key = 'praise' and label_key ~ '^찬양[0-9]+$' then 'praise.song.' || substring(label_key from '찬양([0-9]+)')
        when section_key = 'praise' and label_key = '찬양' and element_order > 0 then 'praise.song.' || element_order::text
        when section_key = 'praise' then 'praise.main'
        when section_key in ('entrance_praise', 'pre_scripture_praise') then 'praise.entrance'
        when section_key = 'prayer' then 'prayer.representative'
        when section_key = 'hymn_praise' then 'hymn.main'
        when section_key = 'special_song' then 'special.song'
        when section_key = 'sermon' and label_key = '실시간성구송출' then 'sermon.live_scripture'
        when section_key = 'sermon' and label_key in ('설교', '설교제목') then 'sermon.title'
        when section_key = 'sermon' and label_key ~ '^인용구절[0-9]*$' then 'sermon.citation.' || coalesce(nullif(substring(label_key from '인용구절([0-9]+)'), ''), '1')
        when section_key = 'sermon' and (label_key in ('설교본문', '본문', '성경본문', '말씀본문', '말씀') or normalized_input_mode = 'scripture' or element_type = 'scripture_body') then 'sermon.scripture'
        when section_key = 'sermon' and (has_asset or element_type in ('image', 'video', 'ppt', 'pdf') or normalized_input_mode = 'asset') then 'sermon.media'
        when section_key = 'response_song' and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise')) then 'response.song'
        when section_key in ('response_song', 'response_prayer') then 'response.prayer'
        when section_key = 'corporate_prayer' and label_key ~ '^공동기도[0-9]+$' then 'prayer.corporate.' || substring(label_key from '공동기도([0-9]+)')
        when section_key = 'corporate_prayer' and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise')) then 'prayer.corporate.song'
        when section_key = 'corporate_prayer' then 'prayer.corporate.1'
        when section_key = 'prayer_meeting_praise' and label_key ~ '^기도찬양[0-9]+$' then 'prayer.meeting.song.' || substring(label_key from '기도찬양([0-9]+)')
        when section_key = 'prayer_meeting_praise' and label_key = '자율기도' then 'prayer.meeting.free'
        when section_key = 'prayer_meeting_praise' and (element_type = 'praise' or normalized_input_mode in ('praise_db', 'score_db', 'lyrics_db', 'manual_praise')) then 'prayer.meeting.song.1'
        when section_key = 'prayer_meeting_praise' then 'prayer.meeting.free'
        when section_key = 'offering' and (has_asset or element_type in ('image', 'video', 'ppt', 'pdf') or normalized_input_mode = 'asset') then 'offering.media'
        when section_key = 'offering' and (label_key in ('봉헌기도', '기도') or element_type = 'title_person') then 'offering.prayer'
        when section_key = 'offering' and label_key in ('특송', '봉헌특송') then 'offering.special'
        when section_key = 'offering' and (label_key in ('봉헌찬송', '찬송') or element_type = 'praise') then 'offering.praise'
        when section_key = 'new_family' then 'new_family.welcome'
        when section_key = 'announcements' and label_key = '새가족환영' then 'announcements.new_family'
        when section_key = 'announcements' and (label_key = '참고화면' or has_asset or element_type in ('image', 'video', 'ppt', 'pdf') or normalized_input_mode = 'asset') then 'announcements.media'
        when section_key = 'announcements' and label_key in ('청소년부광고', '청년부광고') then 'announcements.department'
        when section_key = 'announcements' then 'announcements.main'
        when section_key = 'sending' and (label_key = '송영' or element_type = 'praise') then 'sending.doxology'
        when section_key = 'sending' and label_key = '축도' then 'sending.benediction'
        when section_key = 'sending' and label_key = '주기도문' then 'sending.lords_prayer'
        when section_key = 'lords_prayer' then 'sending.lords_prayer'
        when section_key = 'closing_visual' and (label_key = '폐회찬송' or element_type = 'praise') then 'closing.hymn'
        when section_key = 'closing_visual' then 'closing.visual'
        when section_key = 'community_confession' then 'community.confession'
        when section_key = 'fellowship' then 'fellowship.person'
        else ''
      end
    ) as derived_slot_key
  from element_context
),
duplicates as (
  select
    service_id,
    section_id,
    derived_slot_key,
    count(*) as duplicate_count
  from derived
  where derived_slot_key <> ''
  group by service_id, section_id, derived_slot_key
  having count(*) > 1
)
select
  'slot_key_needs_review' as audit,
  d.service_date,
  d.service_type_id,
  coalesce(nullif(d.service_alias, ''), d.service_title) as service_name,
  d.section_order,
  d.section_key,
  d.section_title,
  d.element_order,
  d.element_id,
  coalesce(nullif(d.source_ref->>'label', ''), d.element_title) as element_label,
  d.element_type,
  d.input_mode,
  d.derived_slot_key,
  case
    when d.derived_slot_key = '' then 'unmapped'
    when dup.duplicate_count is not null then 'duplicate_slot'
    else 'review'
  end as reason
from derived d
left join duplicates dup
  on dup.service_id = d.service_id
 and dup.section_id = d.section_id
 and dup.derived_slot_key = d.derived_slot_key
where d.derived_slot_key = '' or dup.duplicate_count is not null
order by d.service_date, d.service_type_id, d.section_order, d.element_order;

-- Critical all-generation offering shapes.
with offering_slots as (
  select
    svc.service_date,
    svc.service_type_id,
    coalesce(nullif(svc.service_alias, ''), svc.title) as service_name,
    sec.section_key,
    el.id as element_id,
    el.sort_order,
    coalesce(nullif(el.source_ref->>'slotKey', ''), nullif(el.config->>'slotKey', ''), nullif(el.source_ref->>'label', ''), el.title) as identity,
    el.element_type,
    el.input_mode,
    el.source_ref,
    el.config,
    coalesce(el.asset, '{}'::jsonb) as asset
  from public.mindex_worship_services svc
  join public.mindex_worship_sections sec on sec.service_id = svc.id
  join public.mindex_worship_elements el on el.section_id = sec.id
  where svc.service_date in (date '2026-07-19', date '2026-08-23')
    and sec.section_key = 'offering'
    and (
      svc.service_type_id = 'sunday-main'
      or svc.service_alias like '%온세대%'
      or svc.title like '%온세대%'
    )
)
select
  'all_generation_offering_shape' as audit,
  *
from offering_slots
order by service_date, sort_order;

-- Template slot_key coverage.
select
  'template_item_slot_keys' as audit,
  tmpl.service_type_id,
  tmpl.stable_key,
  tmpl.version,
  nullif(item.slot_key, '') as slot_key,
  count(*) as item_count
from public.mindex_worship_template_items item
join public.mindex_worship_templates tmpl on tmpl.id = item.template_id
group by tmpl.service_type_id, tmpl.stable_key, tmpl.version, nullif(item.slot_key, '')
order by tmpl.service_type_id, tmpl.stable_key, tmpl.version, slot_key nulls first;

-- Existing unique/conflict constraints relevant to upload/upsert behavior.
select
  'worship_unique_indexes' as audit,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'mindex_worship_services',
    'mindex_worship_sections',
    'mindex_worship_elements',
    'mindex_worship_template_items'
  )
  and indexdef ilike '%unique%'
order by tablename, indexname;
