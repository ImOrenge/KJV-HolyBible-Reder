# Genesis 28 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.28.1` - `GEN.28.22`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 28 초본 22절 추가
- `docs/translation-style-guide.md`에 Genesis 28 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 28 핵심 용어와 벧엘 서원 표현 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 28 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `God Almighty`는 `전능하신 하나님`, `blessing of Abraham`은 `아브라함의 복`으로 둔다.
- 야곱의 꿈 기사는 `ladder=사다리`, `angels of God=하나님의 천사들`, `house of God=하나님의 집`, `gate of heaven=하늘의 문`으로 둔다.
- 벧엘 서원은 `Beth-el=벧엘`, `Luz=루스`, `vowed a vow=서원을 서원`, `tenth=십분의 일`로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 796
  - Genesis 28 rows: 22
  - Genesis 28 public rows: 0
  - Status counts: `approved=31`, `ai_translated=765`
- Supabase import: PASS
  - Staged rows: 796
  - Target rows: 796
  - Genesis 28 draft/private rows: 22
  - Translation terms: 1055
- Validation script: PASS
  - Errors: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/28`
  - Verse count: 22
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 28은 야곱의 밧단아람 파송, 에서의 마할랏 혼인, 야곱의 벧엘 꿈과 서원으로 구분해 검수한다.
- 꿈과 서원 장면은 해설을 본문에 넣지 않고 KJV의 상징어와 반복 구조를 보존한다.
