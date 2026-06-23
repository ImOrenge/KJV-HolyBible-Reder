# Phase 06: 앱 Repository를 DB 기반 KJV로 전환

## 목표

현재 fixture 기반 성경 리더를 DB 기반 CrossWire KJV 전체 본문 조회로 전환하고, 기존 통독/강조/인용 기능이 `verse_key` 기준으로 유지되게 한다.

## 입력

- Phase 05에서 검증된 `bible_books`, `bible_verses_en`
- 현재 `src/lib/bible-data.ts`
- 현재 `src/lib/bible-repository.ts`
- 현재 `src/lib/user-data-repository.ts`

## 산출물

- DB 기반 `BibleRepository`
- `/api/bible/books`
- `/api/bible/books/[bookId]/chapters/[chapter]`
- `/api/bible/verses/[verseKey]`
- fixture fallback 정책 문서
- `reports/db-reader-smoke-test.md`

## 작업 체크리스트

- [x] 현재 fixture repository의 public contract를 확인한다.
- [x] `Book`, `Verse` 타입에 DB 필드와 `verse_key`를 반영할지 결정한다.
- [x] DB row를 UI 타입으로 변환하는 mapper를 작성한다.
- [x] `bible_books` 목록 조회 API를 만든다.
- [x] 권/장 기준 절 목록 조회 API를 만든다.
- [x] `verse_key` 단건 조회 API를 만든다.
- [x] fixture에 있던 한국어 임시 본문이 실제 KJV 영어 본문과 섞이지 않게 한다.
- [x] 아직 한국어 승인본이 없을 때 UI가 영어 KJV만 명확히 보여주게 한다.
- [x] 마지막 읽은 위치 저장이 `bookId/chapter/verse`와 `verse_key`를 함께 다룰 수 있게 한다.
- [x] 강조와 인용 구절 저장이 `verse_key`를 장기 키로 사용하게 한다.
- [x] DB 조회 실패 시 사용자에게 빈 리더가 아니라 오류/재시도 상태를 보여준다.
- [x] mock/local storage와 DB 본문 repository의 경계를 문서화한다.
- [x] 핵심 장 조회 smoke test를 실행한다.

## API 응답 기준

장 본문 조회는 다음 형태를 기준으로 한다.

```json
{
  "book": {
    "id": "jhn",
    "order": 43,
    "nameKo": "요한복음",
    "nameEn": "John",
    "chapter": 3
  },
  "source": {
    "name": "CrossWire KJV",
    "module": "KJV",
    "version": "3.1"
  },
  "verses": [
    {
      "verseKey": "JHN.3.16",
      "bookId": "jhn",
      "chapter": 3,
      "verse": 16,
      "textEn": "For God so loved the world...",
      "textKo": null,
      "translationStatus": null
    }
  ]
}
```

## UX 전환 원칙

- fixture 본문 문구는 실제 DB 전환 후 사용자 화면에 남지 않아야 한다.
- 한국어 번역이 준비되지 않은 상태를 "오류"로 처리하지 않는다.
- source 표기는 리더 하단 또는 설정/정보 화면에서 확인할 수 있게 한다.
- KJV 영어 원문은 사용자가 수정할 수 없다.
- 개인 기록은 원문 row id가 바뀌어도 `verse_key`로 복구 가능해야 한다.

## 검증 체크리스트

- [x] Genesis 1장을 DB에서 조회해 리더에 표시한다.
- [x] Psalms 23장을 DB에서 조회해 리더에 표시한다.
- [x] John 3장을 DB에서 조회해 16절을 확인한다.
- [x] Revelation 22장을 DB에서 조회해 마지막 장 이동을 확인한다.
- [x] 이전/다음 장 이동이 DB 전체 범위에서 동작한다.
- [x] 읽음 완료 저장이 DB 본문 조회 후에도 동작한다.
- [x] 강조 저장이 `verse_key` 기준으로 동작한다.
- [x] 인용 저장이 `verse_key` 기준으로 동작한다.
- [x] TTS가 영어 KJV 본문을 읽는다.
- [x] fixture-only 장 준비 중 문구가 실제 탑재 장에는 나오지 않는다.

## 실행 결과

- 완료일: 2026-06-21
- smoke test: `reports/db-reader-smoke-test.md`
- fixture fallback 정책: `docs/db-load-phases/phase-06-fixture-fallback-policy.md`
- 주의: 개인 통독/강조/인용 데이터 저장소는 Phase 06에서 아직 Supabase user tables로 이전하지 않았고, localStorage mock repository를 유지한다.

## 완료 기준

- 앱에서 CrossWire KJV 전체 권/장/절을 조회할 수 있다.
- 기존 MVP 기능이 DB 본문과 연결되어 동작한다.
- 한국어 번역 부재 상태가 명확하고 안정적으로 처리된다.
- smoke test report가 통과 상태다.
