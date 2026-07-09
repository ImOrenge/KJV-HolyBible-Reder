alter table public.user_reading_positions add column if not exists client_id text;
update public.user_reading_positions set client_id = 'current-progress' where client_id is null;
alter table public.user_reading_positions alter column client_id set default 'current-progress';
alter table public.user_reading_positions alter column client_id set not null;
create unique index if not exists user_reading_positions_user_client_id_idx
on public.user_reading_positions(user_id, client_id);

alter table public.user_completed_chapters add column if not exists client_id text;
update public.user_completed_chapters set client_id = id::text where client_id is null;
alter table public.user_completed_chapters alter column client_id set not null;
create unique index if not exists user_completed_chapters_user_client_id_idx
on public.user_completed_chapters(user_id, client_id);

alter table public.user_highlights add column if not exists client_id text;
update public.user_highlights set client_id = id::text where client_id is null;
alter table public.user_highlights alter column client_id set not null;
create unique index if not exists user_highlights_user_client_id_idx
on public.user_highlights(user_id, client_id);

alter table public.user_favorite_verses add column if not exists client_id text;
update public.user_favorite_verses set client_id = id::text where client_id is null;
alter table public.user_favorite_verses alter column client_id set not null;
create unique index if not exists user_favorite_verses_user_client_id_idx
on public.user_favorite_verses(user_id, client_id);

alter table public.user_tags add column if not exists client_id text;
update public.user_tags set client_id = id::text where client_id is null;
alter table public.user_tags alter column client_id set not null;
create unique index if not exists user_tags_user_client_id_idx
on public.user_tags(user_id, client_id);

alter table public.user_settings add column if not exists client_id text;
update public.user_settings set client_id = 'settings' where client_id is null;
alter table public.user_settings alter column client_id set default 'settings';
alter table public.user_settings alter column client_id set not null;
create unique index if not exists user_settings_user_client_id_idx
on public.user_settings(user_id, client_id);

alter table public.user_settings add column if not exists reading_mode text not null default 'normal'
  check (reading_mode in ('normal', 'verse-numbers', 'focus'));
alter table public.user_settings add column if not exists show_parallel_translation boolean not null default false;
alter table public.user_settings add column if not exists tts_speed numeric not null default 1.0
  check (tts_speed between 0.5 and 2.0);
alter table public.user_settings add column if not exists tts_repeat boolean not null default false;
alter table public.user_settings add column if not exists tts_auto_scroll boolean not null default true;

create table if not exists public.user_recent_reads (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  chapter int not null check (chapter > 0),
  verse int not null default 1 check (verse > 0),
  verse_key text,
  scroll_position int not null default 0 check (scroll_position >= 0),
  last_read_at timestamptz not null default now(),

  unique(user_id, client_id)
);

create table if not exists public.user_favorite_lists (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, client_id)
);

drop trigger if exists set_user_favorite_lists_updated_at on public.user_favorite_lists;
create trigger set_user_favorite_lists_updated_at
before update on public.user_favorite_lists
for each row
execute function public.set_updated_at();

create table if not exists public.user_favorite_verse_list_memberships (
  id uuid primary key default gen_random_uuid(),
  favorite_verse_id uuid not null references public.user_favorite_verses(id) on delete cascade,
  favorite_list_id uuid not null references public.user_favorite_lists(id) on delete cascade,
  created_at timestamptz not null default now(),

  unique(favorite_verse_id, favorite_list_id)
);

create table if not exists public.user_study_notes (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('chapter', 'verse')),
  book_id uuid not null references public.bible_books(id) on delete restrict,
  book_order int not null check (book_order between 1 and 66),
  chapter int not null check (chapter > 0),
  verse int check (verse is null or verse > 0),
  verse_key text,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, client_id),
  check ((scope = 'chapter' and verse is null) or (scope = 'verse' and verse is not null and verse_key is not null))
);

drop trigger if exists set_user_study_notes_updated_at on public.user_study_notes;
create trigger set_user_study_notes_updated_at
before update on public.user_study_notes
for each row
execute function public.set_updated_at();

create table if not exists public.user_reading_plans (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null check (template in ('one-year', 'six-month', 'ninety-day', 'new-testament-thirty-day')),
  name text not null,
  scope text not null check (scope in ('whole-bible', 'new-testament')),
  start_date date not null,
  total_days int not null check (total_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, client_id)
);

drop trigger if exists set_user_reading_plans_updated_at on public.user_reading_plans;
create trigger set_user_reading_plans_updated_at
before update on public.user_reading_plans
for each row
execute function public.set_updated_at();

alter table public.user_recent_reads enable row level security;
alter table public.user_favorite_lists enable row level security;
alter table public.user_favorite_verse_list_memberships enable row level security;
alter table public.user_study_notes enable row level security;
alter table public.user_reading_plans enable row level security;

drop policy if exists "Users can manage own recent reads" on public.user_recent_reads;
create policy "Users can manage own recent reads"
on public.user_recent_reads
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own favorite lists" on public.user_favorite_lists;
create policy "Users can manage own favorite lists"
on public.user_favorite_lists
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own favorite verse list memberships" on public.user_favorite_verse_list_memberships;
create policy "Users can manage own favorite verse list memberships"
on public.user_favorite_verse_list_memberships
for all
using (
  exists (
    select 1
    from public.user_favorite_verses favorite
    join public.user_favorite_lists list on list.id = user_favorite_verse_list_memberships.favorite_list_id
    where favorite.id = user_favorite_verse_list_memberships.favorite_verse_id
      and favorite.user_id = auth.uid()
      and list.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_favorite_verses favorite
    join public.user_favorite_lists list on list.id = user_favorite_verse_list_memberships.favorite_list_id
    where favorite.id = user_favorite_verse_list_memberships.favorite_verse_id
      and favorite.user_id = auth.uid()
      and list.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage own study notes" on public.user_study_notes;
create policy "Users can manage own study notes"
on public.user_study_notes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own reading plans" on public.user_reading_plans;
create policy "Users can manage own reading plans"
on public.user_reading_plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_recent_reads to authenticated, service_role;
grant select, insert, update, delete on table public.user_favorite_lists to authenticated, service_role;
grant select, insert, update, delete on table public.user_favorite_verse_list_memberships to authenticated, service_role;
grant select, insert, update, delete on table public.user_study_notes to authenticated, service_role;
grant select, insert, update, delete on table public.user_reading_plans to authenticated, service_role;

create or replace function public.get_user_data_snapshot()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  snapshot jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'progress',
      (
        select jsonb_build_object(
          'userId', position.user_id,
          'bookId', book.app_book_id,
          'chapter', position.chapter,
          'verse', coalesce(position.verse, 1),
          'scrollPosition', position.scroll_position,
          'lastReadAt', to_jsonb(position.last_read_at)#>>'{}'
        )
        from public.user_reading_positions position
        join public.bible_books book on book.id = position.book_id
        where position.user_id = current_user_id
        order by position.last_read_at desc
        limit 1
      ),
    'activeReadingPlan',
      (
        select jsonb_build_object(
          'id', plan.client_id,
          'userId', plan.user_id,
          'template', plan.template,
          'name', plan.name,
          'scope', plan.scope,
          'startDate', plan.start_date::text,
          'totalDays', plan.total_days,
          'createdAt', to_jsonb(plan.created_at)#>>'{}',
          'updatedAt', to_jsonb(plan.updated_at)#>>'{}'
        )
        from public.user_reading_plans plan
        where plan.user_id = current_user_id
          and plan.active is true
        order by plan.updated_at desc
        limit 1
      ),
    'recentReads',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'userId', read.user_id,
              'bookId', book.app_book_id,
              'chapter', read.chapter,
              'verse', read.verse,
              'scrollPosition', read.scroll_position,
              'lastReadAt', to_jsonb(read.last_read_at)#>>'{}'
            )
            order by read.last_read_at desc
          )
          from public.user_recent_reads read
          join public.bible_books book on book.id = read.book_id
          where read.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'completedChapters',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', chapter.client_id,
              'userId', chapter.user_id,
              'bookId', book.app_book_id,
              'chapter', chapter.chapter,
              'completedAt', to_jsonb(chapter.completed_at)#>>'{}'
            )
            order by chapter.completed_at desc
          )
          from public.user_completed_chapters chapter
          join public.bible_books book on book.id = chapter.book_id
          where chapter.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'highlights',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', highlight.client_id,
              'userId', highlight.user_id,
              'verseId', highlight.verse_key,
              'bookId', verse.app_book_id,
              'chapter', verse.chapter,
              'verse', verse.verse,
              'color', highlight.color,
              'note', coalesce(highlight.note, ''),
              'createdAt', to_jsonb(highlight.created_at)#>>'{}',
              'updatedAt', to_jsonb(highlight.updated_at)#>>'{}'
            )
            order by highlight.updated_at desc
          )
          from public.user_highlights highlight
          join public.bible_verses_en verse on verse.verse_key = highlight.verse_key
          where highlight.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'studyNotes',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', note.client_id,
              'userId', note.user_id,
              'scope', note.scope,
              'bookId', book.app_book_id,
              'chapter', note.chapter,
              'verse', note.verse,
              'verseId', note.verse_key,
              'note', note.note,
              'createdAt', to_jsonb(note.created_at)#>>'{}',
              'updatedAt', to_jsonb(note.updated_at)#>>'{}'
            )
            order by note.updated_at desc
          )
          from public.user_study_notes note
          join public.bible_books book on book.id = note.book_id
          where note.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'favoriteVerses',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', favorite.client_id,
              'userId', favorite.user_id,
              'verseId', favorite.verse_key,
              'bookId', verse.app_book_id,
              'chapter', verse.chapter,
              'verse', verse.verse,
              'title', coalesce(favorite.title, ''),
              'memo', coalesce(favorite.memo, ''),
              'usageCount', favorite.usage_count,
              'tagIds', coalesce(
                (
                  select jsonb_agg(tag.client_id order by tag.name)
                  from public.user_favorite_verse_tags membership
                  join public.user_tags tag on tag.id = membership.tag_id
                  where membership.favorite_verse_id = favorite.id
                    and tag.user_id = current_user_id
                ),
                '[]'::jsonb
              ),
              'listIds', coalesce(
                (
                  select jsonb_agg(list.client_id order by list.created_at)
                  from public.user_favorite_verse_list_memberships membership
                  join public.user_favorite_lists list on list.id = membership.favorite_list_id
                  where membership.favorite_verse_id = favorite.id
                    and list.user_id = current_user_id
                ),
                '[]'::jsonb
              ),
              'createdAt', to_jsonb(favorite.created_at)#>>'{}',
              'updatedAt', to_jsonb(favorite.updated_at)#>>'{}'
            )
            order by favorite.updated_at desc
          )
          from public.user_favorite_verses favorite
          join public.bible_verses_en verse on verse.verse_key = favorite.verse_key
          where favorite.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'favoriteLists',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', list.client_id,
              'userId', list.user_id,
              'name', list.name,
              'createdAt', to_jsonb(list.created_at)#>>'{}',
              'updatedAt', to_jsonb(list.updated_at)#>>'{}'
            )
            order by list.created_at asc
          )
          from public.user_favorite_lists list
          where list.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'tags',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', tag.client_id,
              'userId', tag.user_id,
              'name', tag.name,
              'createdAt', to_jsonb(tag.created_at)#>>'{}'
            )
            order by tag.created_at asc
          )
          from public.user_tags tag
          where tag.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'settings',
      coalesce(
        (
          select jsonb_build_object(
            'fontSize', setting.font_size,
            'lineHeight', setting.line_height,
            'theme', case when setting.theme = 'dark' then 'dark' else 'light' end,
            'readingMode', setting.reading_mode,
            'defaultTranslation', case when setting.default_translation = 'ko' then 'ko' else 'en' end,
            'showParallelTranslation', setting.show_parallel_translation,
            'ttsVoice', coalesce(setting.tts_voice, ''),
            'ttsSpeed', setting.tts_speed,
            'ttsRepeat', setting.tts_repeat,
            'ttsAutoScroll', setting.tts_auto_scroll
          )
          from public.user_settings setting
          where setting.user_id = current_user_id
          order by setting.updated_at desc
          limit 1
        ),
        jsonb_build_object(
          'fontSize', 18,
          'lineHeight', 1.75,
          'theme', 'light',
          'readingMode', 'normal',
          'defaultTranslation', 'en',
          'showParallelTranslation', false,
          'ttsVoice', '',
          'ttsSpeed', 1,
          'ttsRepeat', false,
          'ttsAutoScroll', true
        )
      )
  )
  into snapshot;

  return snapshot;
end;
$$;

create or replace function public.replace_user_data_snapshot(snapshot jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  incoming jsonb := coalesce(snapshot, '{}'::jsonb);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  delete from public.user_favorite_verse_list_memberships membership
  where membership.favorite_verse_id in (
    select favorite.id from public.user_favorite_verses favorite where favorite.user_id = current_user_id
  )
  or membership.favorite_list_id in (
    select list.id from public.user_favorite_lists list where list.user_id = current_user_id
  );

  delete from public.user_favorite_verse_tags membership
  where membership.favorite_verse_id in (
    select favorite.id from public.user_favorite_verses favorite where favorite.user_id = current_user_id
  );

  delete from public.user_highlight_tags membership
  where membership.highlight_id in (
    select highlight.id from public.user_highlights highlight where highlight.user_id = current_user_id
  );

  delete from public.user_recent_reads where user_id = current_user_id;
  delete from public.user_reading_positions where user_id = current_user_id;
  delete from public.user_completed_chapters where user_id = current_user_id;
  delete from public.user_highlights where user_id = current_user_id;
  delete from public.user_favorite_verses where user_id = current_user_id;
  delete from public.user_study_notes where user_id = current_user_id;
  delete from public.user_reading_plans where user_id = current_user_id;
  delete from public.user_favorite_lists where user_id = current_user_id;
  delete from public.user_tags where user_id = current_user_id;
  delete from public.user_settings where user_id = current_user_id;

  insert into public.user_reading_positions (
    user_id,
    client_id,
    book_id,
    book_order,
    chapter,
    verse,
    verse_key,
    scroll_position,
    last_read_at
  )
  select
    current_user_id,
    'current-progress',
    book.id,
    book.book_order,
    item.chapter,
    item.verse,
    verse.verse_key,
    coalesce(item."scrollPosition", 0),
    coalesce(nullif(item."lastReadAt", '')::timestamptz, now())
  from jsonb_to_record(incoming->'progress') as item(
    "bookId" text,
    chapter int,
    verse int,
    "scrollPosition" int,
    "lastReadAt" text
  )
  join public.bible_books book on book.app_book_id = item."bookId"
  left join public.bible_verses_en verse on verse.app_book_id = item."bookId"
    and verse.chapter = item.chapter
    and verse.verse = item.verse
  where jsonb_typeof(incoming->'progress') = 'object';

  insert into public.user_recent_reads (
    user_id,
    client_id,
    book_id,
    book_order,
    chapter,
    verse,
    verse_key,
    scroll_position,
    last_read_at
  )
  select
    current_user_id,
    concat('recent-', item."bookId", '-', item.chapter),
    book.id,
    book.book_order,
    item.chapter,
    item.verse,
    verse.verse_key,
    coalesce(item."scrollPosition", 0),
    coalesce(nullif(item."lastReadAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'recentReads', '[]'::jsonb)) as item(
    "bookId" text,
    chapter int,
    verse int,
    "scrollPosition" int,
    "lastReadAt" text
  )
  join public.bible_books book on book.app_book_id = item."bookId"
  left join public.bible_verses_en verse on verse.app_book_id = item."bookId"
    and verse.chapter = item.chapter
    and verse.verse = item.verse
  on conflict (user_id, client_id) do nothing;

  insert into public.user_completed_chapters (
    user_id,
    client_id,
    book_id,
    book_order,
    chapter,
    completed_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('completed-', item."bookId", '-', item.chapter)),
    book.id,
    book.book_order,
    item.chapter,
    coalesce(nullif(item."completedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'completedChapters', '[]'::jsonb)) as item(
    id text,
    "bookId" text,
    chapter int,
    "completedAt" text
  )
  join public.bible_books book on book.app_book_id = item."bookId"
  on conflict (user_id, book_id, chapter) do nothing;

  insert into public.user_highlights (
    user_id,
    client_id,
    verse_key,
    en_verse_id,
    color,
    note,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('highlight-', item."verseId")),
    item."verseId",
    verse.id,
    coalesce(nullif(item.color, ''), 'yellow'),
    coalesce(item.note, ''),
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'highlights', '[]'::jsonb)) as item(
    id text,
    "verseId" text,
    color text,
    note text,
    "createdAt" text,
    "updatedAt" text
  )
  join public.bible_verses_en verse on verse.verse_key = item."verseId"
  on conflict (user_id, verse_key) do nothing;

  insert into public.user_favorite_lists (
    user_id,
    client_id,
    name,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), 'default-favorite-list'),
    coalesce(nullif(item.name, ''), '기본 목록'),
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'favoriteLists', '[]'::jsonb)) as item(
    id text,
    name text,
    "createdAt" text,
    "updatedAt" text
  )
  on conflict (user_id, client_id) do nothing;

  insert into public.user_tags (
    user_id,
    client_id,
    name,
    created_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('tag-', md5(coalesce(item.name, '')))),
    coalesce(nullif(item.name, ''), '태그'),
    coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'tags', '[]'::jsonb)) as item(
    id text,
    name text,
    "createdAt" text
  )
  on conflict (user_id, name) do nothing;

  insert into public.user_favorite_verses (
    user_id,
    client_id,
    verse_key,
    en_verse_id,
    title,
    memo,
    usage_count,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('favorite-', item."verseId")),
    item."verseId",
    verse.id,
    coalesce(item.title, ''),
    coalesce(item.memo, ''),
    coalesce(item."usageCount", 0),
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'favoriteVerses', '[]'::jsonb)) as item(
    id text,
    "verseId" text,
    title text,
    memo text,
    "usageCount" int,
    "createdAt" text,
    "updatedAt" text
  )
  join public.bible_verses_en verse on verse.verse_key = item."verseId"
  on conflict (user_id, verse_key) do nothing;

  insert into public.user_favorite_verse_tags (
    favorite_verse_id,
    tag_id
  )
  select
    favorite.id,
    tag.id
  from jsonb_to_recordset(coalesce(incoming->'favoriteVerses', '[]'::jsonb)) as item(
    id text,
    "tagIds" jsonb
  )
  join public.user_favorite_verses favorite on favorite.user_id = current_user_id
    and favorite.client_id = item.id
  cross join lateral jsonb_array_elements_text(coalesce(item."tagIds", '[]'::jsonb)) as tag_ref(client_id)
  join public.user_tags tag on tag.user_id = current_user_id
    and tag.client_id = tag_ref.client_id
  on conflict (favorite_verse_id, tag_id) do nothing;

  insert into public.user_favorite_verse_list_memberships (
    favorite_verse_id,
    favorite_list_id
  )
  select
    favorite.id,
    list.id
  from jsonb_to_recordset(coalesce(incoming->'favoriteVerses', '[]'::jsonb)) as item(
    id text,
    "listIds" jsonb
  )
  join public.user_favorite_verses favorite on favorite.user_id = current_user_id
    and favorite.client_id = item.id
  cross join lateral jsonb_array_elements_text(coalesce(item."listIds", '[]'::jsonb)) as list_ref(client_id)
  join public.user_favorite_lists list on list.user_id = current_user_id
    and list.client_id = list_ref.client_id
  on conflict (favorite_verse_id, favorite_list_id) do nothing;

  insert into public.user_study_notes (
    user_id,
    client_id,
    scope,
    book_id,
    book_order,
    chapter,
    verse,
    verse_key,
    note,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('note-', item.scope, '-', item."bookId", '-', item.chapter, '-', coalesce(item.verse::text, 'chapter'))),
    coalesce(nullif(item.scope, ''), 'chapter'),
    book.id,
    book.book_order,
    item.chapter,
    case when item.scope = 'verse' then item.verse else null end,
    case when item.scope = 'verse' then item."verseId" else null end,
    coalesce(item.note, ''),
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'studyNotes', '[]'::jsonb)) as item(
    id text,
    scope text,
    "bookId" text,
    chapter int,
    verse int,
    "verseId" text,
    note text,
    "createdAt" text,
    "updatedAt" text
  )
  join public.bible_books book on book.app_book_id = item."bookId"
  where item.scope in ('chapter', 'verse')
  on conflict (user_id, client_id) do nothing;

  insert into public.user_reading_plans (
    user_id,
    client_id,
    template,
    name,
    scope,
    start_date,
    total_days,
    active,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('reading-plan-', item.template)),
    item.template,
    coalesce(nullif(item.name, ''), '통독 플랜'),
    item.scope,
    coalesce(nullif(item."startDate", '')::date, current_date),
    coalesce(item."totalDays", 1),
    true,
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_record(incoming->'activeReadingPlan') as item(
    id text,
    template text,
    name text,
    scope text,
    "startDate" text,
    "totalDays" int,
    "createdAt" text,
    "updatedAt" text
  )
  where jsonb_typeof(incoming->'activeReadingPlan') = 'object'
    and item.template in ('one-year', 'six-month', 'ninety-day', 'new-testament-thirty-day')
    and item.scope in ('whole-bible', 'new-testament');

  insert into public.user_settings (
    user_id,
    client_id,
    theme,
    font_size,
    line_height,
    reader_width,
    tts_rate,
    tts_pitch,
    tts_voice,
    default_translation,
    reading_mode,
    show_parallel_translation,
    tts_speed,
    tts_repeat,
    tts_auto_scroll
  )
  select
    current_user_id,
    'settings',
    case when settings.item->>'theme' = 'dark' then 'dark' else 'light' end,
    coalesce(nullif(settings.item->>'fontSize', '')::int, 18),
    coalesce(nullif(settings.item->>'lineHeight', '')::numeric, 1.75),
    'normal',
    coalesce(nullif(settings.item->>'ttsSpeed', '')::numeric, 1.0),
    1.0,
    coalesce(settings.item->>'ttsVoice', ''),
    case when settings.item->>'defaultTranslation' = 'ko' then 'ko' else 'en' end,
    case
      when settings.item->>'readingMode' in ('normal', 'verse-numbers', 'focus') then settings.item->>'readingMode'
      else 'normal'
    end,
    coalesce((settings.item->>'showParallelTranslation')::boolean, false),
    coalesce(nullif(settings.item->>'ttsSpeed', '')::numeric, 1.0),
    coalesce((settings.item->>'ttsRepeat')::boolean, false),
    coalesce((settings.item->>'ttsAutoScroll')::boolean, true)
  from (select coalesce(incoming->'settings', '{}'::jsonb) as item) settings;

  return public.get_user_data_snapshot();
end;
$$;

grant execute on function public.get_user_data_snapshot() to authenticated;
grant execute on function public.replace_user_data_snapshot(jsonb) to authenticated;
