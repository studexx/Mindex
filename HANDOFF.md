# Mindex 인수인계 — Claude 세션 작업 (2026-06-20 추가, review_status 손실 문제)

## 지금 막힌 문제: 찬송가 review_status(검토완료 표시) 복구 불가

### 무슨 일이 있었는지
1. 예전에 사용자가 새찬송가 가사들을 하나씩 검토하면서 `review_status: "reviewed"`로 체크해 나가고 있었음
2. 그런데 (원인 불명의) 사고로 일부 찬송가 가사가 옛 버전으로 덮어써짐 — 사용자가 직접 고친 줄바꿈/맞춤법이 날아감
3. 어제(2026-06-19) 세션에서 Codex가 `/Users/parkjihun/Documents/INDEX/outputs/freeshow-shows/*.show` (2026-05-31 FreeShow export, 119개 찬송가 스냅샷)을 복구 소스로 찾아내서 `scripts/restore_hymn_forms_from_freeshow.py`로 105곡의 가사 폼을 복구함
4. **이 복구 스크립트의 `with_form_ids()` 함수가 새 form 객체를 `{id, part_type, part_number, lyrics, sort_order}`만 채워서 만들기 때문에, 기존 form에 있던 `review_status` 필드(특히 이미 `"reviewed"`였던 것들)가 전부 사라짐** (None이 됨)
5. 오늘(2026-06-20) 세션에서 내(Claude)가 review_status가 없는 98곡을 발견하고, "이건 오늘 복구돼서 검토가 필요한 곡들이겠지"라고 판단해서 전부 `needs_review`로 일괄 설정함
6. **문제**: 105곡 중 일부는 사고 이전에 사용자가 이미 `"reviewed"`로 검토 완료한 곡들이었는데, 4번 단계에서 그 표시가 사라지고 5번 단계에서 내가 `needs_review`로 덮어써서 — 사용자 입장에선 "이미 끝낸 곡들도 다시 미완료로 떴다"는 상황이 됨
7. 사용자가 구체적으로 언급한 범위: **새찬송가 1~18번은 사고 전에 완벽하게 검토 끝난 상태였음**. 이 범위는 오늘 105곡 복구 리스트에도 포함됨 (1~17번, 18번은 복구 대상 아니었음 — 원래부터 안 바뀐 듀 것으로 보임)

### 영향받은 곡 목록 (오늘 forms가 통째로 재생성된 105곡, hymn_no 기준)
```
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 64, 88, 91, 93, 94, 96, 112, 115, 122, 123, 125,
143, 144, 149, 151, 160, 171, 183, 184, 190, 191, 197, 199, 208, 216, 250, 254, 257, 259, 260, 261, 268,
269, 270, 284, 288, 289, 295, 302, 305, 309, 310, 321, 347, 348, 350, 352, 353, 358, 359, 360, 365, 369,
370, 380, 405, 406, 421, 425, 428, 429, 430, 434, 435, 436, 438, 445, 452, 455, 456, 461, 486, 490, 491,
499, 502, 505, 516, 524, 540, 542, 545, 546, 563, 569, 570, 620
(전체 목록: /Users/parkjihun/Documents/INDEX/outputs/hymn-restore-from-freeshow/restore-report-20260619-205622.csv 의 action=restore_forms 행)
```

### 시도했지만 막힌 것
- 이 컴퓨터에서 2026-05-31보다 최신 FreeShow export(.show 파일)를 찾아봤지만 없음 (`find / -iname "*.show"` 전체 검색 결과 동일)
- FreeShow 앱 자체 데이터 폴더도 이 Mac엔 없음 (다른 기기에 설치돼 있을 가능성 — 확인 필요)
- Time Machine 백업 없음 (`tmutil` 권한 막혀 있었음, 그리고 머신 디렉토리 자체가 없다고 나옴)
- Supabase Point-in-Time Recovery(PITR)는 대시보드에서만 확인 가능해서 REST API로는 확인 못 함 — 사용자가 Supabase 대시보드(프로젝트 tdulobbnppmpiqqxbvqy) → Settings → Database → Backups에서 PITR 활성화 여부와 사고 이전 시점 복구 가능한지 직접 확인해야 함

### 다음에 할 일 (우선순위)
1. **Supabase PITR 확인이 최우선**: 만약 PITR이 활성화돼 있다면, 사고 발생 직전 시점으로 `mindex_songs` 테이블만 따로 조회해서 review_status가 살아있던 시점의 정확한 상태를 가져올 수 있음. 이게 되면 이 문제 전체가 해결됨
2. PITR이 안 되면: 사용자에게 "1~18번은 검토 끝났던 걸로 알고 있다"는 진술을 기반으로, 그 범위만이라도 `reviewed`로 재설정할지 결정 필요 (내용은 5/31 FreeShow 기준으로 이미 약간 바뀌었을 수 있어서, 사용자가 한 번 훑어보고 확정하는 걸 권장했었음 — 아직 확정 안 됨)
3. 다른 기기에 FreeShow 앱이 설치되어 있는지 확인 (있다면 거기 살아있는 프로젝트가 더 최신 정보를 가지고 있을 수 있음)
4. 향후 재발 방지: `restore_hymn_forms_from_freeshow.py`의 `with_form_ids()`가 새 form을 만들 때 기존 form의 `review_status`를 보존하도록 고쳐야 함 (지금은 새 dict를 만들면서 그 필드를 안 옮김) — 이 부분은 아직 코드 수정 안 됨

---

# Mindex 인수인계 — Claude 세션 작업 (2026-06-19 추가)

## 이번 세션에서 완료한 작업

### 1. 찬송가 needs_review 느낌표 버그 수정
- 원인: `formNeedsReview()`(app.js)가 `"needs_review"`(언더스코어)만 체크했는데, 찬송가 가사 임포트 스크립트가 `"needs-review"`(하이픈)로 저장해서 다수 곡에 검수 느낌표 누락
- 조치: DB 644곡 폼(2261개)의 `review_status`를 하이픈 → 언더스코어로 일괄 PATCH, app.js는 언더스코어 단일 체크로 정리
- 검증: hymn_no 1~645 전부 존재, 가사 없는 곡 0개, 하이픈 잔여 0개
- 커밋: `f2fdc8c`, `3453b5f`

### 2. 필터 로직 리팩터
- `songPraiseTypes` / `getPraiseFilterListVersion` / `songHasPraiseType`을 `computeSongTypes(song)` + `resolveSongForFilter(song, filterKey)`로 통합
- 커밋: `8c18da6` (이전 세션이 남긴 brandHome 버튼/PWA 아이콘 제거 변경도 함께 커밋됨)

### 3. preview_start 포트 충돌 — Mindex 코드 문제 아님
- `preview_start`가 launch.json `port` 설정과 무관하게 내부 프록시 포트로 **4173을 고정 사용**하는 것으로 추정됨
- 이 머신의 다른 프로젝트(QTS)가 4173을 점유 중이면, Mindex `launch.json` 포트를 4175로 바꾸고 `autoPort: false`를 설정해도 "Port 4173 is in use" 에러 발생
- 회피법: 여러 프로젝트 preview를 동시에 띄우지 말 것. 작업 끝나면 `preview_stop`으로 정리. 충돌 시 `lsof -i :4173`으로 점유 프로세스 확인 후 무관한 프로젝트면 사용자에게 종료 허락받고 kill
- `serve.py`/`launch.json` 자체는 현재 포트 4175로 정상 설정되어 있어 추가 조치 불필요

---

# Mindex 인수인계 — Service 모듈 이후 작업

## 현재 상태 요약

### 프로젝트 구조
- `/Users/parkjihun/Documents/Mindex/` — 정적 HTML/JS 앱 (단일 파일 구조)
- 핵심 파일: `index.html`, `app.js`, `styles.css`
- Supabase 백엔드 (프로젝트: tdulobbnppmpiqqxbvqy)
- 로컬 서버: `python3 serve.py` (no-cache 헤더 포함)

### 모듈 3개
1. **Praise** — 찬양 곡 목록/버전/폼/출력
2. **Scripture** — 성경 권/장/절 열람과 본문 검색
3. **Service** — 예배 콘티/순서 열람, 앞으로 예배 준비/기록으로 확장 예정

---

## Service 모듈 현황

### DB 테이블
- `mindex_service_types` — 예배 종류 (주일예배, 수요예배, 어린이부 등 10개)
- `mindex_services` — 개별 예배. 실제 콘티 데이터의 원본은 Supabase.
- `mindex_service_items` — 예배별 곡 순서. 실제 콘티 데이터의 원본은 Supabase.

### 데이터 특성
- `leader`: 찬양 인도자. `이름 칭호` 형식으로 저장/표시한다. 무호칭은 기본 `청년`, 어린이부/청소년부 무호칭은 `선생님`.
- `tags`: 비고 (["온세대 찬양예배"], ["어린이주일예배"] 등)
- `raw_title`: 원문 그대로 보존 ("502 빛의 사자들이여", "나는 예배자입니다 + 소원")
- `label`: 역할 태그 ("2부 특송", "결단", "기도 1", "파송", null=본찬양)
- `fixed_items`: 수정 불가가 아니라 예배 종류별 기본 컴포넌트. 같은 type의 모든 예배에 자동 적용하며, UI에서는 `Every Service`로 편집한다. 저장은 `mindex_service_types.fixed_items` JSON.

### UI 구조
- 사이드바: 예배 종류 목록 (전체/공예배/부서예배 필터)
- 메인: 날짜 카드 그리드 → 클릭 시 콘티 상세
- 검색: 콘티 곡명, 날짜(MM/DD), 태그, 찬양 인도자명으로 필터링
- 키보드: ↑↓ 예배 종류 이동, ←→ 날짜 이동

### 데이터 임포트 스크립트
- `scripts/parse_setlists.py` — 텍스트 파싱/검토용 JSON 출력. SQL seed를 만들지 않는다.
- `scripts/import_services.py` — Supabase 임포트
  - 실행: `SUPABASE_URL=... SUPABASE_KEY=<service_role_key> python3 scripts/import_services.py <텍스트파일>`
- 콘티/가사/성경본문 같은 내용 데이터는 repo에 seed로 보관하지 않는다. 필요한 내용 변경은 Supabase에 반영하고, repo에는 스키마와 도구만 남긴다.

---

## 2026-06-05 현재 추가 메모

### 최근 UI 조정
- 송리스트의 느낌표/검수 아이콘은 제목 흐름에 붙이지 말고 오른쪽 끝 정렬로 유지.
- 부제/원제/메타 보조 텍스트는 굵게 두지 말고, 11-12px 정도로 읽히게 처리.
- 송폼 선택부는 선택/비선택 상태에서 텍스트 위치와 굵기가 과하게 튀지 않게 보수적으로 유지.
- `index.html` 캐시 키는 현재 `mindex-service-37`.

### 이번에 받은 Service PPT 예시
- 주일예배 1-4부: `Sun_2026-05-31_1st.pptx` 등
- 수요예배: `Wed_2026-06-03.pptx`
- 금요기도회: `Fri_2026-05-29.pptx`
- 월삭예배: `Moon_2026-05-01.pptx`
- 어린이부/청소년부/청년부: `Elem_2026-05-31.pptx`, `TOV_2026-05-31.pptx`, `RIA_2026-05-31.pptx`
- 이 PPT들은 즉시 DB에 밀어 넣기보다, Service의 예배 컴포넌트 체계 설계용 샘플로 먼저 본다.
- 관찰된 컴포넌트 후보: 시작 안내, 사도신경, 찬양/찬송, 대표기도, 성경봉독, 설교/본문, 특송, 결단/파송 등.

## 미완성 / 다음 할 일

### Service 모듈 확장 (우선순위 순)
1. **곡 매칭**: `mindex_service_items.song_id`를 `mindex_songs.id`와 연결
   - raw_title에서 자동 매칭 후 수동 확인 UI
   - 매칭되면 곡 클릭 시 Praise 모듈로 이동 가능하게
2. **2026 하반기 데이터 추가**: 6월 이후 데이터가 비어 있음
3. **예배 준비 편집**: 금주 예배 리스트에서 components를 채워 넣고 저장/기록하는 플로우를 확장
4. **PPT/FreeShow 출력**: 예배 순서 전체를 FreeShow XML 또는 show 파일로 내보내기
5. **PPT 샘플 파싱**: 위 예시 PPT에서 예배 순서/고정 요소/가변 요소를 추출하되, 레이아웃은 따라 하지 말고 데이터 구조만 참고

### 전반적 미완성
- **Praise Types 편집 UI**: Details에서 제거됐으나 hymn/ccm 분류 변경 방법이 없음
  - 제안: 사이드바 song-item에 토글 버튼 또는 Details에 compact 체크박스
- **찬송가 번호 DB 정리**: `title`에 `285 제목` 형태로 hymn_no가 중복 포함된 곡들이 남아 있음
  - SQL: `scripts/migrations/cleanup-title-hymn-numbers.sql` 참고

---

## 주요 원칙 (이 사용자와의 작업 규칙)

1. **데이터 오류는 DB에서 수정** — JS 코드 보정 금지, SQL로 직접 수정
2. **나이브하지 말고 보수적으로** — 확신 없으면 먼저 SELECT 확인 후 UPDATE
3. **Studex 디자인 기준** — Mindex는 Studex 디자인 언어(5px radius, 13-14px font, 미니멀 border) 따름
4. **콘텐츠 seed 금지** — 콘티/가사/성경본문 같은 내용 데이터는 Supabase가 원본. repo에는 스키마와 임포트/검수 도구만 둔다.
5. **버전 스트링 관리** — `index.html`의 `?v=mindex-*` 값을 코드 변경 시 올려야 캐시 갱신됨

---

## Supabase 연결

- URL: `https://tdulobbnppmpiqqxbvqy.supabase.co`
- 앱은 `#supabaseUrl=...&supabaseAnonKey=...` 해시 파라미터 또는 localStorage에서 자격증명 읽음
- 키는 문서에 직접 적지 말 것. 서버 작업은 로컬의 안전한 env 파일이나 사용자가 별도로 제공한 값으로 처리.

---

## 현재 버전 스트링
`mindex-service-37` (index.html 내 CSS/JS 쿼리 파라미터)
