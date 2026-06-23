# Genesis 36 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.36.1` - `GEN.36.43`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 36 초본 43절 추가
- `docs/translation-style-guide.md`에 Genesis 36 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 36 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 36 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `duke/dukes`는 `족장/족장들`, `Horite`는 `호리 사람`, `Edomites`는 `에돔 사람들`로 둔다.
- `reigned in his stead`는 `그를 대신하여 통치하였느니라`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 1084
  - Genesis 36 rows: 43
  - Genesis 36 public rows: 0
  - Status counts: `approved=31`, `ai_translated=1053`
- Supabase import: PASS
  - Staged rows: 1084
  - Target rows: 1084
  - Genesis 36 draft/private rows: 43
  - Translation terms: 1471
- Validation script: PASS
  - Errors: 0
  - Genesis 36 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/36`
  - Verse count: 43
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 36은 에서의 아내와 아들, 에돔 족장, 세일의 호리 사람 족보, 에돔 왕 목록, 에돔 족장 목록으로 구분해 검수한다.
- 족보 장이므로 반복 공식과 고유명사 음역 일관성을 우선했다.
- Genesis 25의 `Hadar` 검증은 `Hadar, and Tema` 구문으로 좁히고, Genesis 36의 `Hadar`는 `하달`로 검증한다.
