# Genesis 37 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.37.1` - `GEN.37.36`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 37 초본 36절 추가
- `docs/translation-style-guide.md`에 Genesis 37 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 37 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 37 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분은 유지한다.
- `generations of Jacob`은 `야곱의 세대들`, `coat of many colours`는 `여러 색의 옷`, `made obeisance`는 `절하였느니라`로 둔다.
- `Ishmeelites`는 `이스마엘 사람들`, `Midianites merchantmen`은 `미디안 사람 상인들`, `twenty pieces of silver`는 `은 이십 개`, `Potiphar`는 `보디발`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 1120
  - Genesis 37 rows: 36
  - Genesis 37 public rows: 0
  - Status counts: `approved=31`, `ai_translated=1089`
- Supabase import: PASS
  - Staged rows: 1120
  - Target rows: 1120
  - Genesis 37 draft/private rows: 36
  - Translation terms: 1501
- Validation script: PASS
  - Errors: 0
  - Genesis 37 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/37`
  - Verse count: 36
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 37은 요셉의 채색옷, 두 꿈, 도단 수색, 형제들의 공모, 구덩이, 이스마엘 사람들과 미디안 상인들, 야곱의 애곡, 보디발에게 팔림으로 구분해 검수한다.
- 초본 상태이므로 Genesis 1처럼 공개하지 않고 `is_public=false`로 둔다.
