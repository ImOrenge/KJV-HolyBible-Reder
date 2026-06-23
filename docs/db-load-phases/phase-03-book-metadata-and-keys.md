# Phase 03: 66권 메타데이터와 Verse Key 규칙

## 목표

CrossWire KJV의 canonical book order와 앱의 한국어/영어 권 정보를 일치시키고, 모든 테이블과 API에서 공유할 `verse_key` 규칙을 확정한다.

## 입력

- `src/lib/bible-data.ts`의 66권 fixture
- `DB-plan.Md`의 `bible_books` 설계
- CrossWire KJV 모듈의 book identifiers

## 산출물

- `supabase/seeds/bible_books_seed.sql`
- `src/lib/bible-book-codes.ts`
- `data/crosswire/kjv/book-map.json`
- `reports/book-metadata-validation.md`

## 작업 체크리스트

- [ ] 66권 전체 목록을 `book_order` 1부터 66까지 정렬한다.
- [ ] 구약 39권, 신약 27권 구분을 검증한다.
- [ ] 각 권의 `chapter_count`를 검증한다.
- [ ] 앱 내부 book id를 확정한다. 예: `gen`, `exo`, `jhn`, `rev`.
- [ ] CrossWire book code와 앱 book id 매핑을 작성한다.
- [ ] OSIS book id와 앱 book id 매핑을 작성한다. 예: `Gen -> gen`.
- [ ] `name_ko`, `name_en`, `short_name_ko`, `short_name_en`을 채운다.
- [ ] `verse_key` 포맷을 확정한다.
- [ ] API 응답에서 쓸 display reference 포맷을 확정한다.
- [ ] seed SQL을 idempotent하게 작성한다.
- [ ] seed 실행 후 66권 row count를 검증한다.
- [ ] `book_order` 중복이 없는지 검증한다.
- [ ] 현재 fixture의 `Book` 타입과 DB schema 차이를 정리한다.

## Verse Key 규칙

기본 규칙은 다음과 같다.

```text
{BOOK_CODE_UPPER}.{CHAPTER}.{VERSE}
```

예시:

```text
GEN.1.1
JHN.3.16
REV.22.21
```

`BOOK_CODE_UPPER`는 앱 내부 3자 코드의 대문자 형태를 기본으로 한다. 단, 현재 `DB-plan.Md`의 예시처럼 `JOHN.3.16`을 사용할지, 앱 fixture처럼 `JHN.3.16`을 사용할지는 이 페이즈에서 최종 결정한다.

## 권장 결정

앱 내부 id, CrossWire/OSIS code, display name을 분리한다.

```json
{
  "bookOrder": 43,
  "appBookId": "jhn",
  "osisBookId": "John",
  "verseKeyBookCode": "JHN",
  "nameKo": "요한복음",
  "nameEn": "John",
  "shortNameKo": "요",
  "shortNameEn": "John"
}
```

이렇게 하면 CrossWire 표기와 앱 URL/DB key를 독립적으로 관리할 수 있다.

## 검증 체크리스트

- [ ] `select count(*) from bible_books` 결과가 66이다.
- [ ] OT count가 39이다.
- [ ] NT count가 27이다.
- [ ] `sum(chapter_count)` 결과가 1,189이다.
- [ ] `book_order`가 1부터 66까지 끊기지 않는다.
- [ ] 앱 fixture의 `bookTuples`와 seed 데이터가 같은 순서다.
- [ ] CrossWire에서 추출한 모든 verse가 `book-map.json`의 book에 매핑된다.

## 완료 기준

- `bible_books` seed가 재실행 가능하다.
- CrossWire book id, OSIS book id, 앱 book id, `verse_key` book code의 관계가 명확하다.
- Phase 04 normalization script가 이 mapping 파일만 보고 verse key를 생성할 수 있다.
