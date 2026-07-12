create policy "Members can create own public profile"
on public.user_public_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'active'
  and ranking_opt_in is false
);

create policy "Members can update own public profile"
on public.user_public_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and status = 'active');

create policy "Members can create own discussion threads"
on public.discussion_threads for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'open'
  and visibility = 'members'
  and comment_count = 0
  and helpful_count = 0
  and report_count = 0
);

create policy "Members can create own discussion comments"
on public.discussion_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'visible'
  and helpful_count = 0
  and report_count = 0
  and exists (
    select 1 from public.discussion_threads thread
    where thread.id = discussion_comments.thread_id and thread.status = 'open'
  )
);

create policy "Members can create own discussion reactions"
on public.discussion_reactions for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Members can delete own discussion reactions"
on public.discussion_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Members can create own discussion reports"
on public.discussion_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and moderator_id is null
  and moderator_note is null
  and resolved_at is null
);

create policy "Members can submit own reading completion evidence"
on public.reading_completion_evidence for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Members can read own point ledger" on public.community_point_ledger;
create policy "Members can read ranking point ledger"
on public.community_point_ledger for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_point_ledger.user_id
      and profile.status = 'active'
      and profile.ranking_opt_in is true
  )
);

drop policy if exists "Members can read own point balance" on public.community_point_balances;
create policy "Members can read ranking point balances"
on public.community_point_balances for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_point_balances.user_id
      and profile.status = 'active'
      and profile.ranking_opt_in is true
  )
);

grant insert (user_id, display_name, ranking_opt_in, show_level)
on public.user_public_profiles to authenticated;
grant update (display_name, ranking_opt_in, show_level)
on public.user_public_profiles to authenticated;

grant insert (author_id, verse_key, title, body, thread_type, kjv_text_snapshot, ko_text_snapshot)
on public.discussion_threads to authenticated;

grant insert (thread_id, author_id, parent_comment_id, body)
on public.discussion_comments to authenticated;

grant insert (user_id, target_type, thread_id, comment_id, reaction_type)
on public.discussion_reactions to authenticated;
grant delete on public.discussion_reactions to authenticated;

grant insert (reporter_id, target_type, thread_id, comment_id, reason, details)
on public.discussion_reports to authenticated;

grant insert (user_id, book_id, chapter, completion_method)
on public.reading_completion_evidence to authenticated;

revoke select on public.community_point_ledger from authenticated;
grant select (user_id, amount, created_at) on public.community_point_ledger to authenticated;
