# Genesis 30 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.30.1` - `GEN.30.43`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 30 초본 43절 추가
- `docs/translation-style-guide.md`에 Genesis 30 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 30 핵심 용어와 인명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 30 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Dan=단`, `Naphtali=납달리`, `Gad=갓`, `Asher=아셀`, `Issachar=잇사갈`, `Zebulun=스불론`, `Dinah=디나`, `Joseph=요셉`으로 둔다.
- `mandrakes=합환채`, `speckled=얼룩진`, `spotted=점 있는`, `ringstraked=줄무늬 있는`, `brown=갈색`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 874
  - Genesis 30 rows: 43
  - Genesis 30 public rows: 0
  - Status counts: `approved=31`, `ai_translated=843`
- Supabase import: PASS
  - Staged rows: 874
  - Target rows: 874
  - Genesis 30 draft/private rows: 43
  - Translation terms: 1158
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/30`
  - Verse count: 43
  - Public `textKo` rows: 0
- Lint: PASS
  - Existing warnings remain in `src/components/kjv-mvp-app.tsx`; no lint errors.
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 30은 라헬/레아의 여종 출산, 합환채 교환, 라헬의 요셉 출산, 야곱의 품삯 가축 분리로 구분해 검수한다.
- 가축 색상과 무늬 용어는 장 안에서 흔들리지 않도록 `얼룩진`, `점 있는`, `줄무늬 있는`, `갈색`으로 고정한다.
