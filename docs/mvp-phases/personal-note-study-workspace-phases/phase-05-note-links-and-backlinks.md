# Phase 5: 노트 링크와 역링크

## 목표

관련 묵상과 단어 연구를 직접 연결하고, 한 노트를 참조하는 다른 노트를 확인한다.

## 태스크

- [ ] `noteReference` inline node를 rich-text schema와 validator에 추가한다.
- [ ] `[[` trigger parser와 personal note suggestion API를 구현한다.
- [ ] `user_personal_note_links` migration, index, RLS를 추가한다.
- [ ] node insert/delete와 link row upsert/delete를 같은 save flow로 연결한다.
- [ ] note detail에 backlink 목록을 최대 20개 표시한다.
- [ ] archive target에 대한 broken-link 표현을 구현한다.
- [ ] self-link를 차단하고 duplicate link를 방지한다.
- [ ] graph traversal은 1-depth까지만 허용한다.

## 완료 기준

- [ ] `[[노트 제목]]` 선택 결과는 targetNoteId로 유지된다.
- [ ] target note에서 referring note 목록을 볼 수 있다.
- [ ] 다른 사용자의 note를 검색, 링크, 역참조할 수 없다.

## 검증

- [ ] self/duplicate/cross-user link API test를 작성한다.
- [ ] node 삭제, archive, restore가 backlink UI에 반영되는지 확인한다.
- [ ] 긴 제목, 동명 노트, pagination을 확인한다.
