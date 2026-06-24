create or replace function public.approve_translation_feedback_publication(
  p_feedback_id uuid,
  p_comment text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, app_private
as $$
declare
  v_actor uuid := auth.uid();
  v_feedback public.translation_feedback%rowtype;
  v_latest_review record;
  v_approval_id uuid;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not app_private.has_role('lead_reviewer') then
    raise exception 'Lead reviewer role required.' using errcode = '42501';
  end if;

  select *
    into v_feedback
    from public.translation_feedback
    where id = p_feedback_id
    for update;

  if not found or v_feedback.ko_verse_id is null then
    raise exception 'Feedback row is not linked to a Korean translation row.' using errcode = 'P0002';
  end if;

  select id, user_id, revised_text, review_status
    into v_latest_review
    from public.translation_reviews
    where ko_verse_id = v_feedback.ko_verse_id
    order by created_at desc, id desc
    limit 1;

  if not found or v_latest_review.review_status <> 'revised' then
    raise exception 'No pending revision exists for approval.' using errcode = 'P0002';
  end if;

  if v_latest_review.user_id = v_actor then
    raise exception 'The same user cannot revise and approve this feedback item.' using errcode = '42501';
  end if;

  update public.bible_verses_ko
    set translation_status = 'approved',
        is_public = true,
        reviewer_note = v_comment
    where id = v_feedback.ko_verse_id;

  insert into public.translation_reviews (
    ko_verse_id,
    user_id,
    previous_text,
    revised_text,
    review_status,
    comment
  )
  values (
    v_feedback.ko_verse_id,
    v_actor,
    v_latest_review.revised_text,
    v_latest_review.revised_text,
    'approved',
    coalesce(v_comment, '최종 공개 승인')
  )
  returning id into v_approval_id;

  insert into public.translation_feedback_review_links (
    feedback_id,
    review_id,
    linked_by
  )
  values (
    v_feedback.id,
    v_approval_id,
    v_actor
  )
  on conflict do nothing;

  update public.translation_feedback
    set status = 'implemented',
        reviewed_by = v_actor,
        reviewed_at = now(),
        reviewer_note = v_comment
    where id = v_feedback.id;

  insert into public.translation_feedback_events (
    feedback_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    metadata
  )
  values (
    v_feedback.id,
    v_actor,
    'approved',
    v_feedback.status,
    'implemented',
    v_comment,
    jsonb_build_object('reviewId', v_approval_id)
  );

  return v_approval_id;
end;
$$;
