-- PostgreSQL RLS requires a matching SELECT policy before UPDATE can target a
-- row. Moderators need to see non-public states in order to hide and restore
-- reported content, while column grants still exclude private idempotency data.
create policy "Moderators can read all Community V2 posts"
on public.community_posts for select to authenticated
using ((select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])));

create policy "Moderators can read all Community V2 comments"
on public.community_comments for select to authenticated
using ((select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])));
