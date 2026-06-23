create index if not exists bible_books_order_idx
on public.bible_books(book_order);

create index if not exists bible_verses_en_location_idx
on public.bible_verses_en(book_order, chapter, verse);

create index if not exists bible_verses_en_book_chapter_idx
on public.bible_verses_en(app_book_id, chapter, verse);

create index if not exists bible_verses_en_verse_key_idx
on public.bible_verses_en(verse_key);

create index if not exists bible_verses_ko_location_idx
on public.bible_verses_ko(book_order, chapter, verse);

create index if not exists bible_verses_ko_verse_key_idx
on public.bible_verses_ko(verse_key);

create index if not exists bible_verses_ko_public_idx
on public.bible_verses_ko(verse_key, translation_name)
where is_public = true and translation_status = 'approved';

create index if not exists translation_reviews_ko_verse_idx
on public.translation_reviews(ko_verse_id, created_at desc);

create index if not exists user_reading_positions_user_idx
on public.user_reading_positions(user_id);

create index if not exists user_completed_chapters_user_idx
on public.user_completed_chapters(user_id);

create index if not exists user_highlights_user_idx
on public.user_highlights(user_id);

create index if not exists user_highlights_verse_key_idx
on public.user_highlights(verse_key);

create index if not exists user_favorite_verses_user_idx
on public.user_favorite_verses(user_id);

create index if not exists user_favorite_verses_verse_key_idx
on public.user_favorite_verses(verse_key);

create index if not exists user_tags_user_idx
on public.user_tags(user_id);

create index if not exists user_tts_sessions_user_played_idx
on public.user_tts_sessions(user_id, played_at desc);
