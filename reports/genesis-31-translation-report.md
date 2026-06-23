# Genesis 31 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.31.1` - `GEN.31.55`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 31 초본 55절 추가
- `docs/translation-style-guide.md`에 Genesis 31 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 31 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 31 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `images`는 라헬의 드라빔 기사에서 `드라빔`으로 둔다.
- `Jegar-sahadutha=여갈사하두다`, `Galeed=갈르엣`, `Mizpah=미스바`, `fear of Isaac=이삭의 두려움이신 분`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 929
  - Genesis 31 rows: 55
  - Genesis 31 public rows: 0
  - Status counts: `approved=31`, `ai_translated=898`
- Supabase import: PASS
  - Staged rows: 929
  - Target rows: 929
  - Genesis 31 draft/private rows: 55
  - Translation terms: 1221
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
  - Term warnings remain review prompts, not structural failures.
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/31`
  - Verse count: 55
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 31은 라반의 아들들의 원망, 하나님 명령에 따른 야곱의 도주, 라헬의 드라빔 은닉, 라반과 야곱의 언약 체결로 구분해 검수한다.
- `stole away unawares`, `images`, `fear of Isaac`, `Jegar-sahadutha/Galeed/Mizpah`는 장 단위 검수에서 우선 확인한다.
- `harp`는 기존 검증 기준에 맞춰 `수금`으로 두었고, `wroth`는 `분노하여`로 맞추었다.
