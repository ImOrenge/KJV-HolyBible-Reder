import { validatePersonalNoteDocument } from "@kjv/shared";
import { NextResponse } from "next/server";
import { normalizeText, requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("user_personal_note_templates").select("client_id,name,description,body_document,status,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}
export async function POST(request: Request) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const payload = await request.json().catch(() => null);
  const validation = validatePersonalNoteDocument(payload?.bodyDocument);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
  const { data, error } = await auth.supabase.from("user_personal_note_templates").insert({ client_id: normalizeText(payload?.clientId, 120) || `note-template-${crypto.randomUUID()}`, user_id: auth.user.id, name: normalizeText(payload?.name, 80) || "이름 없는 템플릿", description: normalizeText(payload?.description, 240), body_document: payload.bodyDocument }).select("client_id,name,description,body_document,status,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
