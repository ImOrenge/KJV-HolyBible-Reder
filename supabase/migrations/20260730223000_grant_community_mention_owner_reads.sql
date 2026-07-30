-- DELETE filters need read access to the owner-scoped key columns. The
-- existing RLS policies keep these mention rows limited to their authors.
grant select (post_id, mentioned_user_id)
on public.community_post_mentions
to authenticated;

grant select (comment_id, mentioned_user_id)
on public.community_comment_mentions
to authenticated;
