# UI/UX 개편 P4 웹 노트 진행 기록

## 범위

- 웹 V2 Shell 기본 활성화와 명시적 legacy rollback
- 새 노트 생성 단계의 템플릿 선택
- 데스크톱 노트 list/editor/inspector 3영역
- 1024px 2열 재배치와 900px 이하 list/editor 분리
- linked verse, revision, backlink, template 저장의 inspector 이동

## 구현 결과

- `NEXT_PUBLIC_UI_SHELL_V2`, `NEXT_PUBLIC_READER_V2`, `NEXT_PUBLIC_NOTES_V2`는 값이 없을 때 기본 활성화된다.
- 각 환경 변수에 `false`를 명시하면 기존 resolver 계약에 따라 개별 rollback된다.
- 빈 노트, 기본 공부 템플릿, 사용자 템플릿은 editor 진입 전에 선택한다.
- editor 상시 toolbar에서는 템플릿 버튼을 제거해 작성 도중 본문 전체를 실수로 교체할 위험을 줄였다.
- revision, backlink, linked verse는 우측 inspector로 이동했고 inspector는 명시적으로 접을 수 있다.
- 900px 이하에서는 노트 목록과 편집기를 동시에 렌더링하지 않고 `노트 목록` 버튼으로 복귀한다.

## 검증 증거

- typecheck, lint, Next.js production build 통과
- `study-ui:validate`, `note-draft:validate`, `note-privacy:validate` 통과
- 브라우저 상호작용: 새 노트 dialog, 기본 템플릿 생성, inspector open/close, 모바일 목록/편집 왕복 통과
- 생성 dialog Escape 닫기와 `새 노트` trigger focus 복원 통과
- 1440px: 232px sidebar와 3영역, horizontal overflow 없음
- 1024px: list/editor 2열과 editor 아래 inspector, horizontal overflow 없음
- 390px: list/editor 분리, toolbar와 inspector 배치, horizontal overflow 없음
- Reader/Notes 브라우저 회귀: `9367`, `passed: true`
- 브라우저 console error/warning 없음

## 남은 항목

- 웹 노트 workspace를 `KjvMvpApp`에서 독립 feature component로 추출
- Reader에서 노트 편집 후 원래 verse anchor 복귀 자동 검증
- 인증 계정의 실제 저장, 두 기기 revision conflict, screen reader 수동 검증
