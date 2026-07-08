# Worship Data Contract

This document defines the target Worship domain model. It follows
`docs/thread-worship-presenter.md` and `scripts/worship-schema.sql`.

## Boundary

Worship owns only worship planning, worship structure, import review, and
presenter instances.

It must not own canonical Praise or Scripture content. Worship elements link to
Praise/Scripture records instead.

Older service tables are compatibility/import residue. Do not add new Worship
concepts by extending `raw_title`, `memo`, `fixed_items`, or `order_template`.

## Core Hierarchy

```text
mindex_worship_services
  > mindex_worship_sections
    > mindex_worship_elements
      > mindex_worship_slides
```

### `mindex_worship_service_types`

Recurring worship categories such as Sunday 1st service, Wednesday service,
Friday prayer meeting, youth worship, and special groups.

This is taxonomy, not service content.

Initial taxonomy lives directly in `mindex_worship_service_types`. Treat it as
reviewed Mindex taxonomy, not as a mirror of legacy service type rows. Do not
copy legacy `fixed_items` or `order_template` content into Worship.

### `mindex_worship_services`

One actual worship service instance on a date.

Use this for date, status, service title, worship leader, praise leader,
tags, template link, and source lineage.

Presenter background is opt-in. Until a dedicated column exists, keep an
explicit source in `source_ref.presenter_background`; Presenter must not infer
or rotate backgrounds from service type, date, or season.

### `mindex_worship_sections`

Practical order blocks used by humans and Presenter: preparation, praise,
scripture reading, sermon, offering, announcements, benediction.

This is not a theological phase taxonomy.

### `mindex_worship_elements`

The content-bearing unit inside a section: one praise song, Apostles' Creed,
one prayer topic, scripture reading, sermon title, video, blank, or imported
file reference.

Use `song_id` / `song_version_id` for linked Praise. Use `scripture_id` or
`scripture_reference` for Scripture. Do not copy curated lyrics or Bible text
into Worship unless it is a one-off body element.

### `mindex_worship_slides`

Materialized presenter frames for a specific worship instance.

Slides may be generated from an element/template, but the actual service needs
instance slides so last-minute edits do not mutate templates or canonical
Praise/Scripture data.

## Templates

```text
mindex_worship_templates
mindex_worship_template_items
```

Templates are reusable blueprints at four levels:

- `service`
- `section`
- `element`
- `slide`

Types are not templates. Types describe rendering or behavior. Templates
describe reusable structure/defaults.

Every creation path must allow no template.

If an instance diverges from a template, set `template_modified = true`. Do not
silently update the template.

The Worship tab currently treats template rows as an empty drafting surface.
Templates should be created from reviewed service decisions with the user. The
previous inactive draft templates derived from the PPT import were purged with
the imported Worship batch.

## Imports

```text
mindex_worship_import_sources
  > mindex_worship_import_candidates
    > mindex_worship_import_mappings
```

Imports are a staging/review pipeline, not canonical data.

### `mindex_worship_import_sources`

One source file or source batch: PPT, PDF, manual setlist, legacy service rows.

Store source identity, source path/hash, parse report, and raw payload.

### `mindex_worship_import_candidates`

Parsed possible service/section/element/slide records before approval.

Use this to review raw PPT section names, normalized titles, suggested Praise
links, suggested Scripture links, and confidence.

No current helper script should re-import the previous PPT-derived Worship rows
or convert legacy service rows directly into canonical services. Future imports
must land in the review tables first, then be accepted into
`Service > Section > Element > Slide` only after user review.

The previous legacy import batch was backed up and purged from worship canonical
tables: `mindex_worship_services`, sections, elements, slides, import staging,
mappings, and draft templates are intentionally empty. Older PPT-imported
service rows were also purged. `mindex_worship_service_types` remains as the
service taxonomy.

### `mindex_worship_import_mappings`

Approved or rejected application of a candidate to a real Worship target.

Mappings are the audit trail between import input and Mindex-owned Worship
records.

## Presenter Read Model

`mindex_worship_presenter_slides` is the read model for Presenter. It joins
service, section, element, and slide instance data in display order.

The app can later read this view directly once Worship data is populated.

## Naming Decision

Use `worship service` for the top-level instance name. The product area is
Worship, and `worship service` is the intended church-domain term.
