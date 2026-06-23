import { bibleBooks, fixtureVerses } from "./bible-data";
import type { Book, Testament, Verse } from "./types";

const verseIndex = new Map(fixtureVerses.map((verse) => [verse.id, verse]));

export function getBooks(testament?: Testament): Book[] {
  return testament ? bibleBooks.filter((book) => book.testament === testament) : bibleBooks;
}

export function getBook(bookId: string): Book | undefined {
  return bibleBooks.find((book) => book.id === bookId);
}

export function getChapters(bookId: string): number[] {
  const book = getBook(bookId);
  if (!book) {
    return [];
  }
  return Array.from({ length: book.chapterCount }, (_, index) => index + 1);
}

export function getVerses(bookId: string, chapter: number): Verse[] {
  return fixtureVerses
    .filter((verse) => verse.bookId === bookId && verse.chapter === chapter)
    .sort((a, b) => a.verse - b.verse);
}

export function getVerseById(verseId: string): Verse | undefined {
  return verseIndex.get(verseId);
}

export function getChapterLabel(bookId: string, chapter: number): string {
  const book = getBook(bookId);
  return book ? `${book.nameKo} ${chapter}장` : `알 수 없는 장`;
}

export function getAdjacentChapter(bookId: string, chapter: number, direction: -1 | 1) {
  const currentBook = getBook(bookId);
  if (!currentBook) {
    return null;
  }

  if (direction === -1 && chapter > 1) {
    return { bookId, chapter: chapter - 1 };
  }

  if (direction === 1 && chapter < currentBook.chapterCount) {
    return { bookId, chapter: chapter + 1 };
  }

  const nextOrder = currentBook.order + direction;
  const adjacentBook = bibleBooks.find((book) => book.order === nextOrder);
  if (!adjacentBook) {
    return null;
  }

  return {
    bookId: adjacentBook.id,
    chapter: direction === 1 ? 1 : adjacentBook.chapterCount,
  };
}

export function getTotalChapterCount(testament?: Testament): number {
  return getBooks(testament).reduce((total, book) => total + book.chapterCount, 0);
}

export function searchFixtureVerses(query: string): Verse[] {
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  if (normalized.length < 2) {
    return [];
  }

  return fixtureVerses.filter((verse) => {
    const book = getBook(verse.bookId);
    const haystack = `${book?.nameKo ?? ""} ${book?.nameEn ?? ""} ${verse.chapter}:${verse.verse} ${verse.text}`.toLocaleLowerCase("ko-KR");
    return haystack.includes(normalized);
  });
}
