# Genesis 5 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 5장 `GEN.5.1` - `GEN.5.32`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 32

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 5장 32절 초본 추가
- `translation_terms_seed.sql`에 Genesis 5 족보 용어와 인명 추가
- `validate-ko-translation.mjs`에 Genesis 5 핵심 용어 검증 추가

## 추가 용어

- `book of the generations` -> `세대들의 책`
- `begat` -> `낳`
- `sons and daughters` -> `아들들과 딸들`
- `he died` -> `그가 죽었느니라`
- `walked with God` -> `하나님과 함께 걸`
- `took him` -> `데려가셨`
- `comfort` -> `위로`
- `toil` -> `수고`
- 인명: `Cainan`, `Mahalaleel`, `Jared`, `Methuselah`, `Noah`, `Shem`, `Ham`, `Japheth`

## DB 상태

- Genesis 1 approved/public rows: 31
- Genesis 2 draft/private rows: 25
- Genesis 3 draft/private rows: 24
- Genesis 4 draft/private rows: 26
- Genesis 5 draft/private rows: 32
- Total Korean translation rows: 138
- Translation terms: 113
- `rested` term rows: `안식`
- `book of the generations` term row: `세대들의 책`

## 공개 API 확인

- `/api/bible/books/gen/chapters/5`: 32 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 5는 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS

## 검수 메모

- `GEN.5.1`의 `book of the generations`는 `세대들의 책`으로 처리해 Genesis 2:4의 `generations`와 구분.
- `GEN.5.22`, `GEN.5.24`의 `walked with God`은 `하나님과 함께 걸...`로 직역형 초본 처리. 문체 검수 필요.
- `GEN.5.29`의 `comfort`, `toil`, `cursed`는 노아 이름 설명 문맥이므로 장 단위 신학/어휘 검수 필요.
