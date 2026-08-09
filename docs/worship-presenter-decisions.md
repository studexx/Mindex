# Worship / Presenter Decision Log

This is the durable record for behavior that must not be silently reverted by
another task. It supplements the data contract; it records reviewed product
decisions rather than implementation history.

## Update Rule

When a change affects live service operation, templates, output behavior,
default selection, or a user-visible exception:

1. Update this file in the same change.
2. State the rule, its scope, and the exception if one exists.
3. Add or update a focused smoke assertion when the behavior is testable.
4. Do not replace a documented rule with a local workaround or fallback.

If another thread sees a documented rule that appears wrong, it must ask the
user or update this log with the new reviewed rule. Do not silently revert a
documented decision during cleanup, refactor, or smoke-test repair.

Small visual polish that does not alter behavior does not need an entry.

## Current Decisions

### Controller Reload Recovery

- Reloading the controller must not stop an already-open Presenter output.
  The output keeps its last rendered frame while the controller reconnects.
- After the output answers the controller's `ready` / heartbeat signal, the
  controller restores the last active service, slide index, blank state, and
  live scripture state from the persisted presenter payload, then republishes
  freshly built slides from the current service data.
- Restoration is only allowed while an output is actually connected and only
  for a payload newer than 12 hours. A stale local payload must never start a
  presentation by itself when the app is opened later.

### Presenter Typography Scale

- Presenter typography is controlled by role tokens, not by individual slide
  exceptions: `Title` (weight 800), `Main song` (800), `Section` (800),
  `Content` / `Lyrics` (700), `Support` (600), and scripture-reading text.
- Fixed measurements on the 1920x1080 stage use a **5px grid**. Timing uses a
  **50ms grid**. Use the closest grid value when adjusting a fixed font size,
  thumbnail size, blank-cross dimension, or animation duration. Percentages,
  container ratios, and typographic ratios (for example the reviewed scripture
  `letter-spacing: -0.06em`) retain their semantic values and are not rounded.
- At the fixed 1920x1080 presenter stage, the reviewed scale is:

  | Role | Chromakey | Fullscreen |
  | --- | ---: | ---: |
  | Title | 90px | 170px |
  | Main song title | 100px | 150px |
  | Section title | 70px | 140px |
  | Content | 70px | 100px |
  | Lyrics | 70px | 100px |
  | Support | 50px | 100px |
  | Formal scripture verse body | 90px | 90px |

- The formal scripture reading deliberately keeps the same 90px verse body
  across output modes. It is a shared reading form rather than a fullscreen
  display variant. This table is the source of truth for future typography
  adjustments; change the role token first, then review the representative
  slides before adding a local override.

### Scripture Input And Reading

- `성경봉독` and `설교 본문` are separate visible service elements in chromakey
  services, but their scripture references may be shared when one side is
  intentionally empty.
- Fullscreen/clean public worship does not need a separate `설교 본문` element:
  `성경봉독` is already the fullscreen scripture output. Existing clean-output
  `설교 본문` items are treated as redundant no-output compatibility items.
- A directly entered `성경봉독` reference is valid content for the reading and
  must not be ignored merely because `설교 본문` is empty.
- If `설교 본문` is empty and `성경봉독` has a valid reference, `설교 본문`
  may use the reading reference as fallback so it does not show `입력 필요`.
- If `성경봉독` is empty and `설교 본문` has a valid reference, `성경봉독`
  may use the sermon-body reference as fallback.
- Direct input always wins over fallback input.
- Scripture reference normalization for service inputs follows the Scripture
  search parser: Korean/English abbreviations, attached book+chapter text such
  as `요21:15~25`, `~` ranges, and comma-separated references are accepted.
- 성경 원본 데이터가 한 행에 여러 절을 묶고 다음 절 번호를 생략한 경우에는
  (예: 대한성서공회 `신 6:18-19`) 그 번호 공백을 읽어 화면 표기를 `18–19`로
  복원한다. 이 규칙은 특정 역본이나 문장 종결 판단에 의존하지 않는다.
- `인용 구절` is optional, separate from the sermon body, and may be entered
  before or during worship. An empty citation creates neither a missing warning
  nor an empty slide.
- A scripture-reading final slide keeps the scripture-reading background and is
  followed by one plain trailing blank that suppresses the service background.
  In chromakey output this is the chromakey blank; in fullscreen/clean output it
  is the default blank frame.
- Scripture-reading output uses the installed `Eulyoo1945` / `을유1945` face
  for the verse body text only. The body uses `font-weight: 700`, allows weight
  synthesis, and applies a very small text stroke for projection readability
  because the installed Eulyoo face can render too thin at screen size. The
  reference line, translation label, and `Fin.` keep the presenter font. Do not
  bundle the Eulyoo font file in this repo.
- Scripture-reading references include the current verse number in the header,
  e.g. `요한계시록 3:19`; the large standalone verse-number column is not used.
- The translation label uses the same color as the reference line and is one
  text-size step larger than the old caption size.
- Scripture-reading output keeps the Eulyoo verse body tighter with
  `letter-spacing: -0.05em` and removes text shadow; body stroke/weight
  synthesis is the other readability boost.

### Ministry Service Auto-Generation

- Youth and young-adult worship stay in the weekly auto-generation flow.
- Children's worship templates and service type remain available for later use,
  but weekly auto-generation is off until explicitly enabled through a reviewed
  product decision. Do not hardcode a September activation date.

### Service Outline And Input State

- Missing-input state belongs to the actionable element only. Section rows show
  structure and start position; they do not repeat an element's `입력 필요`
  badge.
- Fixed liturgical content, shared scripture reading, and fixed closing media
  are not preparation inputs.
- `예배 입력`의 `반영`은 서비스 입력에만 적용하고 저장하지 않는다.
  반영 뒤에는 상단 `저장` 버튼이 활성화되며, 사용자가 그 버튼으로
  Supabase 저장을 명시적으로 확정한다.
- `예배 입력`은 현장용 rough text를 받아야 한다. `찬송가 9, 288, 182`
  같은 한 줄 hymn list는 순서대로 `찬양 1`, `찬양 2`, `찬양 3`에
  매핑하고, `성경봉독 롬 8:12~17`, `설교 제목 한 가지 그것을`,
  `봉헌찬송 찬 187장`처럼 colon 없는 known-label line도 인식한다.
- `예배 입력`의 placeholder는 선택된 예배의 editable input만 예시로
  보여준다. Fixed/default/shared output은 예시에 넣지 않는다.
- 금요기도회 메인 찬양은 `찬양 1`부터 `찬양 5`까지 독립 슬롯이다.
  `찬양 1 곡명` 형식은 같은 번호 슬롯에 연결하고, 성경봉독 직전 찬양은
  성경봉독과 설교 사이의 독립 `입례찬양` section/element로 유지한다. 붙여넣기 입력의 `[팀명.날짜]` 같은
  머리말과 `금요기도회입니다!` 같은 마무리말은 무시하며, 곡명 뒤의 조성
  표기(`G`, `D`, `F#m` 등)는 연주 참고용으로만 보고 곡 검색에서 제외한다.
- 기존 금요 예배의 메인 `찬양` 또는 `성경봉독 전 찬양` 안에 있던 입례찬양은 열 때
  독립 `입례찬양` section으로 정규화한다. `자율기도`는 입력이 필요 없는 고정 순서이므로 missing 상태나
  입력 필드를 만들지 않는다.
- 금요기도회의 `기도회` 섹션에는 `기도 찬양 1·2`와 마지막 `자율기도`를
  둔다. `교회소식`은 독립 `광고` 섹션에만 둔다. 기존 데이터의 위치를
  추정해 자동 이동하지 않고, 템플릿 매칭으로 각각의 섹션을 유지한다.
- `인용 구절`은 optional `설교` 엘리멘트다. 풀스크린의
  메인 찬양, 입례찬양, 기도 찬양의 제목은 152px, weight 800으로 표시하며
  봉헌·특송 등 다른 순서의 곡 제목과 구분한다.
- 금요기도회는 `성경봉독 → 입례찬양 → 설교` 순서로 진행한다.
- 2026년 8월부터 금요일 예배 자동 생성은 주차별 운영명을 따른다.
  첫째 금요일은 `월삭예배`로 만들고 월삭예배 템플릿을 사용한다.
  둘째 금요일은 `문화예배`로 만들되 영화 관람 등으로 집회가 없는 날이므로
  금요기도회 송출 템플릿을 붙이지 않는다. 셋째 금요일 `삼삼오오예배`와
  넷째 금요일 `구역연합예배`는 표시명만 바꾸고 기존 금요기도회 양식을
  유지한다. 다섯째 금요일은 별도 지시가 없으면 기존 `금요기도회`로 둔다.
- 출력 창은 BroadcastChannel 연결 시 이전 local payload를 재출력하지 않고
  현재 controller state를 기다린다. 따라서 풀스크린 예배 시작 시 이전
  크로마키 프레임이 잠깐 노출되지 않는다.
- 풀스크린의 빈 화면 십자가는 세로선을 위에서 아래로 먼저 그린 뒤,
  가로선을 왼쪽에서 오른쪽으로 이어 그린다. 크로마키 빈 화면에는 십자가를
  표시하지 않는다.
- 풀스크린 예배의 설교 `인용 구절`은 성경봉독과 같은 말씀 전용 화면으로
  출력한다. 크로마키 예배에서는 기존 하단 바 성구 화면을 유지한다.
- 금요기도회의 기본 배경은 `26-B` 계열이다. 서비스별로 직접 고른
  배경은 유지하지만, 금요기도회 템플릿/자동 생성 기본값은 `B` 그룹을
  따른다.
- `말씀 <제목>`은 성경 주소처럼 보이지 않으면 `설교 제목`으로,
  `설교 <이름/직분>`은 설교 제목 요소의 담당자로 반영한다.
- 찬양 DB에서 원제/부제/첫 가사 등으로도 곡을 하나로 찾지 못하면,
  새찬송가 score 전용 슬롯을 제외하고 입력 제목의 빈 Praise record를
  만들고 해당 예배 항목에 연결한다. 사용자는 나중에 Praise 탭에서
  가사와 버전을 채운다.

### Public Worship Timing

- Home selects public Worship by each service's actual KST meeting window, not
  by service date alone. A currently running service is shown before the next
  future service.
- Regular windows are: 수요예배 `19:10-20:30`, 금요기도회 and 월삭예배
  `20:00-22:00`, 주일예배 [1부] `07:00-08:00`, [2부] `08:50-10:00`,
  [3부] `10:50-12:00`, and 주일오후예배 `13:20-14:30`.
- Department and special services have no inferred time window. Until they
  carry explicit timing metadata, Home falls back to their service date.

### Default Ministers

- Default sermon/benediction ministers are template defaults, not missing
  preparation inputs. A per-service edit may override them.
- 주일예배 [1부] defaults to 김석범 목사 for sermon and benediction.
- 주일예배 [2부], [3부], 주일오후예배, 수요예배, and 월삭예배 default to
  김남영 목사 for sermon and benediction when those elements exist.
- 금요기도회 defaults to 김남영 목사 for sermon. It has no benediction element.
- In the sending section, `축도` and `주기도문` are mutually exclusive in the
  presenter/order projection. If both legacy/persisted items exist, keep `축도`
  and drop `주기도문`.

### Sunday Public Worship Templates

- Sunday first and second service share the same three main-praise contents:
  `찬양 1`, `찬양 2`, and `찬양 3`.
- Sunday second and third service share scripture reading and the whole sermon
  section content: `성경봉독`, `설교 제목`, `설교 본문`, and `인용 구절`.
- Sunday first, second, and third service share `봉헌찬송`.
- These are same-date linked content rules, not presenter-only fallback.
  When a linked slot is filled, edited, or cleared in one service, saving writes
  the same content to the other same-date services in its sharing group.
  Presenter fallback may remain only as legacy recovery for older rows that have
  not been normalized yet.
- Sunday first and second service doxology is fixed to hymn 5,
  `이 천지간 만물들아`.
- Sunday afternoon doxology is fixed to hymn 1, `만복의 근원 하나님`.
- A fixed doxology is output content, not an input. It must not appear in the
  input rail, block saving, or produce an `입력 필요` warning.
- Sunday afternoon worship starts with four main-praise slots:
  `찬양 1` through `찬양 4`.
- Sunday afternoon worship uses the dedication-service order by default because
  most afternoon services are dedication services. `특송` and `봉헌`
  (`봉헌찬송`, `봉헌기도`) stay in the base template; non-dedication days should
  skip/hide those slots instead of removing them from the scaffold.
- Sunday third service uses the same `신앙고백 → 사도신경` title-slide rule as
  the first and second services. `공동체고백` and `주기도문` also retain their
  own title slides before their body text.
- Template-provided praise defaults are real linked Praise selections, not
  display-only text. Sunday third preloads `입례찬양` (내 한 가지 소원),
  `파송찬송` (359 천성을 향해 가는 성도들아), and `폐회찬송` (352 십자가
  군병들아) when their catalog records are available.
- These are template rules, not copied weekly content. A service instance may
  override them only through a deliberate template-modified edit.
- 주일예배 [3부] 특송 is allowed to be a one-off manual choir item. When the
  element carries manual slides/body, it must not auto-link to Praise DB even
  if the title matches a hymn, because choir arrangements often reuse hymn
  titles with custom lyrics.
- 특송 elements may carry a deliberate image deck in `asset.slides`. In that
  case the presenter outputs those images as-is and does not add an extra
  generated title slide, because the supplied deck is already designed for
  projection.

### Youth Worship Template

- 청소년부 예배 is a regular 10:50 Sunday ministry service. On a date marked
  `온세대 찬양예배`, it is not generated because youth worship is integrated
  with 주일예배 [3부].
- New 청소년부 예배 services receive this weekly scaffold: `사도신경`, main
  praise 3곡, `대표기도`, `봉헌` (`봉헌찬양`, `봉헌기도`), `성경봉독`, `설교`,
  `결단기도`, `광고`, `주기도문`, and `반별 모임`.
- `통성기도` and `결단찬양` are not part of the regular youth template unless
  a user deliberately adds them for that service.
- In every service template, the child element of the `대표기도` section is also
  labeled `대표기도`. Legacy projected items labeled `기도` are normalized for
  display without changing their leader or entered content.
- The regular `봉헌찬양` default is `대단한 믿음 없어도` with the `V1-C` song
  form. It is prefilled for each weekly service rather than copied from the
  previous week.

### Preparation Input Parsing

- `본문`, `성경본문`, `설교본문`, `말씀`, and `말씀본문` are dynamic
  preparation aliases. If the service has a `설교 본문` element, they target
  that element; otherwise they target `성경봉독`.
- This keeps fullscreen/clean public worship from failing when it has no
  separate `설교 본문` input because `성경봉독` is the fullscreen scripture
  source.
- `인용 구절` accepts the same scripture-reference normalization as scripture
  search, including abbreviations, `~`, and comma-separated references. If a
  service has no `설교 본문` element, citation slides are inserted in the
  sermon section after `설교 제목`.
- Implicit praise shorthand numbering advances from the highest explicit
  `찬양 N` already parsed, so mixed explicit and shorthand lines do not reuse a
  number.

### Hymn Version Selection

- When a hymn has both 새찬송가 and 통일찬송가 versions, 새찬송가 is the
  default in Praise and service-item selection.
- 통일찬송가 is an explicit exception. It remains selectable and is used by
  default only when it is the sole available hymn-book version.
- Existing linked song versions are preserved; this default applies when a
  version is newly selected or resolved.
- Worship preparation input and service-item auto-linking use the same
  preferred 새찬송가 default, so resolved hymn-score praise does not remain
  missing only because a version was not explicitly picked.

### Score Praise Output

- `특송` praise items with an assignee output a separate `특송 / 담당자`
  title-assignee slide before the normal praise song-title slide. The song-title
  slide remains visible and carries the song name.
- Hymn-score praise items such as `봉헌찬송` and `송영` keep the normal
  `song-title` title slide. Do not create a separate score-only title layout.
- Score-mode praise may resolve a song from the raw title, so rough input like
  `찬송 80` can find hymn score slides even before the item has a persisted
  `song_id`. `특송` is the explicit exception: it must never output hymn score
  images, even if an item still carries `outputMode: "score"`.
- Non-score praise items that require DB selection must not silently resolve
  lyrics by raw title alone. Leave them as `입력 필요` unless they have a
  linked song or explicit manual slide text.
- Only the score image slides use the score fullscreen contract. A score image
  slide must render as the primary `score` slide class before generic image
  handling so fullscreen output does not inherit chromakey or lower-bar image
  fallback behavior.
- Score image slides remain clean fullscreen media with a white score canvas and
  no visible presenter meta. Title slides remain the same praise title contract
  as non-score praise.
- In chromakey services, the automatic blank after a score image returns to the
  chromakey blank context. It must not appear as a black fullscreen blank behind
  or after the score.

### Presenter Song Forms

- Explicit song-form presets may intentionally omit unlisted forms when they
  are grouped (`V1A`, `V1B`), manual/forced/song-default presets, or contain
  deliberate consecutive repeats such as `C-C`.
- User-entered `manual` song forms are exact output instructions. A typed
  sequence such as `V-C-V-C` or `V-C-V-C-Tag` must not auto-preserve unlisted
  `Bridge`, `Pre-Chorus`, or extra chorus forms from the linked song version.
  Template `default` and `forced` presets follow the same exactness rule unless
  they explicitly list the supplemental forms.
- Grouped labels such as `V1A` and `V1B` mean split `Verse 1` by lyric block.
  If there are no blank-line blocks, split evenly by lyric lines when possible.
- `amen`/`아멘` is not a song-form type. Existing form rows have been migrated
  to `Coda`; import, parser, backfill, and presenter paths must not create it.

## Source Of Truth

- Runtime public-worship template rules: `app.js`.
- Worship data ownership and persistence model:
  `docs/worship-data-contract.md`.
- Presenter-specific workflow and verification:
  `docs/thread-worship-presenter.md`.

## Presenter Output Rules
- `참고 화면`은 전역 presenter toolbar가 아니라 `설교` 또는 `광고` 섹션에 추가한다.
  `참고 화면 추가`는 해당 섹션의 마지막에 image element를 만들며, 이름과
  파일/링크를 채우면 기존 media contract로 clean fullscreen output에 송출한다.
  따라서 크로마키 예배에서도 참고 이미지는 green background나 lower bar를
  물려받지 않는다. 영상은 동일한 asset element contract를 확장해 추가한다.
- `주일오후예배`는 기본적으로 헌신예배 순서를 따른다. `특송`은
  악보(score)가 아니라 일반 praise/lyrics 입력이며, `봉헌찬송`만 score
  output을 사용한다. 헌신예배가 아닌 날에는 `특송`/`봉헌` slot을
  skip/hide한다.
- 크로마키 찬양 제목 slide는 본문 가사 크기와 별도로 더 큰 제목 scale을
  사용한다. 설교 제목 lower bar는 왼쪽 `설교` label을 출력하지 않고
  설교 제목을 왼쪽, 담당자를 오른쪽에 둔다.
- 모든 예배 타입의 설교 제목은 presenter와 프리뷰에서 홑낫표
  `｢제목｣`로 감싼다. 입력에 기존 따옴표가 있어도 출력에서는 중첩하지 않는다.

## Service Auto-Schedule Rules
- 어린이부 예배, 청소년부 예배, 청년부 예배는 주일 자동 생성 대상이다.
- 단, 해당 주일의 교회력/일정/예배 태그에 `온세대` 또는 `찬양예배`가
  있으면 어린이부, 청소년부, 청년부 예배를 별도로 생성하지 않는다.
  그날은 3부 예배(`sunday-main`)가 통합 예배의 source of truth다.
