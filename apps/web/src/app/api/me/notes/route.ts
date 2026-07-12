import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotePayload = {
  clientId?: unknown;
  title?: unknown;
  bodyMarkdown?: unknown;
  bodyText?: unknown;
  verseLinks?: Array<{
    id?: unknown;
    verseKey?: unknown;
    bookId?: unknown;
    chapter?: unknown;
    verse?: unknown;
    selectedText?: unknown;
  }>;
  tagIds?: unknown[];
  tagNames?: unknown[];
};

type VerseLinkRow = {
  client_id: string;
  note_id: string;
  verse_key: string;
  chapter: number;
  verse: number;
  selected_text: string | null;
  link_order: number;
  created_at: string;
  bible_books: Array<{ app_book_id: string }> | null;
};

type VerseTagRow = {
  client_id: string;
  verse_key: string;
  chapter: number;
  verse: number;
  tag_id: string;
  source_note_id: string | null;
  created_at: string;
  bible_books: Array<{ app_book_id: string }> | null;
};

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function markdownLiteToText(value: string) {
  return value
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^- \[[ x]\]\s+/gim, "")
    .replace(/^[->] ?/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) } as const;
  }

  return { supabase, user } as const;
}

async function getBookByAppId(supabase: Awaited<ReturnType<typeof createClient>>, appBookId: string) {
  const { data, error } = await supabase
    .from("bible_books")
    .select("id,book_order,app_book_id")
    .eq("app_book_id", appBookId)
    .maybeSingle<{ id: string; book_order: number; app_book_id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? `성경 권을 찾을 수 없습니다: ${appBookId}`);
  }

  return data;
}

async function getOrCreateTagIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tagNames: string[],
) {
  const names = Array.from(new Set(tagNames.map((name) => normalizeText(name, 32)).filter(Boolean))).slice(0, 30);
  const tagIds: string[] = [];

  for (const name of names) {
    const { data: existing, error: selectError } = await supabase
      .from("user_tags")
      .select("id")
      .eq("user_id", userId)
      .eq("name", name)
      .maybeSingle<{ id: string }>();

    if (selectError) {
      throw new Error(selectError.message);
    }

    if (existing) {
      tagIds.push(existing.id);
      continue;
    }

    const { data: created, error: insertError } = await supabase
      .from("user_tags")
      .insert({
        client_id: `tag-${crypto.randomUUID()}`,
        name,
        user_id: userId,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !created) {
      throw new Error(insertError?.message ?? "태그를 만들지 못했습니다.");
    }

    tagIds.push(created.id);
  }

  return tagIds;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const [notesResult, linksResult, noteTagsResult, verseTagsResult, tagsResult] = await Promise.all([
    auth.supabase
      .from("user_personal_notes")
      .select("id,client_id,title,body_markdown,body_text,editor_format,status,pinned,created_at,updated_at,last_saved_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false }),
    auth.supabase
      .from("user_personal_note_verse_links")
      .select("client_id,note_id,verse_key,chapter,verse,selected_text,link_order,created_at,bible_books!inner(app_book_id)")
      .eq("user_id", auth.user.id)
      .order("link_order", { ascending: true }),
    auth.supabase
      .from("user_personal_note_tags")
      .select("note_id,tag_id,created_at")
      .eq("user_id", auth.user.id),
    auth.supabase
      .from("user_verse_tags")
      .select("client_id,verse_key,chapter,verse,tag_id,source_note_id,created_at,bible_books!inner(app_book_id)")
      .eq("user_id", auth.user.id),
    auth.supabase
      .from("user_tags")
      .select("id,client_id,name,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true }),
  ]);

  const firstError = notesResult.error ?? linksResult.error ?? noteTagsResult.error ?? verseTagsResult.error ?? tagsResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const notes = (notesResult.data ?? []).map((row) => ({
    id: row.client_id,
    userId: auth.user.id,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    bodyText: row.body_text,
    editorFormat: row.editor_format,
    status: row.status,
    pinned: row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSavedAt: row.last_saved_at,
  }));
  const noteClientIdByServerId = new Map((notesResult.data ?? []).map((row) => [row.id, row.client_id]));
  const tagClientIdByServerId = new Map((tagsResult.data ?? []).map((row) => [row.id, row.client_id]));
  const tags = (tagsResult.data ?? []).map((row) => ({
    id: row.client_id,
    userId: auth.user.id,
    name: row.name,
    createdAt: row.created_at,
  }));
  const verseLinks = ((linksResult.data ?? []) as VerseLinkRow[]).map((row) => ({
    id: row.client_id,
    userId: auth.user.id,
    noteId: noteClientIdByServerId.get(row.note_id) ?? row.note_id,
    verseKey: row.verse_key,
    bookId: row.bible_books?.[0]?.app_book_id ?? "",
    chapter: row.chapter,
    verse: row.verse,
    selectedText: row.selected_text ?? undefined,
    linkOrder: row.link_order,
    createdAt: row.created_at,
  }));
  const noteTags = (noteTagsResult.data ?? []).map((row) => ({
    userId: auth.user.id,
    noteId: noteClientIdByServerId.get(row.note_id) ?? row.note_id,
    tagId: tagClientIdByServerId.get(row.tag_id) ?? row.tag_id,
    createdAt: row.created_at,
  }));
  const verseTags = ((verseTagsResult.data ?? []) as VerseTagRow[]).map((row) => ({
    id: row.client_id,
    userId: auth.user.id,
    verseKey: row.verse_key,
    bookId: row.bible_books?.[0]?.app_book_id ?? "",
    chapter: row.chapter,
    verse: row.verse,
    tagId: tagClientIdByServerId.get(row.tag_id) ?? row.tag_id,
    sourceNoteId: row.source_note_id ? noteClientIdByServerId.get(row.source_note_id) ?? row.source_note_id : undefined,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    notes,
    verseLinks,
    noteTags,
    tags,
    verseTags,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const payload = (await request.json().catch(() => null)) as NotePayload | null;
  const title = normalizeText(payload?.title, 120) || "제목 없는 성경노트";
  const bodyMarkdown = typeof payload?.bodyMarkdown === "string" ? payload.bodyMarkdown.slice(0, 50000) : "";
  const bodyText = normalizeText(payload?.bodyText, 50000) || markdownLiteToText(bodyMarkdown);
  const clientId = normalizeText(payload?.clientId, 120) || `personal-note-${crypto.randomUUID()}`;

  const { data: note, error: noteError } = await auth.supabase
    .from("user_personal_notes")
    .insert({
      body_markdown: bodyMarkdown,
      body_text: bodyText,
      client_id: clientId,
      editor_format: "markdown-lite",
      title,
      user_id: auth.user.id,
    })
    .select("id,client_id,title,body_markdown,body_text,editor_format,status,pinned,created_at,updated_at,last_saved_at")
    .single();

  if (noteError || !note) {
    return NextResponse.json({ error: noteError?.message ?? "노트 저장에 실패했습니다." }, { status: 500 });
  }

  const verseLinks = Array.isArray(payload?.verseLinks) ? payload.verseLinks.slice(0, 100) : [];
  for (let index = 0; index < verseLinks.length; index += 1) {
    const link = verseLinks[index];
    const appBookId = normalizeText(link.bookId, 12);
    const verseKey = normalizeText(link.verseKey, 40);
    const chapter = Number(link.chapter);
    const verse = Number(link.verse);
    if (!appBookId || !verseKey || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
      continue;
    }

    const book = await getBookByAppId(auth.supabase, appBookId);
    const { error: linkError } = await auth.supabase.from("user_personal_note_verse_links").insert({
      book_id: book.id,
      book_order: book.book_order,
      chapter,
      client_id: normalizeText(link.id, 120) || `note-link-${crypto.randomUUID()}`,
      link_order: (index + 1) * 10,
      note_id: note.id,
      selected_text: normalizeText(link.selectedText, 500) || null,
      user_id: auth.user.id,
      verse,
      verse_key: verseKey,
    });
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  const tagIds = Array.isArray(payload?.tagIds) ? payload.tagIds.map((id) => normalizeText(id, 80)).filter(Boolean) : [];
  const tagNames = Array.isArray(payload?.tagNames) ? payload.tagNames.map((name) => normalizeText(name, 32)).filter(Boolean) : [];
  const resolvedTagIds = tagNames.length ? await getOrCreateTagIds(auth.supabase, auth.user.id, tagNames) : tagIds;
  if (resolvedTagIds.length) {
    const { error: tagError } = await auth.supabase.from("user_personal_note_tags").insert(
      resolvedTagIds.slice(0, 30).map((tagId) => ({
        note_id: note.id,
        tag_id: tagId,
        user_id: auth.user.id,
      })),
    );
    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ note }, { status: 201 });
}
