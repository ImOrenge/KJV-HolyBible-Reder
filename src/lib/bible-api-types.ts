import type { Book, Verse } from "./types";

export type BibleSource = {
  name: string;
  module: string;
  version: string | null;
};

export type BibleChapterResponse = {
  book: Book & {
    chapter: number;
  };
  source: BibleSource;
  verses: Verse[];
};

export type BibleVerseResponse = {
  verse: Verse;
  source: BibleSource;
};

export type BibleSearchResponse = {
  query: string;
  source: BibleSource;
  verses: Verse[];
};
