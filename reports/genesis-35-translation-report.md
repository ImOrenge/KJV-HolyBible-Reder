# Genesis 35 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.35.1` - `GEN.35.29`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 35 초본 29절 추가
- `docs/translation-style-guide.md`에 Genesis 35 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 35 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 35 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `El-beth-el`은 `엘벧엘`, `Allon-bachuth`는 `알론바굿`으로 둔다.
- `Ben-oni`는 `베노니`, `Benjamin`은 `베냐민`, `Beth-lehem`은 `베들레헴`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 1041
  - Genesis 35 rows: 29
  - Genesis 35 public rows: 0
  - Status counts: `approved=31`, `ai_translated=1010`
- Supabase import: PASS
  - Staged rows: 1041
  - Target rows: 1041
  - Genesis 35 draft/private rows: 29
  - Translation terms: 1391
- Validation script: PASS
  - Errors: 0
  - Genesis 35 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/35`
  - Verse count: 29
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 35는 벧엘 정결 명령, 엘벧엘과 알론바굿, 이스라엘 이름 재확인, 라헬의 죽음, 야곱 아들 목록, 이삭의 죽음으로 구분해 검수한다.
- 이삭의 죽음 공식은 기존 아브라함/이스마엘 죽음 공식과 같은 문체로 유지했다.
- `Beth` broad term warning을 피하기 위해 검증어를 `Beth-el`로 좁혔다.
