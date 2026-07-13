create schema if not exists app_private;

do $$
begin
  if to_regclass('app_private.user_roles') is not null then
    alter table app_private.user_roles drop constraint if exists user_roles_role_check;
    alter table app_private.user_roles
      add constraint user_roles_role_check
      check (role in (
        'feedback_reviewer',
        'translator',
        'lead_reviewer',
        'discussion_moderator',
        'community_manager',
        'admin'
      ));
  end if;
end;
$$;

create or replace function public.current_user_app_roles()
returns text[]
language sql
stable
security invoker
set search_path = public, app_private
as $$
  select coalesce(array_agg(role_name), '{}'::text[])
  from unnest(array[
    'feedback_reviewer',
    'translator',
    'lead_reviewer',
    'discussion_moderator',
    'community_manager',
    'admin'
  ]::text[]) role_name
  where app_private.has_role(role_name);
$$;

revoke execute on function public.current_user_app_roles() from public, anon;
grant execute on function public.current_user_app_roles() to authenticated, service_role;

create table public.user_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 40),
  ranking_opt_in boolean not null default false,
  show_level boolean not null default true,
  status text not null default 'active'
    check (status in ('active', 'restricted', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  verse_key text not null,
  title text not null check (char_length(trim(title)) between 4 and 120),
  body text not null check (char_length(trim(body)) between 10 and 4000),
  thread_type text not null default 'qt_share'
    check (thread_type in ('qt_share', 'question', 'observation', 'application', 'cross_reference')),
  kjv_text_snapshot text not null,
  ko_text_snapshot text,
  status text not null default 'open'
    check (status in ('open', 'locked', 'hidden', 'deleted')),
  visibility text not null default 'members' check (visibility = 'members'),
  comment_count integer not null default 0 check (comment_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  parent_comment_id uuid references public.discussion_comments(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  thread_id uuid references public.discussion_threads(id) on delete cascade,
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('helpful', 'encourage')),
  created_at timestamptz not null default now(),
  constraint discussion_reactions_target_check check (
    (target_type = 'thread' and thread_id is not null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null and thread_id is null)
  )
);

create table public.discussion_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  thread_id uuid references public.discussion_threads(id) on delete cascade,
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate_or_abuse', 'off_topic', 'private_information', 'other')),
  details text check (details is null or char_length(trim(details)) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint discussion_reports_target_check check (
    (target_type = 'thread' and thread_id is not null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null and thread_id is null)
  )
);

create table public.reading_completion_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.bible_books(id) on delete restrict,
  chapter integer not null check (chapter > 0),
  completion_method text not null check (completion_method in ('scroll', 'chapter_tts', 'today_plan_tts')),
  completed_at timestamptz not null default now(),
  unique (user_id, book_id, chapter)
);

create table public.community_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_code text not null,
  amount integer not null check (amount <> 0),
  entry_type text not null check (entry_type in ('earn', 'reversal', 'adjustment')),
  source_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_key)
);

create table public.community_point_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  updated_at timestamptz not null default now()
);

create table public.community_level_definitions (
  code text primary key,
  level integer not null unique check (level > 0),
  name text not null,
  minimum_points integer not null unique check (minimum_points >= 0)
);

insert into public.community_level_definitions (code, level, name, minimum_points)
values
  ('starting', 1, '시작', 0),
  ('steady', 2, '꾸준한 참여', 100),
  ('growing', 3, '성장하는 참여', 300),
  ('engaged', 4, '깊어지는 참여', 700),
  ('companion', 5, '함께 걷는 참여', 1500)
on conflict (code) do update set
  level = excluded.level,
  name = excluded.name,
  minimum_points = excluded.minimum_points;

create unique index discussion_reactions_thread_unique
on public.discussion_reactions(user_id, thread_id, reaction_type)
where target_type = 'thread';

create unique index discussion_reactions_comment_unique
on public.discussion_reactions(user_id, comment_id, reaction_type)
where target_type = 'comment';

create unique index discussion_reports_open_thread_unique
on public.discussion_reports(reporter_id, thread_id)
where target_type = 'thread' and status in ('open', 'reviewing');

create unique index discussion_reports_open_comment_unique
on public.discussion_reports(reporter_id, comment_id)
where target_type = 'comment' and status in ('open', 'reviewing');

create index discussion_threads_activity_idx
on public.discussion_threads(status, last_activity_at desc);

create index discussion_threads_verse_idx
on public.discussion_threads(verse_key, status, last_activity_at desc);

create index discussion_threads_author_idx
on public.discussion_threads(author_id, created_at desc);

create index discussion_comments_thread_idx
on public.discussion_comments(thread_id, status, created_at asc);

create index discussion_comments_author_idx
on public.discussion_comments(author_id, created_at desc);

create index community_point_ledger_period_idx
on public.community_point_ledger(created_at desc, user_id);

create or replace function app_private.award_community_points(
  target_user_id uuid,
  target_event_code text,
  target_amount integer,
  target_source_key text,
  target_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded_id uuid;
begin
  if target_user_id is null or target_amount = 0 then
    return false;
  end if;

  insert into public.community_point_ledger (
    user_id,
    event_code,
    amount,
    entry_type,
    source_key,
    metadata
  )
  values (
    target_user_id,
    target_event_code,
    target_amount,
    case when target_amount > 0 then 'earn' else 'reversal' end,
    target_source_key,
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (user_id, source_key) do nothing
  returning id into awarded_id;

  if awarded_id is null then
    return false;
  end if;

  insert into public.community_point_balances (user_id, total_points, updated_at)
  values (target_user_id, greatest(0, target_amount), now())
  on conflict (user_id) do update set
    total_points = greatest(0, public.community_point_balances.total_points + target_amount),
    updated_at = now();

  return true;
end;
$$;

create or replace function app_private.reverse_community_points(
  target_user_id uuid,
  original_source_key text,
  reversal_source_key text,
  reversal_event_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_amount integer;
begin
  select amount into original_amount
  from public.community_point_ledger
  where user_id = target_user_id
    and source_key = original_source_key
    and amount > 0;

  if original_amount is null then
    return false;
  end if;

  return app_private.award_community_points(
    target_user_id,
    reversal_event_code,
    -original_amount,
    reversal_source_key,
    jsonb_build_object('originalSourceKey', original_source_key)
  );
end;
$$;

create or replace function app_private.on_discussion_thread_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.award_community_points(
    new.author_id,
    'community.qt_published',
    5,
    'thread:' || new.id::text,
    jsonb_build_object('threadId', new.id, 'verseKey', new.verse_key)
  );
  return new;
end;
$$;

create or replace function app_private.on_discussion_comment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_author_id uuid;
  target_thread_id uuid;
begin
  target_thread_id := coalesce(new.thread_id, old.thread_id);

  update public.discussion_threads thread
  set
    comment_count = (
      select count(*) from public.discussion_comments comment
      where comment.thread_id = target_thread_id and comment.status = 'visible'
    ),
    last_activity_at = case when tg_op = 'INSERT' then now() else thread.last_activity_at end
  where thread.id = target_thread_id;

  if tg_op = 'INSERT' then
    select author_id into thread_author_id
    from public.discussion_threads
    where id = new.thread_id;

    if new.author_id is distinct from thread_author_id and char_length(trim(new.body)) >= 20 then
      perform app_private.award_community_points(
        new.author_id,
        'community.comment_published',
        2,
        'comment:' || new.id::text,
        jsonb_build_object('commentId', new.id, 'threadId', new.thread_id)
      );
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'visible' and new.status in ('hidden', 'deleted') then
    perform app_private.reverse_community_points(
      new.author_id,
      'comment:' || new.id::text,
      'reversal:comment:' || new.id::text,
      'moderation.content_reversal'
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app_private.on_discussion_thread_moderated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('open', 'locked') and new.status in ('hidden', 'deleted') then
    perform app_private.reverse_community_points(
      new.author_id,
      'thread:' || new.id::text,
      'reversal:thread:' || new.id::text,
      'moderation.content_reversal'
    );
  end if;
  return new;
end;
$$;

create or replace function app_private.on_discussion_reaction_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_author_id uuid;
  target_id uuid;
begin
  if coalesce(new.target_type, old.target_type) = 'thread' then
    target_id := coalesce(new.thread_id, old.thread_id);
    select author_id into target_author_id from public.discussion_threads where id = target_id;
    update public.discussion_threads
      set helpful_count = (
        select count(*) from public.discussion_reactions reaction
        where reaction.thread_id = target_id and reaction.reaction_type = 'helpful'
      )
      where id = target_id;
  else
    target_id := coalesce(new.comment_id, old.comment_id);
    select author_id into target_author_id from public.discussion_comments where id = target_id;
    update public.discussion_comments
      set helpful_count = (
        select count(*) from public.discussion_reactions reaction
        where reaction.comment_id = target_id and reaction.reaction_type = 'helpful'
      )
      where id = target_id;
  end if;

  if tg_op = 'INSERT' and new.reaction_type = 'helpful' and new.user_id is distinct from target_author_id then
    perform app_private.award_community_points(
      target_author_id,
      'community.helpful_received',
      1,
      'reaction:' || new.id::text,
      jsonb_build_object('reactionId', new.id, 'targetType', new.target_type, 'targetId', target_id)
    );
  elsif tg_op = 'DELETE' and old.reaction_type = 'helpful' then
    perform app_private.reverse_community_points(
      target_author_id,
      'reaction:' || old.id::text,
      'reversal:reaction:' || old.id::text,
      'community.helpful_removed'
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function app_private.on_reading_completion_evidence_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.award_community_points(
    new.user_id,
    'reading.chapter_verified',
    10,
    'reading:' || new.book_id::text || ':' || new.chapter::text,
    jsonb_build_object('bookId', new.book_id, 'chapter', new.chapter, 'method', new.completion_method)
  );
  return new;
end;
$$;

create trigger set_user_public_profiles_updated_at
before update on public.user_public_profiles
for each row execute function public.set_updated_at();

create trigger set_discussion_threads_updated_at
before update on public.discussion_threads
for each row execute function public.set_updated_at();

create trigger set_discussion_comments_updated_at
before update on public.discussion_comments
for each row execute function public.set_updated_at();

create trigger award_discussion_thread_points
after insert on public.discussion_threads
for each row execute function app_private.on_discussion_thread_created();

create trigger moderate_discussion_thread_points
after update of status on public.discussion_threads
for each row execute function app_private.on_discussion_thread_moderated();

create trigger sync_discussion_comment_state
after insert or update or delete on public.discussion_comments
for each row execute function app_private.on_discussion_comment_changed();

create trigger sync_discussion_reaction_state
after insert or delete on public.discussion_reactions
for each row execute function app_private.on_discussion_reaction_changed();

create trigger award_reading_completion_points
after insert on public.reading_completion_evidence
for each row execute function app_private.on_reading_completion_evidence_created();

alter table public.user_public_profiles enable row level security;
alter table public.discussion_threads enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_reactions enable row level security;
alter table public.discussion_reports enable row level security;
alter table public.reading_completion_evidence enable row level security;
alter table public.community_point_ledger enable row level security;
alter table public.community_point_balances enable row level security;
alter table public.community_level_definitions enable row level security;

create policy "Members can read active public profiles"
on public.user_public_profiles for select to authenticated
using (
  status = 'active'
  or user_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read visible discussion threads"
on public.discussion_threads for select to authenticated
using (
  status in ('open', 'locked')
  or author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read visible discussion comments"
on public.discussion_comments for select to authenticated
using (
  status = 'visible'
  or author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read visible discussion reactions"
on public.discussion_reactions for select to authenticated
using (true);

create policy "Members can read own discussion reports"
on public.discussion_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read own reading evidence"
on public.reading_completion_evidence for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read own point ledger"
on public.community_point_ledger for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read own point balance"
on public.community_point_balances for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read community levels"
on public.community_level_definitions for select to authenticated
using (true);

revoke all on table public.user_public_profiles from anon, authenticated;
revoke all on table public.discussion_threads from anon, authenticated;
revoke all on table public.discussion_comments from anon, authenticated;
revoke all on table public.discussion_reactions from anon, authenticated;
revoke all on table public.discussion_reports from anon, authenticated;
revoke all on table public.reading_completion_evidence from anon, authenticated;
revoke all on table public.community_point_ledger from anon, authenticated;
revoke all on table public.community_point_balances from anon, authenticated;
revoke all on table public.community_level_definitions from anon, authenticated;

grant select on table public.user_public_profiles to authenticated;
grant select on table public.discussion_threads to authenticated;
grant select on table public.discussion_comments to authenticated;
grant select on table public.discussion_reactions to authenticated;
grant select on table public.discussion_reports to authenticated;
grant select on table public.reading_completion_evidence to authenticated;
grant select on table public.community_point_ledger to authenticated;
grant select on table public.community_point_balances to authenticated;
grant select on table public.community_level_definitions to authenticated;

grant all on table public.user_public_profiles to service_role;
grant all on table public.discussion_threads to service_role;
grant all on table public.discussion_comments to service_role;
grant all on table public.discussion_reactions to service_role;
grant all on table public.discussion_reports to service_role;
grant all on table public.reading_completion_evidence to service_role;
grant all on table public.community_point_ledger to service_role;
grant all on table public.community_point_balances to service_role;
grant all on table public.community_level_definitions to service_role;

revoke all on function app_private.award_community_points(uuid, text, integer, text, jsonb) from public, anon, authenticated;
revoke all on function app_private.reverse_community_points(uuid, text, text, text) from public, anon, authenticated;
revoke all on function app_private.on_discussion_thread_created() from public, anon, authenticated;
revoke all on function app_private.on_discussion_comment_changed() from public, anon, authenticated;
revoke all on function app_private.on_discussion_thread_moderated() from public, anon, authenticated;
revoke all on function app_private.on_discussion_reaction_changed() from public, anon, authenticated;
revoke all on function app_private.on_reading_completion_evidence_created() from public, anon, authenticated;

grant execute on function app_private.award_community_points(uuid, text, integer, text, jsonb) to service_role;
grant execute on function app_private.reverse_community_points(uuid, text, text, text) to service_role;

comment on table public.community_point_ledger is
  'Append-only, server-managed community participation point ledger.';

comment on table public.reading_completion_evidence is
  'Server-verified reading completion evidence. Manual and imported completions are excluded.';
