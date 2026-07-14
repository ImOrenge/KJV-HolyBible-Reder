import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const clientModule = await import(pathToFileURL("packages/shared/src/personal-note-client.ts"));
const {
  PersonalNoteRevisionConflictError,
  createRemotePersonalNote,
  deleteRemotePersonalNote,
  updateRemotePersonalNote,
} = clientModule;

const note = {
  id: "personal-note-1",
  userId: "user-1",
  title: "창세기 묵상",
  bodyMarkdown: "빛이 있으라",
  bodyText: "빛이 있으라",
  bodyDocument: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "빛이 있으라" }] }] },
  editorFormat: "rich-text-v1",
  status: "active",
  pinned: false,
  revision: 2,
  createdAt: "2026-07-14T09:00:00.000Z",
  updatedAt: "2026-07-14T10:00:00.000Z",
  lastSavedAt: "2026-07-14T10:00:00.000Z",
};
const calls = [];
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const options = {
  accessToken: "access-token",
  baseUrl: "https://reader.example/app",
  fetcher: async (url, init) => {
    calls.push({ url: String(url), init });
    return jsonResponse(201, { note });
  },
};

assert.deepEqual(await createRemotePersonalNote({ note, tagNames: ["묵상"] }, options), note);
assert.equal(calls[0].url, "https://reader.example/api/me/notes");
assert.equal(calls[0].url.includes(note.title), false);
assert.equal(calls[0].url.includes(note.bodyText), false);
assert.equal(calls[0].init.method, "POST");
assert.equal(calls[0].init.headers.Authorization, "Bearer access-token");
assert.equal(JSON.parse(calls[0].init.body).revision, 2);

const current = { ...note, revision: 3, title: "서버에서 수정됨" };
await assert.rejects(
  updateRemotePersonalNote(
    { note },
    {
      ...options,
      fetcher: async () => jsonResponse(409, { code: "note_revision_conflict", current, error: "충돌" }),
    },
  ),
  (error) => error instanceof PersonalNoteRevisionConflictError && error.current.revision === 3,
);

const deleteCalls = [];
await deleteRemotePersonalNote("note/id", {
  ...options,
  fetcher: async (url, init) => {
    deleteCalls.push({ url: String(url), init });
    return jsonResponse(200, { ok: true });
  },
});
assert.equal(deleteCalls[0].url, "https://reader.example/api/me/notes/note%2Fid?permanent=true");
assert.equal(deleteCalls[0].init.method, "DELETE");

console.log("Personal note client validation passed.");
