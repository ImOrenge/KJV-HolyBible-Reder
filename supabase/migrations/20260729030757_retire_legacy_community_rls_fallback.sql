-- Old browser bundles can still issue direct PostgREST SELECT requests after
-- the legacy UI has been retired. Keep those requests non-fatal without
-- exposing archived rows: SELECT can reach the table, while RLS has no policy
-- and therefore returns an empty result. All mutation privileges stay revoked.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'discussion_threads',
        'discussion_comments',
        'discussion_reactions',
        'discussion_reports',
        'reading_completion_evidence',
        'community_point_ledger',
        'community_point_balances',
        'community_level_definitions'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

grant select on table public.discussion_threads to authenticated;
grant select on table public.discussion_comments to authenticated;
grant select on table public.discussion_reactions to authenticated;
grant select on table public.discussion_reports to authenticated;
grant select on table public.reading_completion_evidence to authenticated;
grant select on table public.community_point_ledger to authenticated;
grant select on table public.community_point_balances to authenticated;
grant select on table public.community_level_definitions to authenticated;

comment on table public.discussion_threads is 'Archived legacy community data. Authenticated SELECT returns no rows through default-deny RLS; use community_posts.';
comment on table public.discussion_comments is 'Archived legacy community data. Authenticated SELECT returns no rows through default-deny RLS; use community_comments.';
comment on table public.discussion_reactions is 'Archived legacy community data. Authenticated SELECT returns no rows through default-deny RLS; use community_likes.';
comment on table public.discussion_reports is 'Archived legacy community data. Authenticated SELECT returns no rows through default-deny RLS; use community_reports.';
comment on table public.reading_completion_evidence is 'Archived legacy ranking input. Authenticated SELECT returns no rows through default-deny RLS.';
comment on table public.community_point_ledger is 'Archived legacy community ranking ledger. Authenticated SELECT returns no rows through default-deny RLS.';
comment on table public.community_point_balances is 'Archived legacy community ranking balances. Authenticated SELECT returns no rows through default-deny RLS.';
comment on table public.community_level_definitions is 'Archived legacy community ranking levels. Authenticated SELECT returns no rows through default-deny RLS.';
