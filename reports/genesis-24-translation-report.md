# Genesis 24 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.24.1` - `GEN.24.67`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 아브라함의 종의 맹세, 리브가를 만나는 기도 응답, 종의 보고, 리브가의 동의, 이삭과 리브가의 만남 순서를 유지한다.
- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `pitcher`는 `물동이`, `draw water`는 `물을 긷다` 계열, `Laban`은 `라반`, `vail`은 `너울`, `Sarah's tent`는 `사라의 장막`으로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 659
  - Genesis 24 row: 67
  - Genesis 24 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=628`
- DB import: PASS
  - staged rows: 659
  - target rows: 659
  - Genesis 24 draft/private rows: 67
  - translation_terms: 811
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/24`
  - verse count: 67
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
