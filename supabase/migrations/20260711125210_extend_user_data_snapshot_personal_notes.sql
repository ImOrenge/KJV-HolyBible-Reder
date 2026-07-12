alter function public.get_user_data_snapshot() rename to get_user_data_snapshot_base;
alter function public.replace_user_data_snapshot(jsonb) rename to replace_user_data_snapshot_base;

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

  base_snapshot := coalesce(public.get_user_data_snapshot_base(), '{}'::jsonb);

  return base_snapshot || jsonb_build_object(
    'personalNotes',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', note.client_id,
              'userId', note.user_id,
              'title', note.title,
              'bodyMarkdown', note.body_markdown,
              'bodyText', note.body_text,
              'editorFormat', note.editor_format,
              'status', note.status,
              'pinned', note.pinned,
              'createdAt', to_jsonb(note.created_at)#>>'{}',
              'updatedAt', to_jsonb(note.updated_at)#>>'{}',
              'lastSavedAt', to_jsonb(note.last_saved_at)#>>'{}'
            )
            order by note.updated_at desc
          )
          from public.user_personal_notes note
          where note.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'personalNoteVerseLinks',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', link.client_id,
              'userId', link.user_id,
              'noteId', note.client_id,
              'verseKey', link.verse_key,
              'bookId', book.app_book_id,
              'chapter', link.chapter,
              'verse', link.verse,
              'selectedText', link.selected_text,
              'linkOrder', link.link_order,
              'createdAt', to_jsonb(link.created_at)#>>'{}'
            )
            order by note.updated_at desc, link.link_order asc, link.created_at asc
          )
          from public.user_personal_note_verse_links link
          join public.user_personal_notes note on note.id = link.note_id
          join public.bible_books book on book.id = link.book_id
          where link.user_id = current_user_id
            and note.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'personalNoteTags',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'userId', note_tag.user_id,
              'noteId', note.client_id,
              'tagId', tag.client_id,
              'createdAt', to_jsonb(note_tag.created_at)#>>'{}'
            )
            order by note_tag.created_at desc
          )
          from public.user_personal_note_tags note_tag
          join public.user_personal_notes note on note.id = note_tag.note_id
          join public.user_tags tag on tag.id = note_tag.tag_id
          where note_tag.user_id = current_user_id
            and note.user_id = current_user_id
            and tag.user_id = current_user_id
        ),
        '[]'::jsonb
      ),
    'verseTags',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', verse_tag.client_id,
              'userId', verse_tag.user_id,
              'verseKey', verse_tag.verse_key,
              'bookId', book.app_book_id,
              'chapter', verse_tag.chapter,
              'verse', verse_tag.verse,
              'tagId', tag.client_id,
              'sourceNoteId', source_note.client_id,
              'createdAt', to_jsonb(verse_tag.created_at)#>>'{}'
            )
            order by verse_tag.created_at desc
          )
          from public.user_verse_tags verse_tag
          join public.bible_books book on book.id = verse_tag.book_id
          join public.user_tags tag on tag.id = verse_tag.tag_id
          left join public.user_personal_notes source_note on source_note.id = verse_tag.source_note_id
          where verse_tag.user_id = current_user_id
            and tag.user_id = current_user_id
            and (source_note.id is null or source_note.user_id = current_user_id)
        ),
        '[]'::jsonb
      )
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

  delete from public.user_verse_tags where user_id = current_user_id;
  delete from public.user_personal_note_tags where user_id = current_user_id;
  delete from public.user_personal_note_verse_links where user_id = current_user_id;
  delete from public.user_personal_notes where user_id = current_user_id;

  perform public.replace_user_data_snapshot_base(incoming);

  insert into public.user_personal_notes (
    user_id,
    client_id,
    title,
    body_markdown,
    body_text,
    editor_format,
    status,
    pinned,
    created_at,
    updated_at,
    last_saved_at
  )
  select
    current_user_id,
    coalesce(nullif(item.id, ''), concat('personal-note-', md5(coalesce(item.title, '') || coalesce(item."createdAt", '')))),
    left(coalesce(nullif(item.title, ''), '제목 없는 성경노트'), 120),
    coalesce(item."bodyMarkdown", ''),
    coalesce(item."bodyText", ''),
    case when item."editorFormat" = 'markdown-lite' then 'markdown-lite' else 'markdown-lite' end,
    case when item.status = 'archived' then 'archived' else 'active' end,
    coalesce(item.pinned, false),
    coalesce(nullif(item."createdAt", '')::timestamptz, now()),
    coalesce(nullif(item."updatedAt", '')::timestamptz, now()),
    coalesce(nullif(item."lastSavedAt", '')::timestamptz, coalesce(nullif(item."updatedAt", '')::timestamptz, now()))
  from jsonb_to_recordset(coalesce(incoming->'personalNotes', '[]'::jsonb)) as item(
    id text,
    title text,
    "bodyMarkdown" text,
    "bodyText" text,
    "editorFormat" text,
    status text,
    pinned boolean,
    "createdAt" text,
    "updatedAt" text,
    "lastSavedAt" text
  )
  on conflict (user_id, client_id) do nothing;

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
    "linkOrder" int,
    "createdAt" text
  )
  join public.user_personal_notes note on note.user_id = current_user_id
    and note.client_id = item."noteId"
  join public.bible_books book on book.app_book_id = item."bookId"
  where item.chapter > 0
    and item.verse > 0
  on conflict (note_id, verse_key) do nothing;

  insert into public.user_personal_note_tags (
    user_id,
    note_id,
    tag_id,
    created_at
  )
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

  return public.get_user_data_snapshot();
end;
$$;

grant execute on function public.get_user_data_snapshot_base() to authenticated;
grant execute on function public.replace_user_data_snapshot_base(jsonb) to authenticated;
grant execute on function public.get_user_data_snapshot() to authenticated;
grant execute on function public.replace_user_data_snapshot(jsonb) to authenticated;
