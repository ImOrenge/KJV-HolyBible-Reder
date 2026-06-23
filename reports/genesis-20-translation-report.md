# Genesis 20 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.20.1` - `GEN.20.18`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 아비멜렉과 사라 사건, 꿈 경고, 사라 회복, 태 닫힘과 치유 기사의 KJV 순서를 유지한다.
- `Abimelech`은 `아비멜렉`, `Gerar`는 `그랄`, `prophet`은 `선지자`로 둔다.
- `integrity of my heart`는 `내 마음의 온전함`, `covering of the eyes`는 `눈을 가리는 것`으로 초본 처리한다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 514
  - Genesis 20 row: 18
  - Genesis 20 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=483`
- DB import: PASS
  - staged rows: 514
  - target rows: 514
  - Genesis 20 draft/private rows: 18
  - translation_terms: 636
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/20`
  - verse count: 18
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
