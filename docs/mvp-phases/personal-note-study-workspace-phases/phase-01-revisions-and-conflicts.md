# Phase 1: Revision과 저장 충돌

## 목표

동시 수정과 네트워크 실패로 개인 노트가 조용히 덮어써지지 않게 하고, 사용자가 이전 저장본을 복구할 수 있게 한다.

## 태스크

- [ ] `user_personal_notes.revision`, `archived_at` migration을 작성한다.
- [ ] `user_personal_note_revisions` table, index, RLS를 작성한다.
- [ ] note PATCH에 `If-Match-Revision` 또는 동일 payload field를 추가한다.
- [ ] revision 일치 update와 snapshot insert를 하나의 transaction/RPC로 구현한다.
- [ ] row count 0을 `409 note_revision_conflict`로 변환한다.
- [ ] client에 last known revision, remote snapshot, local draft 상태를 추가한다.
- [ ] 충돌 검토, 최신 버전 사용, 새 노트로 복제 흐름을 구현한다.
- [ ] revision 목록, preview, restore action을 구현한다.
- [ ] archive, restore, 30일 이후 complete delete 정책을 구현한다.
- [ ] revision retention cleanup job을 추가한다.

## 완료 기준

- [ ] 두 클라이언트가 같은 note revision을 저장할 때 한 쪽은 409 충돌을 받는다.
- [ ] 충돌 발생 후 local draft는 사라지지 않는다.
- [ ] 과거 revision 복원은 새 revision을 만든다.
- [ ] archive된 note는 원래 링크를 유지한 채 복원할 수 있다.

## 검증

- [ ] 동시 PATCH, network retry, stale revision API test를 작성한다.
- [ ] account A/B RLS 교차 접근 test를 작성한다.
- [ ] revision body가 log에 남지 않는지 점검한다.
