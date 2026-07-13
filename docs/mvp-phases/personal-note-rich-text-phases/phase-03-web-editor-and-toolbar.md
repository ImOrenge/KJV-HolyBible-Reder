# Phase 3: 웹 편집기와 툴바

## 목표

웹 개인 노트 화면에 Tiptap/ProseMirror 기반 편집기와 주요 서식 툴바를 제공한다.

## 태스크

- [ ] `PersonalNoteRichTextEditor`와 read-only renderer를 추가한다.
- [ ] 공통 JSON schema를 editor extension으로 매핑한다.
- [ ] 실행 취소, 다시 실행, 서식 지우기 icon control을 추가한다.
- [ ] 굵게, 기울임, 밑줄 버튼을 추가한다.
- [ ] 글자 크기 menu를 추가한다.
- [ ] 글자색 swatch menu를 추가한다.
- [ ] 형광색 swatch menu를 추가한다.
- [ ] 시작, 가운데, 끝, 양쪽 정렬 control을 추가한다.
- [ ] 제목, 인용, 목록, 체크리스트를 구조적 block command로 구현한다.
- [ ] 현재 selection의 active/mixed/disabled 상태를 구현한다.
- [ ] 각 icon control에 tooltip, aria-label, 고정 hit area를 적용한다.
- [ ] 붙여넣기 sanitizer와 안전한 read-only renderer를 구현한다.
- [ ] 저장 대기, 저장 중, 실패, 재시도 상태를 노출한다.

## 완료 기준

- [ ] 굵게, 기울임, 밑줄, 크기, 색상, 형광, 정렬이 선택 텍스트와 이후 입력에 적용된다.
- [ ] 색상과 형광은 서로 독립적으로 동작한다.
- [ ] 미리보기와 편집기의 렌더링 결과가 동일하다.
- [ ] 키보드와 포인터만으로 모든 toolbar command에 접근할 수 있다.

## 검증

- [ ] toolbar command와 mixed selection component test를 작성한다.
- [ ] paste sanitize와 raw HTML 차단 test를 작성한다.
- [ ] 라이트/다크 모드에서 색상과 형광 대비를 점검한다.
- [ ] 데스크톱과 좁은 웹 viewport에서 toolbar overflow를 확인한다.
