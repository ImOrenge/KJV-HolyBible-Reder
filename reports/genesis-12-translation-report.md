# Genesis 12 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 12장 `GEN.12.1` - `GEN.12.20`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 20

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 12장 20절 초본 추가
- `translation_terms_seed.sql`에 아브람 부르심, 땅/씨 약속, 제단, 이집트 체류 용어 추가
- `validate-ko-translation.mjs`에 Genesis 12 핵심 용어 검증 추가

## 추가 용어

- `kindred` -> `친족`
- `father's house` -> `아버지의 집`
- `great nation` -> `큰 민족`
- `all families of the earth` -> `땅의 모든 가족들`
- `thy seed` -> `네 씨`
- `plain of Moreh` -> `모레 평야`
- `called upon the name of the Lord` -> `주의 이름을 불렀`
- `famine` -> `기근`
- `Egypt/Egyptians` -> `이집트/이집트 사람들`
- `Pharaoh` -> `파라오`
- `great plagues` -> `큰 재앙들`

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
- Total Korean translation rows: 319
- Translation terms: 346
- `great nation` term rows: `큰 민족`
- `famine` term rows: `기근`

## 공개 API 확인

- `/api/bible/books/gen/chapters/12`: 20 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 12는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- `GEN.12.1-3`의 부르심과 복 약속은 명령/약속 구조를 보존했다.
- `GEN.12.7-8`의 제단과 주의 이름을 부르는 표현은 예배 용어로 유지했다.
- `GEN.12.10-20`의 이집트 체류와 사래 관련 서사는 문체와 윤리적 해석 검수 필요.
