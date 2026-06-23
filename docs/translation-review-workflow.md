# Korean Translation Review Workflow

## 범위

Phase 07은 CrossWire KJV 영어 원문을 기준으로 한국어 자체 번역 초본을 만들고, 장 단위 검수를 거쳐 승인본만 공개하는 흐름을 구축한다.

## 기본 흐름

1. 장 단위 초본 생성
2. `translation_terms` 용어 사전과 대조
3. `bible_verses_ko`에 `ai_translated`, `is_public=false`로 적재
4. 구조 검증 실행
5. 검수자가 장 전체 흐름을 확인
6. 수정 시 `translation_reviews`에 이전 문장과 수정 문장을 기록
7. 최종 승인 시에만 `translation_status='approved'`, `is_public=true`로 전환

## 장 단위 검수 체크리스트

- [ ] KJV 원문 의미가 누락되지 않았다.
- [ ] KJV 원문의 반복 구조가 유지되었다.
- [ ] 성경 고유 문체가 유지되었다.
- [ ] 핵심 용어가 `translation_terms`와 충돌하지 않는다.
- [ ] 같은 장 안에서 고유명사와 신학 용어가 일관된다.
- [ ] 절 번호와 번역문이 1:1로 대응한다.
- [ ] 설명식 의역이나 해설이 본문에 섞이지 않았다.
- [ ] 공개 전 상태가 `approved`가 아니면 `is_public=false`다.

## Genesis 1 파일럿 기준

- 번역 파일: `data/translations/ko/kjv-study-draft.jsonl`
- 범위: `GEN.1.1` - `GEN.1.31`
- 상태: `ai_translated`
- 공개 여부: `false`
- 문체 목표: 창조 기사 반복 어법 보존

## 검수 기록

초본 수정 import 시 기존 문장과 새 문장이 다르면 `translation_reviews`에 다음 값이 기록된다.

- `previous_text`
- `revised_text`
- `review_status='revised'`
- `comment`

초기 적재는 기존 문장이 없으므로 review row를 만들지 않는다.

## 공개 게이트

다음 조건을 모두 만족해야 공개할 수 있다.

- 장 단위 검수 완료
- 주요 용어 충돌 없음
- `needs_check` row 없음
- 승인자가 `approved` 처리
- 승인 row만 `is_public=true`
