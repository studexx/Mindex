# Worship Order Review Draft

This is a review draft for rebuilding Worship templates from Mindex decisions.
It is not runtime seed data yet.

## Principles

- The service order template is the structural authority for Worship.
- The weekly bulletin fills date-specific fields such as scripture reference,
  sermon title, preacher, prayer leader, special music performer, and notes.
- Praise titles and song forms are confirmed manually in Mindex Praise, not
  guessed from PPT slide text.
- PPT files are slide material/reference only. They may suggest layout and slide
  count, but they do not own the worship order.
- Each recurring worship service should become:
  `Service Template > Section Template > Element Template > Slide Template`.
- A service instance can diverge from its template without mutating the template.

## Public Sunday 1st And 2nd Service

Use shared section/element templates for common public worship pieces, with
service-level order differences for 1st and 2nd service.

1st service uses clean/fullscreen output. 2nd service uses chromakey output.

| Order | Section | Element | Type | Bulletin Fill | Manual Fill |
| --- | --- | --- | --- | --- | --- |
| 1 | 준비 | 예배 준비 | video |  | asset |
| 2 | 신앙고백 | 섹션 제목 슬라이드 | title_content |  | fixed `신앙고백 / 사도신경` |
| 3 | 신앙고백 | 사도신경 | body |  | fixed body |
| 4 | 찬양 | 찬양 1-3 | praise/score | hymn number/title | song/version/form |
| 5 | 참회기도 | 참회기도 | title |  | fixed title |
| 6 | 대표기도 | 기도 | title_person | prayer leader | 2nd service normally includes; 1st omits |
| 7 | 성경봉독 | 성경봉독 | scripture_reading | scripture reference | first title slide |
| 8 | 성경봉독 | 성경 본문 | scripture_body | scripture reference | verse slides |
| 9 | 특송 | 특송 | praise | performer/title | 2nd service only unless special case |
| 10 | 설교 | 설교 | title_person | sermon title, preacher |  |
| 11 | 설교 | 본문 | scripture_body | sermon scripture | optional verse slides |
| 12 | 설교 | 실시간 성구 송출 | activity |  | runtime presenter control |
| 13 | 결단 | 결단기도 | title |  | response song is special case |
| 14 | 봉헌 | 봉헌찬송 | praise/score | hymn number/title | offering prayer leader usually worship leader unless special case |
| 15 | 봉헌 | 봉헌기도 | title_person | dedication prayer leader |  |
| 16 | 교회소식 | 교회소식 | title | announcements |  |
| 17 | 송영 | 송영 | praise/score |  | 2026 1st/2nd default: hymn 5 |
| 18 | 축도 | 축도 | title_person | leader | use when worship leader is pastor |
| 19 | 주기도문 | 주기도문 | body | leader | 1st fallback when worship leader is not pastor |
| 20 | 마무리 | 마무리 | image |  | public closing visual |

Open checks:

- `환영` can appear in source order material, but it is not an explicit
  presenter output element.
- 1st service should choose `축도` when the worship leader is a pastor; otherwise
  use `주기도문`, regardless of the bulletin shorthand.
- Public worship usually has no response song; `결단찬양` is a special-case
  addition.

## Public Sunday 3rd Service

3rd service usually needs a separate template because the opening praise block
and response/sending flow are different.

| Order | Section | Element | Type | Bulletin Fill | Manual Fill |
| --- | --- | --- | --- | --- | --- |
| 1 | 준비 | 예배 준비 | video |  | asset |
| 2 | 찬양 | 찬양 | praise |  | led praise set |
| 3 | 참회기도 | 참회기도 | body |  | fixed or editable body |
| 4 | 찬양 | 찬양 | praise |  | hymn/song |
| 5 | 대표기도 | 대표기도 | title_person | prayer leader |  |
| 6 | 성경봉독 | 성경봉독 | scripture_reading | scripture reference | scripture link |
| 7 | 특송 | 특송 | title_person or praise | performer/title | song link when known |
| 8 | 설교 | 설교 | title_person | sermon title, preacher |  |
| 9 | 결단 | 결단기도 | title_person |  | optional |
| 10 | 신앙고백 | 사도신경 | body |  | fixed body |
| 11 | 봉헌 | 봉헌찬양 | praise |  | song/version/form |
| 12 | 봉헌 | 봉헌기도 | title_person | dedication prayer leader |  |
| 13 | 교회소식 | 교회소식 | plain_text | announcements |  |
| 14 | 새가족환영 | 새가족환영 | plain_text |  | optional |
| 15 | 공동체고백 | 공동체고백 | body |  | fixed or editable body |
| 16 | 찬양 | 찬양 | praise |  | sending song |
| 17 | 폐회찬송 | 십자가 군병들아 | praise |  | default song |
| 18 | 축도 | 축도 | title_person | benediction pastor |  |
| 19 | 마무리 | 마무리 | image |  | public closing visual |

Open checks:

- Confirm if `신앙고백` always comes after `결단기도` in 3rd service.
- `사죄의선언` and `아멘송` can appear in source order material, but they are
  not explicit presenter output elements.
- 3rd service has an unprinted closing hymn: `폐회찬송 > 십자가 군병들아`.

## Source Order Normalization

Use PPT section names and slide names as presenter/output naming material.
Normalize bulletin labels before matching:

- `경배와찬양` and `경배와 찬양` -> `찬양`
- `말씀선포` and `말씀` -> `설교`
- `결단의기도` -> `결단기도`

## Hymn Score Output Policy

Keep the element type as `praise` so the item can still link to Mindex Praise.
Use `outputMode: score` when a praise element should render as sheet music
instead of lyrics.

- Sunday 1st service: every praise/song slot uses score output.
- Sunday 2nd service: every praise/song slot except `특송` uses score output.
- Sunday 3rd service: only `찬송` and `봉헌찬송` use score output.
- Sunday afternoon service: generally only `찬송` and `송영` use score output.
  Dedication services may override this per service instance.

## Sunday Afternoon Service

This covers regular Sunday afternoon worship and named dedication services such
as disciple dedication worship.

| Order | Section | Element | Type | Bulletin Fill | Manual Fill |
| --- | --- | --- | --- | --- | --- |
| 1 | 준비 | 예배 준비 | video |  | asset |
| 2 | 찬양 | 찬양 | praise |  | led praise set |
| 3 | 묵도 | 묵도 | body |  | fixed or editable body |
| 4 | 찬양 | 찬양 | praise |  | hymn/song |
| 5 | 대표기도 | 대표기도 | title_person | prayer leader |  |
| 6 | 성경봉독 | 성경봉독 | scripture_reading | scripture reference | scripture link |
| 7 | 설교 | 설교 | title_person | sermon title, preacher |  |
| 8 | 결단 | 결단기도 | title_person |  | optional |
| 9 | 교회소식 | 교회소식 | plain_text | announcements |  |
| 10 | 송영 | 송영 | praise |  | song/version/form |
| 11 | 축도 | 축도 | title_person | benediction pastor |  |
| 12 | 마무리 | 마무리 | image |  | public closing visual |

Open checks:

- Confirm whether dedication-service subtitle belongs to the service title or a
  separate service tag.
- Confirm whether special afternoon services add `특송`, `헌신서약`, or other
  one-off elements.

## Existing Monthly First-Day Service Decisions

Keep the already reviewed monthly first-day decisions:

- `준비` is both a section and an element, with type `video`.
- Monthly offering song default: `이런 교회 되게 하소서`, suggested form `V-C`.
- Final praise default: `여기에 모인 우리`, default form `V1-C-C`.
- The final praise should be named `찬양`, not `파송찬양`.
- Song-form defaults belong to the specific element template when the rule is
  tied to a specific service element.

## Special Music Song-Form Rules

Public worship `특송` has a conditional hymn rule:

- If the linked song is a hymn: `1절`, `후렴`, `2절`, `후렴`, blank interlude
  slide, `마지막 절`, `후렴`, and `Coda` only when the linked version provides
  `Coda` or `Amen`.
- If the linked song is CCM: use a manual preset by performer/song when known.

This rule belongs to the public-worship `특송` section/element template. It should not
be applied globally to all praise elements.

## Presenter Desktop Direction

Installed PWA still runs under browser security rules. It can feel cleaner than
a tab, but fullscreen, multi-screen placement, and automatic window control are
still constrained by browser permissions and user activation.

A native desktop shell such as Electron or Tauri can keep the current web app
core while adding a presenter-specific host:

- Open controller and output windows separately.
- Put output on a selected display.
- Use borderless fullscreen or kiosk-style output.
- Persist the last projector display.
- Keep presenter keyboard handling more predictable during live service.

Recommendation: keep improving the web presenter now, but plan a lightweight
desktop presenter shell if browser fullscreen becomes the main live-operation
weak point.
