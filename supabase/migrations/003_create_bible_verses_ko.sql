create table if not exists public.bible_verses_ko (
  id uuid primary key default gen_random_uuid(),
  en_verse_id uuid not null references public.bible_verses_en(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  app_book_id text not null,
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  verse_key text not null,
  text_ko text not null check (length(trim(text_ko)) > 0),
  translation_name text not null default 'KJV Korean Study Translation',
  translation_status text not null default 'draft'
    check (translation_status in ('draft', 'ai_translated', 'reviewing', 'reviewed', 'approved', 'needs_check')),
  is_public boolean not null default false,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(verse_key, translation_name),
  unique(en_verse_id, translation_name)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bible_verses_ko_updated_at on public.bible_verses_ko;
create trigger set_bible_verses_ko_updated_at
before update on public.bible_verses_ko
for each row
execute function public.set_updated_at();

comment on table public.bible_verses_ko is
  'Project-owned Korean translation rows linked 1:1 to CrossWire KJV source verses.';
