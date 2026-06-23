# Genesis 34 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.34.1` - `GEN.34.31`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 34 초본 31절 추가
- `docs/translation-style-guide.md`에 Genesis 34 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 34 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 34 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `defiled`는 `더럽혔`, `wrought folly in Israel`은 `이스라엘 안에서 어리석은 일을 행하였`으로 둔다.
- `uncircumcised`는 `할례받지 아니한 자`, `harlot`은 `창녀`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 1012
  - Genesis 34 rows: 31
  - Genesis 34 public rows: 0
  - Status counts: `approved=31`, `ai_translated=981`
- Supabase import: PASS
  - Staged rows: 1012
  - Target rows: 1012
  - Genesis 34 draft/private rows: 31
  - Translation terms: 1365
- Validation script: PASS
  - Errors: 0
  - Genesis 34 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/34`
  - Verse count: 31
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 34는 디나와 세겜 기사, 하몰/세겜의 혼인 제안, 야곱의 아들들의 할례 조건, 시므온/레위의 보복, 야곱의 항의로 구분해 검수한다.
- 민감한 폭력 기사는 원문 구조를 보존하되 과도하게 해설화하지 않는 방향으로 초본 처리했다.
- 기존 broad term warning을 줄이기 위해 `grieved`는 `it grieved`, `uncircumcised`는 `uncircumcised man child`로 좁혀 검증한다.
