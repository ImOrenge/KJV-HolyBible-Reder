import { bibleBookCodes, type BibleBookCode } from "./bible-book-codes";

export type VerseReferenceTrigger = {
  start: number;
  end: number;
  query: string;
};

export type ParsedVerseReferenceQuery = {
  bookQuery: string;
  bookCandidates: BibleBookCode[];
  book: BibleBookCode | null;
  chapter: number | null;
  verse: number | null;
};

function normalizeAlias(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[.\s_-]+/g, "");
}

function aliasesForBook(book: BibleBookCode) {
  return [book.nameKo, book.shortNameKo, book.nameEn, book.shortNameEn, book.appBookId, book.osisBookId, book.verseKeyCode]
    .map(normalizeAlias)
    .filter(Boolean);
}

export function findVerseReferenceTrigger(text: string, cursor: number): VerseReferenceTrigger | null {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, safeCursor);
  const hashIndex = before.lastIndexOf("#");
  if (hashIndex < 0) return null;
  const previous = text[hashIndex - 1] ?? "";
  if (previous === "/" || /[\p{L}\p{N}_]/u.test(previous)) return null;
  const query = text.slice(hashIndex + 1, safeCursor);
  if (/\n/.test(query) || query.startsWith(" ") || query.length > 40) return null;
  if (!/^[0-9A-Za-z가-힣.\s:-]*$/.test(query)) return null;
  return { start: hashIndex, end: safeCursor, query };
}

export function matchBibleBooks(query: string, limit = 8): BibleBookCode[] {
  const normalized = normalizeAlias(query);
  if (!normalized) return [];
  return bibleBookCodes
    .filter((book) => aliasesForBook(book).some((alias) => alias.startsWith(normalized)))
    .slice(0, Math.max(1, limit));
}

export function parseVerseReferenceQuery(query: string): ParsedVerseReferenceQuery {
  const trimmed = query.trim();
  const match = /^(.*?)(?:\s+(\d{1,3})(?::(\d{1,3}))?)?$/.exec(trimmed);
  const bookQuery = (match?.[1] ?? trimmed).trim();
  const candidates = matchBibleBooks(bookQuery);
  const exactNormalized = normalizeAlias(bookQuery);
  const exactMatches = candidates.filter((candidate) => aliasesForBook(candidate).includes(exactNormalized));
  const exact = exactMatches.length === 1 ? exactMatches[0] : null;
  const book = exact ?? (candidates.length === 1 ? candidates[0] : null);
  const chapter = match?.[2] ? Number(match[2]) : null;
  const verse = match?.[3] ? Number(match[3]) : null;
  return { bookQuery, bookCandidates: candidates, book, chapter, verse };
}

export function formatShortBibleReference(book: Pick<BibleBookCode, "shortNameKo">, chapter: number, verse: number) {
  return `${book.shortNameKo} ${chapter}:${verse}`;
}

export function createVerseKey(book: Pick<BibleBookCode, "verseKeyCode">, chapter: number, verse: number) {
  return `${book.verseKeyCode}.${chapter}.${verse}`;
}
