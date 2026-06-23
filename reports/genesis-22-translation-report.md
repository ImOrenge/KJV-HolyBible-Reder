# Genesis 22 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.22.1` - `GEN.22.24`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 아브라함 시험, 이삭 번제, 여호와이레 명명, 나홀/리브가 족보 기사의 KJV 순서를 유지한다.
- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `tempt Abraham`은 `아브라함을 시험`, `thine only son`은 `네 유일한 아들`, `Jehovah-jireh`는 `여호와이레`로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 572
  - Genesis 22 row: 24
  - Genesis 22 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=541`
- DB import: PASS
  - staged rows: 572
  - target rows: 572
  - Genesis 22 draft/private rows: 24
  - translation_terms: 726
  - broad `offering` term rows: 0
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/22`
  - verse count: 24
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
