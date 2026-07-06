# 한글 키워드 검색 Release Readiness

작성일: 2026-07-05

## 결론

한글 DB 기반 키워드 검색의 Phase 01-06 구현과 검증을 완료했다. 공개 승인 한국어 본문 31,102행 전체에 검색 정규화 컬럼이 채워져 있으며, `/api/bible/search?lang=ko`와 앱 검색 UI에서 `믿음`, `예수 그리스도` 등 대표 검색어가 정상 동작한다.

## 적용된 DB 변경

| Version | Migration | 내용 |
| --- | --- | --- |
| `20260705125719` | `korean_keyword_search` | `pg_trgm`, 검색 컬럼, trigram 인덱스, 키워드 사전/역색인, 검색 RPC, refresh RPC |
| `20260705130154` | `korean_search_skip_known_term_fallback` | seed 키워드 exact match가 있으면 fallback scan 생략 |
| `20260705130820` | `korean_search_revoke_public_execute` | 검색 RPC의 `PUBLIC` 실행 권한 회수 및 `anon/authenticated/service_role` 명시 |

## DB 상태

| 항목 | 값 |
| --- | ---: |
| 공개 승인 한국어 본문 | 31,102 |
| `search_text_ko` 누락 | 0 |
| `search_text_ko_compact` 누락 | 0 |
| 공개 검색 seed | 17 |
| 구절-검색어 역색인 | 18,248 |

## 검색 Smoke Test

| Query | 조건 | 결과 |
| --- | --- | ---: |
| `믿음` | 기본 | 239 |
| `예수 그리스도` | `testament=NT`, `sort=relevance` | 1,222 |
| `예수 그리스도` | `bookId=jhn`, `sort=relevance` | 262 |
| `a` | 한글 짧은 검색어 | 0 |

## 성능

대표 10개 검색어를 로컬 Next API에서 각 12회 측정했다. 각 검색어별 1회 warmup 이후 측정한 전체 p95는 127.2ms, 최대값은 144.5ms였다.

| Query | API p95 |
| --- | ---: |
| `하나님` | 144.5ms |
| `예수` | 68.0ms |
| `예수 그리스도` | 82.4ms |
| `성령` | 47.0ms |
| `믿음` | 46.8ms |
| `은혜` | 59.1ms |
| `구원` | 59.8ms |
| `생명` | 58.7ms |
| `왕국` | 54.2ms |
| `복음` | 81.4ms |

DB `EXPLAIN ANALYZE` 대표 경로:

| Query | 경로 | Execution Time |
| --- | --- | ---: |
| `믿음` | seed exact index, canonical | 15.262ms |
| `예수 그리스도` | seed phrase, NT relevance | 44.390ms |
| `광야` | non-seed trigram fallback | 367.757ms |

Payload 확인:

| 요청 | 응답 크기 |
| --- | ---: |
| 대표 검색어 `limit=50` | 약 38KB-47KB |
| `믿음&limit=100` | 77,843 bytes |

## API/UI 검증

- `GET /api/bible/search?q=믿음&lang=ko&limit=3` -> 200, total 239, first `DEU.32.20`.
- `GET /api/bible/search?q=faith&lang=en&limit=3` -> 200, 기존 영어 검색 유지.
- `/app?view=search`에서 기본 언어는 `ko`, 기본 정렬은 `canonical`.
- 검색어 `믿음` 입력 시 `50/239개 결과`가 표시됐다.
- 첫 결과 `신명기 32:20`에서 `열기` 선택 시 리더가 `신명기 32장`으로 이동했다.
- 모바일 390px 폭에서 검색 입력, 필터, 결과 행이 viewport 안에 유지됐다.
- 브라우저 콘솔 오류는 없었다.

## 보안/권한

- 검색 RPC는 SQL 내부에서 `translation_status = 'approved'`와 `is_public = true`를 강제한다.
- `search_bible_verses_ko` 실행 권한은 `anon`, `authenticated`, `service_role`, `postgres`에만 있다.
- `refresh_bible_verse_search_terms_ko` 실행 권한은 `service_role`, `postgres`에만 있다.
- 신규 검색 사전/역색인 테이블은 RLS가 활성화되어 있고 공개 SELECT 정책만 가진다.
- API는 service role key 없이 공개 읽기 권한으로 동작한다.

## 로컬 검증 명령

- `node --check scripts/import-ko-translation.mjs`
- `node --check scripts/validate-ko-translation.mjs`
- `node --check scripts/backfill-ko-search.mjs`
- `npm run lint`
- `npm run build`

## 운영 메모

- import 후 `scripts/backfill-ko-search.mjs` 또는 import 스크립트의 refresh 호출로 역색인을 재생성할 수 있다.
- seed에 없는 fallback 검색은 동작하지만 exact seed 경로보다 느리다. 검색 로그가 쌓이면 자주 쓰는 비seed 검색어를 `bible_search_terms_ko`에 추가하는 방식으로 개선한다.
- 로컬 Supabase CLI dry-run은 shell DNS 조회 실패로 사용하지 않았고, Supabase MCP 적용 및 원격 `list_migrations`로 적용 상태를 확인했다.

## Rollback / 비활성화 기준

- API 장애가 발생하면 UI 기본 언어를 `en`으로 되돌리거나 검색 패널에서 `lang=ko` 옵션을 숨긴다.
- DB 함수 장애가 발생하면 `/api/bible/search`의 `lang=ko` 분기를 비활성화하고 기존 영어 검색 분기만 유지한다.
- 성능 저하가 seed 검색어에서 반복되면 fallback 경로를 유지한 채 자주 쓰는 검색어를 seed/역색인에 추가한다.
- 마이그레이션 자체를 되돌려야 하면 마지막 권한 마이그레이션부터 역순으로 적용을 검토한다. 데이터 컬럼과 인덱스는 additive 변경이라 즉시 drop보다 API 비활성화를 우선한다.
