# Genesis 13 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 13장 `GEN.13.1` - `GEN.13.18`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 18

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 13장 18절 초본 추가
- `translation_terms_seed.sql`에 아브람과 롯 분리, 요단 평야, 땅/씨 약속 용어 추가
- `validate-ko-translation.mjs`에 Genesis 13 핵심 용어 검증 추가

## 추가 용어

- `strife` -> `다툼`
- `herdmen` -> `목자들`
- `Perizzite` -> `브리스 사람`
- `plain of Jordan` -> `요단의 평야`
- `well watered` -> `물이 넉넉`
- `garden of the Lord` -> `주의 동산`
- `wicked and sinners` -> `사악하고 죄인들`
- `dust of the earth` -> `땅의 티끌`
- `Mamre` -> `마므레`
- `Hebron` -> `헤브론`

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
- Genesis 12 draft/private rows: 20
- Genesis 13 draft/private rows: 18
- Total Korean translation rows: 337
- Translation terms: 380
- `plain of Jordan` term rows: `요단의 평야`
- `dust of the earth` term rows: `땅의 티끌`

## 공개 API 확인

- `/api/bible/books/gen/chapters/13`: 18 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 13은 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.13.7-9`의 아브람과 롯 분리 장면은 다툼/목자/형제 표현을 보존했다.
- `GEN.13.10-13`의 요단 평야와 소돔 묘사는 이후 소돔 기사와 용어 검수 필요.
- `GEN.13.14-17`의 땅과 씨 약속은 `네 씨`, `땅의 티끌`, `영원히`를 유지했다.
