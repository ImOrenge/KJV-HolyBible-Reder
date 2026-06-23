# Genesis 19 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.19.1` - `GEN.19.38`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 소돔 멸망, 롯 구출, 소금 기둥, 모압/암몬 기원 기사의 KJV 순서를 유지한다.
- `brimstone and fire`는 `유황과 불`, `pillar of salt`는 `소금 기둥`으로 둔다.
- 롯의 딸들 기사는 KJV의 완곡한 서술 구조를 과도하게 풀어 쓰지 않는다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 496
  - Genesis 19 row: 38
  - Genesis 19 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=465`
- DB import: PASS
  - staged rows: 496
  - target rows: 496
  - Genesis 19 draft/private rows: 38
  - translation_terms: 608
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/19`
  - verse count: 38
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
