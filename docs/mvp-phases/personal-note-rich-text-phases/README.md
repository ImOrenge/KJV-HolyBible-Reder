# 개인 노트 Rich Text 구현 페이즈

이 폴더는 [개인 노트 Rich Text 편집기 아키텍처](../personal-note-rich-text-editor-architecture.md)를 실제 구현 순서로 나눈 실행 문서다. 기존 개인 노트와 원격 Supabase 동기화를 유지하면서, JSON 기반 서식 문서와 구절 태그를 추가한다.

## 페이즈 목록

| Phase | 파일 | 핵심 목표 | 완료 게이트 |
| --- | --- | --- | --- |
| 1 | [phase-01-shared-document-contract.md](./phase-01-shared-document-contract.md) | 공통 JSON 문서, token, validator, importer | 필수 |
| 2 | [phase-02-storage-and-remote-migration.md](./phase-02-storage-and-remote-migration.md) | 타입, API, Supabase migration, 기존 노트 호환 | 필수 |
| 3 | [phase-03-web-editor-and-toolbar.md](./phase-03-web-editor-and-toolbar.md) | 웹 rich-text editor와 서식 툴바 | 필수 |
| 4 | [phase-04-inline-verse-reference.md](./phase-04-inline-verse-reference.md) | `#창 1:10` 자동완성과 verse node/링크 동기화 | 필수 |
| 5 | [phase-05-expo-editor-parity.md](./phase-05-expo-editor-parity.md) | Expo editor, native toolbar, IME/키보드 검증 | 필수 |
| 6 | [phase-06-quality-and-release-gates.md](./phase-06-quality-and-release-gates.md) | 보안, 접근성, 동기화, 출시 검증 | 필수 |

## 실행 순서

1. Phase 1에서 저장 가능한 문서 계약을 고정한다.
2. Phase 2에서 remote DB와 API가 그 계약을 안전하게 전달하도록 만든다.
3. Phase 3에서 웹 편집기와 툴바를 구현한다.
4. Phase 4에서 구절 자동완성을 inline node로 연결한다.
5. Phase 5에서 모바일 입력과 편집 동등성을 확보한다.
6. Phase 6에서 보안, 성능, 접근성, 계정 격리를 검증한다.

## 공통 원칙

- 본문 원본은 HTML이 아닌 `PersonalNoteDocument` JSON이다.
- 색상, 크기, 정렬은 허용된 token만 저장한다.
- `verseKey`는 구절 태그와 연결 구절의 영속 키다.
- Markdown-lite 노트는 삭제하지 않고 lazy migration으로 보존한다.
- 각 Phase는 이전 Phase의 완료 기준을 충족한 뒤 시작한다.
