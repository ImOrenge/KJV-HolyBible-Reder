# Genesis 17 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.17.1` - `GEN.17.27`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 아브람/사래의 이름 변경, 할례 언약, 이삭 약속의 KJV 순서를 유지한다.
- `Almighty God`은 `전능한 하나님`, `father of many nations`는 `많은 민족들의 아버지`로 둔다.
- `circumcised`는 `할례`, `foreskin`은 `포피`, `token of the covenant`는 `언약의 징표`로 유지한다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 425
  - Genesis 17 row: 27
  - Genesis 17 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=394`
- DB import: PASS
  - staged rows: 425
  - target rows: 425
  - Genesis 17 draft/private rows: 27
  - translation_terms: 524
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/17`
  - verse count: 27
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
