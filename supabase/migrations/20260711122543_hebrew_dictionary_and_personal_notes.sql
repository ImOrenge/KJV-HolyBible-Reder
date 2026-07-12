create extension if not exists pg_trgm;

create table if not exists public.hebrew_lexicon_entries (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null,
  strong_number text,
  lemma_he text not null,
  lemma_he_normalized text not null,
  transliteration text not null,
  pronunciation_symbol text,
  latin_initial text not null,
  hebrew_initial text,
  pronunciation_ko text,
  gloss_en text not null,
  gloss_ko text not null,
  definition_en text,
  definition_ko text not null,
  interpretation_note_ko text,
  morphology_summary text,
  part_of_speech text,
  source_name text not null,
  source_url text,
  source_license text not null,
  attribution_text text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewing', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(normalized_key),
  unique(strong_number),
  check (latin_initial ~ '^[A-Z]$')
);

drop trigger if exists set_hebrew_lexicon_entries_updated_at on public.hebrew_lexicon_entries;
create trigger set_hebrew_lexicon_entries_updated_at
before update on public.hebrew_lexicon_entries
for each row
execute function public.set_updated_at();

create table if not exists public.hebrew_word_occurrences (
  id uuid primary key default gen_random_uuid(),
  lexicon_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  verse_key text not null,
  app_book_id text not null,
  book_order int not null check (book_order between 1 and 39),
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  surface_he text,
  surface_he_normalized text,
  transliteration text,
  kjv_match_text text,
  ko_match_text text,
  occurrence_index int not null default 1 check (occurrence_index > 0),
  morphology_code text,
  phrase_en text,
  phrase_ko text,
  display_priority int not null default 100,
  source_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(lexicon_entry_id, verse_key, surface_he, occurrence_index)
);

drop trigger if exists set_hebrew_word_occurrences_updated_at on public.hebrew_word_occurrences;
create trigger set_hebrew_word_occurrences_updated_at
before update on public.hebrew_word_occurrences
for each row
execute function public.set_updated_at();

create table if not exists public.hebrew_dictionary_themes (
  id text primary key,
  title_ko text not null,
  description_ko text not null,
  scope_note_ko text,
  display_order int not null default 100,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_hebrew_dictionary_themes_updated_at on public.hebrew_dictionary_themes;
create trigger set_hebrew_dictionary_themes_updated_at
before update on public.hebrew_dictionary_themes
for each row
execute function public.set_updated_at();

create table if not exists public.hebrew_theme_entries (
  theme_id text not null references public.hebrew_dictionary_themes(id) on delete cascade,
  lexicon_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  reason_ko text,
  display_order int not null default 100,
  primary key (theme_id, lexicon_entry_id)
);

create table if not exists public.hebrew_related_entries (
  entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  related_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  relation_type text not null
    check (relation_type in ('same_root', 'contrast', 'paired_theme', 'see_also')),
  note_ko text,
  display_order int not null default 100,
  primary key (entry_id, related_entry_id, relation_type),
  check (entry_id <> related_entry_id)
);

create table if not exists public.hebrew_dictionary_search_index (
  entry_id uuid primary key references public.hebrew_lexicon_entries(id) on delete cascade,
  latin_initial text,
  hebrew_initial text,
  search_text text not null,
  search_text_compact text not null,
  strong_number text,
  theme_ids text[] not null default '{}',
  app_book_ids text[] not null default '{}',
  first_book_order int,
  first_verse_key text,
  first_reference text,
  updated_at timestamptz not null default now()
);

create index if not exists hebrew_lexicon_entries_status_idx
on public.hebrew_lexicon_entries(status);

create index if not exists hebrew_lexicon_entries_strong_idx
on public.hebrew_lexicon_entries(strong_number)
where status = 'published';

create index if not exists hebrew_lexicon_entries_lemma_idx
on public.hebrew_lexicon_entries(lemma_he_normalized)
where status = 'published';

create index if not exists hebrew_word_occurrences_verse_idx
on public.hebrew_word_occurrences(verse_key, display_priority);

create index if not exists hebrew_word_occurrences_entry_location_idx
on public.hebrew_word_occurrences(lexicon_entry_id, book_order, chapter, verse);

create index if not exists hebrew_theme_entries_theme_order_idx
on public.hebrew_theme_entries(theme_id, display_order);

create index if not exists hebrew_dictionary_search_index_latin_initial_idx
on public.hebrew_dictionary_search_index(latin_initial);

create index if not exists hebrew_dictionary_search_index_theme_ids_idx
on public.hebrew_dictionary_search_index
using gin(theme_ids);

create index if not exists hebrew_dictionary_search_index_book_ids_idx
on public.hebrew_dictionary_search_index
using gin(app_book_ids);

create index if not exists hebrew_dictionary_search_index_text_trgm_idx
on public.hebrew_dictionary_search_index
using gin(search_text gin_trgm_ops);

create or replace function public.search_hebrew_dictionary(
  p_query text default null,
  p_alphabet text default null,
  p_theme text default null,
  p_book_id text default null,
  p_sort text default 'alphabetical',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  entry_id uuid,
  normalized_key text,
  strong_number text,
  lemma_he text,
  lemma_he_normalized text,
  transliteration text,
  pronunciation_symbol text,
  pronunciation_ko text,
  latin_initial text,
  hebrew_initial text,
  gloss_en text,
  gloss_ko text,
  definition_en text,
  definition_ko text,
  interpretation_note_ko text,
  morphology_summary text,
  theme_ids text[],
  app_book_ids text[],
  first_verse_key text,
  first_reference text,
  source_name text,
  source_license text,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with filtered as (
    select
      e.id,
      e.normalized_key,
      e.strong_number,
      e.lemma_he,
      e.lemma_he_normalized,
      e.transliteration,
      e.pronunciation_symbol,
      e.pronunciation_ko,
      e.latin_initial,
      e.hebrew_initial,
      e.gloss_en,
      e.gloss_ko,
      e.definition_en,
      e.definition_ko,
      e.interpretation_note_ko,
      e.morphology_summary,
      i.theme_ids,
      i.app_book_ids,
      i.first_verse_key,
      i.first_reference,
      e.source_name,
      e.source_license,
      i.first_book_order
    from public.hebrew_dictionary_search_index i
    join public.hebrew_lexicon_entries e on e.id = i.entry_id
    where e.status = 'published'
      and (
        p_query is null
        or p_query = ''
        or i.search_text ilike '%' || p_query || '%'
        or i.search_text_compact ilike '%' || regexp_replace(coalesce(p_query, ''), '[[:space:][:punct:]]+', '', 'g') || '%'
      )
      and (p_alphabet is null or p_alphabet = '' or upper(p_alphabet) = 'ALL' or i.latin_initial = upper(p_alphabet))
      and (p_theme is null or p_theme = '' or p_theme = 'all' or p_theme = any(i.theme_ids))
      and (p_book_id is null or p_book_id = '' or p_book_id = 'all' or p_book_id = any(i.app_book_ids))
  )
  select
    filtered.id,
    filtered.normalized_key,
    filtered.strong_number,
    filtered.lemma_he,
    filtered.lemma_he_normalized,
    filtered.transliteration,
    filtered.pronunciation_symbol,
    filtered.pronunciation_ko,
    filtered.latin_initial,
    filtered.hebrew_initial,
    filtered.gloss_en,
    filtered.gloss_ko,
    filtered.definition_en,
    filtered.definition_ko,
    filtered.interpretation_note_ko,
    filtered.morphology_summary,
    filtered.theme_ids,
    filtered.app_book_ids,
    filtered.first_verse_key,
    filtered.first_reference,
    filtered.source_name,
    filtered.source_license,
    count(*) over() as total_count
  from filtered
  order by
    case when p_sort = 'canonical' then filtered.first_book_order end asc nulls last,
    case when p_sort = 'canonical' then filtered.first_verse_key end asc nulls last,
    filtered.transliteration asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

alter table public.hebrew_lexicon_entries enable row level security;
alter table public.hebrew_word_occurrences enable row level security;
alter table public.hebrew_dictionary_themes enable row level security;
alter table public.hebrew_theme_entries enable row level security;
alter table public.hebrew_related_entries enable row level security;
alter table public.hebrew_dictionary_search_index enable row level security;

drop policy if exists "Published Hebrew lexicon entries are public readable" on public.hebrew_lexicon_entries;
create policy "Published Hebrew lexicon entries are public readable"
on public.hebrew_lexicon_entries
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Published Hebrew word occurrences are public readable" on public.hebrew_word_occurrences;
create policy "Published Hebrew word occurrences are public readable"
on public.hebrew_word_occurrences
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.hebrew_lexicon_entries entry
    where entry.id = hebrew_word_occurrences.lexicon_entry_id
      and entry.status = 'published'
  )
);

drop policy if exists "Public Hebrew dictionary themes are public readable" on public.hebrew_dictionary_themes;
create policy "Public Hebrew dictionary themes are public readable"
on public.hebrew_dictionary_themes
for select
to anon, authenticated
using (is_public is true);

drop policy if exists "Published Hebrew theme entries are public readable" on public.hebrew_theme_entries;
create policy "Published Hebrew theme entries are public readable"
on public.hebrew_theme_entries
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.hebrew_dictionary_themes theme
    where theme.id = hebrew_theme_entries.theme_id
      and theme.is_public is true
  )
  and exists (
    select 1
    from public.hebrew_lexicon_entries entry
    where entry.id = hebrew_theme_entries.lexicon_entry_id
      and entry.status = 'published'
  )
);

drop policy if exists "Published Hebrew related entries are public readable" on public.hebrew_related_entries;
create policy "Published Hebrew related entries are public readable"
on public.hebrew_related_entries
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.hebrew_lexicon_entries entry
    where entry.id = hebrew_related_entries.entry_id
      and entry.status = 'published'
  )
  and exists (
    select 1
    from public.hebrew_lexicon_entries related
    where related.id = hebrew_related_entries.related_entry_id
      and related.status = 'published'
  )
);

drop policy if exists "Published Hebrew search index is public readable" on public.hebrew_dictionary_search_index;
create policy "Published Hebrew search index is public readable"
on public.hebrew_dictionary_search_index
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.hebrew_lexicon_entries entry
    where entry.id = hebrew_dictionary_search_index.entry_id
      and entry.status = 'published'
  )
);

grant select on table public.hebrew_lexicon_entries to anon, authenticated, service_role;
grant select on table public.hebrew_word_occurrences to anon, authenticated, service_role;
grant select on table public.hebrew_dictionary_themes to anon, authenticated, service_role;
grant select on table public.hebrew_theme_entries to anon, authenticated, service_role;
grant select on table public.hebrew_related_entries to anon, authenticated, service_role;
grant select on table public.hebrew_dictionary_search_index to anon, authenticated, service_role;
grant execute on function public.search_hebrew_dictionary(text, text, text, text, text, int, int) to anon, authenticated, service_role;

create table if not exists public.user_personal_notes (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body_markdown text not null default '',
  body_text text not null default '',
  editor_format text not null default 'markdown-lite'
    check (editor_format in ('markdown-lite')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),

  unique(user_id, client_id),
  check (char_length(title) between 1 and 120),
  check (char_length(body_markdown) <= 50000)
);

drop trigger if exists set_user_personal_notes_updated_at on public.user_personal_notes;
create trigger set_user_personal_notes_updated_at
before update on public.user_personal_notes
for each row
execute function public.set_updated_at();

create table if not exists public.user_personal_note_verse_links (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  verse_key text not null,
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  selected_text text,
  link_order int not null default 100,
  created_at timestamptz not null default now(),

  unique(user_id, client_id),
  unique(note_id, verse_key)
);

create table if not exists public.user_personal_note_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create table if not exists public.user_verse_tags (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  verse_key text not null,
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  source_note_id uuid references public.user_personal_notes(id) on delete set null,
  created_at timestamptz not null default now(),

  unique(user_id, client_id),
  unique(user_id, verse_key, tag_id)
);

create index if not exists user_personal_notes_user_updated_idx
on public.user_personal_notes(user_id, updated_at desc);

create index if not exists user_personal_note_verse_links_note_order_idx
on public.user_personal_note_verse_links(note_id, link_order);

create index if not exists user_personal_note_verse_links_user_book_idx
on public.user_personal_note_verse_links(user_id, book_id);

create index if not exists user_personal_note_tags_tag_idx
on public.user_personal_note_tags(user_id, tag_id);

create index if not exists user_verse_tags_user_verse_idx
on public.user_verse_tags(user_id, verse_key);

alter table public.user_personal_notes enable row level security;
alter table public.user_personal_note_verse_links enable row level security;
alter table public.user_personal_note_tags enable row level security;
alter table public.user_verse_tags enable row level security;

drop policy if exists "Users can read own personal notes" on public.user_personal_notes;
create policy "Users can read own personal notes"
on public.user_personal_notes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own personal notes" on public.user_personal_notes;
create policy "Users can insert own personal notes"
on public.user_personal_notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own personal notes" on public.user_personal_notes;
create policy "Users can update own personal notes"
on public.user_personal_notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own personal notes" on public.user_personal_notes;
create policy "Users can delete own personal notes"
on public.user_personal_notes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own note verse links" on public.user_personal_note_verse_links;
create policy "Users can manage own note verse links"
on public.user_personal_note_verse_links
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = user_personal_note_verse_links.note_id
      and note.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = user_personal_note_verse_links.note_id
      and note.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own personal note tags" on public.user_personal_note_tags;
create policy "Users can manage own personal note tags"
on public.user_personal_note_tags
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = user_personal_note_tags.note_id
      and note.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.user_tags tag
    where tag.id = user_personal_note_tags.tag_id
      and tag.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = user_personal_note_tags.note_id
      and note.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.user_tags tag
    where tag.id = user_personal_note_tags.tag_id
      and tag.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own verse tags" on public.user_verse_tags;
create policy "Users can manage own verse tags"
on public.user_verse_tags
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_tags tag
    where tag.id = user_verse_tags.tag_id
      and tag.user_id = (select auth.uid())
  )
  and (
    source_note_id is null
    or exists (
      select 1
      from public.user_personal_notes note
      where note.id = user_verse_tags.source_note_id
        and note.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_tags tag
    where tag.id = user_verse_tags.tag_id
      and tag.user_id = (select auth.uid())
  )
  and (
    source_note_id is null
    or exists (
      select 1
      from public.user_personal_notes note
      where note.id = user_verse_tags.source_note_id
        and note.user_id = (select auth.uid())
    )
  )
);

grant select, insert, update, delete on table public.user_personal_notes to authenticated, service_role;
grant select, insert, update, delete on table public.user_personal_note_verse_links to authenticated, service_role;
grant select, insert, update, delete on table public.user_personal_note_tags to authenticated, service_role;
grant select, insert, update, delete on table public.user_verse_tags to authenticated, service_role;
