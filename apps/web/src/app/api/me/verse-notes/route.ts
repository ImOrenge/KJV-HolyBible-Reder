import { NextResponse } from "next/server";

import { requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const verseKey = (url.searchParams.get("verseKey") ?? "").trim().toUpperCase();
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  if (!/^[1-3]?[A-Z]{2,3}\.[1-9]\d{0,2}\.[1-9]\d{0,2}$/.test(verseKey)) {
    return NextResponse.json({ error: "올바른 구절 키가 필요합니다." }, { status: 400 });
  }
  const { data, error } = await auth.supabase
    .from("user_personal_note_verse_links")
    .select("source,created_at,user_personal_notes!inner(client_id,title,body_text,status,updated_at)")
    .eq("user_id", auth.user.id)
    .eq("verse_key", verseKey)
    .eq("user_personal_notes.status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const notes = (data ?? []).map((row) => {
    const relation = Array.isArray(row.user_personal_notes) ? row.user_personal_notes[0] : row.user_personal_notes;
    return {
      id: relation?.client_id,
      title: relation?.title,
      excerpt: String(relation?.body_text ?? "").slice(0, 180),
      source: row.source,
      updatedAt: relation?.updated_at,
    };
  }).filter((note) => note.id);
  return NextResponse.json({ verseKey, notes });
}
