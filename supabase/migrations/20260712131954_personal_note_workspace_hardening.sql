create or replace function public.save_personal_note_versioned(
  p_client_id text,
  p_expected_revision integer,
  p_title text,
  p_body_document jsonb,
  p_body_markdown text,
  p_body_text text,
  p_pinned boolean,
  p_status text,
  p_snapshot_reason text default 'save'
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_note public.user_personal_notes%rowtype;
  normalized_title text := left(coalesce(nullif(trim(p_title), ''), '제목 없는 성경노트'), 120);
  normalized_markdown text := left(coalesce(p_body_markdown, ''), 50000);
  normalized_text text := left(coalesce(p_body_text, ''), 50000);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_status not in ('active', 'archived') then
    raise exception 'Invalid note status' using errcode = '22023';
  end if;

  select * into saved_note
  from public.user_personal_notes
  where user_id = current_user_id and client_id = p_client_id;

  if saved_note.id is null or saved_note.revision <> p_expected_revision then
    raise exception 'note_revision_conflict' using errcode = 'P0001';
  end if;

  if saved_note.title = normalized_title
    and saved_note.body_document is not distinct from p_body_document
    and saved_note.body_markdown = normalized_markdown
    and saved_note.body_text = normalized_text
    and saved_note.pinned = coalesce(p_pinned, false)
    and saved_note.status = p_status then
    return jsonb_build_object(
      'id', saved_note.client_id,
      'revision', saved_note.revision,
      'unchanged', true,
      'updatedAt', to_jsonb(saved_note.updated_at)#>>'{}',
      'lastSavedAt', case when saved_note.last_saved_at is null then null else to_jsonb(saved_note.last_saved_at)#>>'{}' end
    );
  end if;

  update public.user_personal_notes
  set title = normalized_title,
      body_document = p_body_document,
      body_markdown = normalized_markdown,
      body_text = normalized_text,
      editor_format = case when p_body_document is null then 'markdown-lite' else 'rich-text-v1' end,
      pinned = coalesce(p_pinned, false),
      status = p_status,
      archived_at = case when p_status = 'archived' then coalesce(archived_at, now()) else null end,
      revision = revision + 1,
      last_saved_at = now()
  where id = saved_note.id and revision = p_expected_revision
  returning * into saved_note;

  if saved_note.id is null then
    raise exception 'note_revision_conflict' using errcode = 'P0001';
  end if;

  insert into public.user_personal_note_revisions (
    user_id, note_id, revision, title, body_document, body_text, snapshot_reason
  ) values (
    current_user_id,
    saved_note.id,
    saved_note.revision,
    saved_note.title,
    saved_note.body_document,
    saved_note.body_text,
    case when p_snapshot_reason = 'restore' then 'restore' else 'save' end
  )
  on conflict (note_id, revision) do nothing;

  return jsonb_build_object(
    'id', saved_note.client_id,
    'revision', saved_note.revision,
    'unchanged', false,
    'updatedAt', to_jsonb(saved_note.updated_at)#>>'{}',
    'lastSavedAt', to_jsonb(saved_note.last_saved_at)#>>'{}'
  );
end;
$$;

create or replace function public.cleanup_personal_note_revisions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with ranked as (
    select id,
      row_number() over (partition by note_id order by revision desc) as position,
      created_at
    from public.user_personal_note_revisions
  ), deleted as (
    delete from public.user_personal_note_revisions revision
    using ranked
    where revision.id = ranked.id
      and ranked.position > 50
      and ranked.created_at < now() - interval '180 days'
    returning revision.id
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

revoke all on function public.cleanup_personal_note_revisions() from public, anon, authenticated;
grant execute on function public.cleanup_personal_note_revisions() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'cleanup-personal-note-revisions';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'cleanup-personal-note-revisions',
    '17 3 * * *',
    'select public.cleanup_personal_note_revisions()'
  );
end;
$$;
