# Phase 02: DB 스키마와 Migration 준비

## 목표

`DB-plan.Md`의 본문/메타데이터 설계를 Supabase migration으로 만들고, CrossWire KJV 본문을 안전하게 재탑재할 수 있는 DB 구조를 확정한다.

## 입력

- `DB-plan.Md`
- Phase 01의 source metadata
- 현재 앱 도메인 타입: `src/lib/types.ts`
- 현재 fixture 구조: `src/lib/bible-data.ts`

## 산출물

- `supabase/migrations/001_create_bible_books.sql`
- `supabase/migrations/002_create_bible_verses_en.sql`
- `supabase/migrations/003_create_bible_verses_ko.sql`
- `supabase/migrations/004_create_translation_terms.sql`
- `supabase/migrations/005_create_user_bible_data.sql`
- `supabase/migrations/006_create_bible_indexes.sql`
- `supabase/migrations/007_create_rls_policies.sql`

## 작업 체크리스트

- [ ] `bible_books` 테이블을 생성한다.
- [ ] `bible_verses_en` 테이블을 생성한다.
- [ ] `bible_verses_en.verse_key`를 unique로 둔다.
- [ ] `bible_verses_en.source_name` 기본값을 `CrossWire KJV` 또는 `KJV`로 확정한다.
- [ ] `bible_verses_en.source_module` 필드를 둘지 결정한다.
- [ ] `bible_verses_en.source_version` 필드를 둘지 결정한다.
- [ ] `bible_verses_en.source_license` 필드에 CrossWire metadata를 기록할 수 있게 한다.
- [ ] `bible_verses_ko` 테이블을 생성한다.
- [ ] 한국어 번역은 `en_verse_id`와 `verse_key`로 영어 원문에 연결한다.
- [ ] `translation_status` check constraint를 추가한다.
- [ ] `translation_terms`와 `translation_reviews` 테이블을 생성한다.
- [ ] 사용자 읽기/강조/인용/태그/설정 테이블을 생성한다.
- [ ] `book_order, chapter, verse` location index를 만든다.
- [ ] `verse_key` index를 만든다.
- [ ] 영어 본문 full text search column 또는 후속 migration 위치를 정한다.
- [ ] 사용자 데이터 테이블에 RLS를 적용한다.
- [ ] 성경 원문 테이블은 public read, write restricted 정책을 정한다.
- [ ] migration rollback 또는 재생성 절차를 문서화한다.

## 권장 스키마 보강

`DB-plan.Md`의 `bible_verses_en`에 다음 필드를 추가하는 것을 권장한다.

```sql
source_module text not null default 'KJV',
source_module_version text,
source_downloaded_at timestamptz,
source_checksum text
```

이 필드는 본문이 어느 CrossWire 모듈 스냅샷에서 왔는지 DB 레벨에서 추적하기 위한 것이다.

## import 재실행 조건

- 같은 `verse_key`는 upsert 또는 truncate-and-reload 정책 중 하나로만 처리한다.
- 운영 DB에서는 사용자 데이터와 원문 본문 테이블을 분리하므로 원문 재탑재가 개인 기록을 삭제하지 않아야 한다.
- `bible_verses_en.id`가 바뀌는 방식으로 재탑재할 경우 사용자 테이블의 `en_verse_id` 참조 영향을 검토한다.
- 안정성을 우선하면 `verse_key`를 사용자 데이터의 장기 연결 키로 유지한다.

## 완료 기준

- Supabase local 또는 staging DB에서 모든 migration이 순서대로 적용된다.
- 성경 본문 import 전 빈 schema 상태에서 index와 constraint가 정상 생성된다.
- 사용자 데이터 RLS 정책이 원문 public read 정책과 충돌하지 않는다.
- Phase 03의 66권 seed를 삽입할 준비가 끝난다.
