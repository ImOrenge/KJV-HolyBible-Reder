# Genesis 32 Translation Report

- Date: 2026-06-21
- Phase: Phase 07 Korean draft translation
- Scope: `GEN.32.1` - `GEN.32.32`
- Source: CrossWire KJV normalized module
- Translation: `KJV Korean Study Translation`
- Status: `ai_translated`
- Public: `false`
- Result: PASS

## 작업 내용

- `data/translations/ko/kjv-study-draft.jsonl`에 Genesis 32 초본 32절 추가
- `docs/translation-style-guide.md`에 Genesis 32 용어 기준 추가
- `supabase/seeds/translation_terms_seed.sql`에 Genesis 32 핵심 용어와 설명 추가
- `scripts/validate-ko-translation.mjs`에 Genesis 32 검증 용어 추가

## 용어 기준

- `rested = 안식` 기준은 기존 Genesis 2/8/18 검증 규칙으로 유지한다.
- `sign/signs = 징조`, `token = 징표`, `mark = 표` 구분을 유지한다.
- `Mahanaim`은 `마하나임`, `Peniel`은 `브니엘`, `Penuel`은 `브누엘`로 둔다.
- `sinew which shrank`는 `오그라든 힘줄`, `hollow of his thigh`는 `넓적다리 오목한 곳`으로 둔다.

## 검증 결과

- Local JSONL parse: PASS
  - Total rows: 961
  - Genesis 32 rows: 32
  - Genesis 32 public rows: 0
  - Status counts: `approved=31`, `ai_translated=930`
- Supabase import: PASS
  - Staged rows: 961
  - Target rows: 961
  - Changed existing rows: 3
  - Genesis 32 draft/private rows: 32
  - Translation terms: 1283
- Validation script: PASS
  - Errors: 0
  - Genesis 32 term warnings: 0
  - Report: `reports/ko-translation-validation.md`
- API private draft check: PASS
  - `/api/bible/books/gen/chapters/32`
  - Verse count: 32
  - Public `textKo` rows: 0
- Lint: PASS
- TypeScript: PASS
- Build: PASS

## 검수 메모

- Genesis 32는 마하나임, 에서 대면 준비, 야곱의 기도, 예물 떼 배치, 얍복 나루 씨름과 브니엘 명명으로 구분해 검수한다.
- `as a prince hast thou power with God and with men`은 초본에서 `통치자로서 하나님과 사람들과 더불어 권능을 가졌고 또 이겼기 때문이라`로 보존했으나 장 단위 검수에서 문체 조정이 필요하다.
- 기존 broad term warning을 줄이기 위해 `God of my father` 검증 구문은 Genesis 31 문맥의 `God of my father hath`로 좁혔다.
