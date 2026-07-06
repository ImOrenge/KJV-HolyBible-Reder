create extension if not exists pg_trgm;

alter table public.bible_verses_ko
add column if not exists search_text_ko text;

alter table public.bible_verses_ko
add column if not exists search_text_ko_compact text;

create or replace function public.normalize_korean_search_text(
  p_text text,
  p_compact boolean default false
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := lower(
    trim(
      regexp_replace(
        regexp_replace(
          coalesce(p_text, ''),
          '[[:punct:]“”‘’《》〈〉「」『』…·ㆍ—–―]+',
          ' ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );

  if p_compact then
    return regexp_replace(normalized, '\s+', '', 'g');
  end if;

  return normalized;
end;
$$;

create or replace function public.set_bible_verses_ko_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_text_ko = public.normalize_korean_search_text(new.text_ko, false);
  new.search_text_ko_compact = public.normalize_korean_search_text(new.text_ko, true);
  return new;
end;
$$;

drop trigger if exists set_bible_verses_ko_search_text on public.bible_verses_ko;
create trigger set_bible_verses_ko_search_text
before insert or update of text_ko on public.bible_verses_ko
for each row
execute function public.set_bible_verses_ko_search_text();

update public.bible_verses_ko
set
  search_text_ko = public.normalize_korean_search_text(text_ko, false),
  search_text_ko_compact = public.normalize_korean_search_text(text_ko, true)
where search_text_ko is null
   or search_text_ko_compact is null
   or search_text_ko is distinct from public.normalize_korean_search_text(text_ko, false)
   or search_text_ko_compact is distinct from public.normalize_korean_search_text(text_ko, true);

create index if not exists bible_verses_ko_search_text_trgm_idx
on public.bible_verses_ko
using gin (search_text_ko gin_trgm_ops)
where is_public = true and translation_status = 'approved';

create index if not exists bible_verses_ko_search_compact_trgm_idx
on public.bible_verses_ko
using gin (search_text_ko_compact gin_trgm_ops)
where is_public = true and translation_status = 'approved';

create index if not exists bible_verses_ko_public_location_idx
on public.bible_verses_ko (translation_name, book_order, chapter, verse)
where is_public = true and translation_status = 'approved';

create table if not exists public.bible_search_terms_ko (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  normalized_term text not null,
  compact_term text not null,
  term_type text not null default 'keyword'
    check (term_type in ('keyword', 'phrase', 'alias', 'theology')),
  canonical_term text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique(normalized_term, term_type)
);

create table if not exists public.bible_verse_search_terms_ko (
  verse_key text not null,
  search_term_id uuid not null references public.bible_search_terms_ko(id) on delete cascade,
  translation_name text not null,
  match_count int not null default 1 check (match_count > 0),
  first_position int,
  created_at timestamptz not null default now(),
  primary key (verse_key, search_term_id, translation_name)
);

alter table public.bible_search_terms_ko enable row level security;
alter table public.bible_verse_search_terms_ko enable row level security;

drop policy if exists "Public can read Korean search terms" on public.bible_search_terms_ko;
create policy "Public can read Korean search terms"
on public.bible_search_terms_ko
for select
using (is_public = true);

drop policy if exists "Public can read Korean verse search term links" on public.bible_verse_search_terms_ko;
create policy "Public can read Korean verse search term links"
on public.bible_verse_search_terms_ko
for select
using (
  exists (
    select 1
    from public.bible_search_terms_ko term
    where term.id = bible_verse_search_terms_ko.search_term_id
      and term.is_public = true
  )
);

create index if not exists bible_search_terms_ko_compact_idx
on public.bible_search_terms_ko (compact_term)
where is_public = true;

create index if not exists bible_verse_search_terms_ko_term_idx
on public.bible_verse_search_terms_ko (search_term_id, translation_name);

create index if not exists bible_verse_search_terms_ko_verse_idx
on public.bible_verse_search_terms_ko (verse_key);

insert into public.bible_search_terms_ko (
  term,
  normalized_term,
  compact_term,
  term_type,
  canonical_term,
  is_public
)
values
  ('하나님', public.normalize_korean_search_text('하나님', false), public.normalize_korean_search_text('하나님', true), 'theology', '하나님', true),
  ('주', public.normalize_korean_search_text('주', false), public.normalize_korean_search_text('주', true), 'theology', '주', true),
  ('예수', public.normalize_korean_search_text('예수', false), public.normalize_korean_search_text('예수', true), 'theology', '예수 그리스도', true),
  ('예수 그리스도', public.normalize_korean_search_text('예수 그리스도', false), public.normalize_korean_search_text('예수 그리스도', true), 'theology', '예수 그리스도', true),
  ('그리스도', public.normalize_korean_search_text('그리스도', false), public.normalize_korean_search_text('그리스도', true), 'theology', '예수 그리스도', true),
  ('주 예수', public.normalize_korean_search_text('주 예수', false), public.normalize_korean_search_text('주 예수', true), 'alias', '예수 그리스도', true),
  ('성령', public.normalize_korean_search_text('성령', false), public.normalize_korean_search_text('성령', true), 'theology', '성령', true),
  ('믿음', public.normalize_korean_search_text('믿음', false), public.normalize_korean_search_text('믿음', true), 'keyword', '믿음', true),
  ('은혜', public.normalize_korean_search_text('은혜', false), public.normalize_korean_search_text('은혜', true), 'keyword', '은혜', true),
  ('죄', public.normalize_korean_search_text('죄', false), public.normalize_korean_search_text('죄', true), 'keyword', '죄', true),
  ('회개', public.normalize_korean_search_text('회개', false), public.normalize_korean_search_text('회개', true), 'keyword', '회개', true),
  ('구원', public.normalize_korean_search_text('구원', false), public.normalize_korean_search_text('구원', true), 'keyword', '구원', true),
  ('생명', public.normalize_korean_search_text('생명', false), public.normalize_korean_search_text('생명', true), 'keyword', '생명', true),
  ('왕국', public.normalize_korean_search_text('왕국', false), public.normalize_korean_search_text('왕국', true), 'keyword', '왕국', true),
  ('하늘의 왕국', public.normalize_korean_search_text('하늘의 왕국', false), public.normalize_korean_search_text('하늘의 왕국', true), 'phrase', '하늘의 왕국', true),
  ('복음', public.normalize_korean_search_text('복음', false), public.normalize_korean_search_text('복음', true), 'keyword', '복음', true),
  ('부활', public.normalize_korean_search_text('부활', false), public.normalize_korean_search_text('부활', true), 'keyword', '부활', true)
on conflict (normalized_term, term_type) do update set
  term = excluded.term,
  compact_term = excluded.compact_term,
  canonical_term = excluded.canonical_term,
  is_public = excluded.is_public;

create or replace function public.refresh_bible_verse_search_terms_ko(
  p_translation_name text default 'KJV Reader Note'
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  inserted_count int;
begin
  delete from public.bible_verse_search_terms_ko
  where translation_name = p_translation_name;

  insert into public.bible_verse_search_terms_ko (
    verse_key,
    search_term_id,
    translation_name,
    match_count,
    first_position
  )
  select
    ko.verse_key,
    term.id,
    ko.translation_name,
    greatest(
      1,
      (
        length(ko.search_text_ko_compact) -
        length(replace(ko.search_text_ko_compact, term.compact_term, ''))
      ) / greatest(length(term.compact_term), 1)
    )::int as match_count,
    nullif(position(term.compact_term in ko.search_text_ko_compact), 0) as first_position
  from public.bible_verses_ko ko
  join public.bible_search_terms_ko term
    on term.is_public = true
   and term.compact_term <> ''
   and ko.search_text_ko_compact like '%' || term.compact_term || '%'
  where ko.translation_name = p_translation_name
    and ko.translation_status = 'approved'
    and ko.is_public = true;

  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'translationName', p_translation_name,
    'indexedRows', inserted_count,
    'refreshedAt', now()
  );
end;
$$;

select public.refresh_bible_verse_search_terms_ko('KJV Reader Note');

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

grant select on table public.bible_search_terms_ko to anon, authenticated, service_role;
grant select on table public.bible_verse_search_terms_ko to anon, authenticated, service_role;

grant execute on function public.normalize_korean_search_text(text, boolean) to anon, authenticated, service_role;
grant execute on function public.search_bible_verses_ko(text, text, text, text, int, int, text) to anon, authenticated, service_role;

revoke execute on function public.refresh_bible_verse_search_terms_ko(text) from public, anon, authenticated;
grant execute on function public.refresh_bible_verse_search_terms_ko(text) to service_role;

comment on column public.bible_verses_ko.search_text_ko is
  'Normalized Korean text used for DB keyword search.';

comment on column public.bible_verses_ko.search_text_ko_compact is
  'Whitespace-stripped Korean text used for phrase search.';

comment on table public.bible_search_terms_ko is
  'Public Korean Bible search keyword dictionary and aliases.';

comment on table public.bible_verse_search_terms_ko is
  'Korean search inverted index linking public search terms to approved public verses.';
