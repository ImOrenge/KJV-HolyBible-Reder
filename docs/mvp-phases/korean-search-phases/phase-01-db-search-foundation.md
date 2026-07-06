# Phase 01: DB 검색 기반

## 목표

한국어 승인 본문을 Postgres에서 직접 검색할 수 있도록 DB 스키마, 인덱스, 기본 RPC 함수를 준비한다. 이 단계가 끝나면 앱 API를 거치지 않고 DB 함수만으로 `믿음` 같은 한글 키워드 검색 결과를 얻을 수 있어야 한다.

## 선행 조건

- `bible_verses_en` 전체 KJV 본문이 탑재되어 있다.
- `bible_verses_ko`에 공개 승인 한국어 본문이 일부 이상 존재한다.
- `bible_verses_ko`는 `verse_key`, `book_order`, `app_book_id`, `chapter`, `verse`, `text_ko`, `translation_status`, `is_public` 값을 가진다.
- Supabase migration 생성 방식과 적용 환경이 정해져 있다.

## 산출물

- 검색 DB migration
- `pg_trgm` extension
- `bible_verses_ko.search_text_ko`
- `bible_verses_ko.search_text_ko_compact`
- 공개 승인본 대상 부분 trigram 인덱스
- 기본 `search_bible_verses_ko` RPC 함수

## 구현 체크리스트

- [x] Supabase CLI 또는 MCP에서 migration 생성 절차를 확인한다.
- [x] `pg_trgm` extension 추가 migration을 작성한다.
- [x] `bible_verses_ko`에 `search_text_ko` 컬럼을 추가한다.
- [x] `bible_verses_ko`에 `search_text_ko_compact` 컬럼을 추가한다.
- [x] `search_text_ko` 대상 GIN trigram 부분 인덱스를 추가한다.
- [x] `search_text_ko_compact` 대상 GIN trigram 부분 인덱스를 추가한다.
- [x] `translation_name`, `book_order`, `chapter`, `verse` 기반 공개 위치 인덱스 필요 여부를 확인한다.
- [x] 기본 `search_bible_verses_ko` RPC 함수를 작성한다.
- [x] RPC 함수가 `bible_verses_en`을 조인해 `text_en`과 source 정보를 반환하게 한다.
- [x] RPC 함수가 `translation_status = 'approved'`와 `is_public = true`를 항상 적용하게 한다.
- [x] `p_limit`은 1-100 범위로 제한한다.
- [x] `p_offset`은 0 이상으로 제한한다.
- [x] `p_sort = 'canonical'` 기본 정렬을 `book_order, chapter, verse`로 고정한다.

## 보안 체크리스트

- [x] 검색 함수는 `stable`로 정의하고 데이터를 변경하지 않는다.
- [x] 함수에 service role 전용 로직을 넣지 않는다.
- [x] 공개 검색 함수가 미승인 번역을 반환하지 않는지 SQL 조건으로 보장한다.
- [x] exposed schema 함수 권한을 `anon`, `authenticated`에 부여할지 명시한다.
- [x] 새 테이블을 만들지 않는 범위에서는 기존 RLS 정책과 충돌하지 않는지 확인한다.

## 검증 체크리스트

- [x] `select * from public.search_bible_verses_ko('믿음') limit 5;`가 결과를 반환한다.
- [x] `select * from public.search_bible_verses_ko('예수 그리스도') limit 5;`가 오류 없이 실행된다.
- [x] `draft` 상태인 한국어 본문이 결과에 포함되지 않는다.
- [x] `is_public = false` 본문이 결과에 포함되지 않는다.
- [x] 결과가 `book_order, chapter, verse` 순서로 정렬된다.
- [x] `explain analyze`에서 대표 검색어가 전체 순차 스캔으로만 동작하지 않는지 확인한다.

## 완료 기준

- DB 함수 단독으로 한국어 키워드 검색이 가능하다.
- 공개 승인 조건이 SQL 함수 안에서 강제된다.
- 기본 검색 latency가 staging 데이터 기준 1초 이하다.
- migration이 재실행 가능한 형태로 정리되어 있다.
