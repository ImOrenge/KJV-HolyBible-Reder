import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const draftModule = await import(pathToFileURL("packages/shared/src/personal-note-draft.ts"));
const {
  clearAllPersonalNoteDrafts,
  clearPersonalNoteDraftIfCovered,
  createPersonalNoteDraft,
  getPersonalNoteDraftStorageKey,
  loadPersonalNoteDraft,
  savePersonalNoteDraft,
  shouldRestorePersonalNoteDraft,
} = draftModule;

const values = new Map();
const storage = {
  getAllKeys: async () => [...values.keys()],
  getItem: async (key) => values.get(key) ?? null,
  removeItem: async (key) => values.delete(key),
  setItem: async (key, value) => values.set(key, value),
};
const bodyDocument = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "임시 묵상" }] }] };
const draft = createPersonalNoteDraft({
  baseRevision: 2,
  bodyDocument,
  noteId: "note-1",
  tagInput: "묵상",
  title: "창세기 묵상",
  updatedAt: "2026-07-14T10:00:00.000Z",
  userId: "user-1",
});

await savePersonalNoteDraft(storage, draft);
assert.deepEqual(await loadPersonalNoteDraft(storage, "user-1", "note-1"), draft);
assert.notEqual(getPersonalNoteDraftStorageKey("user-1", "note-1"), getPersonalNoteDraftStorageKey("user-2", "note-1"));

const olderNote = { id: "note-1", revision: 2, updatedAt: "2026-07-14T09:00:00.000Z" };
assert.equal(shouldRestorePersonalNoteDraft(draft, olderNote), true);
assert.equal(await clearPersonalNoteDraftIfCovered(storage, "user-1", olderNote), false);

const newerNote = { id: "note-1", revision: 3, updatedAt: "2026-07-14T11:00:00.000Z", lastSavedAt: "2026-07-14T11:00:00.000Z" };
assert.equal(shouldRestorePersonalNoteDraft(draft, newerNote), false);
assert.equal(await clearPersonalNoteDraftIfCovered(storage, "user-1", newerNote), true);
assert.equal(await loadPersonalNoteDraft(storage, "user-1", "note-1"), null);

values.set(getPersonalNoteDraftStorageKey("user-1", "note-1"), "{invalid");
assert.equal(await loadPersonalNoteDraft(storage, "user-1", "note-1"), null);

const secondDraft = createPersonalNoteDraft({ ...draft, noteId: "note-2", userId: "user-1" });
const anotherUserDraft = createPersonalNoteDraft({ ...draft, noteId: "note-3", userId: "user-2" });
await savePersonalNoteDraft(storage, secondDraft);
await savePersonalNoteDraft(storage, anotherUserDraft);
await clearAllPersonalNoteDrafts(storage, "user-1");
assert.equal(await loadPersonalNoteDraft(storage, "user-1", "note-2"), null);
assert.equal(values.has(getPersonalNoteDraftStorageKey("user-1", "note-1")), false);
assert.deepEqual(await loadPersonalNoteDraft(storage, "user-2", "note-3"), anotherUserDraft);

console.log("Personal note draft validation passed.");
