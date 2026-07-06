# Phase 02: 정규화, Import, Backfill

## 목표

한국어 본문 import와 검색 정규화 컬럼 갱신을 하나의 재현 가능한 흐름으로 만든다. 기존 한국어 번역 데이터도 backfill해서 검색 컬럼이 비어 있지 않게 한다.

## 선행 조건

- Phase 01의 검색 컬럼이 DB에 존재한다.
- `scripts/import-ko-translation.mjs`가 한국어 번역을 DB에 import한다.
- 한국어 번역 JSONL 파일의 `textKo`, `verseKey`, `translationStatus`, `isPublic` 값이 검증 가능하다.

## 산출물

- 검색어 정규화 규칙
- import 시 검색 컬럼 계산 로직
- 기존 행 backfill SQL 또는 스크립트
- `db:validate-ko` 검색 컬럼 검증 항목
- 대표 검색어 smoke test 결과

## 정규화 규칙

- Unicode `NFKC` 정규화를 적용한다.
- 앞뒤 공백을 제거한다.
- 중복 공백은 단일 공백으로 줄인다.
- 쉼표, 마침표, 세미콜론, 콜론, 따옴표, 괄호류는 공백 또는 제거 대상으로 처리한다.
- `search_text_ko`는 사람이 읽을 수 있는 공백 포함 문자열로 둔다.
- `search_text_ko_compact`는 공백과 주요 문장부호를 제거해 phrase 검색에 사용한다.

## 구현 체크리스트

- [x] 앱 코드에서 재사용할 한국어 검색 정규화 helper 위치를 정한다.
- [x] import 스크립트에서 `search_text_ko` 값을 계산한다.
- [x] import 스크립트에서 `search_text_ko_compact` 값을 계산한다.
- [x] 기존 `bible_verses_ko` 행을 대상으로 backfill 스크립트 또는 SQL을 작성한다.
- [x] backfill은 `translation_name` 단위로 재실행 가능하게 만든다.
- [x] `text_ko`가 비어 있거나 공백뿐인 행을 검증 오류로 처리한다.
- [x] `search_text_ko`가 비어 있는 공개 승인 행을 검증 오류로 처리한다.
- [x] `search_text_ko_compact`가 비어 있는 공개 승인 행을 검증 오류로 처리한다.
- [x] 정규화 helper의 입력/출력 예시를 문서화한다.
- [x] 대표 검색어 목록을 validation report에 포함한다.

## 검증 체크리스트

- [x] `예수 그리스도`와 `예수그리스도`가 같은 compact 검색 흐름으로 처리된다.
- [x] `하나님께서,` 같은 문장부호 포함 본문이 `하나님께서` 검색에 걸린다.
- [x] 공개 승인 한국어 행 전체에 `search_text_ko`가 채워져 있다.
- [x] 공개 승인 한국어 행 전체에 `search_text_ko_compact`가 채워져 있다.
- [x] backfill을 두 번 실행해도 데이터가 중복되거나 깨지지 않는다.
- [x] `npm run db:validate-ko` 또는 동등한 검증 명령이 검색 컬럼 검사를 포함한다.

## 운영 체크리스트

- [x] import 전 DB backup 필요 여부를 결정한다.
- [x] import 실패 시 이전 `text_ko`와 검색 컬럼을 유지하는지 확인한다.
- [x] import 로그에 처리 행 수, 승인 행 수, 검색 컬럼 누락 수를 남긴다.
- [x] staging에서 backfill 후 대표 검색어 smoke test를 실행한다.

## 완료 기준

- 새로 import되는 한국어 번역은 검색 컬럼을 함께 저장한다.
- 기존 한국어 번역도 검색 컬럼 backfill이 완료되어 있다.
- 정규화 규칙이 API 검색어 처리와 import 처리에서 일관되게 사용된다.
