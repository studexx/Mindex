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

No schema or production data was changed by this audit. A destructive cleanup
attempt was intentionally not completed after safety review because some
duplicate-looking scripture rows still contained valid `scriptureReferences`.

## Key Findings

`mindex_worship_template_items.slot_key` is available in the schema but has no
production rows yet, so live behavior currently depends on instance element
normalization. Instance rows therefore need a persisted slot identity before DB
constraints can safely protect the data.

The current JS path derives `_worshipSlotKey` at hydration time and persists a
normalized value into `mindex_worship_elements.source_ref.slotKey` when saving.
The adapter now covers all current production section keys, including legacy
faith/confession, hymn, special song, prayer-meeting, announcement media, and
split scripture body rows. The audit found no existing explicit
`source_ref.slotKey` values in production, so a backfill would be the first
production-wide materialization.

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
| unmapped / needs review | 0 |
| medium-confidence legacy label-derived rows | 514 |
| duplicate derived slot rows | 12 rows in 5 groups |
| `offering.praise` rows | 47 |

The 47 `offering.praise` rows are not all-generation 2026-08-23 rows. They are
regular offering praise rows in public/department/monthly services and should
not be treated as automatic corruption by themselves.

## Duplicate Slot Groups

Duplicates that still block singleton unique constraints for now:

- 2026-07-31 금요기도회: four `sermon.citation.1` rows with the same section,
  sort order, label, and reference.
- 2026-08-02 주일 3부: duplicate `offering.praise` rows and duplicate
  `offering.prayer` rows in the same offering section.
- 2026-08-02 청소년부: duplicate `sermon.citation.1` rows.
- 2026-08-02 주일 3부: duplicate `special.song` rows.

Resolved duplicate false positives:

- 2026-07-05 `scripture_reading` dual rows now split into `word.reading` and
  `word.body`.
- Legacy bare `찬양` rows now derive order-based `praise.song.N`.
- Announcement rows now split into `announcements.main`,
  `announcements.department`, `announcements.media`, and
  `announcements.new_family` where possible.

## Coverage Added

The adapter and audit SQL now map the previously unmapped production coverage:

- `prayer.silent`
- `faith.creed`
- `confession.prayer`
- `confession.assurance`
- `praise.main`
- `praise.entrance`
- `word.body`
- `hymn.main`
- `special.song`
- `sermon.live_scripture`
- `prayer.corporate.N`
- `prayer.corporate.song`
- `prayer.meeting.song.N`
- `prayer.meeting.free`
- `announcements.department`
- `announcements.media`
- `announcements.new_family`
- `new_family.welcome`
- `sending.lords_prayer`
- `community.confession`

## Legacy Label Risk

Medium-confidence rows rely heavily on label/type inference:

- count after coverage expansion: 514 rows.

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
