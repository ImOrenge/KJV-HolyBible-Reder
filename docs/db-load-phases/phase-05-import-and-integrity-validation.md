# Phase 05: DB Import와 무결성 검증

## 목표

정규화된 CrossWire KJV 절 데이터를 `bible_verses_en`에 탑재하고, DB 내부에서 성경 구조와 본문 무결성을 검증한다.

## 입력

- `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- `supabase/seeds/bible_books_seed.sql`
- Phase 02 migration
- Phase 04 normalization report

## 산출물

- `scripts/import-kjv.ts`
- `scripts/validate-kjv.ts`
- `reports/kjv-import-validation.md`
- `reports/kjv-import-errors.json`

## 작업 체크리스트

- [ ] import script가 normalized JSONL을 streaming 방식으로 읽도록 작성한다.
- [ ] `bible_books`의 `book_order`와 `book_id`를 lookup한다.
- [ ] 각 row를 `bible_verses_en`에 insert 또는 upsert한다.
- [ ] import 전후 row count를 기록한다.
- [ ] import 실패 row를 별도 JSON으로 저장한다.
- [ ] transaction 범위를 정한다. 전체 rollback 또는 book 단위 rollback 중 선택한다.
- [ ] `verse_key` unique violation을 명확한 에러로 출력한다.
- [ ] `book_order, chapter, verse` unique violation을 명확한 에러로 출력한다.
- [ ] source metadata를 각 row 또는 import batch metadata에 남긴다.
- [ ] import 완료 후 DB validation script를 실행한다.
- [ ] validation report를 markdown으로 저장한다.

## DB 검증 쿼리 기준

### 총 절 수

```sql
select count(*) from bible_verses_en;
```

기대값:

```text
31,102
```

### 중복 verse_key

```sql
select verse_key, count(*)
from bible_verses_en
group by verse_key
having count(*) > 1;
```

기대값:

```text
0 rows
```

### 빈 본문

```sql
select verse_key
from bible_verses_en
where length(trim(text_en)) = 0;
```

기대값:

```text
0 rows
```

### 권/장 구조

```sql
select b.book_order, b.name_en, count(distinct v.chapter) as imported_chapters, b.chapter_count
from bible_books b
left join bible_verses_en v on v.book_id = b.id
group by b.book_order, b.name_en, b.chapter_count
order by b.book_order;
```

기대값:

```text
모든 권의 imported_chapters = chapter_count
```

## 검증 체크리스트

- [ ] `bible_books` row count가 66이다.
- [ ] `bible_verses_en` row count가 31,102이다.
- [ ] 1,189개 장에 verse가 하나 이상 있다.
- [ ] `GEN.1.1`, `PSA.23.1`, `JHN.3.16`, `REV.22.21` 샘플 조회가 성공한다.
- [ ] normalized count와 DB count가 일치한다.
- [ ] `verse_key` 중복이 없다.
- [ ] `book_id, chapter, verse` 중복이 없다.
- [ ] 빈 본문이 없다.
- [ ] markup 잔존 패턴이 없다. 예: `<w`, `<note`, `<title`, `<div`.
- [ ] source module/version/checksum이 누락되지 않았다.
- [ ] import script를 재실행해도 중복 row가 생기지 않는다.

## 완료 기준

- staging DB에 CrossWire KJV 전체 31,102절이 탑재되어 있다.
- validation report가 통과 상태다.
- 실패 row와 누락 row가 0개다.
- 앱 repository 전환 전 fixture와 실제 DB 데이터를 비교할 샘플 구절 목록이 준비되어 있다.
