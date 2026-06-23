# Genesis 2 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 2장 `GEN.2.1` - `GEN.2.25`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 25

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 2장 25절 초본 추가
- `translation_terms_seed.sql`에 Genesis 2 핵심 용어 추가
- `validate-ko-translation.mjs`에 Genesis 2 핵심 용어 검증 추가

## 추가 용어

- `Lord God` -> `주 하나님`
- `rested` -> `안식`
- `living soul` -> `살아 있는 혼`
- `help meet` -> `합당한 돕는 자`
- `one flesh` -> `한 육체`
- `tree of life` -> `생명나무`
- `tree of knowledge of good and evil` -> `선악을 알게 하는 나무`
- `breath of life` -> `생명의 호흡`
- `dust` -> `흙먼지`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Total Korean translation rows: 56
- Translation terms: 45

## 공개 API 확인

- `/api/bible/books/gen/chapters/2`: 25 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 2는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS

## 용어 수정 이력

- 적용일: 2026-06-21
- `GEN.2.2`, `GEN.2.3`: `rested` 핵심 용어를 `안식`으로 통일. 본문은 존칭 서술 어미로 처리.
- 최신 DB import 결과: changed existing rows 1, translation review row 1
