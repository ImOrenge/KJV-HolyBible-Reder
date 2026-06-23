# Genesis 26 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.26.1` - `GEN.26.35`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 26 초본 35절 추가
- `docs/translation-style-guide.md`에 Genesis 26 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 26 핵심 용어와 인명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 26 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Philistines`, `Gerar`, `Abimelech`, `Phichol`, `Beer-sheba`는 기존 표기를 유지한다.
- 우물 이름은 `Esek=에섹`, `Sitnah=싯나`, `Rehoboth=르호보트`, `Shebah=세바`로 둔다.
- 에서의 헷 사람 아내 기사는 `Judith=유딧`, `Beeri the Hittite=헷 사람 브에리`, `Bashemath=바스맛`, `Elon the Hittite=헷 사람 엘론`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 728
  - Genesis 26 rows: 35
  - Genesis 26 public rows: 0
  - Status counts: `approved=31`, `ai_translated=697`
- Supabase import: PASS
  - Staged rows: 728
  - Target rows: 728
  - Genesis 26 draft/private rows: 35
  - Translation terms: 942
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/26`
  - Verse count: 35
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 26은 이삭의 그랄 체류와 리브가 은폐 사건, 우물 분쟁, 브엘세바 언약, 에서의 헷 사람 아내 기사로 구분해 검수한다.
- `sporting with Rebekah`은 완곡한 KJV 표현으로 보존하되 노골적 해설을 본문에 넣지 않는다.
