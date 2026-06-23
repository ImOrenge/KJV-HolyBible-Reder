# Genesis 6 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 6장 `GEN.6.1` - `GEN.6.22`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 22

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 6장 22절 초본 추가
- `translation_terms_seed.sql`에 Genesis 6 홍수 기사 용어 추가
- `validate-ko-translation.mjs`에 Genesis 6 핵심 용어 검증 추가

## 추가 용어

- `sons of God` -> `하나님의 아들들`
- `daughters of men` -> `사람들의 딸들`
- `giants` -> `거인들`
- `mighty men` -> `용사들`
- `men of renown` -> `명성 있는 사람들`
- `repented/repenteth` -> `후회`
- `grieved` -> `근심하셨`
- `grace` -> `은혜`
- `generations of Noah` -> `노아의 세대들`
- `ark` -> `방주`
- `gopher wood` -> `고페르 나무`
- `pitch` -> `역청`
- `cubit/cubits` -> `큐빗`
- `flood of waters` -> `물들의 홍수`
- `covenant` -> `언약`
- `they shall be male and female` -> `수컷과 암컷`
- `for food for thee` -> `음식`
- `God commanded him` -> `명령하신`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Genesis 5 draft/private rows: 32
- Genesis 6 draft/private rows: 22
- Total Korean translation rows: 160
- Translation terms: 145
- `rested` term rows: `안식`
- `ark` term rows: `방주`

## 공개 API 확인

- `/api/bible/books/gen/chapters/6`: 22 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 6는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS

## 검수 메모

- `GEN.6.2`, `GEN.6.4`의 `sons of God`, `daughters of men`, `giants`는 해석상 민감하므로 장 단위 신학 검수 필요.
- `GEN.6.6-7`의 `repented/repenteth`, `grieved`는 하나님의 후회/근심 표현으로 초본 처리했으며 문체 검수 필요.
- `GEN.6.14-16`의 방주 구조 용어(`gopher wood`, `pitch`, `cubit`, `stories`)는 이후 홍수 기사와 일관 검수 필요.
