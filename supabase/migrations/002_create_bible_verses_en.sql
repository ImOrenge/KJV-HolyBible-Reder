create table if not exists public.bible_verses_en (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  app_book_id text not null,
  osis_book_id text not null,
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  verse_key text not null unique,
  text_en text not null check (length(trim(text_en)) > 0),
  source_name text not null default 'CrossWire KJV',
  source_module text not null default 'KJV',
  source_module_version text,
  source_version_date date,
  source_license text,
  source_checksum text,
  source_commit text,
  source_downloaded_at timestamptz,
  created_at timestamptz not null default now(),

  unique(book_id, chapter, verse),
  unique(book_order, chapter, verse)
);

comment on table public.bible_verses_en is
  'Read-only canonical English KJV verses normalized from the CrossWire KJV source.';

comment on column public.bible_verses_en.verse_key is
  'Stable verse key used to connect source text, translations, and user data.';
