# Worship / Presenter Thread Guide

Read `HANDOFF.md` first. Use this file as the short guide when a thread is mostly about Worship, service elements, presenter controls, presenter output, or order/PPT matching.

## Scope

Focus on:

- Service dashboard and service element editing.
- Presenter slide building.
- Presenter controller controls and keyboard behavior.
- Presenter output route and projector-facing layout.
- Service templates and import/reference mapping when needed.
- Order-sheet integration only where it touches service data or Friday/monthly print output.

Avoid:

- Reworking Praise or Scripture internals unless needed for linked worship elements.
- Replacing curated song/scripture data from PPT imports.
- Adding decorative UI that does not help live service operation.

## Canonical Worship Model

Use this normalized model for new Worship/Presenter data work. Do not invent
missing service orders, section lists, or element presets when the source data is
ambiguous; ask the user and preserve curated service material.

Schema direction:

- New canonical Worship work should target `scripts/worship-schema.sql`.
- Data ownership and table responsibilities are summarized in
  `docs/worship-data-contract.md`.
- `mindex_worship_service_types` is the retained service taxonomy. Populate it
  directly from reviewed Mindex decisions, not from legacy service type rows.
- Older service tables are residue, not the Worship domain model. Do not use
  them as app fallback, template source, or import authority.
- The app/presenter read path loads Worship only. The previous PPT-derived
  Worship rows have been purged; rebuild Worship behavior on normalized worship
  tables.
- Use `mindex_worship_services` for the top-level instance name. The product
  area is Worship, and `worship service` is the intended church-domain term.
- Do not add new Worship concepts by expanding `raw_title`, `memo`, or
  `order_template`; create/import into the normalized Worship domain instead.

Hierarchy:

```text
Service > Section > Element > Slide
```

- `Service` is the top operational worship unit that drives the presenter.
  Examples: `주일예배 (1부)`, `주일예배 (2부)`, `주일예배 (3부)`,
  `수요예배`, `금요기도회`, `월삭예배`, department services, and special
  seasonal services. Recurring services can have stable service keys. Special
  services should normally stay in a special/seasonal grouping and receive
  per-event custom structure instead of becoming permanent top-level categories.
- `Section` is the practical first-level division of a service order. It is not
  the abstract theological flow of worship; it is the actual unit used to build,
  edit, and present the service. Examples include `준비`, `찬양`,
  `대표기도`, `교회소식`, `성경봉독`, `특송`, `설교`, `결단기도`, `봉헌`,
  a final `찬양`, `축도`, and department-only `교제`.
- `Element` is the content-bearing unit inside a section. An element can have
  `제목` (`title`), `담당자` (`person`), and `본문` (`body`), but none of those
  fields is globally required. Required fields depend on the element's type.
- `Slide` is the presenter frame/layout instance. Think of it like PowerPoint's
  layout choice: chromakey blank, chromakey lower-third text, fullscreen centered
  text, image fullscreen, imported PPT/PDF page, and so on.

Concrete hierarchy examples:

- `월삭예배 > 월삭 기도 > 기도 1 > 제목/담당자 slide`
- `월삭예배 > 월삭 기도 > 기도 찬양 > praise title/body slides`
- `주일예배 > 찬양 > 가서 제자 삼으라 > praise title/body slides`
- `주일예배 > 신앙고백 > 사도신경 > body slides`
- `주일예배 > 봉헌 > 봉헌찬양 > praise slides`
- `주일예배 > 봉헌 > 봉헌기도 > 제목/담당자 slide`

`Element` examples:

- In a `찬양` section, each song such as `가서 제자 삼으라` is an element.
- In `신앙고백`, `사도신경` is an element with a title/body and usually no
  담당자.
- In monthly first-day worship prayer sections, `기도 1`, `기도 2`, `기도 3`,
  and `기도 4` can be elements with a prayer topic as `제목` and the prayer
  leader as `담당자`, but no body.
- `봉헌찬양` and `봉헌기도` are separate elements grouped under the `봉헌`
  section.

## Templates And Types

Templates and types are different concepts.

- `Template` is a reusable composition/content preset. Templates can exist at
  every level: `Service Template`, `Section Template`, `Element Template`, and
  `Slide Template`.
- `Type` is the element/slide output form, the file/rendering behavior, or the
  interaction mode used to produce presenter slides.
- A service instance is built by combining templates, but every level must allow
  free creation. When adding a service, section, element, or slide, include a
  `템플릿 없음` / no-template path.
- Editing an instance must not silently mutate the template. If an element,
  slide, praise setlist, imported file, or body content diverges from its
  template, display it like `템플릿명 (수정됨)` until the user explicitly saves a
  new template or updates the existing template.

Template levels:

- `Slide Template`: layout/render preset, similar to choosing a PowerPoint
  layout.
- `Element Template`: content fields and slide-building rules for one content
  unit, such as praise, prayer, Apostles' Creed, scripture reading, or video.
  Song-form defaults belong here when they apply to a specific content unit,
  e.g. monthly `봉헌 > 봉헌찬양` uses `V-C`, while `봉헌기도` has no song form.
- `Section Template`: ordered collection of element templates, such as an
  offering section containing offering song and offering prayer.
- `Service Template`: ordered collection of section templates for a recurring
  worship unit.

Initial type vocabulary:

- `Blank`: empty chromakey/fullscreen screen.
- `Plain Text`: simple text-only slide.
- `Title / Person`: title and 담당자 display.
- `Body`: body text display.
- `Praise`: loads a linked Praise record and creates a title slide plus song-form
  body slides.
- `Scripture Reading`: loads scripture from a normalized reference for formal
  reading.
- `Scripture Body`: displays prewritten or live-entered scripture/body text.
- `Image`: fullscreen image.
- `Video`: video playback.
- `Editable`: free slide editor for text/images and custom one-off layout.
- `PPT`: imported PowerPoint reference/output.
- `PDF`: imported PDF reference/output.

Chromakey/fullscreen is an output context, not by itself the content type. The
same content type may need separate chromakey and fullscreen slide templates.

## Presenter Rules

- Preparation video or waiting slide should be the first element.
- Consecutive praise songs that belong to one led block should be grouped under one praise section.
- Praise leader belongs next to the praise section, not as the main worship leader.
- Hymns in 1st/2nd service may not have a praise leader.
- Scripture reading should link to Scripture data or normalized references.
- Apostles' Creed is a faith-confession element.
- PPTX/Keynote import/reference should be an element type, not the source of truth.
- Blank screen and video should remain available elements.

## Controller UI

- The controller should feel like a simple PowerPoint/FreeShow slide sorter.
- Slide thumbnails must keep the actual output aspect ratio.
- A single thumbnail must not resize wildly just because it is alone.
- Labels should use actual section/form labels and avoid duplicate text.
- Avoid Current/Next panels when thumbnail control is the main mental model.
- Keyboard behavior:
  - Space, Right, Down: next.
  - Left, Up: previous.
  - Number plus Enter: jump.
  - B: black.

## Output

- Chromakey services use `#00ff00`.
- Chroma range is narrow in the real broadcast setup.
- Non-chromakey services use background images.
- Department worship backgrounds may rotate by two-month theme cycles.
- Youth and young adult services may use public-worship backgrounds where specified.
- Paperlogy may be used for department outputs, but never apply it to the whole app by accident.

## Verification

For presenter work, run at least:

```bash
cd /Users/parkjihun/Code/Mindex
/Users/parkjihun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app.js
git diff --check -- app.js styles.css index.html tests/smoke_app.py tests/smoke_worship_presenter.py
python3 tests/smoke_worship_presenter.py
```

For broader app changes, also run:

```bash
python3 tests/smoke_app.py
```

Manual checks when changing live presenter behavior:

- No horizontal overflow.
- Thumbnails stay 16:9 and stable.
- Double-click thumbnail starts presenter at that slide.
- Number input plus Enter jumps correctly.
- Space/Right/Down and Left/Up only affect presenter where intended.
- Non-chromakey services do not flash chromakey green.
- Output slide matches thumbnail in background, title, lyrics, and labels.

## Recent Updates

2026-07-08:

- Presenter output now warms nearby service/live-praise/image slides in the output
  window so long hymn-score or image sequences are less likely to flicker when
  moving between slides.
- Presenter controls can show image warmup progress while an output window is
  connected.
- Hymn auto form presets include a trailing `Coda` form when the linked praise
  version provides one, preserving the rule that each hymn verse is followed by
  the chorus.
- If the presenter output window has fallen out of fullscreen, `Space` or
  `Enter` first requests fullscreen again instead of advancing the slide.
- Presenter smoke coverage now checks long hymn-score warmup ordering, score
  safe-area rendering, hymn Coda output, and a less flaky output key-sync wait.
