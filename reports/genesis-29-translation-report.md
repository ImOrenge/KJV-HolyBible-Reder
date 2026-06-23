# Genesis 29 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.29.1` - `GEN.29.35`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 29 초본 35절 추가
- `docs/translation-style-guide.md`에 Genesis 29 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 29 핵심 용어와 인명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 29 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Rachel=라헬`, `Leah=레아`, `Zilpah=실바`, `Bilhah=빌하`로 둔다.
- 레아의 아들 이름은 `Reuben=르우벤`, `Simeon=시므온`, `Levi=레위`, `Judah=유다`로 둔다.
- `beguiled me`는 `나를 속였`, `affliction`은 기존 기준대로 `고난`, `barren`은 `불임`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 831
  - Genesis 29 rows: 35
  - Genesis 29 public rows: 0
  - Status counts: `approved=31`, `ai_translated=800`
- Supabase import: PASS
  - Staged rows: 831
  - Target rows: 831
  - Genesis 29 draft/private rows: 35
  - Translation terms: 1117
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/29`
  - Verse count: 35
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 29는 야곱의 우물 도착, 라헬과 라반 만남, 레아/라헬 혼인 교환, 레아의 네 아들 출산으로 구분해 검수한다.
- 라반의 교환 장면은 KJV의 완곡한 혼인 표현을 유지하고 해설을 본문에 넣지 않는다.
