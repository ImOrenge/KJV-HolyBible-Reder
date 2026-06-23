# Phase 07: 한국어 자체 번역 파이프라인

## 목표

CrossWire KJV 영어 원문을 기준으로 한국어 자체 번역 초안, 용어 사전, 장 단위 검수, 승인본 공개 흐름을 준비한다.

## 입력

- `bible_verses_en`
- `bible_verses_ko`
- `translation_terms`
- `translation_reviews`
- `DB-plan.Md`의 번역 상태 기준

## 산출물

- `data/translations/ko/kjv-study-draft.jsonl`
- `scripts/import-ko-translation.ts`
- `scripts/validate-ko-translation.ts`
- `docs/translation-review-workflow.md`
- `supabase/seeds/translation_terms_seed.sql`
- `reports/ko-translation-validation.md`

## 작업 체크리스트

- [ ] `bible_verses_en`의 모든 row가 한국어 번역 후보 source가 되게 한다.
- [x] 한국어 번역명 기본값을 확정한다. 예: `KJV Korean Study Translation`.
- [x] 초기 초안 상태를 `ai_translated` 또는 `draft` 중 하나로 확정한다.
- [x] 번역 생성 단위를 정한다. 권 단위, 장 단위, 절 단위 중 장 단위를 기본으로 권장한다.
- [x] 용어 사전 seed를 작성한다.
- [x] `God`, `LORD`, `Lord`, `Holy Ghost`, `Spirit`, `soul`, `flesh`, `sin`, `salvation`, `righteousness` 같은 핵심 용어를 등록한다.
- [x] 번역 import script가 `en_verse_id`와 `verse_key`를 모두 검증하게 한다.
- [x] 승인되지 않은 번역은 `is_public = false`로 유지한다.
- [x] 검수 의견과 이전 문장을 `translation_reviews`에 남긴다.
- [x] 장 단위 검수 체크리스트를 만든다.
- [x] 승인본만 앱 기본 한국어 본문으로 노출하는 query/API를 만든다.
- [x] 한국어 번역 누락/상태별 count report를 만든다.

## 번역 상태 흐름

```text
draft
-> ai_translated
-> reviewing
-> reviewed
-> approved
```

재검토가 필요하면 언제든 `needs_check`로 되돌린다.

## 장 단위 검수 체크리스트

- [ ] KJV 영어 원문 의미를 보존한다.
- [ ] 절 단위 번역이 장 전체 문맥에서 자연스럽다.
- [ ] 신학 용어가 `translation_terms`와 충돌하지 않는다.
- [ ] 고유명사 표기가 같은 권 안에서 일관된다.
- [ ] 대명사 지시 대상이 문맥상 모호하지 않다.
- [ ] 문체와 경어 수준이 통일되어 있다.
- [ ] 구절 번호와 본문이 1:1로 연결되어 있다.
- [ ] 검수자가 남긴 수정 사유가 기록되어 있다.
- [ ] 최종 승인 전 `approved`가 아닌 상태로 공개되지 않는다.

## 검증 체크리스트

- [ ] `bible_verses_ko`의 모든 row가 유효한 `en_verse_id`를 가진다.
- [ ] `verse_key`가 영어 원문과 일치한다.
- [ ] 같은 번역명 안에서 중복 `verse_key`가 없다.
- [ ] `text_ko` 빈 값이 없다.
- [ ] `translation_status`가 허용된 값만 가진다.
- [ ] `approved`가 아닌 row는 public query에서 제외된다.
- [ ] `translation_reviews`에 변경 이력이 저장된다.
- [ ] 용어 사전 충돌 report가 생성된다.

## 완료 기준

- 한국어 번역 초안을 DB에 안전하게 적재할 수 있다.
- 승인본 공개 전 검수 상태와 이력이 보존된다.
- 앱은 영어 KJV 원문과 한국어 승인본을 같은 `verse_key`로 조합해 보여줄 수 있다.

## Phase 07 시작 실행 범위

- 시작일: 2026-06-21
- 파일럿 범위: Genesis 1장 `GEN.1.1` - `GEN.1.31`
- 번역명: `KJV Korean Study Translation`
- 초본 상태: `ai_translated`
- 공개 여부: `is_public=false`
- 문체 기준: `docs/translation-style-guide.md`
- 검수 흐름: `docs/translation-review-workflow.md`
- 검증 보고서: `reports/ko-translation-validation.md`

## EN/KR 리더 스위치 업데이트

- 완료일: 2026-06-21
- Genesis 1장 `GEN.1.1` - `GEN.1.31`을 `approved`, `is_public=true`로 전환했다.
- `/api/bible/books/[bookId]/chapters/[chapter]`는 승인된 한국어 본문이 있으면 `textKo`를 함께 반환한다.
- `/api/bible/verses/[verseKey]`는 승인된 한국어 단일 구절을 함께 반환한다.
- 리더 UI는 `EN/KR` 버튼으로 표시 언어를 전환한다.
- 승인된 한국어 본문이 없는 장에서 `KR`을 선택하면 영어 본문으로 fallback하고 승인본 없음 상태를 표시한다.
