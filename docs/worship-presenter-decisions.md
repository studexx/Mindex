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
- `인용 구절` is optional, separate from the sermon body, and may be entered
  before or during worship. An empty citation creates neither a missing warning
  nor an empty slide.
- A scripture-reading final slide keeps the scripture-reading background and is
  followed by one plain trailing blank that suppresses the service background.
  In chromakey output this is the chromakey blank; in fullscreen/clean output it
  is the default blank frame.
- Scripture-reading body text uses the installed `Eulyoo1945` / `을유1945`
  font when available on the church PC, with `font-weight: 800` for stronger
  projection readability. Only the verse body text changes; the reference,
  translation label, verse number, and `Fin.` keep the presenter font. Do not
  bundle the Eulyoo font file in this repo.

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

### Sunday Public Worship Templates

- Sunday first and second service doxology is fixed to hymn 5,
  `이 천지간 만물들아`.
- Sunday afternoon doxology is fixed to hymn 1, `만복의 근원 하나님`.
- A fixed doxology is output content, not an input. It must not appear in the
  input rail, block saving, or produce an `입력 필요` warning.
- Sunday afternoon worship starts with four main-praise slots:
  `찬양 1` through `찬양 4`.
- These are template rules, not copied weekly content. A service instance may
  override them only through a deliberate template-modified edit.


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
  slide remains visible, carries the song name, and uses the ordinary centered
  praise title layout rather than the section-heading title layout.
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
- Score image slides remain clean fullscreen media with a black score canvas and
  no visible presenter meta. Title slides remain the same praise title contract
  as non-score praise.
- In chromakey services, the automatic blank after a score image returns to the
  chromakey blank context. It must not appear as a black fullscreen blank behind
  or after the score.

### Presenter Song Forms

- Explicit song-form presets may intentionally omit unlisted forms when they
  are grouped (`V1A`, `V1B`), manual/forced/song-default presets, or contain
  deliberate consecutive repeats such as `C-C`.
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
- `주일오후 헌신예배`는 일반 오후예배 순서에 `특송`과 `봉헌`을 추가한다. `특송`은 악보(score)가 아니라 일반 praise/lyrics 입력이며, 추가되는 `봉헌찬송`만 score output을 사용한다.
