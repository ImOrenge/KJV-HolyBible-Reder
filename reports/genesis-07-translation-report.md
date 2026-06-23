# Genesis 7 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 7장 `GEN.7.1` - `GEN.7.24`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 24

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 7장 24절 초본 추가
- `translation_terms_seed.sql`에 Genesis 7 홍수 진행 기사 용어 추가
- `validate-ko-translation.mjs`에 Genesis 7 핵심 용어 검증 추가

## 추가 용어

- `clean beast/clean beasts` -> `정결한 짐승`
- `not clean` -> `정결하지 않은`
- `by sevens` -> `일곱씩`
- `forty days and forty nights` -> `사십 일과 사십 밤`
- `living substance` -> `살아 있는 물질`
- `fountains of the great deep` -> `큰 깊음의 모든 샘들`
- `windows of heaven` -> `하늘의 창들`
- `selfsame day` -> `바로 그 날`
- `two and two` -> `둘씩 둘씩`
- `male and female of all flesh` -> `모든 육체 중 수컷과 암컷`
- `shut him in` -> `안에 닫으셨`
- `waters prevailed` -> `물들이 ... 우세`
- `covered` -> `덮`
- `dry land` -> `마른 땅`
- `remained alive` -> `살아 남았`
- `hundred and fifty days` -> `백오십 일`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Genesis 5 draft/private rows: 32
- Genesis 6 draft/private rows: 22
- Genesis 7 draft/private rows: 24
- Total Korean translation rows: 184
- Translation terms: 162
- `rested` term rows: `안식`
- `ark` term rows: `방주`

## 공개 API 확인

- `/api/bible/books/gen/chapters/7`: 24 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 7는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.7.2-3`의 정결한/정결하지 않은 짐승 구분은 이후 율법 용어와 연결되므로 장 단위 검수 필요.
- `GEN.7.11`의 `fountains of the great deep`, `windows of heaven`은 우주론적 표현을 직역으로 보존했다.
- `GEN.7.18-24`의 `waters prevailed` 반복은 `물들이 ... 우세` 계열로 유지했다.
