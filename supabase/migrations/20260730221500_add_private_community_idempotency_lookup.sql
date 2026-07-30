-- Idempotency keys stay private even when the API runs with the caller JWT.
-- These scalar helpers reveal only the current user's matching row id.
create or replace function public.find_own_community_post_by_idempotency(
  p_idempotency_key text
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select post.id
  from public.community_posts post
  where post.author_id = (select auth.uid())
    and post.idempotency_key = p_idempotency_key
  limit 1;
$$;

create or replace function public.find_own_community_comment_by_idempotency(
  p_idempotency_key text
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select comment_row.id
  from public.community_comments comment_row
  where comment_row.author_id = (select auth.uid())
    and comment_row.idempotency_key = p_idempotency_key
  limit 1;
$$;

revoke execute on function public.find_own_community_post_by_idempotency(text)
from public, anon;
revoke execute on function public.find_own_community_comment_by_idempotency(text)
from public, anon;

grant execute on function public.find_own_community_post_by_idempotency(text)
to authenticated, service_role;
grant execute on function public.find_own_community_comment_by_idempotency(text)
to authenticated, service_role;
