# Genesis 9 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 9장 `GEN.9.1` - `GEN.9.29`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 29

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 9장 29절 초본 추가
- `translation_terms_seed.sql`에 Genesis 9 홍수 후 명령, 언약, 가나안 저주 용어 추가
- `validate-ko-translation.mjs`에 Genesis 9 핵심 용어 검증 추가

## 추가 용어

- `replenish the earth` -> `땅을 다시 채우라`
- `fear of you` -> `너희를 두려워함`
- `dread of you` -> `너희를 무서워함`
- `meat for you` -> `너희를 위한 먹을 것`
- `blood thereof` -> `그 피`
- `token of the covenant` -> `언약의 징표`
- `bow in the cloud` -> `구름 속의 무지개`
- `everlasting covenant` -> `영원한 언약`
- `Canaan` -> `가나안`
- `nakedness` -> `벌거벗음`
- `servant of servants` -> `종들의 종`
- `Lord God of Shem` -> `셈의 주 하나님`
- `enlarge Japheth` -> `야벳을 넓게`
- `tents of Shem` -> `셈의 장막들`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Genesis 5 draft/private rows: 32
- Genesis 6 draft/private rows: 22
- Genesis 7 draft/private rows: 24
- Genesis 8 draft/private rows: 22
- Genesis 9 draft/private rows: 29
- Total Korean translation rows: 235
- Translation terms: 222
- `rested` term rows: `안식`
- `token of the covenant` term rows: `언약의 징표`

## 공개 API 확인

- `/api/bible/books/gen/chapters/9`: 29 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 9는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.9.4-6`의 피/생명 규례는 신학적 용어 검수 필요.
- `GEN.9.12-17`의 `token`은 `징표`로 처리해 `sign/signs=징조` 원칙과 구분했고, `표적`은 사용하지 않았다.
- `GEN.9.20-27`의 노아와 가나안 저주 기사는 문체와 해석상 민감하므로 장 단위 검수 필요.
