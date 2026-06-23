# Genesis 14 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.14.1` - `GEN.14.24`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 왕들의 전쟁, 롯 구출, 멜기세덱 기사 구조를 KJV 순서에 맞춰 보존한다.
- `vale`는 `골짜기`, `slimepits`는 `역청 구덩이`, `goods`는 `재물`로 유지한다.
- `most high God`은 `가장 높으신 하나님`, `priest`는 `제사장`, `tithes`는 `십일조`로 유지한다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 361
  - Genesis 14 row: 24
  - Genesis 14 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=330`
- DB import: PASS
  - staged rows: 361
  - target rows: 361
  - Genesis 14 draft/private rows: 24
  - translation_terms: 409
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/14`
  - verse count: 24
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
