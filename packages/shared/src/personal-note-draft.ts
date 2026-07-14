import type { PersonalNote, PersonalNoteDocument } from "./types";
import type { UserDataStorage } from "./user-data-repository";

const personalNoteDraftStoragePrefix = "kjv-reader-note:v1:personal-note-draft";
const personalNoteDraftIndexStoragePrefix = "kjv-reader-note:v1:personal-note-draft-index";

export type PersonalNoteDraft = {
  version: 1;
  userId: string;
  noteId: string;
  baseRevision: number;
  title: string;
  bodyDocument: PersonalNoteDocument;
  tagInput: string;
  updatedAt: string;
};

export type PersonalNoteDraftInput = Omit<PersonalNoteDraft, "updatedAt" | "version"> & {
  updatedAt?: string;
};

export function getPersonalNoteDraftStorageKey(userId: string, noteId: string) {
  return `${personalNoteDraftStoragePrefix}:${encodeURIComponent(userId)}:${encodeURIComponent(noteId)}`;
}

export function getPersonalNoteDraftIndexStorageKey(userId: string) {
  return `${personalNoteDraftIndexStoragePrefix}:${encodeURIComponent(userId)}`;
}

export function createPersonalNoteDraft(input: PersonalNoteDraftInput): PersonalNoteDraft {
  return {
    ...input,
    version: 1,
    baseRevision: Math.max(1, Math.floor(input.baseRevision || 1)),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function getPersonalNoteDraftFingerprint(value: Pick<PersonalNoteDraft, "bodyDocument" | "tagInput" | "title">) {
  return JSON.stringify({
    bodyDocument: value.bodyDocument,
    tagInput: value.tagInput.trim(),
    title: value.title,
  });
}

function parsePersonalNoteDraft(value: string | null): PersonalNoteDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersonalNoteDraft>;
    if (
      parsed.version !== 1 ||
      typeof parsed.userId !== "string" ||
      typeof parsed.noteId !== "string" ||
      typeof parsed.baseRevision !== "number" ||
      typeof parsed.title !== "string" ||
      typeof parsed.tagInput !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      !parsed.bodyDocument ||
      parsed.bodyDocument.type !== "doc" ||
      !Array.isArray(parsed.bodyDocument.content)
    ) {
      return null;
    }
    return parsed as PersonalNoteDraft;
  } catch {
    return null;
  }
}

export async function loadPersonalNoteDraft(storage: UserDataStorage, userId: string, noteId: string) {
  const value = await storage.getItem(getPersonalNoteDraftStorageKey(userId, noteId));
  const draft = parsePersonalNoteDraft(value);
  return draft?.userId === userId && draft.noteId === noteId ? draft : null;
}

export async function savePersonalNoteDraft(storage: UserDataStorage, draft: PersonalNoteDraft) {
  await storage.setItem(getPersonalNoteDraftStorageKey(draft.userId, draft.noteId), JSON.stringify(draft));
  const noteIds = await loadPersonalNoteDraftIndex(storage, draft.userId);
  if (!noteIds.includes(draft.noteId)) {
    await storage.setItem(getPersonalNoteDraftIndexStorageKey(draft.userId), JSON.stringify([...noteIds, draft.noteId]));
  }
}

export async function clearPersonalNoteDraft(storage: UserDataStorage, userId: string, noteId: string) {
  await storage.removeItem(getPersonalNoteDraftStorageKey(userId, noteId));
  const noteIds = await loadPersonalNoteDraftIndex(storage, userId);
  const nextNoteIds = noteIds.filter((draftNoteId) => draftNoteId !== noteId);
  if (nextNoteIds.length === 0) {
    await storage.removeItem(getPersonalNoteDraftIndexStorageKey(userId));
    return;
  }
  await storage.setItem(getPersonalNoteDraftIndexStorageKey(userId), JSON.stringify(nextNoteIds));
}

async function loadPersonalNoteDraftIndex(storage: UserDataStorage, userId: string) {
  const value = await storage.getItem(getPersonalNoteDraftIndexStorageKey(userId));
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((noteId): noteId is string => typeof noteId === "string") : [];
  } catch {
    return [];
  }
}

export async function clearAllPersonalNoteDrafts(storage: UserDataStorage, userId: string) {
  const noteIds = await loadPersonalNoteDraftIndex(storage, userId);
  const indexedKeys = noteIds.map((noteId) => getPersonalNoteDraftStorageKey(userId, noteId));
  const userDraftPrefix = `${personalNoteDraftStoragePrefix}:${encodeURIComponent(userId)}:`;
  const discoveredKeys = storage.getAllKeys
    ? (await storage.getAllKeys()).filter((key) => key.startsWith(userDraftPrefix))
    : [];
  await Promise.all([...new Set([...indexedKeys, ...discoveredKeys])].map((key) => storage.removeItem(key)));
  await storage.removeItem(getPersonalNoteDraftIndexStorageKey(userId));
}

export function shouldRestorePersonalNoteDraft(draft: PersonalNoteDraft, note: PersonalNote) {
  const draftTime = Date.parse(draft.updatedAt);
  const savedTime = Date.parse(note.lastSavedAt ?? note.updatedAt);
  return draft.noteId === note.id && Number.isFinite(draftTime) && (!Number.isFinite(savedTime) || draftTime > savedTime);
}

export async function clearPersonalNoteDraftIfCovered(storage: UserDataStorage, userId: string, note: PersonalNote) {
  const draft = await loadPersonalNoteDraft(storage, userId, note.id);
  if (!draft || shouldRestorePersonalNoteDraft(draft, note)) return false;
  await clearPersonalNoteDraft(storage, userId, note.id);
  return true;
}
