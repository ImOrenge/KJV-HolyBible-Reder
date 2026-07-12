create index discussion_comments_parent_idx
on public.discussion_comments(parent_comment_id)
where parent_comment_id is not null;

create index discussion_reactions_thread_idx
on public.discussion_reactions(thread_id)
where thread_id is not null;

create index discussion_reactions_comment_idx
on public.discussion_reactions(comment_id)
where comment_id is not null;

create index discussion_reports_thread_idx
on public.discussion_reports(thread_id)
where thread_id is not null;

create index discussion_reports_comment_idx
on public.discussion_reports(comment_id)
where comment_id is not null;

create index discussion_reports_moderator_idx
on public.discussion_reports(moderator_id)
where moderator_id is not null;

create index reading_completion_evidence_book_idx
on public.reading_completion_evidence(book_id);

create index user_public_profiles_ranking_idx
on public.user_public_profiles(ranking_opt_in, status, display_name)
where ranking_opt_in is true and status = 'active';
