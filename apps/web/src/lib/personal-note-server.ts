import {
  markdownLiteToPersonalNoteDocument,
  personalNoteDocumentToMarkdown,
  personalNoteDocumentToText,
  validatePersonalNoteDocument,
  type PersonalNoteDocument,
} from "@kjv/shared";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export type PersonalNotePayload = {
  clientId?: unknown;
  title?: unknown;
  bodyDocument?: unknown;
  bodyMarkdown?: unknown;
  bodyText?: unknown;
  revision?: unknown;
  pinned?: unknown;
  status?: unknown;
  snapshotReason?: unknown;
  verseLinks?: Array<Record<string, unknown>>;
  noteLinks?: Array<Record<string, unknown>>;
  tagIds?: unknown[];
  tagNames?: unknown[];
};

export function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function requirePersonalNoteUser() {
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

export function parsePersonalNoteBody(payload: PersonalNotePayload | null) {
  const bodyMarkdown = typeof payload?.bodyMarkdown === "string" ? payload.bodyMarkdown.slice(0, 50000) : "";
  const bodyDocument = payload?.bodyDocument ?? markdownLiteToPersonalNoteDocument(bodyMarkdown);
  const validation = validatePersonalNoteDocument(bodyDocument);
  if (!validation.valid) {
    throw new Error(`지원하지 않는 노트 문서입니다: ${validation.errors[0]}`);
  }
  const document = bodyDocument as PersonalNoteDocument;
  return {
    bodyDocument: document,
    bodyMarkdown: personalNoteDocumentToMarkdown(document),
    bodyText: personalNoteDocumentToText(document),
    editorFormat: "rich-text-v1" as const,
  };
}

export async function getBookByAppId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appBookId: string,
) {
  const { data, error } = await supabase
    .from("bible_books")
    .select("id,book_order,app_book_id")
    .eq("app_book_id", appBookId)
    .maybeSingle<{ id: string; book_order: number; app_book_id: string }>();
  if (error || !data) throw new Error(error?.message ?? `성경 권을 찾을 수 없습니다: ${appBookId}`);
  return data;
}

export async function getOrCreateTagIds(
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
    if (selectError) throw new Error(selectError.message);
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const { data: created, error: insertError } = await supabase
      .from("user_tags")
      .insert({ client_id: `tag-${crypto.randomUUID()}`, name, user_id: userId })
      .select("id")
      .single<{ id: string }>();
    if (insertError || !created) throw new Error(insertError?.message ?? "태그를 만들지 못했습니다.");
    tagIds.push(created.id);
  }
  return tagIds;
}

export async function replaceNoteRelations(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  noteServerId: string;
  payload: PersonalNotePayload;
}) {
  const { supabase, userId, noteServerId, payload } = args;
  if (Array.isArray(payload.tagNames) || Array.isArray(payload.tagIds)) {
    const names = Array.isArray(payload.tagNames) ? payload.tagNames.map((name) => normalizeText(name, 32)).filter(Boolean) : [];
    const directIds = Array.isArray(payload.tagIds) ? payload.tagIds.map((id) => normalizeText(id, 80)).filter(Boolean) : [];
    const tagIds = names.length ? await getOrCreateTagIds(supabase, userId, names) : directIds;
    const { error: deleteError } = await supabase.from("user_personal_note_tags").delete().eq("user_id", userId).eq("note_id", noteServerId);
    if (deleteError) throw new Error(deleteError.message);
    if (tagIds.length) {
      const { error } = await supabase.from("user_personal_note_tags").insert(tagIds.slice(0, 30).map((tagId) => ({ note_id: noteServerId, tag_id: tagId, user_id: userId })));
      if (error) throw new Error(error.message);
    }
  }

  if (Array.isArray(payload.verseLinks)) {
    const { error: deleteError } = await supabase.from("user_personal_note_verse_links").delete().eq("user_id", userId).eq("note_id", noteServerId);
    if (deleteError) throw new Error(deleteError.message);
    const rows: Record<string, unknown>[] = [];
    for (const [index, link] of payload.verseLinks.slice(0, 100).entries()) {
      const bookId = normalizeText(link.bookId, 12);
      const verseKey = normalizeText(link.verseKey, 40);
      const chapter = Number(link.chapter);
      const verse = Number(link.verse);
      if (!bookId || !verseKey || !Number.isInteger(chapter) || !Number.isInteger(verse)) continue;
      const book = await getBookByAppId(supabase, bookId);
      const source = ["reader", "inline-tag", "dictionary"].includes(String(link.source)) ? String(link.source) : "reader";
      rows.push({
        book_id: book.id,
        book_order: book.book_order,
        chapter,
        client_id: normalizeText(link.id, 120) || `note-link-${crypto.randomUUID()}`,
        link_order: Number.isInteger(Number(link.linkOrder)) ? Number(link.linkOrder) : (index + 1) * 10,
        note_id: noteServerId,
        selected_text: normalizeText(link.selectedText, 500) || null,
        source,
        user_id: userId,
        verse,
        verse_key: verseKey,
      });
    }
    if (rows.length) {
      const { error } = await supabase.from("user_personal_note_verse_links").insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  if (Array.isArray(payload.noteLinks)) {
    const { error: deleteError } = await supabase.from("user_personal_note_links").delete().eq("user_id", userId).eq("source_note_id", noteServerId);
    if (deleteError) throw new Error(deleteError.message);
    const targetClientIds = Array.from(new Set(payload.noteLinks.map((link) => normalizeText(link.targetNoteId, 120)).filter(Boolean))).slice(0, 100);
    if (targetClientIds.length) {
      const { data: targets, error: targetError } = await supabase
        .from("user_personal_notes")
        .select("id,client_id")
        .eq("user_id", userId)
        .in("client_id", targetClientIds);
      if (targetError) throw new Error(targetError.message);
      const rows = (targets ?? []).filter((target) => target.id !== noteServerId).map((target) => ({ user_id: userId, source_note_id: noteServerId, target_note_id: target.id }));
      if (rows.length) {
        const { error } = await supabase.from("user_personal_note_links").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
  }
}

export function mapPersonalNoteRow(row: Record<string, unknown>, userId: string) {
  return {
    id: String(row.client_id),
    userId,
    title: String(row.title),
    bodyMarkdown: String(row.body_markdown ?? ""),
    bodyText: String(row.body_text ?? ""),
    bodyDocument: row.body_document ?? undefined,
    editorFormat: String(row.editor_format ?? "markdown-lite"),
    status: String(row.status ?? "active"),
    pinned: Boolean(row.pinned),
    revision: Number(row.revision ?? 1),
    archivedAt: row.archived_at ? String(row.archived_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastSavedAt: row.last_saved_at ? String(row.last_saved_at) : undefined,
  };
}

export const PERSONAL_NOTE_SELECT = "id,client_id,title,body_markdown,body_text,body_document,editor_format,status,pinned,revision,archived_at,created_at,updated_at,last_saved_at";
