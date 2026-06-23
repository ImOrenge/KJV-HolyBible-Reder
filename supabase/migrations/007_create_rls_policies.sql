alter table public.bible_books enable row level security;
alter table public.bible_verses_en enable row level security;
alter table public.bible_verses_ko enable row level security;
alter table public.translation_terms enable row level security;
alter table public.translation_reviews enable row level security;
alter table public.user_reading_positions enable row level security;
alter table public.user_completed_chapters enable row level security;
alter table public.user_highlights enable row level security;
alter table public.user_favorite_verses enable row level security;
alter table public.user_tags enable row level security;
alter table public.user_favorite_verse_tags enable row level security;
alter table public.user_highlight_tags enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_tts_sessions enable row level security;

create policy "Public can read Bible books"
on public.bible_books
for select
using (true);

create policy "Public can read English KJV verses"
on public.bible_verses_en
for select
using (true);

create policy "Public can read approved Korean verses"
on public.bible_verses_ko
for select
using (is_public = true and translation_status = 'approved');

create policy "Public can read translation terms"
on public.translation_terms
for select
using (true);

create policy "Users can read own reading position"
on public.user_reading_positions
for select
using (auth.uid() = user_id);

create policy "Users can insert own reading position"
on public.user_reading_positions
for insert
with check (auth.uid() = user_id);

create policy "Users can update own reading position"
on public.user_reading_positions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own reading position"
on public.user_reading_positions
for delete
using (auth.uid() = user_id);

create policy "Users can manage own completed chapters"
on public.user_completed_chapters
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own highlights"
on public.user_highlights
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own favorite verses"
on public.user_favorite_verses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own tags"
on public.user_tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own favorite verse tags"
on public.user_favorite_verse_tags
for all
using (
  exists (
    select 1
    from public.user_favorite_verses favorite
    join public.user_tags tag on tag.id = user_favorite_verse_tags.tag_id
    where favorite.id = user_favorite_verse_tags.favorite_verse_id
      and favorite.user_id = auth.uid()
      and tag.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_favorite_verses favorite
    join public.user_tags tag on tag.id = user_favorite_verse_tags.tag_id
    where favorite.id = user_favorite_verse_tags.favorite_verse_id
      and favorite.user_id = auth.uid()
      and tag.user_id = auth.uid()
  )
);

create policy "Users can manage own highlight tags"
on public.user_highlight_tags
for all
using (
  exists (
    select 1
    from public.user_highlights highlight
    join public.user_tags tag on tag.id = user_highlight_tags.tag_id
    where highlight.id = user_highlight_tags.highlight_id
      and highlight.user_id = auth.uid()
      and tag.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_highlights highlight
    join public.user_tags tag on tag.id = user_highlight_tags.tag_id
    where highlight.id = user_highlight_tags.highlight_id
      and highlight.user_id = auth.uid()
      and tag.user_id = auth.uid()
  )
);

create policy "Users can manage own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own TTS sessions"
on public.user_tts_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
