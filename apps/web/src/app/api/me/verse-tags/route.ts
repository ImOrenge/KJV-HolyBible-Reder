import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

async function getOrCreateTagId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, tagName: string) {
  const name = normalizeText(tagName, 32);
  if (!name) {
    return null;
  }

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
    return existing.id;
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

  return created.id;
}

async function resolveSourceNoteId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, sourceNoteClientId: string | null) {
  if (!sourceNoteClientId) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_personal_notes")
    .select("id")
    .eq("user_id", userId)
    .eq("client_id", sourceNoteClientId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const url = new URL(request.url);
  const verseKey = normalizeText(url.searchParams.get("verseKey"), 40);
  let query = auth.supabase
    .from("user_verse_tags")
    .select("client_id,verse_key,chapter,verse,tag_id,source_note_id,created_at,bible_books!inner(app_book_id)")
    .eq("user_id", auth.user.id);

  if (verseKey) {
    query = query.eq("verse_key", verseKey);
  }

  const [{ data, error }, tagsResult, notesResult] = await Promise.all([
    query,
    auth.supabase.from("user_tags").select("id,client_id").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_notes").select("id,client_id").eq("user_id", auth.user.id),
  ]);
  const firstError = error ?? tagsResult.error ?? notesResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }
  const tagClientIdByServerId = new Map((tagsResult.data ?? []).map((row) => [row.id, row.client_id]));
  const noteClientIdByServerId = new Map((notesResult.data ?? []).map((row) => [row.id, row.client_id]));

  return NextResponse.json({
    verseTags: ((data ?? []) as VerseTagRow[]).map((row) => ({
      id: row.client_id,
      userId: auth.user.id,
      verseKey: row.verse_key,
      bookId: row.bible_books?.[0]?.app_book_id ?? "",
      chapter: row.chapter,
      verse: row.verse,
      tagId: tagClientIdByServerId.get(row.tag_id) ?? row.tag_id,
      sourceNoteId: row.source_note_id ? noteClientIdByServerId.get(row.source_note_id) ?? row.source_note_id : undefined,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const payload = await request.json().catch(() => null);
  const appBookId = normalizeText(payload?.bookId, 12);
  const verseKey = normalizeText(payload?.verseKey, 40);
  const rawTagId = normalizeText(payload?.tagId, 80);
  const tagName = normalizeText(payload?.tagName, 32);
  const sourceNoteId = normalizeText(payload?.sourceNoteId, 80) || null;
  const chapter = Number(payload?.chapter);
  const verse = Number(payload?.verse);

  if (!appBookId || !verseKey || (!rawTagId && !tagName) || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return NextResponse.json({ error: "구절 태그 입력이 올바르지 않습니다." }, { status: 400 });
  }

  const book = await getBookByAppId(auth.supabase, appBookId);
  const tagId = rawTagId || await getOrCreateTagId(auth.supabase, auth.user.id, tagName);
  const serverSourceNoteId = await resolveSourceNoteId(auth.supabase, auth.user.id, sourceNoteId);
  if (!tagId) {
    return NextResponse.json({ error: "태그를 만들 수 없습니다." }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from("user_verse_tags")
    .insert({
      book_id: book.id,
      book_order: book.book_order,
      chapter,
      client_id: `verse-tag-${crypto.randomUUID()}`,
      source_note_id: serverSourceNoteId,
      tag_id: tagId,
      user_id: auth.user.id,
      verse,
      verse_key: verseKey,
    })
    .select("client_id,verse_key,chapter,verse,tag_id,source_note_id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ verseTag: data }, { status: 201 });
}
