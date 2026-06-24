create schema if not exists app_private;

create table if not exists app_private.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('feedback_reviewer', 'translator', 'lead_reviewer', 'admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, role)
);

comment on table app_private.user_roles is
  'Server-managed application roles for translation feedback and admin workflows.';

alter table app_private.user_roles enable row level security;

create or replace function app_private.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = app_private, public
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' -> 'roles') ? required_role, false)
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = required_role, false)
    or exists (
      select 1
      from app_private.user_roles role_row
      where role_row.user_id = (select auth.uid())
        and role_row.role = required_role
        and (role_row.expires_at is null or role_row.expires_at > now())
    );
$$;

create or replace function app_private.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = app_private, public
as $$
  select exists (
    select 1
    from unnest(required_roles) role_name
    where app_private.has_role(role_name)
  );
$$;

create or replace function public.current_user_app_roles()
returns text[]
language sql
stable
security invoker
set search_path = public, app_private
as $$
  select coalesce(array_agg(role_name), '{}'::text[])
  from unnest(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin']::text[]) role_name
  where app_private.has_role(role_name);
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;
grant execute on function app_private.has_role(text) to authenticated, service_role;
grant execute on function app_private.has_any_role(text[]) to authenticated, service_role;
revoke execute on function public.current_user_app_roles() from public, anon;
grant execute on function public.current_user_app_roles() to authenticated, service_role;

create table if not exists public.translation_feedback (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  en_verse_id uuid references public.bible_verses_en(id) on delete set null,
  ko_verse_id uuid references public.bible_verses_ko(id) on delete set null,
  book_order int not null check (book_order between 1 and 66),
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  kjv_text_snapshot text not null check (length(trim(kjv_text_snapshot)) > 0),
  ko_text_snapshot text not null check (length(trim(ko_text_snapshot)) > 0),
  translation_name text not null,
  translation_status_snapshot text not null,
  selected_text text,
  term_id uuid references public.translation_terms(id) on delete set null,
  issue_type text not null
    check (
      issue_type in (
        'wrong_meaning',
        'dictionary_sense_mismatch',
        'awkward_expression',
        'theological_term',
        'typo_or_grammar',
        'other'
      )
    ),
  suggested_text text,
  user_comment text,
  status text not null default 'new'
    check (
      status in (
        'new',
        'triaged',
        'reviewing',
        'needs_source_check',
        'accepted',
        'rejected',
        'merged',
        'implemented'
      )
    ),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'blocker')),
  assigned_to uuid references auth.users(id) on delete set null,
  duplicate_of uuid references public.translation_feedback(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_translation_feedback_updated_at on public.translation_feedback;
create trigger set_translation_feedback_updated_at
before update on public.translation_feedback
for each row
execute function public.set_updated_at();

create table if not exists public.translation_feedback_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.translation_feedback(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (
      event_type in (
        'submitted',
        'triaged',
        'assigned',
        'status_changed',
        'commented',
        'merged',
        'accepted',
        'rejected',
        'revision_linked',
        'implemented',
        'approved'
      )
    ),
  from_status text,
  to_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.translation_feedback_review_links (
  feedback_id uuid not null references public.translation_feedback(id) on delete cascade,
  review_id uuid not null references public.translation_reviews(id) on delete cascade,
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  primary key (feedback_id, review_id)
);

create table if not exists public.admin_role_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('feedback_reviewer', 'translator', 'lead_reviewer', 'admin')),
  action text not null check (action in ('grant', 'revoke')),
  created_at timestamptz not null default now()
);

comment on table public.translation_feedback is
  'Reader-submitted translation feedback queue with verse and translation snapshots.';

comment on table public.translation_feedback_events is
  'Append-only workflow events for translation feedback triage and implementation.';

comment on table public.translation_feedback_review_links is
  'Links reader feedback items to internal translation review/revision rows.';

comment on table public.admin_role_events is
  'Audit trail for application role grant and revoke actions.';

create index if not exists translation_feedback_queue_idx
on public.translation_feedback(status, priority, created_at desc);

create index if not exists translation_feedback_verse_idx
on public.translation_feedback(verse_key, status, created_at desc);

create index if not exists translation_feedback_submitter_idx
on public.translation_feedback(submitted_by, created_at desc);

create index if not exists translation_feedback_events_feedback_idx
on public.translation_feedback_events(feedback_id, created_at asc);

create index if not exists translation_feedback_review_links_review_idx
on public.translation_feedback_review_links(review_id);

create index if not exists admin_role_events_target_idx
on public.admin_role_events(target_user_id, created_at desc);

alter table public.translation_feedback enable row level security;
alter table public.translation_feedback_events enable row level security;
alter table public.translation_feedback_review_links enable row level security;
alter table public.admin_role_events enable row level security;

grant select on table app_private.user_roles to service_role;
grant insert, update, delete on table app_private.user_roles to service_role;

grant select, insert, update on table public.translation_feedback to authenticated, service_role;
grant select, insert on table public.translation_feedback_events to authenticated, service_role;
grant select, insert on table public.translation_feedback_review_links to authenticated, service_role;
grant select, insert on table public.admin_role_events to authenticated, service_role;
grant select, insert on table public.translation_reviews to authenticated, service_role;
grant update on table public.bible_verses_ko to authenticated, service_role;

create policy "Users can read own feedback and reviewers can read all feedback"
on public.translation_feedback
for select
to authenticated
using (
  submitted_by = (select auth.uid())
  or app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Users can submit new feedback"
on public.translation_feedback
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'new'
  and priority = 'normal'
  and assigned_to is null
  and duplicate_of is null
  and reviewed_by is null
  and reviewed_at is null
  and reviewer_note is null
);

create policy "Reviewers can update feedback queue"
on public.translation_feedback
for update
to authenticated
using (
  app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
)
with check (
  app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Users can read own feedback events and reviewers can read all feedback events"
on public.translation_feedback_events
for select
to authenticated
using (
  exists (
    select 1
    from public.translation_feedback feedback
    where feedback.id = translation_feedback_events.feedback_id
      and (
        feedback.submitted_by = (select auth.uid())
        or app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
      )
  )
);

create policy "Users can insert submitted feedback event"
on public.translation_feedback_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and event_type = 'submitted'
  and exists (
    select 1
    from public.translation_feedback feedback
    where feedback.id = translation_feedback_events.feedback_id
      and feedback.submitted_by = (select auth.uid())
  )
);

create policy "Reviewers can insert feedback events"
on public.translation_feedback_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Reviewers can read feedback review links"
on public.translation_feedback_review_links
for select
to authenticated
using (
  app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Translators can insert feedback review links"
on public.translation_feedback_review_links
for insert
to authenticated
with check (
  linked_by = (select auth.uid())
  and app_private.has_any_role(array['translator', 'lead_reviewer'])
);

create policy "Reviewers can read non-public Korean translation rows"
on public.bible_verses_ko
for select
to authenticated
using (
  is_public = true
  and translation_status = 'approved'
  or app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Translators can revise Korean translation rows"
on public.bible_verses_ko
for update
to authenticated
using (
  app_private.has_any_role(array['translator', 'lead_reviewer'])
)
with check (
  (
    app_private.has_role('translator')
    and translation_status in ('reviewing', 'reviewed', 'needs_check')
    and is_public = false
  )
  or (
    app_private.has_role('lead_reviewer')
    and (
      (translation_status in ('reviewing', 'reviewed', 'needs_check') and is_public = false)
      or (translation_status = 'approved' and is_public = true)
    )
  )
);

create policy "Reviewers can read translation review history"
on public.translation_reviews
for select
to authenticated
using (
  app_private.has_any_role(array['feedback_reviewer', 'translator', 'lead_reviewer', 'admin'])
);

create policy "Translators can write translation revisions"
on public.translation_reviews
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (review_status = 'approved' and app_private.has_role('lead_reviewer'))
    or (review_status in ('commented', 'revised', 'rejected') and app_private.has_any_role(array['translator', 'lead_reviewer']))
  )
);

create policy "Admins can read role audit events"
on public.admin_role_events
for select
to authenticated
using (app_private.has_role('admin'));

create policy "Admins can write role audit events"
on public.admin_role_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and app_private.has_role('admin')
);

create or replace function public.apply_translation_feedback_revision(
  p_feedback_id uuid,
  p_revised_text text,
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
  v_previous_text text;
  v_review_id uuid;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_revised_text text := trim(coalesce(p_revised_text, ''));
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not app_private.has_any_role(array['translator', 'lead_reviewer']) then
    raise exception 'Translation revision role required.' using errcode = '42501';
  end if;

  if v_revised_text = '' then
    raise exception 'Revised text is required.' using errcode = '22023';
  end if;

  select *
    into v_feedback
    from public.translation_feedback
    where id = p_feedback_id
    for update;

  if not found or v_feedback.ko_verse_id is null then
    raise exception 'Feedback row is not linked to a Korean translation row.' using errcode = 'P0002';
  end if;

  select text_ko
    into v_previous_text
    from public.bible_verses_ko
    where id = v_feedback.ko_verse_id
    for update;

  if not found then
    raise exception 'Korean translation row not found.' using errcode = 'P0002';
  end if;

  update public.bible_verses_ko
    set text_ko = v_revised_text,
        translation_status = 'reviewed',
        is_public = false,
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
    v_previous_text,
    v_revised_text,
    'revised',
    coalesce(v_comment, '사용자 번역 의견 반영')
  )
  returning id into v_review_id;

  insert into public.translation_feedback_review_links (
    feedback_id,
    review_id,
    linked_by
  )
  values (
    v_feedback.id,
    v_review_id,
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
    'implemented',
    v_feedback.status,
    'implemented',
    v_comment,
    jsonb_build_object('reviewId', v_review_id)
  );

  return v_review_id;
end;
$$;

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
  v_latest_revision record;
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

  select id, user_id, revised_text
    into v_latest_revision
    from public.translation_reviews
    where ko_verse_id = v_feedback.ko_verse_id
      and review_status = 'revised'
    order by created_at desc
    limit 1;

  if not found then
    raise exception 'No revision exists for approval.' using errcode = 'P0002';
  end if;

  if v_latest_revision.user_id = v_actor then
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
    v_latest_revision.revised_text,
    v_latest_revision.revised_text,
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

revoke execute on function public.apply_translation_feedback_revision(uuid, text, text) from public, anon;
revoke execute on function public.approve_translation_feedback_publication(uuid, text) from public, anon;
grant execute on function public.apply_translation_feedback_revision(uuid, text, text) to authenticated;
grant execute on function public.approve_translation_feedback_publication(uuid, text) to authenticated;
