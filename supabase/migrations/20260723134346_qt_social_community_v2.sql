create extension if not exists pg_trgm;

alter table public.user_public_profiles
  add column handle text,
  add column handle_normalized text generated always as (lower(trim(handle))) stored,
  add column bio text not null default '',
  add column public_enabled boolean not null default false,
  add column show_honorific boolean not null default false,
  add column follower_count integer not null default 0 check (follower_count >= 0),
  add column following_count integer not null default 0 check (following_count >= 0),
  add column post_count integer not null default 0 check (post_count >= 0),
  add column search_text_normalized text generated always as (
    public.normalize_korean_search_text(
      coalesce(handle, '') || ' ' || display_name || ' ' || coalesce(bio, ''),
      false
    )
  ) stored,
  add constraint user_public_profiles_handle_check check (
    handle is null
    or (
      handle ~ '^[A-Za-z0-9_]{3,24}$'
      and lower(handle) not in (
        'admin', 'api', 'app', 'auth', 'community', 'help', 'login', 'moderator',
        'notifications', 'privacy', 'search', 'settings', 'signup', 'support'
      )
    )
  ),
  add constraint user_public_profiles_bio_check check (char_length(bio) <= 160),
  add constraint user_public_profiles_public_handle_check check (
    public_enabled is false or handle is not null
  );

create unique index user_public_profiles_handle_unique_idx
on public.user_public_profiles(handle_normalized)
where handle_normalized is not null;

create index user_public_profiles_search_trgm_idx
on public.user_public_profiles
using gin(search_text_normalized gin_trgm_ops)
where public_enabled is true and status = 'active';

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  idempotency_key text,
  title text check (title is null or char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 10 and 4000),
  post_kind text not null default 'original' check (post_kind in ('original', 'quote')),
  quoted_post_id uuid references public.community_posts(id) on delete set null,
  primary_verse_key text not null,
  visibility text not null default 'public' check (visibility = 'public'),
  status text not null default 'published'
    check (status in ('draft', 'published', 'limited', 'hidden', 'deleted')),
  comment_policy text not null default 'everyone' check (comment_policy in ('everyone', 'none')),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  repost_count integer not null default 0 check (repost_count >= 0),
  quote_count integer not null default 0 check (quote_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  search_text_normalized text generated always as (
    public.normalize_korean_search_text(coalesce(title, '') || ' ' || body, false)
  ) stored,
  published_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_quote_target_check check (
    (post_kind = 'original' and quoted_post_id is null)
    or (post_kind = 'quote' and quoted_post_id is not null)
  )
);

create table public.community_post_verses (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  verse_key text not null,
  position smallint not null check (position between 0 and 9),
  is_primary boolean not null default false,
  kjv_text_snapshot text not null,
  ko_text_snapshot text,
  translation_source_id uuid,
  created_at timestamptz not null default now(),
  primary key (post_id, verse_key),
  unique (post_id, position)
);

create unique index community_post_verses_primary_unique_idx
on public.community_post_verses(post_id)
where is_primary is true;

create table public.community_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.community_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 8388608),
  width integer not null check (width between 1 and 8192),
  height integer not null check (height between 1 and 8192),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  status text not null default 'pending' check (status in ('pending', 'ready', 'rejected', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null check (char_length(tag) between 1 and 40),
  normalized_tag text not null unique check (char_length(normalized_tag) between 1 and 40),
  post_count integer not null default 0 check (post_count >= 0),
  created_at timestamptz not null default now()
);

create table public.community_post_hashtags (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  hashtag_id uuid not null references public.community_hashtags(id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  primary key (post_id, hashtag_id),
  unique (post_id, position)
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  idempotency_key text,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  status text not null default 'visible' check (status in ('visible', 'limited', 'hidden', 'deleted')),
  like_count integer not null default 0 check (like_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_likes_target_check check (
    (target_type = 'post' and post_id is not null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null and post_id is null)
  )
);

create unique index community_likes_post_unique_idx
on public.community_likes(user_id, post_id)
where target_type = 'post';

create unique index community_likes_comment_unique_idx
on public.community_likes(user_id, comment_id)
where target_type = 'comment';

create table public.community_reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table public.community_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint community_follows_not_self_check check (follower_id <> followed_id)
);

create table public.community_mutes (
  user_id uuid not null references auth.users(id) on delete cascade,
  muted_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id),
  constraint community_mutes_not_self_check check (user_id <> muted_user_id)
);

create table public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint community_blocks_not_self_check check (blocker_id <> blocked_id)
);

create table public.community_post_mentions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, mentioned_user_id)
);

create table public.community_comment_mentions (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create table public.community_post_revisions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  editor_id uuid references auth.users(id) on delete set null,
  title text,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.community_comment_revisions (
  id bigint generated always as identity primary key,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  editor_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.community_notification_outbox (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'follow', 'comment', 'reply', 'mention', 'like_post', 'like_comment',
    'repost', 'quote', 'moderation'
  )),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  actor_count integer not null default 1 check (actor_count > 0),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  profile_id uuid references auth.users(id) on delete cascade,
  reason text not null check (reason in (
    'spam', 'harassment', 'hate_or_abuse', 'off_topic', 'copyright',
    'private_information', 'impersonation', 'self_harm_risk', 'other'
  )),
  details text check (details is null or char_length(trim(details)) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_reports_target_check check (
    (target_type = 'post' and post_id is not null and comment_id is null and profile_id is null)
    or (target_type = 'comment' and comment_id is not null and post_id is null and profile_id is null)
    or (target_type = 'profile' and profile_id is not null and post_id is null and comment_id is null)
  )
);

create unique index community_reports_open_post_unique_idx
on public.community_reports(reporter_id, post_id)
where target_type = 'post' and status in ('open', 'reviewing');

create unique index community_reports_open_comment_unique_idx
on public.community_reports(reporter_id, comment_id)
where target_type = 'comment' and status in ('open', 'reviewing');

create unique index community_reports_open_profile_unique_idx
on public.community_reports(reporter_id, profile_id)
where target_type = 'profile' and status in ('open', 'reviewing');

create table public.community_moderation_events (
  id bigint generated always as identity primary key,
  moderator_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  post_id uuid references public.community_posts(id) on delete set null,
  comment_id uuid references public.community_comments(id) on delete set null,
  profile_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.community_reports(id) on delete set null,
  action text not null check (action in (
    'limit', 'hide', 'restore', 'lock_comments', 'remove',
    'restrict_user', 'suspend_user', 'dismiss_report'
  )),
  reason_code text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.community_user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restriction_type text not null check (restriction_type in ('limited', 'restricted', 'suspended')),
  reason_code text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_user_restrictions_time_check check (ends_at is null or ends_at > starts_at)
);

create table public.community_feed_impressions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  algorithm_version text not null,
  reason_code text,
  shown_at timestamptz not null default now(),
  unique (user_id, post_id, algorithm_version, shown_at)
);

create index community_posts_public_feed_idx
on public.community_posts(status, visibility, published_at desc, id desc)
where status = 'published' and visibility = 'public';

create index community_posts_author_idx
on public.community_posts(author_id, status, published_at desc, id desc);

create unique index community_posts_idempotency_unique_idx
on public.community_posts(author_id, idempotency_key)
where author_id is not null and idempotency_key is not null;

create index community_posts_quote_idx
on public.community_posts(quoted_post_id)
where quoted_post_id is not null;

create index community_posts_search_trgm_idx
on public.community_posts
using gin(search_text_normalized gin_trgm_ops)
where status = 'published' and visibility = 'public';

create index community_post_verses_verse_idx
on public.community_post_verses(verse_key, post_id);

create index community_post_hashtags_tag_idx
on public.community_post_hashtags(hashtag_id, post_id);

create index community_hashtags_normalized_trgm_idx
on public.community_hashtags using gin(normalized_tag gin_trgm_ops);

create index community_comments_post_idx
on public.community_comments(post_id, parent_comment_id, created_at, id);

create index community_comments_author_idx
on public.community_comments(author_id, created_at desc);

create index community_comments_parent_idx
on public.community_comments(parent_comment_id)
where parent_comment_id is not null;

create unique index community_comments_idempotency_unique_idx
on public.community_comments(author_id, idempotency_key)
where author_id is not null and idempotency_key is not null;

create index community_likes_post_idx on public.community_likes(post_id) where post_id is not null;
create index community_likes_comment_idx on public.community_likes(comment_id) where comment_id is not null;
create index community_reposts_post_idx on public.community_reposts(post_id, created_at desc);
create index community_follows_followed_idx on public.community_follows(followed_id, follower_id);
create index community_mutes_muted_idx on public.community_mutes(muted_user_id, user_id);
create index community_blocks_blocked_idx on public.community_blocks(blocked_id, blocker_id);
create index community_post_media_author_idx on public.community_post_media(author_id) where author_id is not null;
create index community_post_mentions_user_idx on public.community_post_mentions(mentioned_user_id, post_id);
create index community_comment_mentions_user_idx on public.community_comment_mentions(mentioned_user_id, comment_id);
create index community_post_revisions_editor_idx on public.community_post_revisions(editor_id) where editor_id is not null;
create index community_comment_revisions_editor_idx on public.community_comment_revisions(editor_id) where editor_id is not null;
create index community_notification_outbox_recipient_idx on public.community_notification_outbox(recipient_id, created_at desc);
create index community_notification_outbox_actor_idx on public.community_notification_outbox(actor_id) where actor_id is not null;
create index community_notification_outbox_post_idx on public.community_notification_outbox(post_id) where post_id is not null;
create index community_notification_outbox_comment_idx on public.community_notification_outbox(comment_id) where comment_id is not null;
create index community_notifications_user_idx on public.community_notifications(user_id, read_at, created_at desc);
create index community_notifications_actor_idx on public.community_notifications(actor_id) where actor_id is not null;
create index community_notifications_post_idx on public.community_notifications(post_id) where post_id is not null;
create index community_notifications_comment_idx on public.community_notifications(comment_id) where comment_id is not null;
create index community_push_tokens_user_idx on public.community_push_tokens(user_id, enabled, last_seen_at desc);
create index community_notification_outbox_pending_idx
on public.community_notification_outbox(created_at)
where processed_at is null;
create index community_reports_status_idx on public.community_reports(status, created_at);
create index community_reports_reporter_idx on public.community_reports(reporter_id, created_at desc);
create index community_reports_post_idx on public.community_reports(post_id) where post_id is not null;
create index community_reports_comment_idx on public.community_reports(comment_id) where comment_id is not null;
create index community_reports_profile_idx on public.community_reports(profile_id) where profile_id is not null;
create index community_reports_moderator_idx on public.community_reports(moderator_id) where moderator_id is not null;
create unique index community_reports_idempotency_unique_idx
on public.community_reports(reporter_id, idempotency_key)
where idempotency_key is not null;
create index community_moderation_events_moderator_idx on public.community_moderation_events(moderator_id) where moderator_id is not null;
create index community_moderation_events_post_idx on public.community_moderation_events(post_id) where post_id is not null;
create index community_moderation_events_comment_idx on public.community_moderation_events(comment_id) where comment_id is not null;
create index community_moderation_events_profile_idx on public.community_moderation_events(profile_id) where profile_id is not null;
create index community_moderation_events_report_idx on public.community_moderation_events(report_id) where report_id is not null;
create index community_user_restrictions_active_idx
on public.community_user_restrictions(user_id, active, ends_at);
create index community_user_restrictions_created_by_idx
on public.community_user_restrictions(created_by)
where created_by is not null;
create index community_feed_impressions_user_idx
on public.community_feed_impressions(user_id, shown_at desc);
create index community_feed_impressions_post_idx
on public.community_feed_impressions(post_id, shown_at desc);

create trigger set_community_posts_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

create trigger set_community_post_media_updated_at
before update on public.community_post_media
for each row execute function public.set_updated_at();

create trigger set_community_comments_updated_at
before update on public.community_comments
for each row execute function public.set_updated_at();

create trigger set_community_notifications_updated_at
before update on public.community_notifications
for each row execute function public.set_updated_at();

create trigger set_community_push_tokens_updated_at
before update on public.community_push_tokens
for each row execute function public.set_updated_at();

create trigger set_community_reports_updated_at
before update on public.community_reports
for each row execute function public.set_updated_at();

create trigger set_community_user_restrictions_updated_at
before update on public.community_user_restrictions
for each row execute function public.set_updated_at();

create or replace function app_private.community_pair_is_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_blocks block
    where (block.blocker_id = p_first and block.blocked_id = p_second)
       or (block.blocker_id = p_second and block.blocked_id = p_first)
  );
$$;

create or replace function app_private.community_user_is_restricted(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_user_restrictions restriction
    where restriction.user_id = p_user_id
      and restriction.active is true
      and (restriction.ends_at is null or restriction.ends_at > now())
      and restriction.restriction_type in ('restricted', 'suspended')
  );
$$;

create or replace function app_private.enqueue_community_notification(
  p_event_key text,
  p_recipient_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_post_id uuid default null,
  p_comment_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient_id is null
     or p_actor_id is null
     or p_recipient_id = p_actor_id
     or app_private.community_pair_is_blocked(p_recipient_id, p_actor_id) then
    return;
  end if;

  insert into public.community_notification_outbox (
    event_key, recipient_id, actor_id, event_type, post_id, comment_id, data
  )
  values (
    p_event_key, p_recipient_id, p_actor_id, p_event_type, p_post_id, p_comment_id, coalesce(p_data, '{}'::jsonb)
  )
  on conflict (event_key) do nothing;
end;
$$;

create or replace function app_private.validate_community_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_post_id uuid;
  parent_parent_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent.post_id, parent.parent_comment_id
  into parent_post_id, parent_parent_id
  from public.community_comments parent
  where parent.id = new.parent_comment_id
    and parent.status in ('visible', 'limited');

  if parent_post_id is null
     or parent_post_id <> new.post_id
     or parent_parent_id is not null then
    raise exception 'Invalid community reply parent' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_community_comment_parent
before insert or update of parent_comment_id, post_id on public.community_comments
for each row execute function app_private.validate_community_comment_parent();

create or replace function app_private.on_community_post_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_author uuid;
  affected_quote uuid;
begin
  if tg_op = 'UPDATE'
     and old.author_id is not distinct from new.author_id
     and old.status is not distinct from new.status
     and old.quoted_post_id is not distinct from new.quoted_post_id then
    return new;
  end if;

  affected_author := case when tg_op = 'DELETE' then old.author_id else new.author_id end;
  affected_quote := case when tg_op = 'DELETE' then old.quoted_post_id else new.quoted_post_id end;

  if affected_author is not null then
    update public.user_public_profiles profile
    set post_count = (
      select count(*)
      from public.community_posts post
      where post.author_id = affected_author and post.status = 'published'
    )
    where profile.user_id = affected_author;
  end if;

  if tg_op = 'UPDATE' and old.author_id is distinct from new.author_id and old.author_id is not null then
    update public.user_public_profiles profile
    set post_count = (
      select count(*) from public.community_posts post
      where post.author_id = old.author_id and post.status = 'published'
    )
    where profile.user_id = old.author_id;
  end if;

  if affected_quote is not null then
    update public.community_posts original
    set quote_count = (
      select count(*) from public.community_posts quote_post
      where quote_post.quoted_post_id = affected_quote and quote_post.status = 'published'
    )
    where original.id = affected_quote;
  end if;

  if tg_op = 'UPDATE' and old.quoted_post_id is distinct from new.quoted_post_id and old.quoted_post_id is not null then
    update public.community_posts original
    set quote_count = (
      select count(*) from public.community_posts quote_post
      where quote_post.quoted_post_id = old.quoted_post_id and quote_post.status = 'published'
    )
    where original.id = old.quoted_post_id;
  end if;

  if tg_op = 'INSERT' and new.post_kind = 'quote' and new.status = 'published' then
    perform app_private.enqueue_community_notification(
      'quote:' || new.id::text,
      (select original.author_id from public.community_posts original where original.id = new.quoted_post_id),
      new.author_id,
      'quote',
      new.id,
      null,
      jsonb_build_object('quotedPostId', new.quoted_post_id)
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_post_state
after insert or update or delete on public.community_posts
for each row execute function app_private.on_community_post_changed();

create or replace function app_private.on_community_comment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
  post_author_id uuid;
  parent_author_id uuid;
begin
  if tg_op = 'UPDATE'
     and old.post_id is not distinct from new.post_id
     and old.status is not distinct from new.status then
    return new;
  end if;

  target_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;

  update public.community_posts post
  set
    comment_count = (
      select count(*) from public.community_comments comment
      where comment.post_id = target_post_id and comment.status = 'visible'
    ),
    last_activity_at = case when tg_op = 'INSERT' then now() else post.last_activity_at end
  where post.id = target_post_id;

  if tg_op = 'INSERT' then
    select post.author_id into post_author_id
    from public.community_posts post where post.id = new.post_id;

    if new.parent_comment_id is null then
      perform app_private.enqueue_community_notification(
        'comment:' || new.id::text,
        post_author_id,
        new.author_id,
        'comment',
        new.post_id,
        new.id
      );
    else
      select parent.author_id into parent_author_id
      from public.community_comments parent where parent.id = new.parent_comment_id;
      perform app_private.enqueue_community_notification(
        'reply:' || new.id::text,
        parent_author_id,
        new.author_id,
        'reply',
        new.post_id,
        new.id
      );
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_comment_state
after insert or update or delete on public.community_comments
for each row execute function app_private.on_community_comment_changed();

create or replace function app_private.on_community_like_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
  target_comment_id uuid;
  target_author_id uuid;
begin
  target_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;
  target_comment_id := case when tg_op = 'DELETE' then old.comment_id else new.comment_id end;

  if target_post_id is not null then
    update public.community_posts post
    set like_count = (select count(*) from public.community_likes item where item.post_id = target_post_id)
    where post.id = target_post_id;
    select post.author_id into target_author_id from public.community_posts post where post.id = target_post_id;
  else
    update public.community_comments comment
    set like_count = (select count(*) from public.community_likes item where item.comment_id = target_comment_id)
    where comment.id = target_comment_id;
    select comment.author_id into target_author_id from public.community_comments comment where comment.id = target_comment_id;
  end if;

  if tg_op = 'INSERT' then
    perform app_private.enqueue_community_notification(
      'like:' || new.id::text,
      target_author_id,
      new.user_id,
      case when new.target_type = 'post' then 'like_post' else 'like_comment' end,
      new.post_id,
      new.comment_id
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_like_state
after insert or delete on public.community_likes
for each row execute function app_private.on_community_like_changed();

create or replace function app_private.on_community_repost_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
  target_author_id uuid;
begin
  target_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;
  update public.community_posts post
  set repost_count = (select count(*) from public.community_reposts item where item.post_id = target_post_id)
  where post.id = target_post_id;

  if tg_op = 'INSERT' then
    select post.author_id into target_author_id from public.community_posts post where post.id = new.post_id;
    perform app_private.enqueue_community_notification(
      'repost:' || new.id::text,
      target_author_id,
      new.user_id,
      'repost',
      new.post_id
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_repost_state
after insert or delete on public.community_reposts
for each row execute function app_private.on_community_repost_changed();

create or replace function app_private.on_community_follow_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_follower uuid;
  target_followed uuid;
begin
  target_follower := case when tg_op = 'DELETE' then old.follower_id else new.follower_id end;
  target_followed := case when tg_op = 'DELETE' then old.followed_id else new.followed_id end;

  update public.user_public_profiles profile
  set following_count = (select count(*) from public.community_follows item where item.follower_id = target_follower)
  where profile.user_id = target_follower;

  update public.user_public_profiles profile
  set follower_count = (select count(*) from public.community_follows item where item.followed_id = target_followed)
  where profile.user_id = target_followed;

  if tg_op = 'INSERT' then
    perform app_private.enqueue_community_notification(
      'follow:' || new.follower_id::text || ':' || new.followed_id::text,
      new.followed_id,
      new.follower_id,
      'follow'
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_follow_state
after insert or delete on public.community_follows
for each row execute function app_private.on_community_follow_changed();

create or replace function app_private.on_community_block_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.community_follows follow
  where (follow.follower_id = new.blocker_id and follow.followed_id = new.blocked_id)
     or (follow.follower_id = new.blocked_id and follow.followed_id = new.blocker_id);

  delete from public.community_mutes mute
  where mute.user_id = new.blocker_id and mute.muted_user_id = new.blocked_id;

  return new;
end;
$$;

create trigger apply_community_block
after insert on public.community_blocks
for each row execute function app_private.on_community_block_created();

create or replace function app_private.on_community_post_content_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.title is distinct from new.title or old.body is distinct from new.body then
    insert into public.community_post_revisions(post_id, editor_id, title, body)
    values (old.id, new.author_id, old.title, old.body);
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger preserve_community_post_revision
before update of title, body on public.community_posts
for each row execute function app_private.on_community_post_content_updated();

create or replace function app_private.on_community_comment_content_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.body is distinct from new.body then
    insert into public.community_comment_revisions(comment_id, editor_id, body)
    values (old.id, new.author_id, old.body);
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger preserve_community_comment_revision
before update of body on public.community_comments
for each row execute function app_private.on_community_comment_content_updated();

create or replace function app_private.on_community_post_mention_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
begin
  select post.author_id into actor_id from public.community_posts post where post.id = new.post_id;
  perform app_private.enqueue_community_notification(
    'mention:post:' || new.post_id::text || ':' || new.mentioned_user_id::text,
    new.mentioned_user_id,
    actor_id,
    'mention',
    new.post_id
  );
  return new;
end;
$$;

create trigger notify_community_post_mention
after insert on public.community_post_mentions
for each row execute function app_private.on_community_post_mention_created();

create or replace function app_private.on_community_comment_mention_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_post_id uuid;
begin
  select comment.author_id, comment.post_id into actor_id, target_post_id
  from public.community_comments comment where comment.id = new.comment_id;
  perform app_private.enqueue_community_notification(
    'mention:comment:' || new.comment_id::text || ':' || new.mentioned_user_id::text,
    new.mentioned_user_id,
    actor_id,
    'mention',
    target_post_id,
    new.comment_id
  );
  return new;
end;
$$;

create trigger notify_community_comment_mention
after insert on public.community_comment_mentions
for each row execute function app_private.on_community_comment_mention_created();

create or replace function app_private.on_community_report_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
  target_comment_id uuid;
begin
  target_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;
  target_comment_id := case when tg_op = 'DELETE' then old.comment_id else new.comment_id end;

  if tg_op = 'UPDATE'
     and old.post_id is not distinct from new.post_id
     and old.comment_id is not distinct from new.comment_id
     and old.status is not distinct from new.status then
    return new;
  end if;

  if target_post_id is not null then
    update public.community_posts post
    set report_count = (
      select count(*)
      from public.community_reports report
      where report.post_id = target_post_id
        and report.status in ('open', 'reviewing')
    )
    where post.id = target_post_id;
  end if;

  if target_comment_id is not null then
    update public.community_comments comment
    set report_count = (
      select count(*)
      from public.community_reports report
      where report.comment_id = target_comment_id
        and report.status in ('open', 'reviewing')
    )
    where comment.id = target_comment_id;
  end if;

  if tg_op = 'UPDATE' and old.post_id is distinct from new.post_id and old.post_id is not null then
    update public.community_posts post
    set report_count = (
      select count(*) from public.community_reports report
      where report.post_id = old.post_id and report.status in ('open', 'reviewing')
    )
    where post.id = old.post_id;
  end if;

  if tg_op = 'UPDATE' and old.comment_id is distinct from new.comment_id and old.comment_id is not null then
    update public.community_comments comment
    set report_count = (
      select count(*) from public.community_reports report
      where report.comment_id = old.comment_id and report.status in ('open', 'reviewing')
    )
    where comment.id = old.comment_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_community_report_state
after insert or update or delete on public.community_reports
for each row execute function app_private.on_community_report_changed();

revoke execute on function app_private.community_pair_is_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function app_private.community_user_is_restricted(uuid) from public, anon, authenticated;
revoke execute on function app_private.enqueue_community_notification(text, uuid, uuid, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function app_private.validate_community_comment_parent() from public, anon, authenticated;
revoke execute on function app_private.on_community_post_changed() from public, anon, authenticated;
revoke execute on function app_private.on_community_comment_changed() from public, anon, authenticated;
revoke execute on function app_private.on_community_like_changed() from public, anon, authenticated;
revoke execute on function app_private.on_community_repost_changed() from public, anon, authenticated;
revoke execute on function app_private.on_community_follow_changed() from public, anon, authenticated;
revoke execute on function app_private.on_community_block_created() from public, anon, authenticated;
revoke execute on function app_private.on_community_post_content_updated() from public, anon, authenticated;
revoke execute on function app_private.on_community_comment_content_updated() from public, anon, authenticated;
revoke execute on function app_private.on_community_post_mention_created() from public, anon, authenticated;
revoke execute on function app_private.on_community_comment_mention_created() from public, anon, authenticated;
revoke execute on function app_private.on_community_report_changed() from public, anon, authenticated;

alter table public.community_posts enable row level security;
alter table public.community_post_verses enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_hashtags enable row level security;
alter table public.community_post_hashtags enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reposts enable row level security;
alter table public.community_follows enable row level security;
alter table public.community_mutes enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_post_mentions enable row level security;
alter table public.community_comment_mentions enable row level security;
alter table public.community_post_revisions enable row level security;
alter table public.community_comment_revisions enable row level security;
alter table public.community_notification_outbox enable row level security;
alter table public.community_notifications enable row level security;
alter table public.community_push_tokens enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderation_events enable row level security;
alter table public.community_user_restrictions enable row level security;
alter table public.community_feed_impressions enable row level security;

create policy "Anyone can read enabled community profiles"
on public.user_public_profiles for select to anon
using (public_enabled is true and status = 'active');

create policy "Anyone can read published community posts"
on public.community_posts for select to anon, authenticated
using (
  status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_posts.author_id
      and profile.public_enabled is true
      and profile.status = 'active'
  )
  and not exists (
    select 1
    from public.community_blocks block
    where (block.blocker_id = (select auth.uid()) and block.blocked_id = community_posts.author_id)
       or (block.blocker_id = community_posts.author_id and block.blocked_id = (select auth.uid()))
  )
);

create policy "Anyone can read verses of published community posts"
on public.community_post_verses for select to anon, authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_verses.post_id
      and post.status = 'published'
      and post.visibility = 'public'
      and exists (
        select 1 from public.user_public_profiles profile
        where profile.user_id = post.author_id
          and profile.public_enabled is true
          and profile.status = 'active'
      )
  )
);

create policy "Anyone can read ready community media metadata"
on public.community_post_media for select to anon, authenticated
using (
  status = 'ready'
  and exists (
    select 1 from public.community_posts post
    where post.id = community_post_media.post_id
      and post.status = 'published'
      and post.visibility = 'public'
  )
);

create policy "Anyone can read community hashtags"
on public.community_hashtags for select to anon, authenticated
using (true);

create policy "Anyone can read published post hashtag links"
on public.community_post_hashtags for select to anon, authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_hashtags.post_id
      and post.status = 'published'
      and post.visibility = 'public'
  )
);

create policy "Anyone can read visible community comments"
on public.community_comments for select to anon, authenticated
using (
  status = 'visible'
  and exists (
    select 1 from public.community_posts post
    where post.id = community_comments.post_id
      and post.status = 'published'
      and post.visibility = 'public'
  )
);

create policy "Members can read own community likes"
on public.community_likes for select to authenticated
using (user_id = (select auth.uid()));

create policy "Anyone can read eligible community reposts"
on public.community_reposts for select to anon, authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_reposts.post_id
      and post.status = 'published'
      and post.visibility = 'public'
  )
  and exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_reposts.user_id
      and profile.public_enabled is true
      and profile.status = 'active'
  )
);

create policy "Members can read own community follows"
on public.community_follows for select to authenticated
using (follower_id = (select auth.uid()) or followed_id = (select auth.uid()));

create policy "Members can read own community mutes"
on public.community_mutes for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read own community blocks"
on public.community_blocks for select to authenticated
using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

create policy "Authors can read own community post revisions"
on public.community_post_revisions for select to authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_revisions.post_id and post.author_id = (select auth.uid())
  )
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Authors can read own community comment revisions"
on public.community_comment_revisions for select to authenticated
using (
  exists (
    select 1 from public.community_comments comment
    where comment.id = community_comment_revisions.comment_id and comment.author_id = (select auth.uid())
  )
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read own community notifications"
on public.community_notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can update own community notification read state"
on public.community_notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members can read own community push tokens"
on public.community_push_tokens for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read own community reports"
on public.community_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Moderators can read community moderation events"
on public.community_moderation_events for select to authenticated
using ((select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])));

create policy "Members can read own community restrictions"
on public.community_user_restrictions for select to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Members can read own community feed impressions"
on public.community_feed_impressions for select to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.community_posts from anon, authenticated;
revoke all on table public.community_post_verses from anon, authenticated;
revoke all on table public.community_post_media from anon, authenticated;
revoke all on table public.community_hashtags from anon, authenticated;
revoke all on table public.community_post_hashtags from anon, authenticated;
revoke all on table public.community_comments from anon, authenticated;
revoke all on table public.community_likes from anon, authenticated;
revoke all on table public.community_reposts from anon, authenticated;
revoke all on table public.community_follows from anon, authenticated;
revoke all on table public.community_mutes from anon, authenticated;
revoke all on table public.community_blocks from anon, authenticated;
revoke all on table public.community_post_mentions from anon, authenticated;
revoke all on table public.community_comment_mentions from anon, authenticated;
revoke all on table public.community_post_revisions from anon, authenticated;
revoke all on table public.community_comment_revisions from anon, authenticated;
revoke all on table public.community_notification_outbox from anon, authenticated;
revoke all on table public.community_notifications from anon, authenticated;
revoke all on table public.community_push_tokens from anon, authenticated;
revoke all on table public.community_reports from anon, authenticated;
revoke all on table public.community_moderation_events from anon, authenticated;
revoke all on table public.community_user_restrictions from anon, authenticated;
revoke all on table public.community_feed_impressions from anon, authenticated;

grant select (
  user_id, handle, handle_normalized, display_name, bio, avatar_path,
  follower_count, following_count, post_count, status, created_at, updated_at
) on public.user_public_profiles to anon;

grant select (
  id, author_id, title, body, post_kind, quoted_post_id, primary_verse_key,
  visibility, status, comment_policy, like_count, comment_count, repost_count,
  quote_count, published_at, last_activity_at, edited_at, created_at, updated_at
) on public.community_posts to anon, authenticated;

grant select (
  post_id, verse_key, position, is_primary, kjv_text_snapshot, ko_text_snapshot, translation_source_id
) on public.community_post_verses to anon, authenticated;

grant select (
  id, post_id, storage_path, mime_type, byte_size, width, height, alt_text, status, created_at, updated_at
) on public.community_post_media to anon, authenticated;

grant select on public.community_hashtags to anon, authenticated;
grant select on public.community_post_hashtags to anon, authenticated;
grant select (
  id, post_id, author_id, parent_comment_id, body, status, like_count, edited_at, created_at, updated_at
) on public.community_comments to anon, authenticated;
grant select on public.community_likes to authenticated;
grant select on public.community_reposts to anon, authenticated;
grant select on public.community_follows to authenticated;
grant select on public.community_mutes to authenticated;
grant select on public.community_blocks to authenticated;
grant select on public.community_post_revisions to authenticated;
grant select on public.community_comment_revisions to authenticated;
grant select, update (read_at) on public.community_notifications to authenticated;
grant select on public.community_push_tokens to authenticated;
grant select on public.community_reports to authenticated;
grant select on public.community_moderation_events to authenticated;
grant select on public.community_user_restrictions to authenticated;
grant select on public.community_feed_impressions to authenticated;

grant all on table public.community_posts to service_role;
grant all on table public.community_post_verses to service_role;
grant all on table public.community_post_media to service_role;
grant all on table public.community_hashtags to service_role;
grant all on table public.community_post_hashtags to service_role;
grant all on table public.community_comments to service_role;
grant all on table public.community_likes to service_role;
grant all on table public.community_reposts to service_role;
grant all on table public.community_follows to service_role;
grant all on table public.community_mutes to service_role;
grant all on table public.community_blocks to service_role;
grant all on table public.community_post_mentions to service_role;
grant all on table public.community_comment_mentions to service_role;
grant all on table public.community_post_revisions to service_role;
grant all on table public.community_comment_revisions to service_role;
grant all on table public.community_notification_outbox to service_role;
grant all on table public.community_notifications to service_role;
grant all on table public.community_push_tokens to service_role;
grant all on table public.community_reports to service_role;
grant all on table public.community_moderation_events to service_role;
grant all on table public.community_user_restrictions to service_role;
grant all on table public.community_feed_impressions to service_role;

grant usage, select on all sequences in schema public to service_role;

drop policy if exists "Members can read ranking point ledger" on public.community_point_ledger;
create policy "Members can read own community point ledger"
on public.community_point_ledger for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members can read visible point balances" on public.community_point_balances;
create policy "Members can read own community point balance"
on public.community_point_balances for select to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-post-media',
  'community-post-media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community media owners can read objects" on storage.objects;
create policy "Community media owners can read objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'community-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Community media owners can upload objects" on storage.objects;
create policy "Community media owners can upload objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'community-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Community media owners can update objects" on storage.objects;
create policy "Community media owners can update objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'community-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'community-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Community media owners can delete objects" on storage.objects;
create policy "Community media owners can delete objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'community-post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
