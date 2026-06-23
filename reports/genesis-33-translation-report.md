# Genesis 33 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.33.1` - `GEN.33.20`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 33 초본 20절 추가
- `docs/translation-style-guide.md`에 Genesis 33 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 33 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 33 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Succoth`는 `숙곳`, `Shalem`은 `살렘`, `El-elohe-Israel`은 `엘엘로헤이스라엘`로 둔다.
- `bowed himself to the ground seven times`는 `땅에 몸을 일곱 번 굽혔`, `fell on his neck`은 `목을 안고`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 981
  - Genesis 33 rows: 20
  - Genesis 33 public rows: 0
  - Status counts: `approved=31`, `ai_translated=950`
- Supabase import: PASS
  - Staged rows: 981
  - Target rows: 981
  - Genesis 33 draft/private rows: 20
  - Translation terms: 1314
- Validation script: PASS
  - Errors: 0
  - Genesis 33 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/33`
  - Verse count: 20
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 33은 야곱과 에서 재회, 예물 수락, 세일 대신 숙곳으로 이동, 세겜 앞 정착과 제단 명명으로 구분해 검수한다.
- `my blessing that is brought to thee`는 초본에서 `가져온 내 복물`로 두었으며, 장 단위 검수에서 `blessing`과 `present`의 차이를 확인한다.
- `foremost` 검증어는 Genesis 32/33 양쪽 표현을 포괄하도록 `맨 앞`으로 조정했다.
