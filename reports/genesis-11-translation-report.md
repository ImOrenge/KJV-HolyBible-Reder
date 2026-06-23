# Genesis 11 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 11장 `GEN.11.1` - `GEN.11.32`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 32

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 11장 32절 초본 추가
- `translation_terms_seed.sql`에 Genesis 11 바벨탑 기사와 셈-아브람 족보 용어 추가
- `validate-ko-translation.mjs`에 Genesis 11 핵심 용어 검증 추가

## 추가 용어

- `one language` -> `한 언어`
- `one speech` -> `한 말`
- `plain in the land of Shinar` -> `시날 땅에서 한 평야`
- `make brick` -> `벽돌을 만들`
- `slime had they for morter` -> `회반죽 대신 역청`
- `city and a tower` -> `성읍과 탑`
- `make us a name` -> `이름을 만들`
- `confound their language` -> `언어를 혼잡하게`
- `scattered abroad` -> `흩`
- `generations of Shem` -> `셈의 세대들`
- 주요 고유명사: `아르박삿`, `살라`, `르우`, `스룩`, `나홀`, `데라`, `아브람`, `하란`, `롯`, `사래`, `밀가`

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
- Genesis 10 draft/private rows: 32
- Genesis 11 draft/private rows: 32
- Total Korean translation rows: 299
- Translation terms: 316
- `confound their language` term rows: `언어를 혼잡하게`
- `Ur of the Chaldees` term rows: `갈대아의 우르`

## 공개 API 확인

- `/api/bible/books/gen/chapters/11`: 32 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 11은 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.11.1-9`의 바벨탑 기사는 `언어/말/혼잡/흩어짐` 반복을 보존했다.
- `GEN.11.10-26`의 셈 족보는 `살고`, `낳았느니라`, `아들들과 딸들` 공식을 유지했다.
- `GEN.11.27-32`의 데라 가족과 갈대아의 우르/하란 이동은 이후 아브라함 기사와 함께 고유명사 검수 필요.
