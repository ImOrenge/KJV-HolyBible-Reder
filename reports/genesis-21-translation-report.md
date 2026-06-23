# Genesis 21 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.21.1` - `GEN.21.34`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 이삭 출생, 하갈과 이스마엘의 광야 기사, 브엘세바 언약 기사의 KJV 순서를 유지한다.
- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `visited Sarah`는 `사라를 찾아오셨고`, `was weaned`는 `젖을 떼었고`, `Beer-sheba`는 `브엘세바`로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 548
  - Genesis 21 row: 34
  - Genesis 21 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=517`
- DB import: PASS
  - staged rows: 548
  - target rows: 548
  - Genesis 21 draft/private rows: 34
  - translation_terms: 677
  - superseded broad terms: 0 (`took him`, `Sheba`)
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/21`
  - verse count: 34
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
