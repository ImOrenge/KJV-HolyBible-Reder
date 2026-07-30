-- Keep legacy discussion records for audit and rollback, but remove every
-- client-facing Data API privilege. Community v2 remains the only live channel.
revoke all privileges on table public.discussion_threads from anon, authenticated;
revoke all privileges on table public.discussion_comments from anon, authenticated;
revoke all privileges on table public.discussion_reactions from anon, authenticated;
revoke all privileges on table public.discussion_reports from anon, authenticated;
revoke all privileges on table public.reading_completion_evidence from anon, authenticated;
revoke all privileges on table public.community_point_ledger from anon, authenticated;
revoke all privileges on table public.community_point_balances from anon, authenticated;
revoke all privileges on table public.community_level_definitions from anon, authenticated;

comment on table public.discussion_threads is 'Archived legacy community data. No client Data API access; use community_posts.';
comment on table public.discussion_comments is 'Archived legacy community data. No client Data API access; use community_comments.';
comment on table public.discussion_reactions is 'Archived legacy community data. No client Data API access; use community_likes.';
comment on table public.discussion_reports is 'Archived legacy community data. No client Data API access; use community_reports.';
comment on table public.reading_completion_evidence is 'Archived legacy ranking input. Reading activity no longer awards community points.';
comment on table public.community_point_ledger is 'Archived legacy community ranking ledger.';
comment on table public.community_point_balances is 'Archived legacy community ranking balances.';
comment on table public.community_level_definitions is 'Archived legacy community ranking levels.';
