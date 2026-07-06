create or replace function public.search_bible_verses_ko(
  p_query text,
  p_translation_name text default 'KJV Reader Note',
  p_testament text default null,
  p_book_id text default null,
  p_limit int default 50,
  p_offset int default 0,
  p_sort text default 'canonical'
)
returns table (
  verse_key text,
  app_book_id text,
  book_order int,
  chapter int,
  verse int,
  text_ko text,
  text_en text,
  translation_name text,
  translation_status text,
  score int,
  total_count bigint,
  source_name text,
  source_module text,
  source_module_version text
)
language sql
stable
set search_path = public
as $$
  with normalized as (
    select
      public.normalize_korean_search_text(p_query, false) as query_text,
      public.normalize_korean_search_text(p_query, true) as query_compact,
      greatest(1, least(coalesce(p_limit, 50), 100)) as row_limit,
      greatest(0, coalesce(p_offset, 0)) as row_offset,
      case
        when upper(coalesce(p_testament, '')) in ('OT', 'OLD') then 'OT'
        when upper(coalesce(p_testament, '')) in ('NT', 'NEW') then 'NT'
        else null
      end as testament_filter,
      nullif(trim(coalesce(p_book_id, '')), '') as book_filter,
      case when p_sort = 'relevance' then 'relevance' else 'canonical' end as sort_mode
  ),
  matching_terms as (
    select term.*
    from public.bible_search_terms_ko term
    cross join normalized n
    where term.is_public = true
      and length(n.query_compact) >= 2
      and (
        term.compact_term = n.query_compact
        or public.normalize_korean_search_text(coalesce(term.canonical_term, ''), true) = n.query_compact
      )
  ),
  term_matches as (
    select
      ko.verse_key,
      100
        + case when term.term_type in ('theology', 'phrase') then 20 else 0 end
        + least(link.match_count * 5, 30)
        + case when coalesce(link.first_position, 999999) between 1 and 12 then 10 else 0 end as score
    from public.bible_verse_search_terms_ko link
    join matching_terms term on term.id = link.search_term_id
    join public.bible_verses_ko ko
      on ko.verse_key = link.verse_key
     and ko.translation_name = link.translation_name
    join public.bible_books book on book.app_book_id = ko.app_book_id
    cross join normalized n
    where ko.translation_name = p_translation_name
      and ko.translation_status = 'approved'
      and ko.is_public = true
      and (n.testament_filter is null or book.testament = n.testament_filter)
      and (n.book_filter is null or ko.app_book_id = n.book_filter)
  ),
  fallback_matches as (
    select
      ko.verse_key,
      (
        case when ko.search_text_ko_compact ilike '%' || n.query_compact || '%' then 60 else 0 end
        + case when ko.search_text_ko ilike '%' || n.query_text || '%' then 40 else 0 end
        + case when position(n.query_compact in ko.search_text_ko_compact) between 1 and 12 then 10 else 0 end
      ) as score
    from public.bible_verses_ko ko
    join public.bible_books book on book.app_book_id = ko.app_book_id
    cross join normalized n
    where length(n.query_compact) >= 2
      and not exists (select 1 from matching_terms)
      and ko.translation_name = p_translation_name
      and ko.translation_status = 'approved'
      and ko.is_public = true
      and (n.testament_filter is null or book.testament = n.testament_filter)
      and (n.book_filter is null or ko.app_book_id = n.book_filter)
      and (
        ko.search_text_ko ilike '%' || n.query_text || '%'
        or ko.search_text_ko_compact ilike '%' || n.query_compact || '%'
      )
  ),
  merged as (
    select verse_key, max(score)::int as score
    from (
      select * from term_matches
      union all
      select * from fallback_matches
    ) matches
    group by verse_key
  ),
  scoped as (
    select
      ko.verse_key,
      ko.app_book_id,
      ko.book_order,
      ko.chapter,
      ko.verse,
      ko.text_ko,
      en.text_en,
      ko.translation_name,
      ko.translation_status,
      merged.score,
      count(*) over () as total_count,
      en.source_name,
      en.source_module,
      en.source_module_version
    from merged
    join public.bible_verses_ko ko
      on ko.verse_key = merged.verse_key
     and ko.translation_name = p_translation_name
    join public.bible_verses_en en on en.verse_key = ko.verse_key
  )
  select
    scoped.verse_key,
    scoped.app_book_id,
    scoped.book_order,
    scoped.chapter,
    scoped.verse,
    scoped.text_ko,
    scoped.text_en,
    scoped.translation_name,
    scoped.translation_status,
    scoped.score,
    scoped.total_count,
    scoped.source_name,
    scoped.source_module,
    scoped.source_module_version
  from scoped
  cross join normalized n
  order by
    case when n.sort_mode = 'relevance' then scoped.score end desc,
    scoped.book_order asc,
    scoped.chapter asc,
    scoped.verse asc
  limit (select row_limit from normalized)
  offset (select row_offset from normalized);
$$;
