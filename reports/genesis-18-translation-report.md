# Genesis 18 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.18.1` - `GEN.18.33`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 마므레 방문, 사라의 웃음, 소돔을 위한 아브라함의 간구 순서를 유지한다.
- `rest yourselves`는 사용자 지정 `rest/rested=안식` 기준에 맞춰 `안식하소서`로 둔다.
- `Judge of all the earth`는 `온 땅의 심판자`, `dust and ashes`는 `티끌과 재`로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 458
  - Genesis 18 row: 33
  - Genesis 18 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=427`
- DB import: PASS
  - staged rows: 458
  - target rows: 458
  - Genesis 18 draft/private rows: 33
  - translation_terms: 564
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/18`
  - verse count: 33
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
