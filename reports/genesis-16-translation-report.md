# Genesis 16 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.16.1` - `GEN.16.16`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 사래와 하갈, 주의 천사, 이스마엘 이름, 브엘라해로이 기사의 KJV 순서를 유지한다.
- `handmaid/maid`는 `여종`, `mistress`는 `주인 여자`, `angel of the Lord`는 `주의 천사`로 둔다.
- `Ishmael`은 `이스마엘`, `Beer-lahai-roi`는 `브엘라해로이`, `Thou God seest me`는 `나를 보시는 하나님` 계열로 둔다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 398
  - Genesis 16 row: 16
  - Genesis 16 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=367`
- DB import: PASS
  - staged rows: 398
  - target rows: 398
  - Genesis 16 draft/private rows: 16
  - translation_terms: 491
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/16`
  - verse count: 16
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
