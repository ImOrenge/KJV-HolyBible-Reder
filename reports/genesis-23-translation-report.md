# Genesis 23 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.23.1` - `GEN.23.20`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 사라의 죽음, 헷 자손과의 협상, 막벨라 굴 매입, 사라 장사 기사의 KJV 순서를 유지한다.
- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sons/children of Heth`는 `헷의 아들들/자손들`, `cave of Machpelah`는 `막벨라 굴`, `were made sure`는 `확정되었느니라`로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 592
  - Genesis 23 row: 20
  - Genesis 23 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=561`
- DB import: PASS
  - staged rows: 592
  - target rows: 592
  - Genesis 23 draft/private rows: 20
  - translation_terms: 755
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/23`
  - verse count: 20
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
