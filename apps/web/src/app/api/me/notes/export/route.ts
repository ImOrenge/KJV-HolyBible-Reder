import { personalNoteDocumentToMarkdown } from "@kjv/shared";
import JSZip from "jszip";
import { NextResponse } from "next/server";

import { requirePersonalNoteUser } from "@/lib/personal-note-server";

export const dynamic = "force-dynamic";

function safeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().slice(0, 80) || "성경노트";
}

export async function POST(request: Request) {
  const auth = await requirePersonalNoteUser();
  if ("error" in auth) return auth.error;
  const payload = await request.json().catch(() => null);
  const format = payload?.format === "markdown" ? "markdown" : "json";
  const [notes, verseLinks, noteLinks, noteTags, tags, revisions] = await Promise.all([
    auth.supabase.from("user_personal_notes").select("client_id,title,body_document,body_markdown,body_text,editor_format,status,pinned,revision,archived_at,created_at,updated_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_note_verse_links").select("client_id,note_id,verse_key,chapter,verse,source,link_order,created_at,bible_books!inner(app_book_id)").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_note_links").select("source_note_id,target_note_id,created_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_note_tags").select("note_id,tag_id,created_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_tags").select("id,client_id,name,created_at").eq("user_id", auth.user.id),
    auth.supabase.from("user_personal_note_revisions").select("note_id,revision,created_at,snapshot_reason").eq("user_id", auth.user.id),
  ]);
  const error = [notes, verseLinks, noteLinks, noteTags, tags, revisions].find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const exportData = { schemaVersion: 1, exportedAt: new Date().toISOString(), notes: notes.data ?? [], verseLinks: verseLinks.data ?? [], noteLinks: noteLinks.data ?? [], noteTags: noteTags.data ?? [], tags: tags.data ?? [], revisions: revisions.data ?? [] };
  if (format === "json") {
    return new Response(JSON.stringify(exportData, null, 2), { headers: { "Content-Disposition": "attachment; filename=kjv-reader-notes.json", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });
  }
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({ schemaVersion: 1, exportedAt: exportData.exportedAt, noteCount: exportData.notes.length }, null, 2));
  for (const note of exportData.notes) {
    const body = note.body_document ? personalNoteDocumentToMarkdown(note.body_document) : note.body_markdown;
    zip.file(`${safeFilename(note.title)}-${note.client_id.slice(-8)}.md`, `# ${note.title}\n\n${body}\n`);
  }
  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Response(archive as BodyInit, { headers: { "Content-Disposition": "attachment; filename=kjv-reader-notes.zip", "Content-Type": "application/zip", "Cache-Control": "private, no-store" } });
}
