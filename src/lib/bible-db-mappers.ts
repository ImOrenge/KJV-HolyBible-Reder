import type { Book, Testament, Verse } from "./types";
import { getConfiguredPublicKoTranslationName } from "./public-ko-translation";

export type BibleBookRow = {
  book_order: number;
  testament: "OT" | "NT";
  app_book_id: string;
  name_ko: string;
  name_en: string;
  chapter_count: number;
};

export type BibleVerseEnRow = {
  app_book_id: string;
  chapter: number;
  verse: number;
  verse_key: string;
  text_en: string;
  source_name: string;
  source_module: string;
  source_module_version: string | null;
};

export type BibleVerseKoRow = {
  verse_key: string;
  text_ko: string;
  translation_name: string;
  translation_status: string;
  is_public: boolean;
  updated_at?: string | null;
};

export function mapTestament(testament: "OT" | "NT"): Testament {
  return testament === "OT" ? "old" : "new";
}

export function mapBookRow(row: BibleBookRow): Book {
  return {
    id: row.app_book_id,
    testament: mapTestament(row.testament),
    order: row.book_order,
    nameKo: row.name_ko,
    nameEn: row.name_en,
    chapterCount: row.chapter_count,
  };
}

export function mapVerseRow(row: BibleVerseEnRow): Verse {
  return {
    id: row.verse_key,
    verseKey: row.verse_key,
    bookId: row.app_book_id,
    chapter: row.chapter,
    verse: row.verse,
    text: row.text_en,
    textEn: row.text_en,
    textKo: null,
    translation: "CrossWire KJV",
    translationStatus: null,
    sourceName: row.source_name,
    sourceModule: row.source_module,
    sourceModuleVersion: row.source_module_version,
  };
}

export function mergeApprovedKoRows(verses: Verse[], koRows: BibleVerseKoRow[]): Verse[] {
  const configuredTranslationName = getConfiguredPublicKoTranslationName();
  const koByVerseKey = new Map<string, BibleVerseKoRow>();

  for (const row of koRows) {
    const current = koByVerseKey.get(row.verse_key);
    if (
      !current ||
      (configuredTranslationName &&
        current.translation_name !== configuredTranslationName &&
        row.translation_name === configuredTranslationName)
    ) {
      koByVerseKey.set(row.verse_key, row);
    }
  }

  return verses.map((verse) => {
    const ko = koByVerseKey.get(verse.id);
    if (!ko) {
      return verse;
    }

    return {
      ...verse,
      textKo: ko.text_ko,
      translationName: ko.translation_name,
      translationStatus: ko.translation_status,
    };
  });
}
