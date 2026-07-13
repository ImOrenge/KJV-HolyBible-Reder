# 개인 성경공부 워크스페이스 구현 페이즈

이 폴더는 [개인 성경공부 워크스페이스 확장 아키텍처](../personal-note-study-workspace-architecture.md)를 개별 구현 단계로 나눈 문서다. rich-text editor와 구절 태그 Phase 1~6이 완료되거나 필요한 기반이 준비된 뒤 진행한다.

| Phase | 파일 | 핵심 목표 | 완료 게이트 |
| --- | --- | --- | --- |
| 1 | [phase-01-revisions-and-conflicts.md](./phase-01-revisions-and-conflicts.md) | optimistic concurrency, revision, archive 복구 | 필수 |
| 2 | [phase-02-reader-verse-backlinks.md](./phase-02-reader-verse-backlinks.md) | 리더 구절 역참조 | 필수 |
| 3 | [phase-03-note-search.md](./phase-03-note-search.md) | 원격 검색, 필터, highlight | 필수 |
| 4 | [phase-04-study-templates.md](./phase-04-study-templates.md) | 기본/사용자 템플릿 | 권장 |
| 5 | [phase-05-note-links-and-backlinks.md](./phase-05-note-links-and-backlinks.md) | 노트 링크와 역링크 | 권장 |
| 6 | [phase-06-export-and-backup.md](./phase-06-export-and-backup.md) | JSON, Markdown ZIP, PDF export | 필수 |
| 7 | [phase-07-focus-mode-and-release-gates.md](./phase-07-focus-mode-and-release-gates.md) | 집중 모드, 접근성, 출시 검증 | 필수 |

## 공통 선행 조건

- `PersonalNoteDocument` rich-text schema와 `verseReference` node가 검증되어야 한다.
- note CRUD가 remote Supabase RLS를 사용해야 한다.
- `verseKey`는 연결 구절과 리더 이동의 단일 키로 유지해야 한다.
- Phase 1의 revision contract가 완료되기 전에는 자동 저장 빈도를 높이지 않는다.
