# Hymn Reference Audit - 2026-08-19

## Scope

- Reference: 하나성경 hymn pages
- 새찬송가: 1-645
- 통일찬송가: 1-558
- MINDEX tables: `mindex_songs`, `mindex_song_versions`, `mindex_version_units`
- Read-only: no Supabase rows were inserted, updated, or deleted
- Reference lyrics were compared in memory and were not persisted in the report

## Verification

- Supabase schema check: no issues or warnings
- Reference pages checked: 1,203
- Reference fetch failures: 0
- Audit findings: 621

| Book | Finding | Count |
| --- | --- | ---: |
| 새찬송가 | Title review candidate | 1 |
| 새찬송가 | Chorus structure review candidate | 22 |
| 새찬송가 | Amen structure review candidate | 1 |
| 새찬송가 | Low lyric similarity candidate | 23 |
| 통일찬송가 | Numbered version not found | 79 |
| 통일찬송가 | Version found but lyrics empty | 452 |
| 통일찬송가 | Duplicate numbered version candidate | 4 |
| 통일찬송가 | Title review candidate | 36 |
| 통일찬송가 | Chorus structure review candidate | 1 |
| 통일찬송가 | Amen structure review candidate | 1 |
| 통일찬송가 | Low lyric similarity candidate | 1 |

새찬송가 645곡은 모두 MINDEX song/version/lyrics records가 존재했다. 통일찬송가의
`not found` 결과는 통일 장 번호를 version metadata에서 찾지 못했다는 뜻이며, 곧바로
곡 자체가 DB에 없다는 뜻은 아니다.

## Review Rule

Do not auto-apply findings. 하나성경 새찬송가 19장 제목은 `찬양하는 소리 있어`로
표시되지만 MINDEX의 `찬송하는 소리 있어`가 맞을 가능성이 높다. 제목, 맞춤법,
줄바꿈, 새찬송가-통일찬송가 연결은 다른 대조 자료와 교차 확인한 뒤 확실한 항목만
수정한다.

## Confirmed Title Repairs

Seven clear typographical errors were cross-checked and repaired in
`mindex_song_versions.curated_version_name` and `version_label` only:

| 통일찬송가 | Before | After |
| ---: | --- | --- |
| 307 | 공중 나는 새르 보라 | 공중 나는 새를 보라 |
| 326 | 죄집에 눌린 사람은 | 죄짐에 눌린 사람은 |
| 346 | 값비산 향율을 주께 드린 | 값비싼 향유를 주께 드린 |
| 438 | 예부터 도움 도시고 | 예부터 도움 되시고 |
| 455 | 주 안에 이는 나에게 | 주 안에 있는 나에게 |
| 474 | 이 세상에 금심된 일이 많고 | 이 세상에 근심된 일이 많고 |
| 486 | 주 에수여 은혜를 | 주 예수여 은혜를 |

The repair used exact old-value guards and required one matching version per
hymn number. Post-repair schema checks had no issues or warnings. A targeted
reference audit found no remaining title mismatch for the seven versions, and
the deployed GitHub Pages praise list showed every corrected title with none of
the old spellings present.

## Confirmed Duplicate Mapping Repairs

Four duplicate 통일찬송가 mappings were cross-checked and repaired:

| 통일찬송가 | Final 새찬송가 | Removed or moved from |
| ---: | ---: | --- |
| 132 호산나 호산나 | 141 | Removed empty version from 143 웬말인가 날 위하여 |
| 548 주 기도문 영창 | 636 | Removed alias from 635 and moved the official version from 635 to 636 |
| 549 우리 기도를 | 631 | Removed empty version from 632 주여 주여 우리를 |
| 550 주 너를 지키시고 | 638 | Removed empty version from 639 주 함께하소서 |

All four deleted versions had zero `mindex_version_units`. The operation reduced
`mindex_song_versions` from 1,640 to 1,636 while `mindex_version_units` remained
at 4,186. Post-repair schema checks had no issues or warnings, the targeted audit
reported no duplicate mappings, and the deployed praise list showed two versions
only on 새찬송가 141, 631, 636, and 638.

## New York Bethel Cross-check

The [New York Bethel Church index](https://nybethel.org/240) covers all 645 new hymns, but its text table has
several shifted or mistyped old-hymnal numbers. Candidate mismatches were therefore
checked against the linked score image, the local corrected lyric filename, and the
`(통 nnn)` header rendered in the Mindex score asset.

Three existing versions were confirmed as attached to the adjacent same-title hymn
and moved without changing their IDs or lyric units:

| 통일찬송가 | Before | After |
| ---: | ---: | ---: |
| 2 | 새찬송가 4 | 새찬송가 3 |
| 36 | 새찬송가 37 | 새찬송가 36 |
| 114 | 새찬송가 108 | 새찬송가 114 |

새찬송가 143↔통일찬송가 141 and 새찬송가 343↔통일찬송가 443 are supported by
the same metadata sources but have no existing 통일찬송가 version in Mindex. They
remain unresolved because creating those versions would require importing and
curating old-hymnal lyrics, not merely repairing an existing relationship.

## Commands

```sh
python3 tests/check_supabase_schema.py
python3 -m unittest tests.test_audit_hbible_hymns
python3 scripts/audit_hbible_hymns.py --book both \
  --workers 4 --delay 0.05 \
  --output /tmp/mindex-hymn-audit-full.json
```
