# Genesis 8 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 8장 `GEN.8.1` - `GEN.8.22`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 22

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 8장 22절 초본 추가
- `translation_terms_seed.sql`에 Genesis 8 홍수 감수와 방주 퇴거 기사 용어 추가
- `validate-ko-translation.mjs`에 Genesis 8 핵심 용어 검증 추가

## 추가 용어

- `remembered Noah` -> `노아`
- `waters asswaged` -> `물들이 가라앉`
- `fountains also of the deep` -> `깊음의 샘들`
- `rain from heaven was restrained` -> `비가 그쳤`
- `waters were abated` -> `물들이 줄어들`
- `ark rested` -> `방주가 ... 안식`
- `Ararat` -> `아라랏`
- `raven` -> `까마귀`
- `dove` -> `비둘기`
- `no rest for the sole of her foot` -> `안식처`
- `olive leaf` -> `감람나무 잎`
- `covering of the ark` -> `방주의 덮개`
- `Go forth of the ark` -> `방주에서 나가라`
- `Bring forth with thee` -> `이끌어 내`
- `breed abundantly` -> `풍성히 번식`
- `altar` -> `제단`
- `burnt offerings` -> `번제들`
- `sweet savour` -> `달콤한 향기`
- `seedtime and harvest` -> `씨 뿌리는 때와 거두는 때`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Genesis 5 draft/private rows: 32
- Genesis 6 draft/private rows: 22
- Genesis 7 draft/private rows: 24
- Genesis 8 draft/private rows: 22
- Total Korean translation rows: 206
- Translation terms: 189
- `rested` term rows: `안식`
- `ark` term rows: `방주`

## 공개 API 확인

- `/api/bible/books/gen/chapters/8`: 22 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 8은 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.8.4`의 `ark rested`는 사용자 용어 기준에 따라 `안식` 어근을 보존했으나, 방주 문맥에서의 문체 검수 필요.
- `GEN.8.9`의 `no rest for the sole of her foot`는 `안식처`로 초본 처리했다.
- `GEN.8.20-21`의 제단, 번제, 향기, 저주/심판 표현은 이후 제사 용어와 함께 검수 필요.
