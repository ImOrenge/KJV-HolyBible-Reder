# Genesis 38 Translation Report

- Date: 2026-06-22
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.38.1` - `GEN.38.30`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 38 초본 30절 추가
- `docs/translation-style-guide.md`에 Genesis 38 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 38 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 38 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분은 유지한다.
- `Adullamite`는 `아둘람 사람`, `Hirah`는 `히라`, `Shuah`는 `수아`, `Er`는 `에르`, `Onan`은 `오난`, `Shelah`는 `셀라`, `Tamar`는 `다말`로 둔다.
- `daughter in law`는 `며느리`, `pledge`는 `담보`, `signet`은 `인장`, `bracelets`는 `팔찌들`, `staff`는 `지팡이`, `scarlet thread`는 `주홍 실`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 1150
  - Genesis 38 rows: 30
  - Genesis 38 public rows: 0
  - Status counts: `approved=31`, `ai_translated=1119`
- Supabase import: PASS
  - Staged rows: 1150
  - Target rows: 1150
  - Genesis 38 draft/private rows: 30
  - Translation terms: 1538
- Validation script: PASS
  - Errors: 0
  - Genesis 38 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/38`
  - Verse count: 30
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 38은 유다의 가나안 혼인, 에르/오난/셀라, 다말의 과부 상태, 딤낫 길가 사건, 담보물 확인, 베레스와 세라 출생으로 구분해 검수한다.
- 초본 상태이므로 Genesis 1처럼 공개하지 않고 `is_public=false`로 둔다.
