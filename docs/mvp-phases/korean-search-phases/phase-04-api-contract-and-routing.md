# Phase 04: API 계약과 서버 라우팅

## 목표

기존 `GET /api/bible/search`를 한국어 검색 요구에 맞게 확장한다. API는 `lang=ko` 요청을 DB RPC 함수로 보내고, 기존 클라이언트가 사용할 수 있는 `BibleSearchResponse` 형태로 결과를 반환해야 한다.

## 선행 조건

- Phase 01의 기본 `search_bible_verses_ko` RPC 함수가 동작한다.
- Phase 02의 검색 정규화 helper가 정의되어 있다.
- 기존 `src/app/api/bible/search/route.ts`의 영어 검색 동작을 파악했다.
- `src/lib/bible-api-types.ts`와 `src/lib/bible-db-mappers.ts`의 타입 변경 범위를 정했다.

## 산출물

- 확장된 `GET /api/bible/search` 파라미터 계약
- 한국어 검색 RPC 호출 코드
- 검색어 정규화/검증 helper
- 응답 mapper
- API route 단위 테스트 또는 smoke test

## API 계약

```text
GET /api/bible/search?q=믿음&lang=ko&sort=canonical&limit=50
```

| 파라미터 | 기본값 | 설명 |
| --- | --- | --- |
| `q` | required | 검색어 |
| `lang` | `ko` | `ko`, `en`, `all` |
| `translation` | public config | 한국어 번역본 이름 |
| `testament` | null | `OT`, `NT` |
| `bookId` | null | 앱 권 id |
| `sort` | `canonical` | `canonical`, `relevance` |
| `limit` | 50 | 1-100 |
| `offset` | 0 | 0 이상 |

## 구현 체크리스트

- [x] `q` 파라미터를 trim하고 Unicode normalize한다.
- [x] 공백 제거 후 2글자 미만이면 빈 결과를 반환한다.
- [x] 검색어 최대 길이를 80자로 제한한다.
- [x] `lang` 허용값을 `ko`, `en`, `all`로 제한한다.
- [x] `sort` 허용값을 `canonical`, `relevance`로 제한한다.
- [x] `limit`을 1-100 범위로 clamp한다.
- [x] `offset`을 0 이상으로 clamp한다.
- [x] `lang=ko` 요청에서 `search_bible_verses_ko` RPC를 호출한다.
- [x] `lang=en` 요청은 기존 영어 검색 동작을 유지한다.
- [x] `lang=all`은 한국어 결과와 영어 결과 병합 정책을 명시한다.
- [x] 한국어 RPC 결과를 기존 `Verse` 타입에 매핑한다.
- [x] 응답에 `query`, `normalizedQuery`, `lang`, `source`, `verses`를 포함한다.
- [x] RPC 오류를 500으로 감싸되 내부 SQL 세부 정보가 과도하게 노출되지 않게 한다.
- [x] Supabase config가 없을 때 명확한 오류를 반환한다.

## 응답 체크리스트

- [x] 각 결과는 `verseKey`를 포함한다.
- [x] 각 결과는 `bookId`, `chapter`, `verse`를 포함한다.
- [x] 한국어 검색 결과는 `textKo`를 포함한다.
- [x] 가능한 경우 `textEn`도 함께 포함한다.
- [x] `translationName`과 `translationStatus`가 유지된다.
- [x] source 정보는 기존 KJV source 필드와 호환된다.

## 검증 체크리스트

- [x] `/api/bible/search?q=믿음&lang=ko`가 200을 반환한다.
- [x] `/api/bible/search?q=a&lang=ko`가 빈 결과를 반환한다.
- [x] `/api/bible/search?q=예수%20그리스도&lang=ko`가 오류 없이 동작한다.
- [x] `/api/bible/search?q=faith&lang=en`의 기존 동작이 깨지지 않는다.
- [x] `bookId` 필터를 적용하면 해당 권 결과만 반환된다.
- [x] `testament=NT` 필터를 적용하면 신약 결과만 반환된다.
- [x] `limit=500` 요청은 최대 100으로 제한된다.

## 완료 기준

- 한국어 검색 API 계약이 문서화되고 route에 반영되어 있다.
- 기존 영어 검색 사용자 흐름이 회귀하지 않는다.
- API 결과를 클라이언트 검색 UI가 바로 사용할 수 있다.
