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

  delete from public.user_verse_tags where user_id = current_user_id;
  delete from public.user_personal_note_tags where user_id = current_user_id;
  delete from public.user_personal_note_verse_links where user_id = current_user_id;
  delete from public.user_personal_note_links where user_id = current_user_id;
  delete from public.user_personal_note_templates where user_id = current_user_id;

  perform public.replace_user_data_snapshot_base(incoming);

  insert into public.user_personal_note_verse_links (
    user_id,
    client_id,
    note_id,
    book_id,
    book_order,
    verse_key,
    chapter,
    verse,
    selected_text,
    source,
    link_order,
    created_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('note-link-', item."noteId", '-', item."verseKey")),
    note.id,
    book.id,
    book.book_order,
    coalesce(nullif(item."verseKey", ''), concat(upper(item."bookId"), '.', item.chapter, '.', item.verse)),
    item.chapter,
    item.verse,
    item."selectedText",
    case when item.source in ('reader', 'inline-tag', 'dictionary') then item.source else 'reader' end,
    coalesce(item."linkOrder", 100),
    coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteVerseLinks', '[]'::jsonb)) as item(
    id text,
    "noteId" text,
    "verseKey" text,
    "bookId" text,
    chapter int,
    verse int,
    "selectedText" text,
    source text,
    "linkOrder" int,
    "createdAt" text
  )
  join public.user_personal_notes note on note.user_id = current_user_id
    and note.client_id = item."noteId"
  join public.bible_books book on book.app_book_id = item."bookId"
  where item.chapter > 0
    and item.verse > 0
  on conflict (note_id, verse_key) do nothing;

  insert into public.user_personal_note_tags (user_id, note_id, tag_id, created_at)
  select
    current_user_id,
    note.id,
    tag.id,
    coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteTags', '[]'::jsonb)) as item(
    "noteId" text,
    "tagId" text,
    "createdAt" text
  )
  join public.user_personal_notes note on note.user_id = current_user_id
    and note.client_id = item."noteId"
  join public.user_tags tag on tag.user_id = current_user_id
    and tag.client_id = item."tagId"
  on conflict (note_id, tag_id) do nothing;

  insert into public.user_verse_tags (
    user_id,
    client_id,
    book_id,
    book_order,
    verse_key,
    chapter,
    verse,
    tag_id,
    source_note_id,
    created_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('verse-tag-', item."verseKey", '-', item."tagId")),
    book.id,
    book.book_order,
    coalesce(nullif(item."verseKey", ''), concat(upper(item."bookId"), '.', item.chapter, '.', item.verse)),
    item.chapter,
    item.verse,
    tag.id,
    source_note.id,
    coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'verseTags', '[]'::jsonb)) as item(
    id text,
    "verseKey" text,
    "bookId" text,
    chapter int,
    verse int,
    "tagId" text,
    "sourceNoteId" text,
    "createdAt" text
  )
  join public.bible_books book on book.app_book_id = item."bookId"
  join public.user_tags tag on tag.user_id = current_user_id
    and tag.client_id = item."tagId"
  left join public.user_personal_notes source_note on source_note.user_id = current_user_id
    and source_note.client_id = item."sourceNoteId"
  where item.chapter > 0
    and item.verse > 0
  on conflict (user_id, verse_key, tag_id) do nothing;

  insert into public.user_personal_note_templates (
    user_id,
    client_id,
    name,
    description,
    body_document,
    status,
    created_at,
    updated_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('note-template-', md5(coalesce(item.name, '') || now()::text))),
    left(coalesce(nullif(item.name, ''), '이름 없는 템플릿'), 80),
    left(coalesce(item.description, ''), 240),
    item."bodyDocument",
    case when item.status = 'archived' then 'archived' else 'active' end,
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteTemplates', '[]'::jsonb)) as item(
    id text,
    name text,
    description text,
    "bodyDocument" jsonb,
    status text,
    "createdAt" text,
    "updatedAt" text
  )
  where item."bodyDocument" is not null
  on conflict (user_id, client_id) do nothing;

  insert into public.user_personal_note_links (user_id, source_note_id, target_note_id, created_at)
  select
    current_user_id,
    source_note.id,
    target_note.id,
    coalesce(nullif(item."createdAt", '')::timestamptz, now())
  from jsonb_to_recordset(coalesce(incoming->'personalNoteLinks', '[]'::jsonb)) as item(
    "sourceNoteId" text,
    "targetNoteId" text,
    "createdAt" text
  )
  join public.user_personal_notes source_note on source_note.user_id = current_user_id
    and source_note.client_id = item."sourceNoteId"
  join public.user_personal_notes target_note on target_note.user_id = current_user_id
    and target_note.client_id = item."targetNoteId"
  where source_note.id <> target_note.id
  on conflict (source_note_id, target_note_id) do nothing;

  return public.get_user_data_snapshot();
end;
$$;

revoke all on function public.replace_user_data_snapshot(jsonb) from public, anon;
grant execute on function public.replace_user_data_snapshot(jsonb) to authenticated, service_role;
