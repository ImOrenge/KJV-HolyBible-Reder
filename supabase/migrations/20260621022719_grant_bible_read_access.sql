grant usage on schema public to anon, authenticated, service_role;

grant select on table public.bible_books to anon, authenticated, service_role;
grant select on table public.bible_verses_en to anon, authenticated, service_role;
grant select on table public.translation_terms to anon, authenticated, service_role;
grant select on table public.bible_verses_ko to anon, authenticated, service_role;

grant select, insert, update, delete on table public.user_reading_positions to authenticated, service_role;
grant select, insert, update, delete on table public.user_completed_chapters to authenticated, service_role;
grant select, insert, update, delete on table public.user_highlights to authenticated, service_role;
grant select, insert, update, delete on table public.user_favorite_verses to authenticated, service_role;
grant select, insert, update, delete on table public.user_tags to authenticated, service_role;
grant select, insert, update, delete on table public.user_favorite_verse_tags to authenticated, service_role;
grant select, insert, update, delete on table public.user_highlight_tags to authenticated, service_role;
grant select, insert, update, delete on table public.user_settings to authenticated, service_role;
grant select, insert, update, delete on table public.user_tts_sessions to authenticated, service_role;
