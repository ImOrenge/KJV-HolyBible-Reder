create table if not exists public.user_reading_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  chapter int not null check (chapter > 0),
  verse int check (verse is null or verse > 0),
  verse_key text,
  scroll_position int not null default 0 check (scroll_position >= 0),
  last_read_at timestamptz not null default now(),

  unique(user_id)
);

create table if not exists public.user_completed_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  chapter int not null check (chapter > 0),
  completed_at timestamptz not null default now(),

  unique(user_id, book_id, chapter)
);

create table if not exists public.user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  en_verse_id uuid references public.bible_verses_en(id) on delete cascade,
  ko_verse_id uuid references public.bible_verses_ko(id) on delete set null,
  color text not null default 'yellow'
    check (color in ('yellow', 'blue', 'green', 'red', 'purple', 'orange')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, verse_key)
);

drop trigger if exists set_user_highlights_updated_at on public.user_highlights;
create trigger set_user_highlights_updated_at
before update on public.user_highlights
for each row
execute function public.set_updated_at();

create table if not exists public.user_favorite_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  en_verse_id uuid references public.bible_verses_en(id) on delete cascade,
  ko_verse_id uuid references public.bible_verses_ko(id) on delete set null,
  title text,
  memo text,
  usage_count int not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, verse_key)
);

drop trigger if exists set_user_favorite_verses_updated_at on public.user_favorite_verses;
create trigger set_user_favorite_verses_updated_at
before update on public.user_favorite_verses
for each row
execute function public.set_updated_at();

create table if not exists public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),

  unique(user_id, name)
);

create table if not exists public.user_favorite_verse_tags (
  id uuid primary key default gen_random_uuid(),
  favorite_verse_id uuid not null references public.user_favorite_verses(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,

  unique(favorite_verse_id, tag_id)
);

create table if not exists public.user_highlight_tags (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.user_highlights(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,

  unique(highlight_id, tag_id)
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  font_size int not null default 18 check (font_size between 12 and 32),
  line_height numeric not null default 1.8 check (line_height between 1.2 and 2.4),
  reader_width text not null default 'normal'
    check (reader_width in ('narrow', 'normal', 'wide')),
  tts_rate numeric not null default 1.0 check (tts_rate between 0.5 and 2.0),
  tts_pitch numeric not null default 1.0 check (tts_pitch between 0.5 and 2.0),
  tts_voice text,
  default_translation text not null default 'en'
    check (default_translation in ('en', 'ko', 'parallel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

create table if not exists public.user_tts_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.bible_books(id) on delete set null,
  book_order int check (book_order is null or book_order between 1 and 66),
  chapter int check (chapter is null or chapter > 0),
  start_verse int check (start_verse is null or start_verse > 0),
  end_verse int check (end_verse is null or end_verse > 0),
  last_played_verse int check (last_played_verse is null or last_played_verse > 0),
  tts_rate numeric not null default 1.0 check (tts_rate between 0.5 and 2.0),
  played_at timestamptz not null default now()
);
