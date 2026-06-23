import type { BibleChapterResponse, BibleSearchResponse, BibleVerseResponse } from "./bible-api-types";
import { bibleBookByAppId, type AppBookId } from "./bible-book-codes";
import type { Verse } from "./types";

const legacyVerseIdPattern = /^([a-z0-9]+)-(\d+)-(\d+)$/i;

export function buildVerseKey(bookId: string, chapter: number, verse: number) {
  const book = bibleBookByAppId.get(bookId as AppBookId);
  return `${book?.verseKeyCode ?? bookId.toUpperCase()}.${chapter}.${verse}`;
}

export function normalizeVerseId(verseId: string) {
  const legacyMatch = legacyVerseIdPattern.exec(verseId);
  if (!legacyMatch) {
    return verseId;
  }

  const [, bookId, chapter, verse] = legacyMatch;
  return buildVerseKey(bookId.toLowerCase(), Number(chapter), Number(verse));
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload && typeof payload.error === "string" ? payload.error : "Bible API request failed.";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchBibleChapter(bookId: string, chapter: number) {
  return fetchJson<BibleChapterResponse>(
    `/api/bible/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(String(chapter))}`,
  );
}

export async function fetchBibleVerse(verseId: string) {
  const verseKey = normalizeVerseId(verseId);
  return fetchJson<BibleVerseResponse>(`/api/bible/verses/${encodeURIComponent(verseKey)}`);
}

export async function searchBibleVerses(query: string) {
  return fetchJson<BibleSearchResponse>(`/api/bible/search?q=${encodeURIComponent(query)}`);
}

export function cacheVerseList(current: Record<string, Verse>, verses: Verse[]) {
  const next = { ...current };
  for (const verse of verses) {
    next[verse.id] = verse;
  }
  return next;
}
