create extension if not exists pgcrypto;

create table if not exists public.bible_books (
  id uuid primary key default gen_random_uuid(),
  book_order int not null unique check (book_order between 1 and 66),
  testament text not null check (testament in ('OT', 'NT')),
  app_book_id text not null unique,
  osis_book_id text not null unique,
  verse_key_code text not null unique,
  name_ko text not null,
  name_en text not null,
  short_name_ko text not null,
  short_name_en text not null,
  chapter_count int not null check (chapter_count > 0),
  created_at timestamptz not null default now()
);

comment on table public.bible_books is
  'Canonical 66-book Bible metadata used by CrossWire KJV import and app navigation.';

comment on column public.bible_books.app_book_id is
  'Stable app-facing lowercase book id such as gen, exo, jhn.';

comment on column public.bible_books.osis_book_id is
  'CrossWire/OSIS book id such as Gen, Exod, John.';

comment on column public.bible_books.verse_key_code is
  'Stable uppercase code used in verse_key values such as GEN.1.1 and JHN.3.16.';
