# Worship Slot Key Audit - 2026-08-26

Read-only production audit for the adapter-first Worship module/slot contract.

Scope:

- JS adapter checked against `app.js`:
  - `deriveWorshipSlotKey()`
  - `normalizeWorshipSlotKey()`
  - `groupWorshipElements()`
  - `buildWorshipPersistenceRows()` / save normalization into
    `source_ref.slotKey`
- Production tables fetched read-only:
  - `mindex_worship_services`: 68 rows
  - `mindex_worship_sections`: 728 rows
  - `mindex_worship_elements`: 1213 rows
  - `mindex_worship_templates`: 0 rows
  - `mindex_worship_template_items`: 0 rows

No schema or production data was changed by this audit.

## Key Findings

`mindex_worship_template_items.slot_key` is available in the schema but has no
production rows yet, so live behavior currently depends on instance element
normalization. Instance rows therefore need a persisted slot identity before DB
constraints can safely protect the data.

The current JS path already derives `_worshipSlotKey` at hydration time and
persists a normalized value into `mindex_worship_elements.source_ref.slotKey`
when saving. The audit found no existing explicit `source_ref.slotKey` values in
production, so a backfill would be the first production-wide materialization.

The 2026-08-23 all-generation offering shape is correct under the adapter:

| sort | label | element_type | input_mode | derived slotKey |
| --- | --- | --- | --- | --- |
| 1 | 봉헌 영상 | video | asset | `offering.media` |
| 2 | 봉헌기도 | title_person | text | `offering.prayer` |

It does not derive or contain `offering.praise` / 봉헌찬송.

The 2026-07-19 all-generation offering shape is also correct:

| sort | label | element_type | input_mode | derived slotKey |
| --- | --- | --- | --- | --- |
| 1 | 봉헌특송 | praise | praise_db | `offering.special` |
| 2 | 봉헌기도 | title_person | text | `offering.prayer` |
| 3 | 감사 이미지 | image | asset | `offering.media` |

`ready.waiting` still uses the display label `대기 화면`; the audit did not find
a need to revive `대기 영상`.

## Review Counts

| bucket | count |
| --- | ---: |
| unmapped / needs review | 173 |
| medium-confidence legacy label-derived rows | 200 |
| duplicate derived slot rows | 33 rows in 15 groups |
| `offering.praise` rows | 47 |

The 47 `offering.praise` rows are not all-generation 2026-08-23 rows. They are
regular offering praise rows in public/department/monthly services and should
not be treated as automatic corruption by themselves.

## Duplicate Slot Groups

Duplicates that should block singleton unique constraints for now:

- 2026-07-31 금요기도회: four `sermon.citation.1` rows with the same section,
  sort order, label, and reference.
- 2026-08-02 주일 3부: duplicate `offering.praise` rows and duplicate
  `offering.prayer` rows in the same offering section.
- 2026-08-02 청소년부: duplicate `sermon.citation.1` rows.
- 2026-07-05 public services: `scripture_reading` sections contain both a
  `scripture_reading` row and a `scripture_body` row, both deriving
  `word.reading`.

Duplicates that are probably legitimate repeatable content but need more
specific slotting before constraints:

- Multiple announcement rows in one `announcements` section currently all
  derive `announcements.main`.

## Unmapped Coverage Gaps

Common unmapped legacy sections/elements:

- `creed` / 사도신경
- `confession` / 참회기도, 사죄의 선언
- `silent_prayer` / 묵도
- `special_song` / 특송
- `hymn_praise` / 찬송
- `corporate_prayer` / 공동기도
- `community_confession` / 공동체고백
- `prayer_meeting_praise` / 기도회, 기도 찬양, 자율기도
- `lords_prayer` / 주기도문
- `entrance_praise` and `pre_scripture_praise`
- `new_family` / 새가족환영
- `sermon` rows labeled 실시간 성구 송출

These are adapter coverage gaps, not proof that the underlying worship content
is wrong. They should be mapped deliberately before any non-null `slot_key`
column or check constraint is introduced.

## Legacy Label Risk

Medium-confidence rows rely heavily on label/type inference:

- `sermon.title`: 63
- `response.prayer`: 61
- `offering.praise`: 47
- `response.song`: 24
- `sermon.scripture`: 4
- `offering.special`: 1

These should not be bulk-backfilled blindly. Backfill should either preserve the
adapter confidence in an audit table/report, or only write rows that are
confirmed by stable section/type/input signals.

## Constraint And Migration Plan

1. Keep the adapter-first path active. Continue deriving `_worshipSlotKey` at
   hydration time and saving normalized `source_ref.slotKey`.
2. Expand the allowed slot map for the unmapped section keys above, especially
   faith/confession, hymn, special song, corporate prayer, and prayer meeting
   modules.
3. Clean or explicitly model the duplicate groups before adding uniqueness:
   - remove true duplicate rows where confirmed;
   - split repeatable announcements into more specific slots or mark them
     repeatable;
   - separate scripture reading title/intro rows from actual scripture body
     rows if both must coexist.
4. Backfill `source_ref.slotKey` only for high-confidence, non-duplicate rows
   first. Do not touch curated `body`, `song_id`, `song_version_id`,
   `scripture_reference`, `config`, uploaded `asset`, or manual slides.
5. Add nullable `mindex_worship_elements.slot_key` only after the high-confidence
   backfill has been verified. Copy from `source_ref.slotKey`, then keep app
   writes dual-writing both fields during the transition.
6. Add DB-side guards in stages:
   - `check` allowed slot values, allowing empty/null during migration;
   - partial unique index for singleton slots only:
     `(section_id, slot_key) where slot_key in (...)`;
   - exclude repeatable/custom slots such as `praise.song.N`,
     `sermon.citation.N`, future announcement subslots, and dated media slots
     until their repeatability rules are explicit.
7. Add an offering module guard only after module shape is persisted. For
   all-generation services, allow `offering.media`, `offering.special`, and
   `offering.prayer` by date/module options, and reject `offering.praise` unless
   the service explicitly enables it.

The current audit result means schema enforcement should wait. The immediate
safe work is adapter coverage expansion plus conservative `source_ref.slotKey`
backfill planning.
