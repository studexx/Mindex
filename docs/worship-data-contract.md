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

## Data Structure

```text
mindex_worship_service_types (예배 타입)
├─ id / name / sort_order
└─ taxonomy only: not weekly content, not a template instance

mindex_worship_services (특정 날짜 예배)
├─ id / service_type_id / service_date
├─ title / status / tags
├─ worship_leader / praise_leader
├─ template link / source lineage
└─ owns ordered sections for that date

mindex_worship_sections (예배 순서 묶음)
├─ id / service_id / sort_order
├─ section_key
├─ title / person
├─ template_id / template_modified
└─ owns ordered elements

mindex_worship_elements (순서 안의 콘텐츠 단위)
├─ id / section_id / sort_order
├─ created_at (required when creating a projected element)
├─ element_type
├─ title / person / body / scripture_reference
├─ song_id / song_version_id
├─ input_mode / content_state
├─ asset / config / source_ref
├─ template_id / template_modified
└─ may generate presenter slides

mindex_worship_slides (인스턴스 출력 프레임)
├─ id / element_id / sort_order
├─ layout / elementType / text / media
└─ instance-level slide override, not canonical Praise/Scripture data
```

## Public Worship Schedule

The public Worship schedule is operational metadata. Home uses these local
Korea Standard Time (KST) windows to identify an in-progress service before it
selects the next one. Keep this table and `SERVICE_TIME_WINDOWS` in `app.js`
in sync when the church changes a regular meeting time.

| Service type | Meeting window |
| --- | --- |
| 수요예배 (`wednesday`) | 19:10-20:30 |
| 금요기도회 (`friday`) | 20:00-22:00 |
| 월삭예배 (`monthly`) | 20:00-22:00 |
| 주일예배 [1부] (`sunday-first`) | 07:00-08:00 |
| 주일예배 [2부] (`sunday-second`) | 08:50-10:00 |
| 주일예배 [3부] (`sunday-main`) | 10:50-12:00 |
| 주일오후예배 (`sunday-afternoon`) | 13:20-14:30 |

Special and department services do not have a universal time window. Until a
time field is modeled for them, Home falls back to their service date.

Bulletin authoring UI is currently hidden. Keep the code path available for
later work, but do not expose the button/workbench in the app yet.

## Minister Defaults

Default ministers are materialized into generated worship elements, not inferred
at render time. Current operational defaults:

- `sunday-second` and `sunday-main`: offering prayer person is `김남영 목사`.
- `young-adult`: sermon person and offering prayer person are `김석범 목사`.

## Runtime Projection Tree

This is the structure the app should keep in mind when turning a recurring
service type into one actual worship instance and then into Presenter output.

```text
Service Type (예배 타입)
└─ Service Template / Scaffold (예배 구조 템플릿)
   └─ Section[] (순서 묶음, ordered)
      ├─ sectionKey (구조 식별자)
      ├─ label / name (표시 이름)
      ├─ required / flex / repeatable (필수 / 유동 / 반복 가능)
      └─ Element[] (입력/출력 항목, ordered)
         ├─ elementType (입력/출력 타입)
         ├─ label / name (항목 이름)
         ├─ default_text / person / defaultSong / asset (기본값)
         ├─ formPreset / formHint / outputMode (출력 보조 규칙)
         └─ input mode (입력 방식)
            ├─ praise DB search (찬양 DB 검색)
            ├─ text/person input (텍스트/담당자 입력)
            ├─ scripture lookup/manual text (성경 조회/직접 입력)
            └─ asset picker/url (미디어/파일 연결)

Service Instance (특정 날짜 예배)
├─ service metadata (날짜, 타입, 인도자, 태그)
└─ Projected Service Item[] (템플릿에서 투영된 실제 순서)
   ├─ template identity (템플릿 정체성)
   │  ├─ _worshipSectionKey
   │  ├─ _worshipSectionTitle
   │  ├─ _worshipSectionOrder
   │  ├─ _worshipElementOrder
   │  ├─ _worshipTemplateProjected
   │  └─ _worshipTemplatePlaceholder
   ├─ user input (사용자 입력)
   │  ├─ raw_title
   │  ├─ assignee
   │  ├─ song_id / version_id
   │  └─ memo
   ├─ content state (콘텐츠 상태; stored in element config for now)
   │  ├─ default/input/song/asset exists
   │  │  └─ build Presenter slide
   │  ├─ no default and no user input
   │  │  └─ missingContent / Input Required (입력 필요)
   │  └─ deleted for this service only
   │     └─ templateSuppressed
   └─ Presenter Slide[] (출력 슬라이드)
      ├─ title-assignee
      ├─ song-title / lyrics / score
      ├─ scripture / liturgical-body
      ├─ image / video / file / audio
      ├─ blank
      └─ missingContent
```

## Worship Structures

These trees are structural order definitions. They are not theological
validation metadata.

```text
sunday-first
├─ 01. Ready / ready
│  └─ video / 준비
├─ 02. Creed / creed
│  └─ body / 사도신경
├─ 03. Praise / praise
│  ├─ praise / 찬양 1
│  ├─ praise / 찬양 2
│  └─ praise / 찬양 3
├─ 04. Confession Prayer / confession
│  └─ title / 참회기도
├─ 05. Scripture Reading / scripture_reading
│  └─ scripture_body / 성경봉독
├─ 06. Sermon / sermon
│  ├─ title_person / 설교 제목
│  ├─ scripture_body / 설교 본문
│  └─ live_scripture / 실시간 성구 송출
├─ 07. Response / response_song
│  └─ title / 결단기도
├─ 08. Offering / offering
│  ├─ praise / 봉헌찬송
│  └─ title_person / 봉헌기도
├─ 09. Announcements / announcements
│  └─ title / 교회소식
├─ 10. Sending / sending
│  ├─ praise / 송영, unless disabled
│  ├─ title_person / 축도, when enabled
│  └─ body / 주기도문, when enabled
└─ 11. Closing Visual / closing_visual
   └─ image / 마무리

sunday-second
├─ 01. Ready / ready
├─ 02. Creed / creed
├─ 03. Praise / praise
│  ├─ praise / 찬양 1
│  ├─ praise / 찬양 2
│  └─ praise / 찬양 3
├─ 04. Confession Prayer / confession
├─ 05. Prayer / prayer
│  └─ title_person / 기도
├─ 06. Scripture Reading / scripture_reading
│  └─ scripture_body / 성경봉독
├─ 07. Special Song / special_song
│  └─ praise / 특송
├─ 08. Sermon / sermon
├─ 09. Response / response_song
│  └─ title / 결단기도
├─ 10. Offering / offering
├─ 11. Announcements / announcements
├─ 12. Sending / sending
│  ├─ praise / 송영
│  └─ title_person / 축도
└─ 13. Closing Visual / closing_visual

sunday-main
├─ 01. Ready / ready
│  └─ video / 준비
├─ 02. Praise / praise
│  ├─ title_content / 환영
│  ├─ praise / 찬양 1
│  ├─ praise / 찬양 2
│  ├─ praise / 찬양 3
│  ├─ praise / 찬양 4
│  └─ praise / 입례 찬양
├─ 03. Confession Prayer / confession
│  └─ title / 참회기도
├─ 04. Hymn Praise / hymn_praise
│  └─ praise / 찬송
├─ 05. Prayer / prayer
│  └─ title_person / 기도
├─ 06. Scripture Reading / scripture_reading
│  └─ scripture_body / 성경봉독
├─ 07. Special Song / special_song
│  └─ praise / 특송
├─ 08. Sermon / sermon
│  ├─ title_person / 설교 제목
│  ├─ scripture_body / 설교 본문
│  └─ live_scripture / 실시간 성구 송출
├─ 09. Response / response_song
│  └─ title_person / 결단기도
├─ 10. Creed / creed
│  └─ body / 사도신경
├─ 11. Offering / offering
│  ├─ praise / 봉헌찬송
│  └─ title_person / 봉헌기도
├─ 12. Announcements / announcements
│  └─ title / 교회소식
├─ 13. Community Confession / community_confession
│  └─ body / 공동체고백
├─ 14. Sending / sending
│  ├─ praise / 파송찬송
│  └─ title_person / 축도
└─ 15. Closing Visual / closing_visual
   ├─ image / 마무리
   └─ praise / 폐회찬송

sunday-afternoon
├─ 01. Ready / ready
├─ 02. Praise / praise
│  └─ praise / 찬양
├─ 03. Silent Prayer / silent_prayer
│  └─ title / 묵도
├─ 04. Hymn Praise / hymn_praise
│  └─ praise / 찬송
├─ 05. Prayer / prayer
├─ 06. Scripture Reading / scripture_reading
├─ 07. Sermon / sermon
├─ 08. Response / response_song
│  └─ title / 결단기도
├─ 09. Announcements / announcements
├─ 10. Sending / sending
│  ├─ praise / 송영
│  └─ title_person / 축도
└─ 11. Closing Visual / closing_visual

monthly
├─ 01. Ready / ready
├─ 02. Praise / praise
│  ├─ title_content / 환영
│  ├─ praise / 찬양 1
│  ├─ praise / 찬양 2
│  ├─ praise / 찬양 3
│  ├─ praise / 찬양 4
│  └─ praise / 찬양 5
├─ 03. Prayer / prayer
├─ 04. Scripture Reading / scripture_reading
├─ 05. Special Song / special_song
├─ 06. Sermon / sermon
├─ 07. Response / response_song
│  ├─ praise / 결단찬양
│  └─ title_person / 결단기도
├─ 08. Corporate Prayer / corporate_prayer
│  ├─ title_person / 공동기도 1
│  ├─ title_person / 공동기도 2
│  ├─ praise / 기도 찬양
│  ├─ title_person / 공동기도 3
│  └─ title_person / 공동기도 4
├─ 09. Offering / offering
│  ├─ praise / 봉헌찬양
│  └─ title_person / 봉헌기도
├─ 10. Announcements / announcements
├─ 11. Sending / sending
│  ├─ praise / 파송찬송
│  └─ title_person / 축도
└─ 12. Closing Visual / closing_visual
```

## Element Type Structure

The editor should expose the element types that are actually used by current
worship data and service config. Do not add speculative types to ordinary
worship templates.

Active editor options:

```text
찬양
성경봉독
성경 본문
제목
제목 / 담당자
제목 / 내용
본문
일반 텍스트
이미지
동영상
오디오
악보
파일
실시간 성구
빈 화면
```

Current data basis:

- `praise`, `title_person`, `scripture_body`, `plain_text`, `image`, `body`,
  `video`, and `scripture_reading` exist in `mindex_worship_elements.element_type`.
- `title`, `title_content`, and `live_scripture` are used through service
  config/memo and presenter generation.
- `audio`, `score`, and `file` are active operational types even when they are
  sparse in weekly data. They must keep their existing presenter/preview output.
- Do not expose unused legacy/scratch types such as `template`, `live_praise`,
  or `editable` in ordinary worship editing.
- Do not expose `auto` as an element type. Template defaults must be materialized
  into concrete element types and output modes when a worship service is created.
- Praise elements expose three input methods, independent from fullscreen or
  chromakey rendering:
  - `score_db`: "악보 불러오기" loads a Praise DB song and renders score output.
  - `lyrics_db`: "가사 불러오기" loads a Praise DB song and renders lyric output.
  - `manual_praise`: "직접 입력하기" stores the title and manual lyric slides on
    the worship element, without requiring `song_id` or `song_version_id`.

```text
Element Type (템플릿/저장 타입)
├─ praise (찬양)
│  ├─ input: Praise DB search, version, optional manual title
│  ├─ storage: song_id / song_version_id / raw_title / formPreset
│  ├─ outputMode=score: score image/file path
│  └─ presenter: song-title, lyrics, score image/file
├─ scripture_reading (성경봉독)
│  ├─ input: scripture reference
│  ├─ storage: scripture_reference or raw_title
│  └─ presenter: title-assignee / clean scripture reading
├─ scripture_body (성경 본문)
│  ├─ input: scripture reference + resolved Bible text
│  ├─ storage: scripture_reference/body payload
│  └─ presenter: scripture lower bar, reading form, sermon body, or citation
├─ title (제목)
│  ├─ input: text title
│  ├─ storage: title or raw_title/default_text
│  └─ presenter: title-assignee or title slide
├─ title_person (제목 + 담당자)
│  ├─ input: assignee/person text
│  ├─ storage: person/assignee plus optional title
│  └─ presenter: title-assignee / lower bar
├─ title_content (제목 + 내용)
│  ├─ input: first line title, following lines body
│  ├─ storage: title/body-like text in raw_title or memo note
│  └─ presenter: title-content / center text
├─ body (본문)
│  ├─ input: fixed/manual body text
│  ├─ storage: body/default_text/memo slides
│  └─ presenter: liturgical-body or lower-bar body chunks
├─ plain_text (일반 텍스트)
│  ├─ input: manual text
│  ├─ storage: raw_title/body-like text
│  └─ presenter: title-content/freeform text
├─ image (이미지)
│  ├─ input: asset picker/url
│  ├─ storage: asset.url
│  └─ presenter: image / media layout
├─ video (동영상)
│  ├─ input: asset picker/url
│  ├─ storage: asset.url + playback config
│  └─ presenter: video / media layout
├─ audio (오디오)
│  ├─ input: asset picker/url
│  ├─ storage: asset.url + playback config
│  └─ presenter: audio/file preview
├─ score (악보)
│  ├─ input: score asset or hymn score manifest
│  ├─ storage: asset.url or linked Praise/hymn metadata
│  └─ presenter: score image slides or file slide
├─ file (파일)
│  ├─ input: asset picker/url
│  ├─ storage: asset.url
│  └─ presenter: file slide
├─ live_scripture (실시간 성구)
│  ├─ input: live scripture config
│  ├─ storage: memo/config
│  └─ presenter: live scripture bridge
└─ blank (빈 화면)
   ├─ input: none
   ├─ storage: element_type=blank
   └─ presenter: blank / blank layout
```

## Presenter Slide Model Contract

Presenter output must receive normalized slide models, not raw worship items.
The renderer should only care about this contract:

```text
Presenter Slide
├─ identity
│  ├─ id
│  ├─ elementId / sectionId
│  └─ sectionKey / sectionLabel / elementLabel
├─ render contract
│  ├─ elementType
│  ├─ layout
│  ├─ outputContext: chromakey | clean
│  └─ type: legacy render class only
├─ content payload
│  ├─ title / assignee / bodyText / text
│  ├─ marker / formKey
│  ├─ imageSrc / videoSrc / audioSrc / asset
│  └─ scriptureContext / reference metadata
└─ operational state
   ├─ missingContent / inputMode
   ├─ hiddenInPresentation
   ├─ suppressBackgroundImage
   └─ autoTrailingBlank / skipTrailingBlank
```

Allowed `layout -> elementType` pairs are intentionally narrow:

```text
blank
└─ blank

center_text
├─ title
├─ plain_text
├─ title_content
├─ title_assignee
├─ body_text
├─ scripture_reading / scripture_text
├─ praise
└─ freeform

lower_bar_text
├─ title_assignee
├─ praise
├─ scripture_reading / scripture_text
├─ plain_text / body_text
└─ freeform

media
├─ image
└─ video

file
├─ audio
├─ file
└─ freeform
```

When a new element type or layout is added, update the app contract and the
Presenter smoke test before relying on it in a worship template.

```text
Content State By Element (콘텐츠 상태)
├─ has default value
│  └─ filled, builds presenter output
├─ has user input
│  └─ filled, builds presenter output
├─ no default + no user input
│  └─ missingContent / Input Required with inputMode
└─ deleted for this service
   └─ templateSuppressed, excluded from projection
```

## Structural Risks

These are the problems exposed by the projection tree above.

- Runtime template authority: structural templates currently live in app code.
  That is now the only active runtime source, but it should eventually move to
  reviewed template data so service structures can be versioned and compared.
- Mixed template shapes: fallback templates may be strings, section-like
  objects, or section objects with nested elements. Normalize early so later
  code only sees one shape.
- Content state is now persisted on the element instance config, but it is still
  derived from loose fields: `raw_title`, `assignee`, `song_id`, `asset`, and
  `memo` feed the resolver before save. A later schema should promote this from
  JSON config into typed instance fields.
- Placeholder lifecycle is subtle: an unfilled template slot, a filled instance
  item, and a one-service deletion must never collapse into the same state.
- Presenter currently resolves too much: slide generation is doing content
  resolution, missing-content detection, and output rendering decisions. Those
  should be split into a resolver step and a renderer step.
- Labels still carry too much meaning: section labels are useful for display,
  but matching and behavior should rely on stable keys and element types.
- Input mode is now explicit in the runtime content-state payload and persisted
  on the service element config. It should eventually become a typed instance
  field so validation can happen before Presenter output without reading JSON
  config.

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

This is not a theological order taxonomy.

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

### Versioning

Public worship starts with the shared `2026-q3` baseline, effective from
`2026-07-01`. The service type remains part of the template identity; the
version label marks the reviewed rule set shared by those type-specific
templates.

Do not create a new template version merely because a month changes. Create a
later version only for a lasting rule change, such as a revised recurring song
form or section structure, and give it its actual effective date. A one-off
service change remains an instance override and must not become a version.

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

One source file or source batch: PPT, PDF, manual worship order, legacy service rows.

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
