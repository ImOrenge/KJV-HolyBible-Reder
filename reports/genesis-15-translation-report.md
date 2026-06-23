# Genesis 15 Translation Report

실행일: 2026-06-21

## 범위

- 범위: `GEN.15.1` - `GEN.15.21`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 원천: CrossWire KJV normalized source

## 초본 방향

- 아브람 언약, 상속자 약속, 믿음과 의, 절단 의식, 땅 경계 선언의 KJV 순서를 유지한다.
- `word of the Lord`는 `주의 말씀`, `heir`는 `상속자`, `inherit`는 `상속하다`, `righteousness`는 `의` 계열로 둔다.
- 절단 의식 동물명과 민족 목록은 장 단위 검수 전까지 초본 음역을 고정한다.
- 승인 전이므로 성경 리더에는 한국어 본문을 공개하지 않는다.

## 검증

- JSONL 구조 검증: PASS
  - 총 JSONL row: 382
  - Genesis 15 row: 21
  - Genesis 15 공개 row: 0
  - 상태 count: `approved=31`, `ai_translated=351`
- DB import: PASS
  - staged rows: 382
  - target rows: 382
  - Genesis 15 draft/private rows: 21
  - translation_terms: 454
- 용어 검증: PASS
  - 구조 오류: 0
  - term warning: 1 (`GEN.1.16`의 기존 `light`/`광명체` 검수 항목)
- 공개 API 확인: PASS
  - `/api/bible/books/gen/chapters/15`
  - verse count: 21
  - 공개 `textKo` rows: 0
- lint/typecheck/build: PASS
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## 결과

PASS
