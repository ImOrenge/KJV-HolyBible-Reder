import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function markdownLiteToText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { noteId } = await context.params;
  const payload = await request.json().catch(() => null);
  const bodyMarkdown = typeof payload?.bodyMarkdown === "string" ? payload.bodyMarkdown.slice(0, 50000) : undefined;
  const patch: Record<string, unknown> = {};

  if (typeof payload?.title === "string") {
    patch.title = normalizeText(payload.title, 120) || "제목 없는 성경노트";
  }
  if (bodyMarkdown !== undefined) {
    patch.body_markdown = bodyMarkdown;
    patch.body_text = normalizeText(payload?.bodyText, 50000) || markdownLiteToText(bodyMarkdown);
  }
  if (typeof payload?.pinned === "boolean") {
    patch.pinned = payload.pinned;
  }
  if (payload?.status === "active" || payload?.status === "archived") {
    patch.status = payload.status;
    patch.archived_at = payload.status === "archived" ? new Date().toISOString() : null;
  }
  patch.last_saved_at = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("user_personal_notes")
    .update(patch)
    .eq("user_id", auth.user.id)
    .eq("client_id", noteId)
    .select("id,client_id,title,body_markdown,body_text,editor_format,status,pinned,created_at,updated_at,last_saved_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "노트를 찾을 수 없습니다." }, { status: 404 });
  }

  if (Array.isArray(payload?.tagNames) || Array.isArray(payload?.tagIds)) {
    const tagNames = Array.isArray(payload?.tagNames) ? payload.tagNames.map((name: unknown) => normalizeText(name, 32)).filter(Boolean) : [];
    const tagIds = Array.isArray(payload?.tagIds) ? payload.tagIds.map((id: unknown) => normalizeText(id, 80)).filter(Boolean) : [];
    const resolvedTagIds = tagNames.length ? await getOrCreateTagIds(auth.supabase, auth.user.id, tagNames) : tagIds;

    const { error: deleteTagError } = await auth.supabase
      .from("user_personal_note_tags")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("note_id", data.id);
    if (deleteTagError) {
      return NextResponse.json({ error: deleteTagError.message }, { status: 500 });
    }

    if (resolvedTagIds.length) {
      const { error: insertTagError } = await auth.supabase.from("user_personal_note_tags").insert(
        resolvedTagIds.map((tagId: string) => ({
          note_id: data.id,
          tag_id: tagId,
          user_id: auth.user.id,
        })),
      );
      if (insertTagError) {
        return NextResponse.json({ error: insertTagError.message }, { status: 500 });
      }
    }
  }

  if (Array.isArray(payload?.verseLinks)) {
    const { error: deleteLinkError } = await auth.supabase
      .from("user_personal_note_verse_links")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("note_id", data.id);
    if (deleteLinkError) {
      return NextResponse.json({ error: deleteLinkError.message }, { status: 500 });
    }

    const rows = [];
    for (let index = 0; index < payload.verseLinks.slice(0, 100).length; index += 1) {
      const link = payload.verseLinks[index];
      const appBookId = normalizeText(link?.bookId, 12);
      const verseKey = normalizeText(link?.verseKey, 40);
      const chapter = Number(link?.chapter);
      const verse = Number(link?.verse);
      if (!appBookId || !verseKey || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
        continue;
      }
      const book = await getBookByAppId(auth.supabase, appBookId);
      rows.push({
        book_id: book.id,
        book_order: book.book_order,
        chapter,
        client_id: normalizeText(link?.id, 120) || `note-link-${crypto.randomUUID()}`,
        link_order: Number.isInteger(Number(link?.linkOrder)) ? Number(link.linkOrder) : (index + 1) * 10,
        note_id: data.id,
        selected_text: normalizeText(link?.selectedText, 500) || null,
        user_id: auth.user.id,
        verse,
        verse_key: verseKey,
      });
    }

    if (rows.length) {
      const { error: insertLinkError } = await auth.supabase.from("user_personal_note_verse_links").insert(rows);
      if (insertLinkError) {
        return NextResponse.json({ error: insertLinkError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ note: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { noteId } = await context.params;
  const { error } = await auth.supabase
    .from("user_personal_notes")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("client_id", noteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
