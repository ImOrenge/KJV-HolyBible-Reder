# Phase 06 Fixture Fallback Policy

## 원칙

- Phase 06 이후 사용자에게 표시되는 성경 본문은 Supabase `bible_verses_en`의 CrossWire KJV를 기준으로 한다.
- fixture 본문은 개발 참조 데이터로만 남기며, 리더/검색 UI의 기본 본문 fallback으로 사용하지 않는다.
- Supabase 본문 조회가 실패하면 빈 fixture 장을 보여주지 않고 오류 상태를 표시한다.

## 현재 경계

- `src/lib/bible-data.ts`, `src/lib/bible-repository.ts`
  - 책 메타데이터, 장 이동, 기존 fixture 참조를 유지한다.
  - 장 본문/검색/단일 구절 UI 로딩의 primary source는 아니다.
- `src/app/api/bible/*`
  - Supabase REST Data API를 통해 `bible_books`, `bible_verses_en`을 읽는다.
  - API 응답은 UI용 `Book`, `Verse` 타입으로 변환한다.
- `src/components/kjv-mvp-app.tsx`
  - 장 본문과 검색 결과를 `/api/bible/*`에서 가져온다.
  - 개인 기록은 기존 localStorage mock repository에 남아 있다.

## Verse Key 호환

- 새 구절 id는 `verse_key`를 그대로 사용한다. 예: `JHN.3.16`.
- 기존 localStorage에 남은 legacy fixture id는 `bookId-chapter-verse` 형식으로 감지해 `verse_key`로 변환한다. 예: `jhn-3-16` -> `JHN.3.16`.
- 장기 저장 키는 `verse_key`를 기준으로 한다.

## 한국어 본문 정책

- 현재 Phase 06 범위에는 승인된 한국어 번역본이 없다.
- UI는 영어 KJV 본문을 명확히 보여주며 `textKo`, `translationStatus`는 `null` 상태로 둔다.
- 한국어 번역 부재는 오류가 아니다.

## 실패 처리

- 장 조회 실패: 리더에 오류 메시지를 표시한다.
- 검색 실패: 검색 결과 영역에 오류 메시지를 표시한다.
- 저장된 강조/인용 구절 조회 실패: 해당 항목은 숨기고, 다른 항목 렌더링은 계속한다.
- fixture 본문으로 자동 대체하지 않는다.
