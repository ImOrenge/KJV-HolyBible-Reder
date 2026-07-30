-- Public community search filters only normalized derivatives of content that
-- is already eligible under the table RLS policies. Grant the filter columns
-- without widening access to private profile or moderation fields.
grant select (search_text_normalized)
on public.community_posts
to anon, authenticated;

grant select (search_text_normalized)
on public.user_public_profiles
to anon, authenticated;
