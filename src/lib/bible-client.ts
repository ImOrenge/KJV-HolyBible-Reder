import type { BibleChapterResponse, BibleSearchResponse, BibleVerseResponse } from "./bible-api-types";
import { bibleBookByAppId, type AppBookId } from "./bible-book-codes";
import type { BibleSearchLanguage, BibleSearchSort } from "./korean-search";
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

export async function searchBibleVerses(
  query: string,
  options: {
    lang?: BibleSearchLanguage;
    sort?: BibleSearchSort;
    testament?: "OT" | "NT" | "all";
    bookId?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const params = new URLSearchParams({ q: query });
  if (options.lang) {
    params.set("lang", options.lang);
  }
  if (options.sort) {
    params.set("sort", options.sort);
  }
  if (options.testament && options.testament !== "all") {
    params.set("testament", options.testament);
  }
  if (options.bookId && options.bookId !== "all") {
    params.set("bookId", options.bookId);
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.offset) {
    params.set("offset", String(options.offset));
  }

  return fetchJson<BibleSearchResponse>(`/api/bible/search?${params.toString()}`);
}

export function cacheVerseList(current: Record<string, Verse>, verses: Verse[]) {
  const next = { ...current };
  for (const verse of verses) {
    next[verse.id] = verse;
  }
  return next;
}
