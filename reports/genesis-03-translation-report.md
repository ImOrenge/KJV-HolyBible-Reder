# Genesis 3 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 3장 `GEN.3.1` - `GEN.3.24`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 24

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 3장 24절 초본 추가
- `translation_terms_seed.sql`에 Genesis 3 핵심 용어 추가
- `validate-ko-translation.mjs`에 Genesis 3 핵심 용어 검증 추가

## 추가 용어

- `serpent` -> `뱀`
- `subtil` -> `간교`
- `beguiled` -> `속였`
- `gods` -> `신들`
- `good and evil` -> `선악`
- `enmity` -> `적의`
- `seed` -> `씨`
- `bruise` -> `상하게`
- `sorrow` -> `고통`
- `sweat` -> `땀`
- `coats of skins` -> `가죽옷`
- `Cherubims` -> `그룹들`
- `flaming sword` -> `불타는 칼`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Total Korean translation rows: 80
- Translation terms: 59
- `rested` term rows: `안식`

## 공개 API 확인

- `/api/bible/books/gen/chapters/3`: 24 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 3는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS

## 검수 메모

- `GEN.3.5`의 `gods` -> `신들`은 소문자 gods 문맥을 보존한 초본이므로 신학 검수 필요.
- `GEN.3.15`의 `seed`, `bruise` 표현은 `씨`, `상하게`로 보존했으며 메시아 예언 문맥 검수 필요.
- `GEN.3.16`의 `desire`, `rule over` 표현은 장 단위 검수 때 문체와 신학 용어 확인 필요.
