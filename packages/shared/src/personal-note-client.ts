import type { PersonalNote, PersonalNoteLink, PersonalNoteVerseLink } from "./types";

export type PersonalNoteRemoteInput = {
  note: PersonalNote;
  noteLinks?: PersonalNoteLink[];
  tagNames?: string[];
  verseLinks?: PersonalNoteVerseLink[];
};

export type PersonalNoteClientOptions = {
  accessToken: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

type PersonalNoteResponse = {
  note?: PersonalNote;
  current?: PersonalNote | null;
  code?: string;
  error?: string;
};

export class PersonalNoteRevisionConflictError extends Error {
  readonly code = "note_revision_conflict";
  readonly current: PersonalNote | null;

  constructor(message: string, current: PersonalNote | null) {
    super(message);
    this.name = "PersonalNoteRevisionConflictError";
    this.current = current;
  }
}

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function toPayload(input: PersonalNoteRemoteInput) {
  return {
    bodyDocument: input.note.bodyDocument,
    bodyMarkdown: input.note.bodyMarkdown,
    bodyText: input.note.bodyText,
    clientId: input.note.id,
    noteLinks: input.noteLinks ?? [],
    pinned: input.note.pinned,
    revision: input.note.revision,
    status: input.note.status,
    tagNames: input.tagNames ?? [],
    title: input.note.title,
    verseLinks: (input.verseLinks ?? []).map((link) => ({
      bookId: link.bookId,
      chapter: link.chapter,
      id: link.id,
      linkOrder: link.linkOrder,
      selectedText: link.selectedText,
      source: link.source,
      verse: link.verse,
      verseKey: link.verseKey,
    })),
  };
}

async function requestPersonalNote(path: string, method: "POST" | "PATCH" | "DELETE", input: PersonalNoteRemoteInput | null, options: PersonalNoteClientOptions) {
  const response = await (options.fetcher ?? fetch)(resolveApiUrl(path, options.baseUrl), {
    body: input ? JSON.stringify(toPayload(input)) : undefined,
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      ...(input ? { "Content-Type": "application/json" } : {}),
    },
    method,
  });
  const payload = (await response.json().catch(() => null)) as PersonalNoteResponse | null;
  if (response.status === 409 && payload?.code === "note_revision_conflict") {
    throw new PersonalNoteRevisionConflictError(payload.error ?? "다른 기기에서 이 노트가 수정되었습니다.", payload.current ?? null);
  }
  if (!response.ok) {
    throw new Error(payload?.error ?? "노트를 서버에 저장하지 못했습니다.");
  }
  return payload;
}

export async function createRemotePersonalNote(input: PersonalNoteRemoteInput, options: PersonalNoteClientOptions) {
  const payload = await requestPersonalNote("/api/me/notes", "POST", input, options);
  if (!payload?.note) throw new Error("서버의 노트 생성 응답이 올바르지 않습니다.");
  return payload.note;
}

export async function updateRemotePersonalNote(input: PersonalNoteRemoteInput, options: PersonalNoteClientOptions) {
  const payload = await requestPersonalNote(`/api/me/notes/${encodeURIComponent(input.note.id)}`, "PATCH", input, options);
  if (!payload?.note) throw new Error("서버의 노트 저장 응답이 올바르지 않습니다.");
  return payload.note;
}

export async function deleteRemotePersonalNote(noteId: string, options: PersonalNoteClientOptions) {
  await requestPersonalNote(`/api/me/notes/${encodeURIComponent(noteId)}?permanent=true`, "DELETE", null, options);
}
