insert into public.hebrew_dictionary_themes (id, title_ko, description_ko, scope_note_ko, display_order, is_public)
values
  ('biblical-world-structure', '성경속 세상의 구조', '하늘, 땅, 물, 빛, 어둠처럼 성경의 세계 묘사를 이루는 기본 어휘', '구약 히브리어 사전 1차 테마', 10, true),
  ('genesis-primeval', '창세기 1-11장', '창조, 타락, 홍수, 민족 기원의 핵심어', '구약 히브리어 사전 1차 테마', 20, true),
  ('genesis-patriarchs', '창세기 12-50장', '족장 이야기의 언약, 복, 땅, 후손 어휘', '후속 확장 테마', 30, true),
  ('isaiah-core', '이사야 핵심어', '심판, 거룩함, 회복, 종의 언어', '후속 확장 테마', 40, true)
on conflict (id) do update set
  title_ko = excluded.title_ko,
  description_ko = excluded.description_ko,
  scope_note_ko = excluded.scope_note_ko,
  display_order = excluded.display_order,
  is_public = excluded.is_public;

insert into public.hebrew_lexicon_entries (
  normalized_key,
  strong_number,
  lemma_he,
  lemma_he_normalized,
  transliteration,
  pronunciation_symbol,
  latin_initial,
  hebrew_initial,
  pronunciation_ko,
  gloss_en,
  gloss_ko,
  definition_en,
  definition_ko,
  interpretation_note_ko,
  morphology_summary,
  source_name,
  source_license,
  attribution_text,
  status,
  published_at
)
values
  ('reshith', 'H7225', 'רֵאשִׁית', 'ראשית', 'reshith', 'reshith', 'R', 'ר', '레쉬트', 'beginning, first', '시작, 처음', 'The beginning or first part of an ordered sequence.', '시작이나 첫머리를 가리키는 말이다.', '창세기 1:1에서는 창조 사건의 출발점을 가리킨다.', '명사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now()),
  ('bara', 'H1254', 'בָּרָא', 'ברא', 'bara', 'bara', 'B', 'ב', '바라', 'create', '창조하다', 'To bring into being or shape by divine action in the creation account.', '하나님의 창조 행위를 나타내는 동사다.', '창세기 1장의 시작에서 하나님이 하늘과 땅을 창조하신 행위를 말한다.', '동사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now()),
  ('elohim', 'H430', 'אֱלֹהִים', 'אלהים', 'elohim', 'elohim', 'E', 'א', '엘로힘', 'God', '하나님', 'A common Hebrew designation for God, used prominently in Genesis 1.', '하나님을 가리키는 대표적인 히브리어 명칭이다.', '창세기 1장에서는 창조의 주체로 반복해서 등장한다.', '명사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now()),
  ('shamayim', 'H8064', 'שָׁמַיִם', 'שמים', 'shamayim', 'shamayim', 'S', 'ש', '샤마임', 'heavens, sky', '하늘', 'The heavens or sky, often paired with the earth.', '하늘 또는 하늘들을 가리키며 땅과 짝을 이루어 쓰인다.', '창세기 1:1에서는 땅과 함께 창조 세계 전체를 포괄한다.', '명사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now()),
  ('erets', 'H776', 'אֶרֶץ', 'ארץ', 'erets', 'erets', 'E', 'א', '에레츠', 'earth, land', '땅, 땅덩어리', 'Earth, land, or territory depending on context.', '문맥에 따라 땅, 땅덩어리, 지역을 가리킨다.', '창세기 1:1에서는 하늘과 함께 창조된 세계를 표현한다.', '명사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now()),
  ('or', 'H216', 'אוֹר', 'אור', 'or', 'or', 'O', 'א', '오르', 'light', '빛', 'Light, especially as ordered over against darkness in Genesis 1.', '어둠과 구분되는 빛을 가리킨다.', '창세기 1:3-4에서 하나님이 빛을 부르시고 어둠과 나누신다.', '명사', 'Strong''s Hebrew / OSHB reference', 'Public Domain / CC BY 4.0 reference metadata', 'Field-level reference metadata retained for release review.', 'published', now())
on conflict (normalized_key) do update set
  strong_number = excluded.strong_number,
  lemma_he = excluded.lemma_he,
  lemma_he_normalized = excluded.lemma_he_normalized,
  transliteration = excluded.transliteration,
  pronunciation_symbol = excluded.pronunciation_symbol,
  latin_initial = excluded.latin_initial,
  hebrew_initial = excluded.hebrew_initial,
  pronunciation_ko = excluded.pronunciation_ko,
  gloss_en = excluded.gloss_en,
  gloss_ko = excluded.gloss_ko,
  definition_en = excluded.definition_en,
  definition_ko = excluded.definition_ko,
  interpretation_note_ko = excluded.interpretation_note_ko,
  morphology_summary = excluded.morphology_summary,
  source_name = excluded.source_name,
  source_license = excluded.source_license,
  attribution_text = excluded.attribution_text,
  status = excluded.status,
  published_at = coalesce(public.hebrew_lexicon_entries.published_at, excluded.published_at);

with occurrence_seed as (
  select *
  from (values
    ('reshith', 'GEN.1.1', 'gen', 1, 1, 1, 'בְּרֵאשִׁית', 'bereshith', 'In the beginning', '처음에', 'In the beginning', '처음에', 1, 10),
    ('bara', 'GEN.1.1', 'gen', 1, 1, 1, 'בָּרָא', 'bara', 'created', '창조하셨다', 'created', '창조하셨다', 1, 20),
    ('elohim', 'GEN.1.1', 'gen', 1, 1, 1, 'אֱלֹהִים', 'elohim', 'God', '하나님', 'God', '하나님', 1, 30),
    ('shamayim', 'GEN.1.1', 'gen', 1, 1, 1, 'הַשָּׁמַיִם', 'hashamayim', 'the heaven', '하늘', 'the heaven', '하늘', 1, 40),
    ('erets', 'GEN.1.1', 'gen', 1, 1, 1, 'הָאָרֶץ', 'haerets', 'the earth', '땅', 'the earth', '땅', 1, 50),
    ('or', 'GEN.1.3', 'gen', 1, 1, 3, 'אוֹר', 'or', 'light', '빛', 'Let there be light', '빛이 있으라', 1, 10)
  ) as seed(normalized_key, verse_key, app_book_id, book_order, chapter, verse, surface_he, transliteration, kjv_match_text, ko_match_text, phrase_en, phrase_ko, occurrence_index, display_priority)
)
insert into public.hebrew_word_occurrences (
  lexicon_entry_id,
  verse_key,
  app_book_id,
  book_order,
  chapter,
  verse,
  surface_he,
  transliteration,
  kjv_match_text,
  ko_match_text,
  phrase_en,
  phrase_ko,
  occurrence_index,
  display_priority,
  source_name
)
select
  entry.id,
  seed.verse_key,
  seed.app_book_id,
  seed.book_order,
  seed.chapter,
  seed.verse,
  seed.surface_he,
  seed.transliteration,
  seed.kjv_match_text,
  seed.ko_match_text,
  seed.phrase_en,
  seed.phrase_ko,
  seed.occurrence_index,
  seed.display_priority,
  'manual seed'
from occurrence_seed seed
join public.hebrew_lexicon_entries entry on entry.normalized_key = seed.normalized_key
on conflict (lexicon_entry_id, verse_key, surface_he, occurrence_index) do update set
  transliteration = excluded.transliteration,
  kjv_match_text = excluded.kjv_match_text,
  ko_match_text = excluded.ko_match_text,
  phrase_en = excluded.phrase_en,
  phrase_ko = excluded.phrase_ko,
  display_priority = excluded.display_priority,
  source_name = excluded.source_name;

with theme_seed as (
  select *
  from (values
    ('genesis-primeval', 'reshith', '창세기 창조 기사 시작을 여는 핵심어', 10),
    ('genesis-primeval', 'bara', '창조 행위를 나타내는 핵심 동사', 20),
    ('genesis-primeval', 'elohim', '창세기 1장의 창조 주체', 30),
    ('biblical-world-structure', 'shamayim', '성경의 세계 구조에서 하늘을 가리키는 핵심어', 10),
    ('biblical-world-structure', 'erets', '성경의 세계 구조에서 땅을 가리키는 핵심어', 20),
    ('biblical-world-structure', 'or', '빛과 어둠의 구분을 이해하는 핵심어', 30)
  ) as seed(theme_id, normalized_key, reason_ko, display_order)
)
insert into public.hebrew_theme_entries (theme_id, lexicon_entry_id, reason_ko, display_order)
select seed.theme_id, entry.id, seed.reason_ko, seed.display_order
from theme_seed seed
join public.hebrew_lexicon_entries entry on entry.normalized_key = seed.normalized_key
on conflict (theme_id, lexicon_entry_id) do update set
  reason_ko = excluded.reason_ko,
  display_order = excluded.display_order;

insert into public.hebrew_dictionary_search_index (
  entry_id,
  latin_initial,
  hebrew_initial,
  search_text,
  search_text_compact,
  strong_number,
  theme_ids,
  app_book_ids,
  first_book_order,
  first_verse_key,
  first_reference,
  updated_at
)
select
  entry.id,
  entry.latin_initial,
  entry.hebrew_initial,
  concat_ws(
    ' ',
    entry.normalized_key,
    entry.strong_number,
    entry.lemma_he,
    entry.lemma_he_normalized,
    entry.transliteration,
    entry.pronunciation_symbol,
    entry.pronunciation_ko,
    entry.gloss_en,
    entry.gloss_ko,
    entry.definition_en,
    entry.definition_ko,
    entry.interpretation_note_ko,
    string_agg(distinct coalesce(occurrence.surface_he, '') || ' ' || coalesce(occurrence.transliteration, '') || ' ' || coalesce(occurrence.phrase_en, '') || ' ' || coalesce(occurrence.phrase_ko, ''), ' ')
  ) as search_text,
  regexp_replace(
    concat_ws(
      '',
      entry.normalized_key,
      entry.strong_number,
      entry.lemma_he,
      entry.lemma_he_normalized,
      entry.transliteration,
      entry.pronunciation_symbol,
      entry.pronunciation_ko,
      entry.gloss_en,
      entry.gloss_ko,
      entry.definition_en,
      entry.definition_ko
    ),
    '[[:space:][:punct:]]+',
    '',
    'g'
  ) as search_text_compact,
  entry.strong_number,
  coalesce(array_agg(distinct theme.theme_id) filter (where theme.theme_id is not null), '{}'),
  coalesce(array_agg(distinct occurrence.app_book_id) filter (where occurrence.app_book_id is not null), '{}'),
  min(occurrence.book_order),
  (array_agg(occurrence.verse_key order by occurrence.book_order, occurrence.chapter, occurrence.verse))[1],
  (array_agg('창 ' || occurrence.chapter || ':' || occurrence.verse order by occurrence.book_order, occurrence.chapter, occurrence.verse))[1],
  now()
from public.hebrew_lexicon_entries entry
left join public.hebrew_word_occurrences occurrence on occurrence.lexicon_entry_id = entry.id
left join public.hebrew_theme_entries theme on theme.lexicon_entry_id = entry.id
where entry.status = 'published'
group by entry.id
on conflict (entry_id) do update set
  latin_initial = excluded.latin_initial,
  hebrew_initial = excluded.hebrew_initial,
  search_text = excluded.search_text,
  search_text_compact = excluded.search_text_compact,
  strong_number = excluded.strong_number,
  theme_ids = excluded.theme_ids,
  app_book_ids = excluded.app_book_ids,
  first_book_order = excluded.first_book_order,
  first_verse_key = excluded.first_verse_key,
  first_reference = excluded.first_reference,
  updated_at = excluded.updated_at;
