# Phase 03: 키워드 사전과 역색인

## 목표

자주 검색되는 신학 용어와 표기 변형을 안정적으로 찾기 위해 키워드 사전과 구절-키워드 역색인을 구축한다. 이 단계는 기본 trigram 검색 위에 검색 품질과 관련도 정렬을 추가한다.

## 선행 조건

- Phase 01의 기본 검색 함수가 동작한다.
- Phase 02의 `search_text_ko_compact` 값이 모든 공개 승인 행에 채워져 있다.
- 핵심 신학 용어 목록의 초기 seed 범위를 정했다.

## 산출물

- `bible_search_terms_ko` 테이블
- `bible_verse_search_terms_ko` 테이블
- 핵심 키워드 seed
- 역색인 재생성 스크립트
- exact keyword match + trigram fallback 검색 함수
- 관련도 정렬 옵션

## 키워드 seed 초안

초기 seed는 작게 시작한다.

- 하나님
- 주
- 예수
- 예수 그리스도
- 그리스도
- 성령
- 믿음
- 은혜
- 죄
- 회개
- 구원
- 생명
- 왕국
- 하늘의 왕국
- 복음
- 부활

## 구현 체크리스트

- [x] `bible_search_terms_ko` 테이블 migration을 작성한다.
- [x] `bible_verse_search_terms_ko` 테이블 migration을 작성한다.
- [x] `compact_term` 부분 인덱스를 추가한다.
- [x] `search_term_id, translation_name` 인덱스를 추가한다.
- [x] `verse_key` 인덱스를 추가한다.
- [x] 핵심 키워드 seed SQL 또는 JSON을 작성한다.
- [x] 키워드 seed는 재실행 가능하게 만든다.
- [x] `translation_name` 단위 역색인 재생성 스크립트를 작성한다.
- [x] 역색인 생성 시 `match_count`를 계산한다.
- [x] 역색인 생성 시 `first_position`을 계산한다.
- [x] 역색인 생성 결과 행 수와 용어별 매칭 수를 리포트한다.
- [x] `search_bible_verses_ko` 함수에 exact keyword CTE를 추가한다.
- [x] exact match 결과와 trigram fallback 결과를 `verse_key` 기준으로 병합한다.
- [x] `sort=relevance`에서 score desc 정렬을 지원한다.
- [x] `sort=canonical`은 기존 성경 순서 정렬을 유지한다.

## 랭킹 체크리스트

- [x] exact keyword match는 일반 포함 검색보다 높은 점수를 받는다.
- [x] canonical term match와 alias match 점수 차이를 정의한다.
- [x] 같은 구절이 여러 경로로 매칭되어도 한 번만 반환된다.
- [x] score가 같으면 `book_order, chapter, verse`로 안정 정렬된다.
- [x] 관련도 정렬 결과와 성경 순서 정렬 결과를 API에서 선택할 수 있다.

## 검증 체크리스트

- [x] `하나님` 검색이 역색인 테이블을 사용한다.
- [x] `예수 그리스도` 검색이 공백 포함/미포함 본문을 모두 찾는다.
- [x] `하늘의 왕국` 같은 phrase가 compact 검색으로 보강된다.
- [x] seed에 없는 단어도 trigram fallback으로 검색된다.
- [x] 역색인을 재생성해도 중복 primary key 오류가 나지 않는다.
- [x] 대표 키워드별 매칭 구절 수가 리포트에 남는다.

## 완료 기준

- 핵심 신학 용어 검색 품질이 기본 trigram 검색보다 개선된다.
- `sort=relevance`가 API와 DB 함수에서 동작한다.
- 역색인 재생성 절차가 import 후 반복 실행 가능하다.
