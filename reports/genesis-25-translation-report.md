# Genesis 25 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.25.1` - `GEN.25.34`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 25 초본 34절 추가
- `docs/translation-style-guide.md`에 Genesis 25 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 25 핵심 용어와 인명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 25 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Keturah`, `Zimran`, `Jokshan`, `Midian` 등 그두라 자손 고유명사를 장 단위로 고정한다.
- `gave up the ghost`는 `숨을 거두고`, `gathered to his people`는 `자기 백성에게로 모였느니라` 계열로 둔다.
- `Esau`, `Jacob`, `birthright`, `pottage of lentiles`는 각각 `에서`, `야곱`, `장자권`, `렌즈콩 죽`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 693
  - Genesis 25 rows: 34
  - Genesis 25 public rows: 0
  - Status counts: `approved=31`, `ai_translated=662`
- Supabase import: PASS
  - Staged rows: 693
  - Target rows: 693
  - Genesis 25 draft/private rows: 34
  - Translation terms: 883
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/25`
  - Verse count: 34
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 25는 그두라 자손 족보, 아브라함과 이스마엘의 죽음 공식, 이삭-리브가의 쌍둥이 예언, 에서의 장자권 매각 기사로 구분해 검수한다.
- KJV 반복 공식의 문장 구조를 과도하게 현대어로 풀지 않고 `-였느니라`, `-하였느니라` 계열의 성경 문체를 유지한다.
