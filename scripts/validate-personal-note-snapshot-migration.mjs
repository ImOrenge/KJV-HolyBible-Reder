import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = "supabase/migrations/20260714110000_preserve_personal_notes_in_user_snapshot.sql";
const sql = await readFile(migrationPath, "utf8");

assert.match(sql, /create or replace function public\.replace_user_data_snapshot\(snapshot jsonb\)/i);
assert.match(sql, /perform public\.replace_user_data_snapshot_base\(incoming\)/i);
assert.doesNotMatch(sql, /replace_user_data_snapshot_rich_text_base\(incoming\)/i);
assert.doesNotMatch(sql, /delete from public\.user_personal_notes/i);
assert.doesNotMatch(sql, /delete from public\.user_personal_note_revisions/i);
assert.doesNotMatch(sql, /update public\.user_personal_notes/i);
assert.doesNotMatch(sql, /insert into public\.user_personal_notes\s*\(/i);
assert.match(sql, /insert into public\.user_personal_note_verse_links/i);
assert.match(sql, /insert into public\.user_personal_note_tags/i);
assert.match(sql, /insert into public\.user_verse_tags/i);
assert.match(sql, /insert into public\.user_personal_note_templates/i);
assert.match(sql, /insert into public\.user_personal_note_links/i);
assert.match(sql, /grant execute on function public\.replace_user_data_snapshot\(jsonb\) to authenticated, service_role/i);

console.log("Personal note snapshot migration validation passed.");
