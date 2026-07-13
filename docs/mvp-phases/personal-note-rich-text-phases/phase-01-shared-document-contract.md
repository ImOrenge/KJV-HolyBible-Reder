# Phase 1: 공통 문서 계약

## 목표

웹과 Expo가 같은 rich-text 노트를 읽고 쓸 수 있는 `PersonalNoteDocument` JSON 계약을 만든다. 이 단계에서는 UI나 DB를 변경하지 않는다.

## 태스크

- [ ] `packages/shared/src/personal-note-document.ts`를 추가한다.
- [ ] `PersonalNoteDocument`, block, list item, task item, inline, mark 타입을 정의한다.
- [ ] `fontSize`, `textColor`, `highlight`, `textAlign` token enum을 정의한다.
- [ ] `verseReference` inline node와 `verseKey` 속성 계약을 정의한다.
- [ ] JSON validator와 정규화 함수를 구현한다.
- [ ] node 수, text 길이, nesting depth 제한을 정의한다.
- [ ] rich-text 문서에서 `bodyText`를 추출하는 함수를 구현한다.
- [ ] 구버전 fallback용 Markdown/plain-text projection을 구현한다.
- [ ] Markdown-lite importer를 구현한다.
- [ ] malformed Markdown이 일반 paragraph text로 보존되는지 확인한다.

## 완료 기준

- [ ] 임의 HTML, CSS, URL attribute가 JSON에 저장될 수 없다.
- [ ] 굵게, 기울임, 밑줄, 크기, 글자색, 형광, 정렬을 공통 타입으로 표현할 수 있다.
- [ ] `#창 1:10` verse node는 plain text에서 같은 표기로 추출된다.
- [ ] 웹과 모바일은 DOM이나 native API 없이 같은 validator를 호출할 수 있다.

## 검증

- [ ] valid/invalid document unit test를 작성한다.
- [ ] 모든 token enum과 최대 길이 경계값을 test한다.
- [ ] importer와 text extractor snapshot test를 작성한다.
