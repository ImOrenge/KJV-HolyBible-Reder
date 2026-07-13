import { NextResponse } from "next/server";
import { createVerseKey, parseVerseReferenceQuery } from "@kjv/shared";

import { PERSONAL_NOTE_SELECT, mapPersonalNoteRow, requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";

function escapeSearch(value: string) {
  return value.replace(/[,%()]/g, " ").trim().slice(0, 120);
}

function matchRanges(value: string, query: string) {
  if (!query) return [];
  const start = value.toLocaleLowerCase("ko-KR").indexOf(query.toLocaleLowerCase("ko-KR"));
  return start < 0 ? [] : [{ start, end: start + query.length }];
}

export async function GET(request: Request) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const query = escapeSearch(url.searchParams.get("q") ?? "");
  const bookId = (url.searchParams.get("bookId") ?? "").slice(0, 12);
  let verseKey = (url.searchParams.get("verseKey") ?? "").slice(0, 40).toUpperCase();
  const tagId = (url.searchParams.get("tagId") ?? "").slice(0, 80);
  const status = url.searchParams.get("status") === "archived" ? "archived" : "active";
  const sort = ["relevance", "recent", "title"].includes(url.searchParams.get("sort") ?? "") ? url.searchParams.get("sort")! : "relevance";
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 30));

  if (!verseKey && query.startsWith("#")) {
    const parsed = parseVerseReferenceQuery(query.slice(1));
    if (parsed.book && parsed.chapter && parsed.verse) verseKey = createVerseKey(parsed.book, parsed.chapter, parsed.verse);
  }
  if (query.startsWith("#") && !verseKey) {
    return NextResponse.json({ query, filters: { bookId, verseKey, tagId, status, sort }, notes: [], total: 0, nextCursor: null });
  }

  let relationNoteIds: string[] | null = null;
  if (bookId || verseKey || tagId) {
    const idSets: string[][] = [];
    if (bookId || verseKey) {
    let linkQuery = auth.supabase.from("user_personal_note_verse_links").select("note_id").eq("user_id", auth.user.id);
    if (bookId) linkQuery = linkQuery.eq("bible_books.app_book_id", bookId).select("note_id,bible_books!inner(app_book_id)");
    if (verseKey) linkQuery = linkQuery.eq("verse_key", verseKey);
    const { data, error } = await linkQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      idSets.push((data ?? []).map((row) => row.note_id));
    }
    if (tagId) {
      const { data, error } = await auth.supabase.from("user_personal_note_tags").select("note_id").eq("user_id", auth.user.id).eq("tag_id", tagId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      idSets.push((data ?? []).map((row) => row.note_id));
    }
    relationNoteIds = idSets.reduce((current, ids) => current.filter((id) => ids.includes(id)), idSets[0] ?? []);
    relationNoteIds = Array.from(new Set(relationNoteIds));
    if (!relationNoteIds.length) return NextResponse.json({ query, notes: [], total: 0 });
  }

  let notesQuery = auth.supabase.from("user_personal_notes").select(PERSONAL_NOTE_SELECT).eq("user_id", auth.user.id).eq("status", status);
  if (query && !query.startsWith("#")) {
    const { data: matchingTags, error: tagError } = await auth.supabase.from("user_tags").select("id").eq("user_id", auth.user.id).ilike("name", `%${query}%`).limit(30);
    if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 });
    let tagNoteIds: string[] = [];
    if (matchingTags?.length) {
      const { data: tagLinks, error: tagLinkError } = await auth.supabase.from("user_personal_note_tags").select("note_id").eq("user_id", auth.user.id).in("tag_id", matchingTags.map((tag) => tag.id));
      if (tagLinkError) return NextResponse.json({ error: tagLinkError.message }, { status: 500 });
      tagNoteIds = Array.from(new Set((tagLinks ?? []).map((link) => link.note_id)));
    }
    const filters = [`title.ilike.%${query}%`, `body_text.ilike.%${query}%`];
    if (tagNoteIds.length) filters.push(`id.in.(${tagNoteIds.join(",")})`);
    notesQuery = notesQuery.or(filters.join(","));
  }
  if (relationNoteIds) notesQuery = notesQuery.in("id", relationNoteIds);
  if (cursor && sort !== "title") notesQuery = notesQuery.lt("updated_at", cursor);
  notesQuery = sort === "title" ? notesQuery.order("title", { ascending: true }) : notesQuery.order("updated_at", { ascending: false });
  const { data, error } = await notesQuery.limit(limit + 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const hasMore = (data?.length ?? 0) > limit;
  const page = (data ?? []).slice(0, limit);
  const notes = page.map((row) => {
    const note = mapPersonalNoteRow(row, auth.user.id);
    const lower = note.bodyText.toLocaleLowerCase("ko-KR");
    const index = query ? lower.indexOf(query.toLocaleLowerCase("ko-KR")) : -1;
    return {
      ...note,
      excerpt: index >= 0 ? note.bodyText.slice(Math.max(0, index - 45), index + query.length + 100) : note.bodyText.slice(0, 160),
      matches: { title: matchRanges(note.title, query), bodyText: matchRanges(note.bodyText, query) },
    };
  });
  return NextResponse.json({ query, filters: { bookId, verseKey, tagId, status, sort }, notes, total: notes.length, nextCursor: hasMore ? page.at(-1)?.updated_at ?? null : null });
}
