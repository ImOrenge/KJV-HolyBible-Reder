# 한글 키워드 검색 구현 페이즈

이 폴더는 [한글 키워드 검색엔진 아키텍처](../korean-keyword-search-engine-architecture.md)를 실제 구현 가능한 단계로 나눈 실행 계획이다. 목표는 Supabase/Postgres 기반으로 한국어 승인 본문을 빠르게 검색하고, 검색 결과에서 리더의 해당 구절로 이동할 수 있게 만드는 것이다.

## 공통 전제

- 검색 대상은 `bible_verses_ko`의 `translation_status = 'approved'` 및 `is_public = true` 행이다.
- 영어 KJV 원문은 `bible_verses_en`에서 병기하며, 한국어 검색의 기준 텍스트는 `text_ko`다.
- MVP 검색은 Postgres 내부 기능인 `pg_trgm`, 부분 인덱스, RPC 함수로 시작한다.
- 키워드 사전과 역색인은 Phase 3에서 확장한다. Phase 1-2만으로도 기본 한글 포함 검색은 동작해야 한다.
- 사용자 개인 데이터 검색은 이 페이즈에서 제외한다.
- service role key 없이 공개 읽기 권한으로 검색 API가 동작해야 한다.

## 페이즈 목록

| Phase | 파일 | 핵심 목표 | 완료 게이트 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | [phase-01-db-search-foundation.md](./phase-01-db-search-foundation.md) | 검색용 DB 컬럼, `pg_trgm` 인덱스, 기본 RPC 함수 준비 | 필수 | 완료 |
| 2 | [phase-02-normalization-import-backfill.md](./phase-02-normalization-import-backfill.md) | 한국어 검색 정규화, import/backfill, 검증 스크립트 정리 | 필수 | 완료 |
| 3 | [phase-03-keyword-dictionary-inverted-index.md](./phase-03-keyword-dictionary-inverted-index.md) | 키워드 사전, 구절-키워드 역색인, 랭킹 기반 검색 확장 | 권장 | 완료 |
| 4 | [phase-04-api-contract-and-routing.md](./phase-04-api-contract-and-routing.md) | `/api/bible/search?lang=ko` 계약과 서버 라우트 구현 | 필수 | 완료 |
| 5 | [phase-05-search-ui-reader-integration.md](./phase-05-search-ui-reader-integration.md) | 검색 UI, 필터, 결과 상태, 리더 이동 연결 | 필수 | 완료 |
| 6 | [phase-06-quality-performance-release-gates.md](./phase-06-quality-performance-release-gates.md) | 성능, 보안, 회귀 테스트, 출시 게이트 검증 | 필수 | 완료 |

## 권장 구현 순서

1. Phase 1과 Phase 2를 먼저 완료해 DB에서 한국어 검색이 실제로 가능한 상태를 만든다.
2. Phase 4를 구현해 API 응답 계약을 고정한다.
3. Phase 5에서 UI를 연결한다.
4. Phase 6으로 성능과 보안 게이트를 통과시킨다.
5. Phase 3은 검색 품질과 운영 요구가 확인된 뒤 진행할 수 있지만, 신학 용어 검색 품질을 MVP에 포함하려면 Phase 2 다음에 바로 진행한다.

## 최종 산출물

- 검색 migration: `pg_trgm`, 검색 정규화 컬럼, 부분 인덱스, RPC 함수
- 한국어 정규화/backfill 스크립트
- 검색 smoke test 및 대표 검색어 검증 리포트: [한글 키워드 검색 Release Readiness](../../../reports/korean-keyword-search-release-readiness.md)
- `/api/bible/search` 한국어 검색 확장
- 검색 UI 및 리더 이동 연결
- 성능/보안/release readiness 체크리스트

## 공통 완료 기준

- `믿음`, `예수`, `성령`, `하나님`, `예수 그리스도` 검색이 한국어 본문에서 동작한다.
- 검색 결과는 기본적으로 성경 순서로 반환된다.
- 검색 결과는 `verseKey`, `bookId`, `chapter`, `verse`, `textKo`, `textEn`을 포함한다.
- 비공개 또는 미승인 한국어 번역은 검색되지 않는다.
- 모바일 화면에서 검색 입력, 결과 목록, 리더 이동이 깨지지 않는다.
