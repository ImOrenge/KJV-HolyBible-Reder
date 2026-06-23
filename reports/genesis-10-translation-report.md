# Genesis 10 Korean Draft Report

실행일: 2026-06-21

## 결과

PASS

## 범위

- 범위: Genesis 10장 `GEN.10.1` - `GEN.10.32`
- 번역명: `KJV Korean Study Translation`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 절 수: 32

## 적용 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 10장 32절 초본 추가
- `translation_terms_seed.sql`에 Genesis 10 민족표 고유명사와 반복 공식 용어 추가
- `validate-ko-translation.mjs`에 Genesis 10 핵심 용어 검증 추가

## 추가 용어

- `generations of the sons of Noah` -> `노아의 아들들`
- `isles of the Gentiles` -> `이방인들의 섬들`
- `after his tongue` -> `자기 언어대로`
- `mighty one in the earth` -> `땅에서 용사`
- `mighty hunter before the Lord` -> `주 앞의 강한 사냥꾼`
- `beginning of his kingdom` -> `그의 왕국의 시작`
- `families of the Canaanites` -> `가나안 족속들의 가족들`
- `border of the Canaanites` -> `가나안 족속들의 경계`
- `earth divided` -> `땅이 나뉘`
- `nations divided in the earth` -> `민족들이 땅에서 나뉘`
- 주요 고유명사: `고멜`, `마곡`, `야완`, `구스`, `미스라임`, `니므롯`, `바벨`, `시날`, `니느웨`, `가나안`, `에벨`, `벨렉`, `욕단`

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
- Total Korean translation rows: 267
- Translation terms: 285
- `mighty hunter before the Lord` term rows: `주 앞의 강한 사냥꾼`
- `isles of the Gentiles` term rows: `이방인들의 섬들`

## 공개 API 확인

- `/api/bible/books/gen/chapters/10`: 32 verses
- 공개 `textKo` rows: 0
- 이유: Genesis 10은 아직 `ai_translated`, `is_public=false`

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 검수 메모

- 민족표 고유명사는 초본 표기이며 장 단위 검수에서 음역 통일 필요.
- `GEN.10.5`, `GEN.10.20`, `GEN.10.31-32`의 가족/언어/민족 반복 공식은 KJV 구조를 보존했다.
- `GEN.10.8-12`의 니므롯, 왕국, 시날 땅 관련 표현은 신학/역사 용어 검수 필요.
