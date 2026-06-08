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
