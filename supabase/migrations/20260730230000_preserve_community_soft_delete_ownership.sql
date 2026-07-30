-- Preserve ownership for audit and RLS when users soft-delete content. Public
-- policies continue to hide deleted rows, and authors cannot transfer rows.
drop policy if exists "Authors and moderators can update Community V2 posts"
on public.community_posts;

create policy "Authors and moderators can update Community V2 posts"
on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
)
with check (
  (
    author_id = (select auth.uid())
    and status in ('published', 'deleted')
    and visibility = 'public'
  )
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

drop policy if exists "Authors and moderators can update Community V2 comments"
on public.community_comments;

create policy "Authors and moderators can update Community V2 comments"
on public.community_comments for update to authenticated
using (
  author_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
)
with check (
  (author_id = (select auth.uid()) and status in ('visible', 'deleted'))
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

revoke update (author_id) on public.community_posts from authenticated;
revoke update (author_id) on public.community_comments from authenticated;
