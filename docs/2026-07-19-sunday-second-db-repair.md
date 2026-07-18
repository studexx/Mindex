# 2026-07-19 Sunday Second Service DB Repair

This is an operational repair record for the live `주일예배 [2부]` service.
Do not overwrite these rows with template-only fallback data.

## Scope

- Date: `2026-07-19`
- Service type: `sun_2nd`
- Service id: `a37e1224-21a8-4338-a1fa-21d91f2a1856`

## Repair

The persisted service only contained the `파송 / 축도` element. The presenter
therefore showed projected template placeholders for the rest of the service,
including missing score-praise slides.

The service was repaired directly in Supabase with the standard Sunday second
service section structure:

- `준비`
- `신앙고백`
- `찬양`
- `참회기도`
- `대표기도`
- `성경봉독`
- `특송`
- `설교`
- `결단`
- `봉헌`
- `광고`
- `파송`
- `폐회`

The following praise records are linked with concrete `song_id` and
`song_version_id` values:

- `찬양 1`: hymn 9, `하늘에 가득 찬 영광의 하나님`
- `찬양 2`: hymn 288, `예수를 나의 구주 삼고`
- `찬양 3`: hymn 182, `강물같이 흐르는 기쁨`
- `특송`: `당신을 향한 노래` with display title `아주 먼 옛날`,
  assignee `유치부 교사 일동`, and manual song form `V-PC-C-PC-C`
- `봉헌찬송`: hymn 187, `비둘기같이 온유한`
- `송영`: hymn 5, `이 천지간 만물들아`

Scripture and sermon fields were filled from the rough input:

- `성경봉독`: `롬 8:12-17`
- `설교 제목`: `한 가지 그것을`
- `설교 본문`: `롬 8:12-17`

## Verification

After the repair, Supabase returned:

- `13` worship sections
- `18` worship elements
- `찬양 1`, `찬양 2`, and `찬양 3` all in `filled` state with linked song
  versions
- `특송` in `filled` state with linked song version and `formPreset`
  `{ forms: ["V", "PC", "C", "PC", "C"], strength: "manual" }`
- `성경봉독` and `설교 본문` both pointing to `롬 8:12-17`

## Related Sunday Afternoon Edit

The same 2026-07-19 operating pass also filled the `주일오후예배` special
song:

- Service id: `22c319c7-2e4a-4ddf-89ff-ca7750847cb9`
- `찬송`: hymn 80, `천지에 있는 이름 중`
- `대표기도`: `이대범 집사`
- `성경봉독`: `계 3:19–22`
- `특송`: hymn 505, `온 세상 위하여`
- Assignee: `4·5남전도회 일동`
- Version: 새찬송가
- `설교 제목`: `모든 것 되신 예수`
- Sermon assignee: `김광한 전도사`
- `설교 인용 구절`: `요 8:19`; `요 14:6–9`; `요 14:26`;
  `롬 8:9하`; `요 5:39`; `히 12:2`; `요 13:34`; `계 3:14`;
  `골 3:11하`; `계 22:13`
- `봉헌찬송`: hymn 95, `나의 기쁨 나의 소망되시며`
- `봉헌기도`: `김강석 집사`
