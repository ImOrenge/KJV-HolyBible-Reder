# Genesis 4 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 4장 `GEN.4.1` - `GEN.4.26`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 26

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 4장 26절 초본 추가
- `translation_terms_seed.sql`에 Genesis 4 핵심 용어와 인명 추가
- `validate-ko-translation.mjs`에 Genesis 4 핵심 용어 검증 추가

## 추가 용어

- `offering` -> `제물`
- `firstlings` -> `첫 새끼`
- `flock` -> `양 떼`
- `respect` -> `받아들이`
- `wroth` -> `분노`
- `countenance` -> `얼굴빛`
- `fugitive` -> `도망자`
- `vagabond` -> `방랑자`
- `vengeance` -> `복수`
- `sevenfold` -> `일곱 배`
- `mark` -> `표`
- 인명: `Cain`, `Abel`, `Enoch`, `Irad`, `Mehujael`, `Methusael`, `Lamech`, `Adah`, `Zillah`, `Jabal`, `Jubal`, `Tubal-cain`, `Naamah`, `Seth`, `Enos`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Total Korean translation rows: 106
- Translation terms: 97
- `rested` term rows: `안식`

## 공개 API 확인

- `/api/bible/books/gen/chapters/4`: 26 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 4는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS

## 검수 메모

- `GEN.4.7`의 `sin lieth at the door`, `his desire`, `rule over him`은 대명사 지시와 죄의 인격화 문체 검수 필요.
- `GEN.4.15`의 `mark`는 `징조`가 아니라 `표`로 처리했으며, 기존 `sign/signs -> 징조` 규칙과 구분 필요.
- `GEN.4.23-24`의 라멕 발언은 시적 반복과 폭력/복수 표현을 장 단위로 재검토 필요.
