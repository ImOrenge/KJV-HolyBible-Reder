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
type RouteContext = { params: Promise<{ noteId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { noteId } = await context.params;
  const payload = (await request.json().catch(() => null)) as PersonalNotePayload | null;
  if (!payload) return NextResponse.json({ error: "저장할 노트가 없습니다." }, { status: 400 });
  try {
    const body = parsePersonalNoteBody(payload);
    const expectedRevision = Math.max(1, Number(payload.revision) || 1);
    const { data: saved, error: saveError } = await auth.supabase.rpc("save_personal_note_versioned", {
      p_body_document: body.bodyDocument,
      p_body_markdown: body.bodyMarkdown,
      p_body_text: body.bodyText,
      p_client_id: noteId,
      p_expected_revision: expectedRevision,
      p_pinned: Boolean(payload.pinned),
      p_snapshot_reason: payload.snapshotReason === "restore" ? "restore" : "save",
      p_status: payload.status === "archived" ? "archived" : "active",
      p_title: normalizeText(payload.title, 120) || "제목 없는 성경노트",
    });
    if (saveError) {
      if (saveError.message.includes("note_revision_conflict")) {
        const { data: current } = await auth.supabase.from("user_personal_notes").select(PERSONAL_NOTE_SELECT).eq("user_id", auth.user.id).eq("client_id", noteId).maybeSingle();
        return NextResponse.json({ error: "다른 기기에서 이 노트가 수정되었습니다.", code: "note_revision_conflict", current: current ? mapPersonalNoteRow(current, auth.user.id) : null }, { status: 409 });
      }
      throw new Error(saveError.message);
    }
    const { data: note, error: noteError } = await auth.supabase.from("user_personal_notes").select(PERSONAL_NOTE_SELECT).eq("user_id", auth.user.id).eq("client_id", noteId).single();
    if (noteError || !note) throw new Error(noteError?.message ?? "노트를 찾을 수 없습니다.");
    await replaceNoteRelations({ supabase: auth.supabase, userId: auth.user.id, noteServerId: note.id, payload });
    return NextResponse.json({ note: mapPersonalNoteRow(note, auth.user.id), saved });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "노트를 저장하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { noteId } = await context.params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  const query = auth.supabase.from("user_personal_notes");
  const { error } = permanent
    ? await query.delete().eq("user_id", auth.user.id).eq("client_id", noteId)
    : await query.update({ status: "archived", archived_at: new Date().toISOString() }).eq("user_id", auth.user.id).eq("client_id", noteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archived: !permanent });
}
