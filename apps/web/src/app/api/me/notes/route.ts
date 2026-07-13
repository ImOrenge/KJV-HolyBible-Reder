import { NextResponse } from "next/server";

import {
  PERSONAL_NOTE_SELECT,
  mapPersonalNoteRow,
  normalizeText,
  parsePersonalNoteBody,
  replaceNoteRelations,
  requirePersonalNoteUser,
  type PersonalNotePayload,
} from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";

type VerseLinkRow = {
  client_id: string;
  note_id: string;
  verse_key: string;
  chapter: number;
  verse: number;
  selected_text: string | null;
  source: "reader" | "inline-tag" | "dictionary";
  link_order: number;
  created_at: string;
  bible_books: Array<{ app_book_id: string }> | null;
};

export async function GET() {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const [notesResult, linksResult, noteTagsResult, verseTagsResult, tagsResult, revisionsResult, noteLinksResult, templatesResult] = await Promise.all([
    auth.supabase.from("user_personal_notes").select(PERSONAL_NOTE_SELECT).eq("user_id", auth.user.id).order("updated_at", { ascending: false }),
    auth.supabase.from("user_personal_note_verse_links").select("client_id,note_id,verse_key,chapter,verse,selected_text,source,link_order,created_at,bible_books!inner(app_book_id)").eq("user_id", auth.user.id).order("link_order"),
    auth.supabase.from("user_personal_note_tags").select("note_id,tag_id,created_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_verse_tags").select("client_id,verse_key,chapter,verse,tag_id,source_note_id,created_at,bible_books!inner(app_book_id)").eq("user_id", auth.user.id),
    auth.supabase.from("user_tags").select("id,client_id,name,created_at").eq("user_id", auth.user.id).order("created_at"),
    auth.supabase.from("user_personal_note_revisions").select("id,note_id,revision,title,body_document,body_text,snapshot_reason,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(500),
    auth.supabase.from("user_personal_note_links").select("source_note_id,target_note_id,created_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_note_templates").select("client_id,name,description,body_document,status,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }),
  ]);
  const results = [notesResult, linksResult, noteTagsResult, verseTagsResult, tagsResult, revisionsResult, noteLinksResult, templatesResult];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const notes = (notesResult.data ?? []).map((row) => mapPersonalNoteRow(row, auth.user.id));
  const noteClientIdByServerId = new Map((notesResult.data ?? []).map((row) => [row.id, row.client_id]));
  const tagClientIdByServerId = new Map((tagsResult.data ?? []).map((row) => [row.id, row.client_id]));
  const verseLinks = ((linksResult.data ?? []) as VerseLinkRow[]).map((row) => ({
    id: row.client_id, userId: auth.user.id, noteId: noteClientIdByServerId.get(row.note_id) ?? row.note_id,
    verseKey: row.verse_key, bookId: row.bible_books?.[0]?.app_book_id ?? "", chapter: row.chapter, verse: row.verse,
    selectedText: row.selected_text ?? undefined, source: row.source, linkOrder: row.link_order, createdAt: row.created_at,
  }));
  const tags = (tagsResult.data ?? []).map((row) => ({ id: row.client_id, userId: auth.user.id, name: row.name, createdAt: row.created_at }));
  const noteTags = (noteTagsResult.data ?? []).map((row) => ({ userId: auth.user.id, noteId: noteClientIdByServerId.get(row.note_id) ?? row.note_id, tagId: tagClientIdByServerId.get(row.tag_id) ?? row.tag_id, createdAt: row.created_at }));
  const verseTags = (verseTagsResult.data ?? []).map((row) => ({ id: row.client_id, userId: auth.user.id, verseKey: row.verse_key, bookId: row.bible_books?.[0]?.app_book_id ?? "", chapter: row.chapter, verse: row.verse, tagId: tagClientIdByServerId.get(row.tag_id) ?? row.tag_id, sourceNoteId: row.source_note_id ? noteClientIdByServerId.get(row.source_note_id) ?? row.source_note_id : undefined, createdAt: row.created_at }));
  const revisions = (revisionsResult.data ?? []).map((row) => ({ id: row.id, userId: auth.user.id, noteId: noteClientIdByServerId.get(row.note_id) ?? row.note_id, revision: row.revision, title: row.title, bodyDocument: row.body_document ?? undefined, bodyText: row.body_text, snapshotReason: row.snapshot_reason, createdAt: row.created_at }));
  const noteLinks = (noteLinksResult.data ?? []).map((row) => ({ userId: auth.user.id, sourceNoteId: noteClientIdByServerId.get(row.source_note_id) ?? row.source_note_id, targetNoteId: noteClientIdByServerId.get(row.target_note_id) ?? row.target_note_id, createdAt: row.created_at }));
  const templates = (templatesResult.data ?? []).map((row) => ({ id: row.client_id, userId: auth.user.id, name: row.name, description: row.description, bodyDocument: row.body_document, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
  return NextResponse.json({ notes, verseLinks, noteTags, tags, verseTags, revisions, noteLinks, templates });
}
export async function POST(request: Request) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const payload = (await request.json().catch(() => null)) as PersonalNotePayload | null;
  try {
    const body = parsePersonalNoteBody(payload);
    const clientId = normalizeText(payload?.clientId, 120) || `personal-note-${crypto.randomUUID()}`;
    const title = normalizeText(payload?.title, 120) || "제목 없는 성경노트";
    const { data: note, error } = await auth.supabase.from("user_personal_notes").insert({
      body_document: body.bodyDocument, body_markdown: body.bodyMarkdown, body_text: body.bodyText,
      client_id: clientId, editor_format: body.editorFormat, revision: 1, title, user_id: auth.user.id,
    }).select(PERSONAL_NOTE_SELECT).single();
    if (error || !note) throw new Error(error?.message ?? "노트 저장에 실패했습니다.");
    const { error: revisionError } = await auth.supabase.from("user_personal_note_revisions").insert({ user_id: auth.user.id, note_id: note.id, revision: 1, title, body_document: body.bodyDocument, body_text: body.bodyText, snapshot_reason: "create" });
    if (revisionError) throw new Error(revisionError.message);
    await replaceNoteRelations({ supabase: auth.supabase, userId: auth.user.id, noteServerId: note.id, payload: payload ?? {} });
    return NextResponse.json({ note: mapPersonalNoteRow(note, auth.user.id) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "노트 저장에 실패했습니다." }, { status: 400 });
  }
}
