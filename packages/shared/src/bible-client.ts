import type { BibleChapterResponse, BibleSearchResponse, BibleVerseResponse } from "./bible-api-types";
import { bibleBookByAppId, type AppBookId } from "./bible-book-codes";
import type { BibleSearchLanguage, BibleSearchSort } from "./korean-search";
import type { Verse } from "./types";

export type BibleApiClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

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

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function fetchJson<T>(path: string, options: BibleApiClientOptions = {}): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(resolveApiUrl(path, options.baseUrl), { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload && typeof payload.error === "string" ? payload.error : "Bible API request failed.";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchBibleChapter(bookId: string, chapter: number, options?: BibleApiClientOptions) {
  return fetchJson<BibleChapterResponse>(
    `/api/bible/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(String(chapter))}`,
    options,
  );
}

export async function fetchBibleVerse(verseId: string, options?: BibleApiClientOptions) {
  const verseKey = normalizeVerseId(verseId);
  return fetchJson<BibleVerseResponse>(`/api/bible/verses/${encodeURIComponent(verseKey)}`, options);
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
  clientOptions?: BibleApiClientOptions,
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

  return fetchJson<BibleSearchResponse>(`/api/bible/search?${params.toString()}`, clientOptions);
}

export function createBibleApiClient(options: BibleApiClientOptions) {
  return {
    fetchBibleChapter: (bookId: string, chapter: number) => fetchBibleChapter(bookId, chapter, options),
    fetchBibleVerse: (verseId: string) => fetchBibleVerse(verseId, options),
    searchBibleVerses: (
      query: string,
      searchOptions?: Parameters<typeof searchBibleVerses>[1],
    ) => searchBibleVerses(query, searchOptions, options),
  };
}

export function cacheVerseList(current: Record<string, Verse>, verses: Verse[]) {
  const next = { ...current };
  for (const verse of verses) {
    next[verse.id] = verse;
  }
  return next;
}
