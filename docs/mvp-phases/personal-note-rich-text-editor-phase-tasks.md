# 개인 노트 Rich Text 편집기 구현 페이즈 색인

기준 아키텍처: [personal-note-rich-text-editor-architecture.md](./personal-note-rich-text-editor-architecture.md)

각 구현 페이즈는 별도 파일로 관리한다. 전체 순서와 공통 원칙은 [personal-note-rich-text-phases/README.md](./personal-note-rich-text-phases/README.md)를 기준으로 한다.

| Phase | 파일 | 핵심 목표 |
| --- | --- | --- |
| 1 | [공통 문서 계약](./personal-note-rich-text-phases/phase-01-shared-document-contract.md) | JSON 문서, token, validator, importer |
| 2 | [저장소와 원격 데이터 전환](./personal-note-rich-text-phases/phase-02-storage-and-remote-migration.md) | 타입, API, migration, 호환 |
| 3 | [웹 편집기와 툴바](./personal-note-rich-text-phases/phase-03-web-editor-and-toolbar.md) | 서식 도구와 웹 editor |
| 4 | [인라인 구절 태그](./personal-note-rich-text-phases/phase-04-inline-verse-reference.md) | 자동완성과 verse node |
| 5 | [Expo 편집기 동등성](./personal-note-rich-text-phases/phase-05-expo-editor-parity.md) | 모바일 입력과 툴바 |
| 6 | [품질과 출시 게이트](./personal-note-rich-text-phases/phase-06-quality-and-release-gates.md) | 보안, 접근성, 동기화, 출시 |
