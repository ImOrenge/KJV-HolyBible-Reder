drop policy if exists "Members can read visible discussion reactions"
on public.discussion_reactions;

create policy "Members can read own discussion reactions"
on public.discussion_reactions for select to authenticated
using (user_id = (select auth.uid()));
