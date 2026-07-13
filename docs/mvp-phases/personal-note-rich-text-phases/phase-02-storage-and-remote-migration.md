# Phase 2: 저장소와 원격 데이터 전환

## 목표

구조화된 문서를 개인 노트의 원본으로 저장하면서 기존 Markdown-lite 노트, local repository, 원격 Supabase 동기화를 모두 호환시킨다.

## 태스크

- [ ] `PersonalNoteEditorFormat`에 `rich-text-v1`을 추가한다.
- [ ] `PersonalNote`에 optional `bodyDocument`를 추가한다.
- [ ] local user-data normalize/save/load에 문서 fallback을 추가한다.
- [ ] `user_personal_notes.body_document jsonb` migration을 작성한다.
- [ ] `editor_format` check constraint에 두 형식을 허용한다.
- [ ] notes POST/PATCH payload와 response에 `bodyDocument`를 추가한다.
- [ ] 서버에서 JSON size, node count, token enum, verse reference 형식을 검증한다.
- [ ] 서버가 `bodyText`와 legacy `bodyMarkdown` projection을 문서에서 생성하게 한다.
- [ ] remote snapshot 변환에 `bodyDocument`를 추가한다.
- [ ] 기존 Markdown-lite 노트의 lazy importer 경로를 구현한다.
- [ ] 기존 노트를 자동 삭제하거나 일괄 재작성하지 않음을 확인한다.

## 완료 기준

- [ ] rich-text와 Markdown-lite 노트를 같은 목록과 상세 화면에서 읽을 수 있다.
- [ ] 원격 DB에는 validator를 통과한 JSON만 기록된다.
- [ ] `bodyText` 검색용 값은 rich-text 문서와 일치한다.
- [ ] 기존 RLS, 사용자 소유권, note ID 계약은 변경되지 않는다.

## 검증

- [ ] migration up/down 또는 schema snapshot을 확인한다.
- [ ] POST/PATCH의 valid/invalid bodyDocument API test를 작성한다.
- [ ] 구버전 payload에서 rich-text fallback이 깨지지 않음을 test한다.
- [ ] 계정 A/B가 상대방의 노트 JSON을 읽거나 수정할 수 없음을 smoke test한다.
