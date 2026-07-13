create extension if not exists pg_trgm;

alter table public.user_personal_notes
  add column if not exists body_document jsonb,
  add column if not exists revision integer not null default 1;

alter table public.user_personal_notes
  alter column editor_format set default 'rich-text-v1';

alter table public.user_personal_notes
  drop constraint if exists user_personal_notes_editor_format_check;

alter table public.user_personal_notes
  add constraint user_personal_notes_editor_format_check
  check (editor_format in ('markdown-lite', 'rich-text-v1'));

alter table public.user_personal_note_verse_links
  add column if not exists source text not null default 'reader';

alter table public.user_personal_note_verse_links
  drop constraint if exists user_personal_note_verse_links_source_check;

alter table public.user_personal_note_verse_links
  add constraint user_personal_note_verse_links_source_check
  check (source in ('reader', 'inline-tag', 'dictionary'));

create table if not exists public.user_personal_note_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  revision integer not null check (revision > 0),
  title text not null,
  body_document jsonb,
  body_text text not null default '',
  snapshot_reason text not null default 'save'
    check (snapshot_reason in ('create', 'save', 'restore')),
  created_at timestamptz not null default now(),
  unique(note_id, revision)
);

create table if not exists public.user_personal_note_templates (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  body_document jsonb not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_id),
  check (char_length(name) between 1 and 80),
  check (char_length(description) <= 240)
);

drop trigger if exists set_user_personal_note_templates_updated_at on public.user_personal_note_templates;
create trigger set_user_personal_note_templates_updated_at
before update on public.user_personal_note_templates
for each row execute function public.set_updated_at();

create table if not exists public.user_personal_note_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  target_note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_note_id, target_note_id),
  check (source_note_id <> target_note_id)
);

create index if not exists user_personal_note_revisions_note_idx
on public.user_personal_note_revisions(user_id, note_id, revision desc);

create index if not exists user_personal_note_verse_links_verse_idx
on public.user_personal_note_verse_links(user_id, verse_key);

create index if not exists user_personal_note_links_target_idx
on public.user_personal_note_links(user_id, target_note_id, created_at desc);

create index if not exists user_personal_note_templates_updated_idx
on public.user_personal_note_templates(user_id, updated_at desc);

create index if not exists user_personal_notes_title_trgm_idx
on public.user_personal_notes using gin (lower(title) gin_trgm_ops);

create index if not exists user_personal_notes_body_text_trgm_idx
on public.user_personal_notes using gin (lower(body_text) gin_trgm_ops);

alter table public.user_personal_note_revisions enable row level security;
alter table public.user_personal_note_templates enable row level security;
alter table public.user_personal_note_links enable row level security;

create policy "Users can read own personal note revisions"
on public.user_personal_note_revisions for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.user_personal_notes note
    where note.id = user_personal_note_revisions.note_id
      and note.user_id = (select auth.uid())
  )
);

create policy "Users can insert own personal note revisions"
on public.user_personal_note_revisions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.user_personal_notes note
    where note.id = user_personal_note_revisions.note_id
      and note.user_id = (select auth.uid())
  )
);

create policy "Users can manage own personal note templates"
on public.user_personal_note_templates for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read own personal note links"
on public.user_personal_note_links for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.user_personal_notes source_note where source_note.id = source_note_id and source_note.user_id = (select auth.uid()))
  and exists (select 1 from public.user_personal_notes target_note where target_note.id = target_note_id and target_note.user_id = (select auth.uid()))
);

create policy "Users can insert own personal note links"
on public.user_personal_note_links for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.user_personal_notes source_note where source_note.id = source_note_id and source_note.user_id = (select auth.uid()))
  and exists (select 1 from public.user_personal_notes target_note where target_note.id = target_note_id and target_note.user_id = (select auth.uid()))
);

create policy "Users can delete own personal note links"
on public.user_personal_note_links for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.user_personal_notes source_note where source_note.id = source_note_id and source_note.user_id = (select auth.uid()))
);

grant select, insert on table public.user_personal_note_revisions to authenticated, service_role;
grant select, insert, update, delete on table public.user_personal_note_templates to authenticated, service_role;
grant select, insert, delete on table public.user_personal_note_links to authenticated, service_role;

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
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_status not in ('active', 'archived') then
    raise exception 'Invalid note status' using errcode = '22023';
  end if;

  update public.user_personal_notes
  set title = left(coalesce(nullif(trim(p_title), ''), '제목 없는 성경노트'), 120),
      body_document = p_body_document,
      body_markdown = left(coalesce(p_body_markdown, ''), 50000),
      body_text = left(coalesce(p_body_text, ''), 50000),
      editor_format = case when p_body_document is null then 'markdown-lite' else 'rich-text-v1' end,
      pinned = coalesce(p_pinned, false),
      status = p_status,
      archived_at = case when p_status = 'archived' then coalesce(archived_at, now()) else null end,
      revision = revision + 1,
      last_saved_at = now()
  where user_id = current_user_id
    and client_id = p_client_id
    and revision = p_expected_revision
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
    'updatedAt', to_jsonb(saved_note.updated_at)#>>'{}',
    'lastSavedAt', to_jsonb(saved_note.last_saved_at)#>>'{}'
  );
end;
$$;

grant execute on function public.save_personal_note_versioned(text, integer, text, jsonb, text, text, boolean, text, text)
to authenticated, service_role;

alter function public.get_user_data_snapshot() rename to get_user_data_snapshot_rich_text_base;
alter function public.replace_user_data_snapshot(jsonb) rename to replace_user_data_snapshot_rich_text_base;

create or replace function public.get_user_data_snapshot()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  base_snapshot jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  base_snapshot := coalesce(public.get_user_data_snapshot_rich_text_base(), '{}'::jsonb);

  return base_snapshot || jsonb_build_object(
    'personalNotes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.client_id,
        'userId', note.user_id,
        'title', note.title,
        'bodyMarkdown', note.body_markdown,
        'bodyText', note.body_text,
        'bodyDocument', note.body_document,
        'editorFormat', note.editor_format,
        'status', note.status,
        'pinned', note.pinned,
        'revision', note.revision,
        'archivedAt', case when note.archived_at is null then null else to_jsonb(note.archived_at)#>>'{}' end,
        'createdAt', to_jsonb(note.created_at)#>>'{}',
        'updatedAt', to_jsonb(note.updated_at)#>>'{}',
        'lastSavedAt', to_jsonb(note.last_saved_at)#>>'{}'
      ) order by note.updated_at desc)
      from public.user_personal_notes note where note.user_id = current_user_id
    ), '[]'::jsonb),
    'personalNoteVerseLinks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', link.client_id,
        'userId', link.user_id,
        'noteId', note.client_id,
        'verseKey', link.verse_key,
        'bookId', book.app_book_id,
        'chapter', link.chapter,
        'verse', link.verse,
        'selectedText', link.selected_text,
        'source', link.source,
        'linkOrder', link.link_order,
        'createdAt', to_jsonb(link.created_at)#>>'{}'
      ) order by link.link_order, link.created_at)
      from public.user_personal_note_verse_links link
      join public.user_personal_notes note on note.id = link.note_id
      join public.bible_books book on book.id = link.book_id
      where link.user_id = current_user_id
    ), '[]'::jsonb),
    'personalNoteRevisions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', revision.id,
        'userId', revision.user_id,
        'noteId', note.client_id,
        'revision', revision.revision,
        'title', revision.title,
        'bodyDocument', revision.body_document,
        'bodyText', revision.body_text,
        'snapshotReason', revision.snapshot_reason,
        'createdAt', to_jsonb(revision.created_at)#>>'{}'
      ) order by revision.created_at desc)
      from public.user_personal_note_revisions revision
      join public.user_personal_notes note on note.id = revision.note_id
      where revision.user_id = current_user_id
    ), '[]'::jsonb),
    'personalNoteLinks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', note_link.user_id,
        'sourceNoteId', source_note.client_id,
        'targetNoteId', target_note.client_id,
        'createdAt', to_jsonb(note_link.created_at)#>>'{}'
      ) order by note_link.created_at desc)
      from public.user_personal_note_links note_link
      join public.user_personal_notes source_note on source_note.id = note_link.source_note_id
      join public.user_personal_notes target_note on target_note.id = note_link.target_note_id
      where note_link.user_id = current_user_id
    ), '[]'::jsonb),
    'personalNoteTemplates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', template.client_id,
        'userId', template.user_id,
        'name', template.name,
        'description', template.description,
        'bodyDocument', template.body_document,
        'status', template.status,
        'createdAt', to_jsonb(template.created_at)#>>'{}',
        'updatedAt', to_jsonb(template.updated_at)#>>'{}'
      ) order by template.updated_at desc)
      from public.user_personal_note_templates template where template.user_id = current_user_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.replace_user_data_snapshot(snapshot jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  incoming jsonb := coalesce(snapshot, '{}'::jsonb);
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  delete from public.user_personal_note_templates where user_id = current_user_id;
  perform public.replace_user_data_snapshot_rich_text_base(incoming);

  update public.user_personal_notes note
  set body_document = item."bodyDocument",
      editor_format = case when item."bodyDocument" is null then 'markdown-lite' else 'rich-text-v1' end,
      revision = greatest(coalesce(item.revision, 1), 1),
      archived_at = nullif(item."archivedAt", '')::timestamptz
  from jsonb_to_recordset(coalesce(incoming->'personalNotes', '[]'::jsonb)) as item(
    id text,
    "bodyDocument" jsonb,
    revision integer,
    "archivedAt" text
  )
  where note.user_id = current_user_id and note.client_id = item.id;

  update public.user_personal_note_verse_links link
  set source = case when item.source in ('reader', 'inline-tag', 'dictionary') then item.source else 'reader' end
  from jsonb_to_recordset(coalesce(incoming->'personalNoteVerseLinks', '[]'::jsonb)) as item(id text, source text)
  where link.user_id = current_user_id and link.client_id = item.id;

  insert into public.user_personal_note_templates (
    user_id, client_id, name, description, body_document, status, created_at, updated_at
  )
  select current_user_id,
    coalesce(nullif(item.id, ''), concat('note-template-', md5(coalesce(item.name, '') || now()::text))),
    left(coalesce(nullif(item.name, ''), '이름 없는 템플릿'), 80),
    left(coalesce(item.description, ''), 240),
    item."bodyDocument",
    case when item.status = 'archived' then 'archived' else 'active' end,
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteTemplates', '[]'::jsonb)) as item(
    id text, name text, description text, "bodyDocument" jsonb, status text, "createdAt" text, "updatedAt" text
  )
  where item."bodyDocument" is not null
  on conflict (user_id, client_id) do nothing;

  insert into public.user_personal_note_links (user_id, source_note_id, target_note_id, created_at)
  select current_user_id, source_note.id, target_note.id, coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteLinks', '[]'::jsonb)) as item(
    "sourceNoteId" text, "targetNoteId" text, "createdAt" text
  )
  join public.user_personal_notes source_note on source_note.user_id = current_user_id and source_note.client_id = item."sourceNoteId"
  join public.user_personal_notes target_note on target_note.user_id = current_user_id and target_note.client_id = item."targetNoteId"
  where source_note.id <> target_note.id
  on conflict (source_note_id, target_note_id) do nothing;

  return public.get_user_data_snapshot();
end;
$$;

grant execute on function public.get_user_data_snapshot_rich_text_base() to authenticated;
grant execute on function public.replace_user_data_snapshot_rich_text_base(jsonb) to authenticated;
grant execute on function public.get_user_data_snapshot() to authenticated;
grant execute on function public.replace_user_data_snapshot(jsonb) to authenticated;
