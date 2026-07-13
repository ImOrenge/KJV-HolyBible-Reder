import { NextResponse } from "next/server";
import { requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ noteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { noteId } = await context.params;
  const { data: target } = await auth.supabase.from("user_personal_notes").select("id").eq("user_id", auth.user.id).eq("client_id", noteId).maybeSingle();
  if (!target) return NextResponse.json({ error: "노트를 찾을 수 없습니다." }, { status: 404 });
  const { data, error } = await auth.supabase.from("user_personal_note_links").select("created_at,user_personal_notes!user_personal_note_links_source_note_id_fkey(client_id,title,body_text,updated_at,status)").eq("user_id", auth.user.id).eq("target_note_id", target.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ backlinks: (data ?? []).map((row) => ({ createdAt: row.created_at, note: Array.isArray(row.user_personal_notes) ? row.user_personal_notes[0] : row.user_personal_notes })) });
}
