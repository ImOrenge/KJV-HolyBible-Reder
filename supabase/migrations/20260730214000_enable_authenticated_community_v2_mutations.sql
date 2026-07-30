-- Community V2 API requests retain the caller JWT when a service-role key is
-- intentionally unavailable (for example in local development). Keep that
-- path functional with row-scoped RLS instead of widening server-managed data.

create policy "Members can create own Community V2 posts"
on public.community_posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.public_enabled is true
      and profile.status = 'active'
  )
);

create policy "Authors and moderators can update Community V2 posts"
on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
)
with check (
  (
    author_id = (select auth.uid())
    and status = 'published'
    and visibility = 'public'
  )
  or (author_id is null and status = 'deleted')
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Authors can roll back own Community V2 posts"
on public.community_posts for delete to authenticated
using (author_id = (select auth.uid()));

create policy "Authors can manage own Community V2 post verses"
on public.community_post_verses for all to authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_verses.post_id
      and post.author_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_verses.post_id
      and post.author_id = (select auth.uid())
  )
);

create policy "Authors can create Community V2 hashtags"
on public.community_hashtags for insert to authenticated
with check (true);

create policy "Authors can manage own Community V2 hashtag links"
on public.community_post_hashtags for all to authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_hashtags.post_id
      and post.author_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_hashtags.post_id
      and post.author_id = (select auth.uid())
  )
);

create policy "Authors can manage own Community V2 post mentions"
on public.community_post_mentions for all to authenticated
using (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_mentions.post_id
      and post.author_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.community_posts post
    where post.id = community_post_mentions.post_id
      and post.author_id = (select auth.uid())
  )
);

create policy "Authors can manage own Community V2 media metadata"
on public.community_post_media for all to authenticated
using (author_id = (select auth.uid()))
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.community_posts post
    where post.id = community_post_media.post_id
      and post.author_id = (select auth.uid())
  )
);

create policy "Members can create own Community V2 comments"
on public.community_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'visible'
  and exists (
    select 1 from public.community_posts post
    where post.id = community_comments.post_id
      and post.status = 'published'
      and post.visibility = 'public'
      and post.comment_policy = 'everyone'
  )
);

create policy "Authors and moderators can update Community V2 comments"
on public.community_comments for update to authenticated
using (
  author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
)
with check (
  (author_id = (select auth.uid()) and status = 'visible')
  or (author_id is null and status = 'deleted')
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Authors can manage own Community V2 comment mentions"
on public.community_comment_mentions for all to authenticated
using (
  exists (
    select 1 from public.community_comments comment_row
    where comment_row.id = community_comment_mentions.comment_id
      and comment_row.author_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.community_comments comment_row
    where comment_row.id = community_comment_mentions.comment_id
      and comment_row.author_id = (select auth.uid())
  )
);

create policy "Members can manage own Community V2 likes"
on public.community_likes for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members can manage own Community V2 reposts"
on public.community_reposts for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members can manage own Community V2 follows"
on public.community_follows for all to authenticated
using (follower_id = (select auth.uid()))
with check (follower_id = (select auth.uid()));

create policy "Members can manage own Community V2 mutes"
on public.community_mutes for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members can manage own Community V2 blocks"
on public.community_blocks for all to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()));

create policy "Members can manage own Community V2 push tokens"
on public.community_push_tokens for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members can create own Community V2 reports"
on public.community_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and moderator_id is null
  and moderator_note is null
  and resolved_at is null
);

create policy "Moderators can update Community V2 reports"
on public.community_reports for update to authenticated
using ((select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])))
with check ((select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])));

create policy "Moderators can create Community V2 audit events"
on public.community_moderation_events for insert to authenticated
with check (
  moderator_id = (select auth.uid())
  and (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Moderators can create Community V2 restrictions"
on public.community_user_restrictions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

create policy "Moderators can enqueue Community V2 notices"
on public.community_notification_outbox for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and event_type = 'moderation'
  and (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

grant insert (
  author_id, body, comment_policy, idempotency_key, post_kind,
  primary_verse_key, quoted_post_id, title
) on public.community_posts to authenticated;
grant update (
  author_id, body, comment_policy, deleted_at, primary_verse_key, status, title
) on public.community_posts to authenticated;
grant delete on public.community_posts to authenticated;

grant insert (
  post_id, verse_key, position, is_primary, kjv_text_snapshot,
  ko_text_snapshot, translation_source_id
) on public.community_post_verses to authenticated;
grant delete on public.community_post_verses to authenticated;

grant insert (tag, normalized_tag) on public.community_hashtags to authenticated;
grant insert (post_id, hashtag_id, position) on public.community_post_hashtags to authenticated;
grant delete on public.community_post_hashtags to authenticated;

grant insert (post_id, mentioned_user_id) on public.community_post_mentions to authenticated;
grant delete on public.community_post_mentions to authenticated;
grant insert (comment_id, mentioned_user_id) on public.community_comment_mentions to authenticated;
grant delete on public.community_comment_mentions to authenticated;

grant insert (
  post_id, author_id, storage_path, mime_type, byte_size, width, height,
  alt_text, status
) on public.community_post_media to authenticated;
grant update (
  post_id, author_id, storage_path, mime_type, byte_size, width, height,
  alt_text, status
) on public.community_post_media to authenticated;
grant delete on public.community_post_media to authenticated;

grant insert (post_id, author_id, idempotency_key, parent_comment_id, body)
on public.community_comments to authenticated;
grant update (author_id, body, deleted_at, status)
on public.community_comments to authenticated;

grant insert (user_id, target_type, post_id, comment_id)
on public.community_likes to authenticated;
grant delete on public.community_likes to authenticated;
grant insert (user_id, post_id) on public.community_reposts to authenticated;
grant delete on public.community_reposts to authenticated;
grant insert (follower_id, followed_id) on public.community_follows to authenticated;
grant delete on public.community_follows to authenticated;
grant insert (user_id, muted_user_id) on public.community_mutes to authenticated;
grant delete on public.community_mutes to authenticated;
grant insert (blocker_id, blocked_id) on public.community_blocks to authenticated;
grant delete on public.community_blocks to authenticated;

grant insert (user_id, token, platform, enabled, last_seen_at)
on public.community_push_tokens to authenticated;
grant update (user_id, token, platform, enabled, last_seen_at)
on public.community_push_tokens to authenticated;
grant delete on public.community_push_tokens to authenticated;

grant insert (
  reporter_id, idempotency_key, target_type, post_id, comment_id,
  profile_id, reason, details
) on public.community_reports to authenticated;
grant update (status, moderator_id, moderator_note, resolved_at)
on public.community_reports to authenticated;

grant insert (
  moderator_id, target_type, post_id, comment_id, profile_id, report_id,
  action, reason_code, note, metadata
) on public.community_moderation_events to authenticated;
grant insert (user_id, restriction_type, reason_code, ends_at, created_by)
on public.community_user_restrictions to authenticated;
grant insert (
  event_key, recipient_id, actor_id, event_type, post_id, comment_id, data
) on public.community_notification_outbox to authenticated;

-- Hashtag counts are database-owned. Reconcile them whenever an author-owned
-- link changes so clients never receive a counter update privilege.
create or replace function app_private.refresh_community_hashtag_post_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_hashtag_id uuid;
begin
  affected_hashtag_id := case when tg_op = 'DELETE' then old.hashtag_id else new.hashtag_id end;

  update public.community_hashtags hashtag
  set post_count = (
    select count(*)
    from public.community_post_hashtags link
    join public.community_posts post on post.id = link.post_id
    where link.hashtag_id = affected_hashtag_id
      and post.status = 'published'
      and post.visibility = 'public'
  )
  where hashtag.id = affected_hashtag_id;

  if tg_op = 'UPDATE' and old.hashtag_id is distinct from new.hashtag_id then
    update public.community_hashtags hashtag
    set post_count = (
      select count(*)
      from public.community_post_hashtags link
      join public.community_posts post on post.id = link.post_id
      where link.hashtag_id = old.hashtag_id
        and post.status = 'published'
        and post.visibility = 'public'
    )
    where hashtag.id = old.hashtag_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_community_hashtag_post_count on public.community_post_hashtags;
create trigger refresh_community_hashtag_post_count
after insert or update of hashtag_id or delete on public.community_post_hashtags
for each row execute function app_private.refresh_community_hashtag_post_count();

update public.community_hashtags hashtag
set post_count = (
  select count(*)
  from public.community_post_hashtags link
  join public.community_posts post on post.id = link.post_id
  where link.hashtag_id = hashtag.id
    and post.status = 'published'
    and post.visibility = 'public'
);

revoke execute on function app_private.refresh_community_hashtag_post_count()
from public, anon, authenticated;

-- Notification rows are materialized by a trusted trigger. The Node worker
-- still owns push delivery and marks the outbox event processed when a
-- service-role client is available.
create or replace function app_private.materialize_community_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_notifications (
    user_id, actor_id, event_type, post_id, comment_id, data
  ) values (
    new.recipient_id,
    new.actor_id,
    new.event_type,
    new.post_id,
    new.comment_id,
    new.data || jsonb_build_object('eventKey', new.event_key)
  );
  return new;
end;
$$;

drop trigger if exists materialize_community_notification on public.community_notification_outbox;
create trigger materialize_community_notification
after insert on public.community_notification_outbox
for each row execute function app_private.materialize_community_notification();

revoke execute on function app_private.materialize_community_notification()
from public, anon, authenticated;
