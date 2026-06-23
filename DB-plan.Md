# KJV 기반 성경 통독·공부 웹앱 DB 구축 계획서

## 1. DB 구축 목표

본 DB는 KJV 영어 성경 원문을 기반으로 성경 통독, 구절 강조, 인용 구절 저장, TTS 재생, 한국어 자체 번역 관리 기능을 제공하기 위한 구조로 설계한다.

핵심 목표는 다음과 같다.

1. 성경 66권의 권, 장, 절 구조를 안정적으로 저장한다.
2. 영어 KJV 원문을 절 단위로 저장한다.
3. 자체 한국어 번역본을 영어 원문과 연결하여 관리한다.
4. 번역 상태를 `초안 / 검수 / 승인` 단계로 관리한다.
5. 사용자별 읽기 위치, 통독 진척도, 강조 구절, 저장 구절을 분리 저장한다.
6. TTS 재생, 검색, 태그, 메모 기능을 확장 가능하게 만든다.

---

# 2. 전체 DB 구성 개요

DB는 크게 4개 영역으로 나눈다.

```text
1. 성경 메타데이터 영역
- 성경 권 정보
- 장 정보
- 절 위치 정보

2. 성경 본문 영역
- 영어 KJV 원문
- 한국어 자체 번역문
- 번역 상태
- 번역 검수 기록

3. 사용자 학습 데이터 영역
- 마지막 읽은 위치
- 읽은 장
- 형광 강조 구절
- 인용 구절 보관함
- 태그
- 메모

4. 앱 설정 및 기능 데이터 영역
- 사용자 설정
- TTS 설정
- 검색 인덱스
- 로그
```

---

# 3. 기본 데이터 구조

## 3.1 성경 권 테이블

성경 66권의 기본 정보를 저장한다.

```sql
create table bible_books (
  id uuid primary key default gen_random_uuid(),
  book_order int not null unique,
  testament text not null check (testament in ('OT', 'NT')),
  name_ko text not null,
  name_en text not null,
  short_name_ko text not null,
  short_name_en text not null,
  chapter_count int not null,
  created_at timestamptz default now()
);
```

## 예시 데이터

```sql
insert into bible_books
(book_order, testament, name_ko, name_en, short_name_ko, short_name_en, chapter_count)
values
(1, 'OT', '창세기', 'Genesis', '창', 'Gen', 50),
(2, 'OT', '출애굽기', 'Exodus', '출', 'Exo', 40),
(3, 'OT', '레위기', 'Leviticus', '레', 'Lev', 27),
(40, 'NT', '마태복음', 'Matthew', '마', 'Mat', 28),
(43, 'NT', '요한복음', 'John', '요', 'John', 21),
(66, 'NT', '요한계시록', 'Revelation', '계', 'Rev', 22);
```

---

# 4. 영어 KJV 원문 테이블

영어 KJV 원문은 절 단위로 저장한다.

```sql
create table bible_verses_en (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references bible_books(id) on delete cascade,
  book_order int not null,
  chapter int not null,
  verse int not null,
  verse_key text not null unique,
  text_en text not null,
  source_name text not null default 'KJV',
  source_license text,
  created_at timestamptz default now(),

  unique(book_id, chapter, verse)
);
```

## verse_key 규칙

`verse_key`는 성경 구절을 고유하게 식별하기 위한 문자열이다.

```text
창세기 1장 1절 → GEN.1.1
요한복음 3장 16절 → JOHN.3.16
요한계시록 22장 21절 → REV.22.21
```

이 값은 영어 원문, 한국어 번역, 사용자 저장 데이터가 서로 연결될 때 기준 키로 사용한다.

---

# 5. 한국어 자체 번역 테이블

영어 KJV 원문을 기반으로 만든 자체 한국어 번역문을 저장한다.

```sql
create table bible_verses_ko (
  id uuid primary key default gen_random_uuid(),
  en_verse_id uuid not null references bible_verses_en(id) on delete cascade,
  book_id uuid not null references bible_books(id) on delete cascade,
  book_order int not null,
  chapter int not null,
  verse int not null,
  verse_key text not null,
  text_ko text not null,
  translation_name text not null default 'KJV Korean Study Translation',
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'ai_translated', 'reviewing', 'reviewed', 'approved', 'needs_check')),
  is_public boolean not null default false,
  reviewer_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(verse_key, translation_name)
);
```

## 번역 상태 기준

```text
draft
- 사람이 직접 작성한 초안

ai_translated
- AI가 생성한 초벌 번역

reviewing
- 검수 중

reviewed
- 1차 검수 완료

approved
- 최종 승인되어 앱 기본 본문으로 사용 가능

needs_check
- 신학 용어, 문맥, 고유명사 등 재검토 필요
```

---

# 6. 번역 검수 기록 테이블

번역 수정 이력을 보존하기 위한 테이블이다.

```sql
create table translation_reviews (
  id uuid primary key default gen_random_uuid(),
  ko_verse_id uuid not null references bible_verses_ko(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  previous_text text,
  revised_text text not null,
  review_status text not null
    check (review_status in ('commented', 'revised', 'approved', 'rejected')),
  comment text,
  created_at timestamptz default now()
);
```

## 목적

* 번역 변경 이력 보존
* 검수자 의견 저장
* 승인 전후 문장 비교
* 신학 용어 변경 추적
* 오번역 발생 시 롤백 가능

---

# 7. 용어 사전 테이블

KJV 번역은 용어 통일이 중요하므로 신학 용어 사전을 따로 둔다.

```sql
create table translation_terms (
  id uuid primary key default gen_random_uuid(),
  kjv_term text not null,
  ko_term text not null,
  category text,
  description text,
  rule_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(kjv_term, ko_term)
);
```

## 예시

```sql
insert into translation_terms
(kjv_term, ko_term, category, description, rule_note)
values
('God', '하나님', 'divine_name', '하나님을 가리키는 일반 명칭', '문맥상 우상이나 거짓 신과 구분 필요'),
('LORD', '주', 'divine_name', '대문자 LORD 표기', 'Lord와 구분하여 관리'),
('Holy Ghost', '성령', 'spirit', 'KJV의 Holy Ghost 표현', 'Holy Spirit과 병행 검토'),
('soul', '혼', 'anthropology', '사람의 혼', 'spirit, body와 구분'),
('flesh', '육체', 'anthropology', '육체 또는 육신', '문맥별 검토'),
('salvation', '구원', 'doctrine', '구원', '일관 번역');
```

---

# 8. 사용자 읽기 기록 테이블

사용자의 마지막 읽은 위치를 저장한다.

```sql
create table user_reading_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references bible_books(id) on delete cascade,
  book_order int not null,
  chapter int not null,
  verse int,
  scroll_position int default 0,
  last_read_at timestamptz default now(),

  unique(user_id)
);
```

## 저장 기준

페이지 단위가 아니라 다음 기준으로 저장한다.

```text
- 성경 권
- 장
- 절
- 스크롤 위치
- 마지막 읽은 시각
```

웹에서는 글자 크기, 화면 크기, 줄 간격에 따라 페이지가 달라지기 때문에 “페이지 번호”보다 “장/절/스크롤 위치”가 안정적이다.

---

# 9. 통독 완료 장 테이블

사용자가 읽음 완료 처리한 장을 저장한다.

```sql
create table user_completed_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references bible_books(id) on delete cascade,
  book_order int not null,
  chapter int not null,
  completed_at timestamptz default now(),

  unique(user_id, book_id, chapter)
);
```

## 통독률 계산

성경 전체 장 수는 1,189장 기준으로 계산한다.

```sql
select
  count(*) as completed_count,
  round((count(*)::numeric / 1189) * 100, 2) as progress_percent
from user_completed_chapters
where user_id = :user_id;
```

---

# 10. 형광 강조 구절 테이블

사용자가 특정 구절을 형광펜처럼 강조한 기록을 저장한다.

```sql
create table user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  en_verse_id uuid references bible_verses_en(id) on delete cascade,
  ko_verse_id uuid references bible_verses_ko(id) on delete set null,
  color text not null default 'yellow'
    check (color in ('yellow', 'blue', 'green', 'red', 'purple', 'orange')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, verse_key)
);
```

## 색상 의미 예시

```text
yellow  - 중요
blue    - 묵상
green   - 약속
red     - 경고
purple  - 예언
orange  - 개인 적용
```

---

# 11. 인용 구절 보관함 테이블

자주 인용하는 구절을 별도로 저장한다.

```sql
create table user_favorite_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  en_verse_id uuid references bible_verses_en(id) on delete cascade,
  ko_verse_id uuid references bible_verses_ko(id) on delete set null,
  title text,
  memo text,
  usage_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, verse_key)
);
```

## 사용 예시

```text
요한복음 3:16
태그: 구원, 복음, 하나님의 사랑
메모: 전도용 핵심 구절
사용 횟수: 12회
```

---

# 12. 태그 테이블

강조 구절, 인용 구절, 노트에 연결할 수 있는 사용자별 태그를 저장한다.

```sql
create table user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),

  unique(user_id, name)
);
```

## 인용 구절 태그 연결 테이블

```sql
create table user_favorite_verse_tags (
  id uuid primary key default gen_random_uuid(),
  favorite_verse_id uuid not null references user_favorite_verses(id) on delete cascade,
  tag_id uuid not null references user_tags(id) on delete cascade,

  unique(favorite_verse_id, tag_id)
);
```

## 강조 구절 태그 연결 테이블

```sql
create table user_highlight_tags (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references user_highlights(id) on delete cascade,
  tag_id uuid not null references user_tags(id) on delete cascade,

  unique(highlight_id, tag_id)
);
```

---

# 13. 사용자 설정 테이블

읽기 화면, TTS, 테마 설정을 저장한다.

```sql
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  font_size int not null default 18,
  line_height numeric not null default 1.8,
  reader_width text not null default 'normal'
    check (reader_width in ('narrow', 'normal', 'wide')),
  tts_rate numeric not null default 1.0,
  tts_pitch numeric not null default 1.0,
  tts_voice text,
  default_translation text not null default 'ko',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id)
);
```

---

# 14. TTS 재생 기록 테이블

필수 기능은 아니지만, 추후 통계와 이어 듣기 기능을 위해 설계한다.

```sql
create table user_tts_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references bible_books(id) on delete set null,
  book_order int,
  chapter int,
  start_verse int,
  end_verse int,
  last_played_verse int,
  tts_rate numeric default 1.0,
  played_at timestamptz default now()
);
```

---

# 15. 검색 인덱스 전략

## 15.1 영어 원문 검색

```sql
alter table bible_verses_en
add column search_vector_en tsvector;

create index bible_verses_en_search_idx
on bible_verses_en
using gin(search_vector_en);
```

업데이트 트리거 또는 배치 작업으로 `text_en`을 검색 벡터에 반영한다.

## 15.2 한국어 번역 검색

한국어 검색은 PostgreSQL 기본 full-text search만으로는 한계가 있다.
MVP에서는 `ilike` 기반 검색으로 시작하고, 이후 다음 중 하나로 확장한다.

```text
1. PostgreSQL trigram index
2. Supabase pg_trgm 확장
3. Meilisearch
4. Typesense
5. Elasticsearch
```

## 한국어 검색 MVP 인덱스

```sql
create extension if not exists pg_trgm;

create index bible_verses_ko_text_trgm_idx
on bible_verses_ko
using gin (text_ko gin_trgm_ops);
```

---

# 16. 필수 인덱스

성능을 위해 다음 인덱스를 만든다.

```sql
create index bible_books_order_idx
on bible_books(book_order);

create index bible_verses_en_location_idx
on bible_verses_en(book_order, chapter, verse);

create index bible_verses_en_verse_key_idx
on bible_verses_en(verse_key);

create index bible_verses_ko_location_idx
on bible_verses_ko(book_order, chapter, verse);

create index bible_verses_ko_verse_key_idx
on bible_verses_ko(verse_key);

create index user_completed_chapters_user_idx
on user_completed_chapters(user_id);

create index user_highlights_user_idx
on user_highlights(user_id);

create index user_highlights_verse_key_idx
on user_highlights(verse_key);

create index user_favorite_verses_user_idx
on user_favorite_verses(user_id);

create index user_favorite_verses_verse_key_idx
on user_favorite_verses(verse_key);
```

---

# 17. RLS 보안 정책

Supabase 사용 기준으로 사용자 데이터 테이블에는 RLS를 반드시 적용한다.

## 예시: user_highlights

```sql
alter table user_highlights enable row level security;

create policy "Users can read own highlights"
on user_highlights
for select
using (auth.uid() = user_id);

create policy "Users can insert own highlights"
on user_highlights
for insert
with check (auth.uid() = user_id);

create policy "Users can update own highlights"
on user_highlights
for update
using (auth.uid() = user_id);

create policy "Users can delete own highlights"
on user_highlights
for delete
using (auth.uid() = user_id);
```

같은 정책을 다음 테이블에 적용한다.

```text
- user_reading_positions
- user_completed_chapters
- user_highlights
- user_favorite_verses
- user_tags
- user_favorite_verse_tags
- user_highlight_tags
- user_settings
- user_tts_sessions
```

성경 본문 테이블은 읽기 전용 공개 테이블로 운영할 수 있다.

```text
- bible_books
- bible_verses_en
- bible_verses_ko 승인본
```

단, 한국어 번역 중 `approved`가 아닌 본문은 관리자 또는 검수자만 접근하도록 제한한다.

---

# 18. 데이터 수집 및 삽입 파이프라인

## 18.1 1단계: 66권 메타데이터 Seed

직접 작성한 66권 메타데이터를 DB에 삽입한다.

필수 필드:

```text
- book_order
- testament
- name_ko
- name_en
- short_name_ko
- short_name_en
- chapter_count
```

## 18.2 2단계: 영어 KJV 원문 수집

공개 사용 가능한 KJV 데이터를 선택한다.

검토 기준:

```text
- 절 단위 데이터 제공 여부
- JSON, XML, CSV 변환 가능 여부
- 라이선스 명시 여부
- 앱 DB 저장 가능 여부
- 웹 서비스 제공 가능 여부
- 출처 표기 필요 여부
```

## 18.3 3단계: 원문 정규화

원본 데이터를 다음 구조로 변환한다.

```json
{
  "book": "Genesis",
  "bookOrder": 1,
  "chapter": 1,
  "verse": 1,
  "verseKey": "GEN.1.1",
  "text": "In the beginning God created the heaven and the earth."
}
```

## 18.4 4단계: 영어 원문 DB 삽입

정규화된 데이터를 `bible_verses_en`에 삽입한다.

검증 조건:

```text
- 총 절 수 확인
- 권별 장 수 확인
- 장별 절 수 확인
- 중복 verse_key 확인
- 누락 구절 확인
```

## 18.5 5단계: 한국어 번역 초안 생성

영어 KJV 원문을 기반으로 한국어 자체 번역 초안을 생성한다.

처음부터 전체를 공개하지 않고 상태를 나눠 관리한다.

```text
Genesis 1:1
영어 원문: In the beginning God created the heaven and the earth.
한국어 초안: 처음에 하나님께서 하늘과 땅을 창조하셨다.
상태: ai_translated
```

## 18.6 6단계: 용어 사전 적용

번역문에 용어 사전을 적용한다.

검토 대상:

```text
- God
- LORD
- Lord
- Holy Ghost
- Spirit
- soul
- flesh
- sin
- salvation
- righteousness
- hell
- grave
- kingdom of heaven
- kingdom of God
```

## 18.7 7단계: 장 단위 검수

절 단위 번역은 문맥이 끊길 수 있으므로 최종 검수는 장 단위로 한다.

검수 기준:

```text
- 원문 의미 보존
- 신학 용어 일관성
- 고유명사 통일
- 존칭과 문체 통일
- 절 단위 자연스러움
- 장 전체 흐름
```

## 18.8 8단계: 승인본 공개

검수 완료된 구절만 `approved` 처리하고 `is_public = true`로 전환한다.

앱의 기본 한국어 본문은 승인본만 보여준다.

---

# 19. 데이터 검증 체크리스트

## 19.1 성경 구조 검증

```text
- 성경 권 수가 66권인가?
- 구약 39권, 신약 27권인가?
- 전체 장 수가 1,189장인가?
- 각 권의 장 수가 정확한가?
- 각 장의 절 수가 원문과 일치하는가?
```

## 19.2 영어 원문 검증

```text
- verse_key가 중복되지 않는가?
- 빈 본문이 없는가?
- 특수문자가 깨지지 않았는가?
- 따옴표, 세미콜론, 콜론이 정상 보존되었는가?
- 장/절 순서가 정확한가?
```

## 19.3 한국어 번역 검증

```text
- 영어 원문과 1:1로 연결되는가?
- 누락 번역이 없는가?
- 번역 상태가 정확히 들어갔는가?
- 승인되지 않은 번역이 공개되지 않는가?
- 용어 사전과 충돌하는 표현이 없는가?
```

## 19.4 사용자 데이터 검증

```text
- 사용자별 데이터가 분리되는가?
- 로그아웃 상태에서 개인 데이터 접근이 차단되는가?
- 강조 구절이 중복 저장되지 않는가?
- 인용 구절이 중복 저장되지 않는가?
- 읽음 완료 취소가 정상 작동하는가?
```

---

# 20. 개발 단계별 구축 순서

## Phase 1: DB 기초 구축

목표: 성경 구조와 사용자 기능을 담을 기본 테이블을 만든다.

작업:

```text
1. Supabase 프로젝트 생성
2. bible_books 테이블 생성
3. bible_verses_en 테이블 생성
4. bible_verses_ko 테이블 생성
5. 사용자 기능 테이블 생성
6. 기본 인덱스 생성
7. RLS 정책 설정
```

산출물:

```text
- schema.sql
- seed_books.sql
- migration 파일
```

---

## Phase 2: 66권 메타데이터 삽입

목표: 성경 권, 장 수 정보를 DB에 저장한다.

작업:

```text
1. 66권 목록 작성
2. 구약/신약 분리
3. 권별 장 수 입력
4. 약칭 입력
5. seed 실행
6. 데이터 검증
```

산출물:

```text
- bible_books_seed.ts
- bible_books_seed.sql
```

---

## Phase 3: 영어 KJV 원문 삽입

목표: 영어 KJV 본문을 절 단위로 저장한다.

작업:

```text
1. KJV 원문 데이터 확보
2. 원본 파일 형식 분석
3. JSON으로 정규화
4. verse_key 생성
5. DB insert 스크립트 작성
6. 누락/중복 검증
```

산출물:

```text
- kjv_raw.xml 또는 kjv_raw.json
- kjv_normalized.json
- import_kjv.ts
- validate_kjv.ts
```

---

## Phase 4: 한국어 번역 테이블 구축

목표: 영어 원문과 연결된 한국어 번역 데이터를 저장한다.

작업:

```text
1. bible_verses_ko 테이블 연결 확인
2. 영어 원문 기준 번역 초안 생성
3. translation_status 입력
4. 검수자 메모 필드 테스트
5. 승인본 공개 로직 설계
```

산출물:

```text
- ko_translation_seed.json
- import_ko_translation.ts
- translation_review_workflow.md
```

---

## Phase 5: 사용자 데이터 기능 연결

목표: 앱 기능과 DB를 연결한다.

작업:

```text
1. 마지막 읽은 위치 저장 API
2. 읽음 완료 API
3. 통독률 계산 API
4. 구절 강조 API
5. 인용 구절 저장 API
6. 태그 API
7. 설정 API
```

산출물:

```text
- /api/me/progress
- /api/me/completed-chapters
- /api/me/highlights
- /api/me/favorite-verses
- /api/me/tags
- /api/me/settings
```

---

## Phase 6: 검색 기능 구축

목표: 영어와 한국어 본문 검색을 제공한다.

작업:

```text
1. 영어 full-text search 적용
2. 한국어 pg_trgm 검색 적용
3. 검색 결과 정렬
4. 권/장 필터 추가
5. 검색 결과에서 저장/강조 기능 연결
```

산출물:

```text
- search_bible.sql
- /api/bible/search
```

---

## Phase 7: 운영 및 백업

목표: 본문과 사용자 데이터를 안정적으로 보존한다.

작업:

```text
1. DB 백업 정책 설정
2. 번역 데이터 버전 관리
3. migration 기록 관리
4. 관리자만 번역 수정 가능하게 제한
5. 사용자 데이터 삭제 정책 정리
```

산출물:

```text
- backup_policy.md
- admin_translation_policy.md
- data_retention_policy.md
```

---

# 21. 추천 폴더 구조

```text
/src
  /lib
    supabase.ts
    bible.ts
    progress.ts
    search.ts

  /data
    bible-books.ts
    kjv-normalized.json
    translation-terms.ts

  /scripts
    seed-books.ts
    import-kjv.ts
    validate-kjv.ts
    import-ko-translation.ts
    check-missing-verses.ts

  /app
    /api
      /bible
        /books
        /search
      /me
        /progress
        /completed-chapters
        /highlights
        /favorite-verses
        /tags
        /settings

/supabase
  /migrations
    001_create_bible_books.sql
    002_create_bible_verses_en.sql
    003_create_bible_verses_ko.sql
    004_create_user_progress.sql
    005_create_user_highlights.sql
    006_create_user_favorites.sql
    007_create_user_settings.sql
    008_create_indexes.sql
    009_create_rls_policies.sql

  /seeds
    bible_books_seed.sql
    translation_terms_seed.sql
```

---

# 22. API 응답 예시

## 장 본문 조회

```json
{
  "book": {
    "nameKo": "요한복음",
    "nameEn": "John",
    "chapter": 3
  },
  "verses": [
    {
      "verseKey": "JOHN.3.16",
      "chapter": 3,
      "verse": 16,
      "textEn": "For God so loved the world...",
      "textKo": "하나님께서 세상을 이처럼 사랑하사...",
      "translationStatus": "approved",
      "highlight": {
        "color": "yellow",
        "note": "복음 핵심 구절"
      },
      "isFavorite": true
    }
  ]
}
```

---

# 23. MVP 기준 최소 테이블

처음부터 모든 테이블을 만들 필요는 없다.
MVP는 다음 테이블만 있어도 충분하다.

```text
1. bible_books
2. bible_verses_en
3. bible_verses_ko
4. user_reading_positions
5. user_completed_chapters
6. user_highlights
7. user_favorite_verses
8. user_tags
9. user_favorite_verse_tags
10. user_settings
```

추후 확장 테이블:

```text
- translation_reviews
- translation_terms
- user_tts_sessions
- user_notes
- reading_plans
- reading_plan_days
- verse_share_images
```

---

# 24. 구축 우선순위

## P0

```text
- bible_books
- bible_verses_en
- bible_verses_ko
- user_reading_positions
- user_completed_chapters
- user_highlights
- user_favorite_verses
- user_settings
```

## P1

```text
- user_tags
- favorite verse tags
- search index
- translation status
- approved translation filter
```

## P2

```text
- translation review history
- TTS session history
- 통독 플랜
- 노트
- 공유 이미지
```

---

# 25. 최종 구축 방향

이 DB는 단순 성경 본문 저장소가 아니라, 다음 3가지를 동시에 처리하는 구조여야 한다.

```text
1. 성경 원문 데이터베이스
2. 자체 번역 관리 시스템
3. 개인 성경 통독·공부 기록 시스템
```

따라서 영어 KJV 원문은 절대 수정하지 않는 기준 데이터로 두고, 한국어 자체 번역은 별도 테이블에서 상태값과 검수 이력을 관리한다.

사용자 데이터는 성경 본문과 직접 섞지 않고, `verse_key`와 `verse_id`를 통해 연결한다.

최종 구조는 다음 흐름을 따른다.

```text
KJV 영어 원문
→ 절 단위 정규화
→ DB 저장
→ 한국어 자체 번역 생성
→ 용어 사전 적용
→ 장 단위 검수
→ 승인본 공개
→ 사용자 통독/강조/저장/TTS 기능 연결
```

이 구조로 설계하면 초기에는 영어 KJV 리더로 시작할 수 있고, 이후 검수된 한국어 번역본을 점진적으로 공개할 수 있다.
