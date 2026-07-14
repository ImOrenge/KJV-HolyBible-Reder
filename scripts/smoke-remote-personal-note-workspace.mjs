import fs from "node:fs";
import { spawnSync } from "node:child_process";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
}

const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
const baseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !anonKey) throw new Error("Missing Supabase smoke environment variables.");

if (!serviceKey || serviceKey.startsWith("your-")) {
  const supabaseCommand = process.platform === "win32" ? "supabase.exe" : "supabase";
  const psqlCommand = process.platform === "win32" ? "psql.exe" : "psql";
  const connection = spawnSync(supabaseCommand, ["db", "dump", "--linked", "--dry-run"], { cwd: process.cwd(), encoding: "utf8" });
  const output = `${connection.stdout ?? ""}\n${connection.stderr ?? ""}`;
  if (connection.status !== 0) throw new Error(`Supabase CLI connection lookup failed: ${connection.error?.message ?? connection.stderr?.trim() ?? connection.status}`);
  const postgresEnv = Object.fromEntries(
    ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"].map((key) => {
      const value = new RegExp(`export ${key}="([^"]+)"`).exec(output)?.[1];
      if (!value) throw new Error(`Supabase CLI did not provide ${key} for the linked database.`);
      return [key, value];
    }),
  );
  const result = spawnSync(psqlCommand, ["-v", "ON_ERROR_STOP=1", "-f", "scripts/smoke-remote-personal-note-workspace.sql"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...postgresEnv },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Remote SQL smoke failed with exit code ${result.status}.`);
  process.exit(0);
}

async function request(path, { token = anonKey, method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = text;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  return { response, payload };
}

async function createUser(label) {
  const password = `Kjv-${crypto.randomUUID()}-Aa1!`;
  const email = `codex-note-smoke-${label}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const created = await request("/auth/v1/admin/users", { token: serviceKey, method: "POST", body: { email, password, email_confirm: true } });
  if (!created.response.ok) throw new Error(`User creation failed: ${created.response.status}`);
  const signedIn = await request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!signedIn.response.ok || !signedIn.payload?.access_token) throw new Error(`User sign-in failed: ${signedIn.response.status}`);
  return { id: created.payload.id, accessToken: signedIn.payload.access_token };
}

const users = [];
try {
  const userA = await createUser("a"); users.push(userA);
  const userB = await createUser("b"); users.push(userB);
  const clientId = `smoke-note-${crypto.randomUUID()}`;
  const document = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "창세기 1장 관찰" }] }] };

  const inserted = await request("/rest/v1/user_personal_notes", {
    token: userA.accessToken,
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: { user_id: userA.id, client_id: clientId, title: "원격 노트 smoke", body_document: document, body_markdown: "창세기 1장 관찰", body_text: "창세기 1장 관찰", editor_format: "rich-text-v1", status: "active", pinned: false, revision: 1 },
  });
  if (!inserted.response.ok || inserted.payload?.[0]?.revision !== 1) throw new Error(`Note insert failed: ${inserted.response.status}`);

  const saveBody = { p_client_id: clientId, p_expected_revision: 1, p_title: "원격 노트 smoke 수정", p_body_document: document, p_body_markdown: "창세기 1장 관찰", p_body_text: "창세기 1장 관찰", p_pinned: false, p_status: "active", p_snapshot_reason: "save" };
  const saved = await request("/rest/v1/rpc/save_personal_note_versioned", { token: userA.accessToken, method: "POST", body: saveBody });
  if (!saved.response.ok || saved.payload?.revision !== 2 || saved.payload?.unchanged !== false) throw new Error(`Versioned save failed: ${saved.response.status}`);

  const unchanged = await request("/rest/v1/rpc/save_personal_note_versioned", { token: userA.accessToken, method: "POST", body: { ...saveBody, p_expected_revision: 2 } });
  if (!unchanged.response.ok || unchanged.payload?.revision !== 2 || unchanged.payload?.unchanged !== true) throw new Error(`Unchanged save failed: ${unchanged.response.status}`);

  const revisionsBefore = await request(`/rest/v1/user_personal_note_revisions?select=id,revision&note_id=eq.${inserted.payload[0].id}`, { token: userA.accessToken });
  if (!revisionsBefore.response.ok) throw new Error(`Revision precheck failed: ${revisionsBefore.response.status}`);
  const snapshot = await request("/rest/v1/rpc/get_user_data_snapshot", { token: userA.accessToken, method: "POST", body: {} });
  if (!snapshot.response.ok || !snapshot.payload) throw new Error(`Snapshot load failed: ${snapshot.response.status}`);
  const replaced = await request("/rest/v1/rpc/replace_user_data_snapshot", { token: userA.accessToken, method: "POST", body: { snapshot: snapshot.payload } });
  if (!replaced.response.ok) throw new Error(`Snapshot replace failed: ${replaced.response.status}`);
  const preservedNote = await request(`/rest/v1/user_personal_notes?select=revision,title&client_id=eq.${encodeURIComponent(clientId)}`, { token: userA.accessToken });
  if (!preservedNote.response.ok || preservedNote.payload?.[0]?.revision !== 2 || preservedNote.payload?.[0]?.title !== "원격 노트 smoke 수정") {
    throw new Error("Snapshot replace did not preserve the versioned note row.");
  }
  const revisionsAfter = await request(`/rest/v1/user_personal_note_revisions?select=id,revision&note_id=eq.${inserted.payload[0].id}`, { token: userA.accessToken });
  if (!revisionsAfter.response.ok || revisionsAfter.payload?.length !== revisionsBefore.payload?.length) {
    throw new Error("Snapshot replace did not preserve note revision history.");
  }

  const linkedClientId = `smoke-note-linked-${crypto.randomUUID()}`;
  const linkedNote = await request("/rest/v1/user_personal_notes", {
    token: userA.accessToken,
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: { user_id: userA.id, client_id: linkedClientId, title: "연결 노트 smoke", body_document: document, body_markdown: "", body_text: "", editor_format: "rich-text-v1", status: "active", pinned: false, revision: 1 },
  });
  if (!linkedNote.response.ok || !linkedNote.payload?.[0]?.id) throw new Error(`Linked note insert failed: ${linkedNote.response.status}`);
  const noteLink = await request("/rest/v1/user_personal_note_links", {
    token: userA.accessToken,
    method: "POST",
    body: { user_id: userA.id, source_note_id: inserted.payload[0].id, target_note_id: linkedNote.payload[0].id },
  });
  if (!noteLink.response.ok) throw new Error(`Note link insert failed: ${noteLink.response.status}`);

  const crossRead = await request(`/rest/v1/user_personal_notes?select=client_id&client_id=eq.${encodeURIComponent(clientId)}`, { token: userB.accessToken });
  if (!crossRead.response.ok || !Array.isArray(crossRead.payload) || crossRead.payload.length !== 0) throw new Error("Cross-account note read was not isolated.");
  const crossRevision = await request(`/rest/v1/user_personal_note_revisions?select=id&note_id=eq.${inserted.payload[0].id}`, { token: userB.accessToken });
  if (!crossRevision.response.ok || crossRevision.payload.length !== 0) throw new Error("Cross-account note revision read was not isolated.");
  const crossLink = await request(`/rest/v1/user_personal_note_links?select=source_note_id&source_note_id=eq.${inserted.payload[0].id}`, { token: userB.accessToken });
  if (!crossLink.response.ok || crossLink.payload.length !== 0) throw new Error("Cross-account note link read was not isolated.");

  const crossSave = await request("/rest/v1/rpc/save_personal_note_versioned", { token: userB.accessToken, method: "POST", body: { ...saveBody, p_expected_revision: 2 } });
  if (crossSave.response.ok) throw new Error("Cross-account note write was not isolated.");

  const templateId = `smoke-template-${crypto.randomUUID()}`;
  const template = await request("/rest/v1/user_personal_note_templates", { token: userA.accessToken, method: "POST", body: { user_id: userA.id, client_id: templateId, name: "Smoke template", body_document: document } });
  if (!template.response.ok) throw new Error(`Template insert failed: ${template.response.status}`);
  const crossTemplate = await request(`/rest/v1/user_personal_note_templates?select=client_id&client_id=eq.${encodeURIComponent(templateId)}`, { token: userB.accessToken });
  if (!crossTemplate.response.ok || crossTemplate.payload.length !== 0) throw new Error("Cross-account template read was not isolated.");

  console.log("remote personal-note workspace smoke passed: revision=2, snapshot-preserved=true, unchanged-save=true, note-revision-link-isolation=true");
} finally {
  for (const user of users) {
    await request(`/auth/v1/admin/users/${user.id}`, { token: serviceKey, method: "DELETE" }).catch(() => undefined);
  }
}
