# Phase 4: 인라인 구절 태그

## 목표

노트 본문에서 `#창 1:10`을 입력·선택하면 읽기 쉬운 verse node와 안정적인 `verseKey` 링크를 함께 저장한다.

## 태스크

- [ ] 자동완성 파서를 editor selection API에 연결한다.
- [ ] 권 약어와 장절 후보 endpoint를 rich-text editor에서 호출한다.
- [ ] suggestion 선택 시 typed range를 `verseReference` inline node로 교체한다.
- [ ] node 삽입 시 `PersonalNoteVerseLink.source = 'inline-tag'`를 upsert한다.
- [ ] node 삭제 시 해당 inline-tag link를 같은 transaction에서 제거한다.
- [ ] 리더/사전에서 추가된 `reader`, `dictionary` link는 보존한다.
- [ ] 연결 구절 칩에서 node 출처와 제거 동작을 제공한다.
- [ ] 제목 shortcut, URL fragment, 일반 hashtag 제외 규칙을 적용한다.
- [ ] 한글 IME composition 중에는 후보 요청을 멈춘다.

## 완료 기준

- [ ] 본문 `#창 1:10`, inline node 속성, `PersonalNoteVerseLink.verseKey`가 같은 구절을 가리킨다.
- [ ] node를 클릭하면 해당 절의 리더 화면으로 이동할 수 있다.
- [ ] node만 삭제했을 때 reader/dictionary 출처 링크는 남아 있다.
- [ ] 모호한 권 접두어는 임의 선택 없이 후보 목록을 보여 준다.

## 검증

- [ ] `#창`, `#창 1`, `#창 1:10`, `#사`, `#Gen 1:10`을 검증한다.
- [ ] 제목 shortcut, URL fragment, 일반 hashtag가 node로 변환되지 않음을 test한다.
- [ ] node 삽입/삭제와 link 동기화 test를 작성한다.
- [ ] 키보드 후보 탐색과 Escape/Enter/Tab 동작을 확인한다.
