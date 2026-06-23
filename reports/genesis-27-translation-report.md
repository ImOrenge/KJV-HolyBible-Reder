# Genesis 27 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.27.1` - `GEN.27.46`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 27 초본 46절 추가
- `docs/translation-style-guide.md`에 Genesis 27 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 27 핵심 용어와 축복 공식 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 27 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `savoury meat`는 `별미`, `venison`은 기존 기준대로 `사냥한 고기`로 둔다.
- 이삭의 축복 공식은 `dew of heaven=하늘의 이슬`, `fatness of the earth=땅의 기름짐`, `corn and wine=곡식과 포도주`로 둔다.
- 야곱 변장 기사에서는 `hairy man=털 많은 사람`, `smooth man=매끈한 사람`, `skins of the kids=염소 새끼들의 가죽`으로 둔다.
- 에서의 탄식과 도피 준비 기사는 `supplanted me=나를 밀어냈나이다`, `daughters of Heth=헷의 딸들`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 774
  - Genesis 27 rows: 46
  - Genesis 27 public rows: 0
  - Status counts: `approved=31`, `ai_translated=743`
- Supabase import: PASS
  - Staged rows: 774
  - Target rows: 774
  - Genesis 27 draft/private rows: 46
  - Translation terms: 1008
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/27`
  - Verse count: 46
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 27은 이삭의 축복 준비, 리브가와 야곱의 변장, 야곱에게 넘어간 축복, 에서의 탄식과 별도 축복, 야곱의 하란 도피 준비로 구분해 검수한다.
- 축복/저주 공식은 KJV 반복 구조를 살리고 현대적 설명문으로 풀어 쓰지 않는다.
