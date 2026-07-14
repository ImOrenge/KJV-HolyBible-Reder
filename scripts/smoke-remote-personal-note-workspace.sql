begin;
set local role postgres;

create temporary table smoke_note_users on commit drop as
select id, row_number() over (order by created_at, id) as position
from auth.users
order by created_at, id
limit 2;

do $$
begin
  if (select count(*) from smoke_note_users) < 2 then
    raise exception 'Two existing auth users are required for the RLS smoke test.';
  end if;
end;
$$;

grant select on smoke_note_users to authenticated;
set local role authenticated;

do $$
declare
  user_a uuid := (select id from smoke_note_users where position = 1);
  user_b uuid := (select id from smoke_note_users where position = 2);
  note_client_id text := 'smoke-note-' || gen_random_uuid()::text;
  linked_note_client_id text := 'smoke-note-linked-' || gen_random_uuid()::text;
  source_note_server_id uuid;
  template_client_id text := 'smoke-template-' || gen_random_uuid()::text;
  note_document jsonb := '{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"창세기 1장 관찰"}]}]}'::jsonb;
  saved jsonb;
  snapshot jsonb;
  revision_count_before integer;
  revision_count_after integer;
  visible_count integer;
begin
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into public.user_personal_notes (
    user_id, client_id, title, body_document, body_markdown, body_text, editor_format, status, pinned, revision
  ) values (
    user_a, note_client_id, '원격 노트 smoke', note_document, '창세기 1장 관찰', '창세기 1장 관찰', 'rich-text-v1', 'active', false, 1
  );
  select id into source_note_server_id
  from public.user_personal_notes
  where user_id = user_a and client_id = note_client_id;

  saved := public.save_personal_note_versioned(
    note_client_id, 1, '원격 노트 smoke 수정', note_document,
    '창세기 1장 관찰', '창세기 1장 관찰', false, 'active', 'save'
  );
  if (saved->>'revision')::integer <> 2 or (saved->>'unchanged')::boolean then
    raise exception 'Versioned save did not create revision 2: %', saved;
  end if;

  saved := public.save_personal_note_versioned(
    note_client_id, 2, '원격 노트 smoke 수정', note_document,
    '창세기 1장 관찰', '창세기 1장 관찰', false, 'active', 'save'
  );
  if (saved->>'revision')::integer <> 2 or not (saved->>'unchanged')::boolean then
    raise exception 'Unchanged save created an unexpected revision: %', saved;
  end if;

  select count(*) into revision_count_before
  from public.user_personal_note_revisions revision
  join public.user_personal_notes note on note.id = revision.note_id
  where note.user_id = user_a and note.client_id = note_client_id;

  snapshot := public.get_user_data_snapshot();
  perform public.replace_user_data_snapshot(snapshot);

  if not exists (
    select 1 from public.user_personal_notes
    where user_id = user_a and client_id = note_client_id and revision = 2 and title = '원격 노트 smoke 수정'
  ) then
    raise exception 'Snapshot replace did not preserve the versioned note row.';
  end if;

  select count(*) into revision_count_after
  from public.user_personal_note_revisions revision
  join public.user_personal_notes note on note.id = revision.note_id
  where note.user_id = user_a and note.client_id = note_client_id;
  if revision_count_after <> revision_count_before then
    raise exception 'Snapshot replace changed revision history: before %, after %', revision_count_before, revision_count_after;
  end if;

  insert into public.user_personal_note_templates (user_id, client_id, name, body_document)
  values (user_a, template_client_id, 'Smoke template', note_document);

  insert into public.user_personal_notes (
    user_id, client_id, title, body_document, body_markdown, body_text, editor_format, status, pinned, revision
  ) values (
    user_a, linked_note_client_id, '연결 노트 smoke', note_document, '', '', 'rich-text-v1', 'active', false, 1
  );

  insert into public.user_personal_note_links (user_id, source_note_id, target_note_id)
  select user_a, source_note.id, target_note.id
  from public.user_personal_notes source_note
  join public.user_personal_notes target_note on target_note.user_id = user_a and target_note.client_id = linked_note_client_id
  where source_note.user_id = user_a and source_note.client_id = note_client_id;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  select count(*) into visible_count
  from public.user_personal_notes where client_id = note_client_id;
  if visible_count <> 0 then
    raise exception 'Account B could read account A note.';
  end if;
  select count(*) into visible_count
  from public.user_personal_note_revisions
  where note_id = source_note_server_id;
  if visible_count <> 0 then
    raise exception 'Account B could read account A note revision.';
  end if;
  select count(*) into visible_count
  from public.user_personal_note_links
  where source_note_id = source_note_server_id;
  if visible_count <> 0 then
    raise exception 'Account B could read account A note link.';
  end if;
  select count(*) into visible_count
  from public.user_personal_note_templates where client_id = template_client_id;
  if visible_count <> 0 then
    raise exception 'Account B could read account A template.';
  end if;

  begin
    perform public.save_personal_note_versioned(
      note_client_id, 2, 'cross account write', note_document,
      'cross account write', 'cross account write', false, 'active', 'save'
    );
    raise exception 'Account B unexpectedly updated account A note.';
  exception
    when raise_exception then
      if sqlerrm <> 'note_revision_conflict' then raise; end if;
  end;

  raise notice 'remote personal-note workspace smoke passed: revision=2, snapshot-preserved=true, unchanged-save=true, note-revision-link-isolation=true';
end;
$$;

rollback;
