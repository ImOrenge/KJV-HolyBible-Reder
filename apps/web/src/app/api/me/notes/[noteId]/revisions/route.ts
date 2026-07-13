import { NextResponse } from "next/server";
import { personalNoteDocumentToMarkdown, type PersonalNoteDocument } from "@kjv/shared";

import { PERSONAL_NOTE_SELECT, mapPersonalNoteRow, requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ noteId: string }> };

async function getNote(auth: Exclude<Awaited<ReturnType<typeof requirePersonalNoteUser>>, { error: NextResponse }>, noteId: string) {
  return auth.supabase.from("user_personal_notes").select(PERSONAL_NOTE_SELECT).eq("user_id", auth.user.id).eq("client_id", noteId).maybeSingle();
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { noteId } = await context.params;
  const { data: note, error: noteError } = await getNote(auth, noteId);
  if (noteError || !note) return NextResponse.json({ error: noteError?.message ?? "노트를 찾을 수 없습니다." }, { status: 404 });
  const { data, error } = await auth.supabase.from("user_personal_note_revisions").select("id,revision,title,body_document,body_text,snapshot_reason,created_at").eq("user_id", auth.user.id).eq("note_id", note.id).order("revision", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: mapPersonalNoteRow(note, auth.user.id), revisions: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { noteId } = await context.params;
  const payload = await request.json().catch(() => null);
  const revisionNumber = Number(payload?.revision);
  const { data: note, error: noteError } = await getNote(auth, noteId);
  if (noteError || !note) return NextResponse.json({ error: noteError?.message ?? "노트를 찾을 수 없습니다." }, { status: 404 });
  const { data: revision, error: revisionError } = await auth.supabase.from("user_personal_note_revisions").select("title,body_document,body_text").eq("user_id", auth.user.id).eq("note_id", note.id).eq("revision", revisionNumber).maybeSingle();
  if (revisionError || !revision) return NextResponse.json({ error: revisionError?.message ?? "복원할 버전을 찾을 수 없습니다." }, { status: 404 });
  const { error } = await auth.supabase.rpc("save_personal_note_versioned", {
    p_client_id: noteId, p_expected_revision: note.revision, p_title: revision.title,
    p_body_document: revision.body_document, p_body_markdown: revision.body_document ? personalNoteDocumentToMarkdown(revision.body_document as PersonalNoteDocument) : note.body_markdown,
    p_body_text: revision.body_text, p_pinned: note.pinned, p_status: note.status, p_snapshot_reason: "restore",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes("note_revision_conflict") ? 409 : 500 });
  const { data: restored } = await getNote(auth, noteId);
  return NextResponse.json({ note: restored ? mapPersonalNoteRow(restored, auth.user.id) : null });
}
