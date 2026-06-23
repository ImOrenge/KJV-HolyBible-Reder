# Phase 04: CrossWire KJV 추출과 정규화

## 목표

CrossWire `KJV` SWORD 모듈에서 canonical verse만 추출해 DB import 가능한 절 단위 JSONL/CSV로 정규화한다.

## 입력

- `data/crosswire/kjv/raw/` 원본 모듈
- `data/crosswire/kjv/source-metadata.json`
- `data/crosswire/kjv/book-map.json`
- `supabase/seeds/bible_books_seed.sql`

## 산출물

- `scripts/extract-crosswire-kjv.ts`
- `scripts/normalize-kjv.ts`
- `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- `data/crosswire/kjv/normalized/kjv-verses.csv`
- `reports/kjv-normalization-report.md`

## 작업 체크리스트

- [ ] CrossWire 모듈을 읽는 방식을 확정한다.
- [ ] 후보 1: SWORD CLI 또는 `diatheke`로 OSIS/reference별 text를 export한다.
- [ ] 후보 2: JSword 또는 SWORD 라이브러리를 별도 변환 도구로 사용한다.
- [ ] 후보 3: raw module ZIP 구조를 분석해 안정적인 export command를 만든다.
- [ ] 모든 66권과 1,189장을 순회하는 extraction script를 작성한다.
- [ ] verse가 아닌 title, heading, note, cross-reference를 제외한다.
- [ ] Strong number와 morphology markup을 plain text에서 제거한다.
- [ ] red-letter markup은 MVP plain text에서 제거하되 후속 확장 가능성을 기록한다.
- [ ] punctuation, capitalization, apostrophe, semicolon, colon이 깨지지 않게 UTF-8로 저장한다.
- [ ] 각 row에 `book_order`, `book_id`, `osis_book_id`, `chapter`, `verse`, `verse_key`, `text_en`, `source_module`, `source_version`을 포함한다.
- [ ] 빈 본문 row를 실패로 처리한다.
- [ ] 중복 `verse_key`를 실패로 처리한다.
- [ ] 변환 결과의 총 verse count를 계산한다.
- [ ] CrossWire export log와 normalization report를 저장한다.

## 정규화 레코드 형식

```json
{
  "bookOrder": 1,
  "bookId": "gen",
  "osisBookId": "Gen",
  "chapter": 1,
  "verse": 1,
  "verseKey": "GEN.1.1",
  "textEn": "In the beginning God created the heaven and the earth.",
  "sourceName": "CrossWire KJV",
  "sourceModule": "KJV",
  "sourceModuleVersion": "3.1"
}
```

## 정규화 원칙

- 본문은 절 단위 plain text로 저장한다.
- CrossWire 원문을 임의로 현대화하지 않는다.
- 문장 부호와 대소문자를 보존한다.
- XML/OSIS/SWORD markup은 별도 필드 없이 제거한다.
- 원문에서 얻은 heading, note, Strong/morphology는 MVP DB 본문에 넣지 않는다.
- 후속 확장으로 원문 markup을 저장하려면 `bible_verse_annotations` 같은 별도 테이블을 둔다.

## 검증 체크리스트

- [ ] normalized 파일이 UTF-8이다.
- [ ] normalized row count가 31,102이다.
- [ ] `GEN.1.1`이 존재한다.
- [ ] `JHN.3.16` 또는 최종 확정한 요한복음 key가 존재한다.
- [ ] `REV.22.21`이 존재한다.
- [ ] `verse_key` 중복이 0개다.
- [ ] `text_en` 빈 값이 0개다.
- [ ] XML tag가 `text_en`에 남아 있지 않다.
- [ ] 권별 장 수가 `bible_books.chapter_count`와 일치한다.
- [ ] 장별 verse count report가 생성된다.

## 완료 기준

- CrossWire 원본에서 normalized JSONL/CSV를 재생성할 수 있다.
- normalization report가 count, 중복, 누락, 빈 본문, markup 잔존 여부를 포함한다.
- Phase 05 import script가 normalized 파일을 입력으로 사용할 수 있다.

## 참고 자료

- CrossWire OSIS overview: <https://crosswire.org/osis/>
