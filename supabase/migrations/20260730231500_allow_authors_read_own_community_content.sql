-- UPDATE under RLS also needs the resulting row to remain SELECT-visible to
-- the caller. Authors may read their own hidden/deleted rows; public readers
-- remain limited to published/visible content by the existing policies.
create policy "Authors can read own Community V2 posts"
on public.community_posts for select to authenticated
using (author_id = (select auth.uid()));

create policy "Authors can read own Community V2 comments"
on public.community_comments for select to authenticated
using (author_id = (select auth.uid()));
