# 개인 노트 인라인 구절 태그 자동완성 페이즈별 태스크

기준 아키텍처: [personal-note-verse-tag-autocomplete-architecture.md](./personal-note-verse-tag-autocomplete-architecture.md)

## Phase 1: 입력 계약과 공유 파서

- [ ] `VerseReferenceSuggestion` 타입을 `packages/shared`에 정의한다.
- [ ] `verse-reference-autocomplete.ts`에 caret 기준 trigger 범위 탐색을 구현한다.
- [ ] `#권`, `#권 장`, `#권 장:절`의 부분 입력 파서를 구현한다.
- [ ] 제목 shortcut과 URL fragment 제외 규칙을 구현한다.
- [ ] 한글/영문 권 전체명과 표준 약어 prefix matcher를 구현한다.
- [ ] 모호한 접두어가 모든 일치 권을 반환하도록 구현한다.
- [ ] 사용자 표시용 짧은 참조 표기 formatter를 구현한다.

완료 기준:

- [ ] `#창 1:10`은 `GEN.1.10`으로 해석할 수 있다.
- [ ] `# 제목`은 구절 태그로 해석하지 않는다.
- [ ] 웹과 Expo가 같은 파서 결과를 사용한다.

## Phase 2: 원격 후보 API

- [ ] `GET /api/bible/reference-suggestions` route를 추가한다.
- [ ] query, limit, 장절 범위를 서버에서 검증한다.
- [ ] 권 미확정 입력에는 메타데이터 기반 권 후보를 반환한다.
- [ ] 권과 장이 확정된 입력에는 최대 8개 절 후보와 snippet을 반환한다.
- [ ] 한국어 번역이 없을 때 영어 KJV snippet fallback을 적용한다.
- [ ] 요청 실패와 빈 결과를 구분하는 응답 계약을 정의한다.
- [ ] 개인 사용자 데이터가 endpoint 응답에 포함되지 않음을 확인한다.

완료 기준:

- [ ] `#창`은 창세기 후보를 반환한다.
- [ ] `#창 1:10`은 창세기 1:10을 반환한다.
- [ ] 잘못된 장절과 과도한 limit은 서버에서 거부 또는 정규화된다.

## Phase 3: 웹 편집기 자동완성

- [ ] `PersonalNoteRichTextEditor`의 입력과 selection 정보를 연결한다.
- [ ] 120ms debounce와 이전 request 취소를 구현한다.
- [ ] `VerseReferenceAutocomplete` popover를 구현한다.
- [ ] 후보 목록의 click, ArrowUp, ArrowDown, Enter, Tab, Escape 동작을 구현한다.
- [ ] suggestion 선택 시 입력 범위를 `#창 1:10`으로 교체한다.
- [ ] 선택 뒤 editor focus와 caret 위치를 복원한다.
- [ ] IME composition 중 검색을 멈추고 composition end 후 갱신한다.
- [ ] listbox ARIA 계약과 빈 결과 상태를 구현한다.

완료 기준:

- [ ] 사용자는 마우스와 키보드 모두로 후보를 선택할 수 있다.
- [ ] 제목 shortcut과 일반 rich-text 편집이 깨지지 않는다.
- [ ] 후보 UI가 editor 또는 화면 경계를 가리지 않는다.

## Phase 4: 연결 구절 영속화

- [ ] `PersonalNoteVerseLink.source` 타입을 추가한다.
- [ ] `source` migration을 추가하고 기존 링크를 `reader`로 보존한다.
- [ ] notes POST/PATCH payload와 API 변환에 `source`를 추가한다.
- [ ] remote snapshot과 local repository 변환에 `source` fallback을 추가한다.
- [ ] inline suggestion 선택 시 `inline-tag` 링크를 추가한다.
- [ ] 같은 노트와 `verseKey`의 중복 링크를 차단한다.
- [ ] 연결 구절 칩에 명시적 제거 동작을 추가한다.

완료 기준:

- [ ] 본문 태그 선택 결과는 새로고침 후에도 리더로 이동한다.
- [ ] 본문 태그 문자열을 지워도 사용자의 명시적 링크 제거 전에는 링크가 남는다.
- [ ] 이전 앱 버전이 보낸 source 없는 요청도 저장된다.

## Phase 5: 모바일 동등성 및 노트 UX 보완

- [ ] Expo용 `VerseReferenceAutocompleteSheet`를 구현한다.
- [ ] 키보드가 열린 상태에서 후보 sheet 높이와 스크롤을 검증한다.
- [ ] `window.prompt` 구절 태그를 다중 선택 가능한 `VerseTagSheet`로 교체한다.
- [ ] 기존 태그 검색, 새 태그 생성, 제거를 하나의 sheet에서 제공한다.
- [ ] 연결 구절 칩에 출처와 제거 제어를 제공한다.
- [ ] `구절 삽입`에서 대상 연결 구절을 선택할 수 있게 한다.
- [ ] 원격 저장 실패 시 재시도와 로컬 draft 보존을 구현한다.

완료 기준:

- [ ] 웹과 모바일에서 동일한 `#창 1:10` 선택 결과가 저장된다.
- [ ] 모바일 편집 중 화면 겹침이나 포커스 손실이 없다.
- [ ] 구절 태그는 prompt 없이 여러 개를 관리할 수 있다.

## Phase 6: 검증과 출시 게이트

- [ ] 공유 파서와 formatter unit test를 추가한다.
- [ ] 자동완성 선택 및 중복 링크 방지 component test를 추가한다.
- [ ] API 입력 검증과 source fallback test를 추가한다.
- [ ] 한글 IME, 키보드 탐색, 스크린리더 수동 점검을 한다.
- [ ] 원격 Supabase account A/B 격리 smoke를 수행한다.
- [ ] `npm run lint`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] 데스크톱과 모바일에서 `#창`, `#창 1`, `#창 1:10`, `#사`를 확인한다.

최종 수용 기준:

- [ ] 사용자가 권의 앞글자 또는 표준 약어만으로 구절 후보를 찾을 수 있다.
- [ ] 후보는 `창 1:10` 형식의 짧은 표기와 본문 일부를 보여 준다.
- [ ] 선택된 구절은 읽기 쉬운 본문 태그와 안정적인 `verseKey` 링크를 함께 가진다.
- [ ] 제목 shortcut, IME 입력, 모바일 편집, 기존 개인 노트 저장이 회귀하지 않는다.
