import "server-only";

import { cache } from "react";

import type { BibleChapterResponse } from "@/lib/bible-api-types";
import {
  mapBookRow,
  mapVerseRow,
  mergeApprovedKoRows,
  type BibleBookRow,
  type BibleVerseEnRow,
  type BibleVerseKoRow,
} from "@/lib/bible-db-mappers";
import { getBook, getVerses } from "@/lib/bible-repository";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const PUBLIC_BIBLE_CACHE_TAG = "public-bible";
const PUBLIC_BIBLE_REVALIDATE_SECONDS = 60 * 60 * 24;
const publicBibleRequestOptions = {
  next: {
    revalidate: PUBLIC_BIBLE_REVALIDATE_SECONDS,
    tags: [PUBLIC_BIBLE_CACHE_TAG],
  },
};

function canUseLocalBibleFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

function localChapterResponse(bookId: string, chapter: number): BibleChapterResponse | null {
  const book = getBook(bookId);
  if (!book || chapter > book.chapterCount) return null;

  return {
    book: { ...book, chapter },
    source: {
      name: "Local fixture",
      module: "KJV fixture",
      version: "dev",
    },
    verses: getVerses(bookId, chapter),
  };
}

async function loadPublicBibleChapter(bookId: string, chapter: number): Promise<BibleChapterResponse | null> {
  const repositoryBook = getBook(bookId);
  if (!repositoryBook || !Number.isInteger(chapter) || chapter < 1 || chapter > repositoryBook.chapterCount) {
    return null;
  }

  try {
    const encodedBookId = encodeFilterValue(bookId);
    const [book] = await supabaseRestGet<BibleBookRow[]>(
      `bible_books?select=book_order,testament,app_book_id,name_ko,name_en,chapter_count&app_book_id=eq.${encodedBookId}&limit=1`,
      publicBibleRequestOptions,
    );
    if (!book || chapter > book.chapter_count) return null;

    const [rows, koRows] = await Promise.all([
      supabaseRestGet<BibleVerseEnRow[]>(
        [
          "bible_verses_en?select=app_book_id,chapter,verse,verse_key,text_en,source_name,source_module,source_module_version",
          `app_book_id=eq.${encodedBookId}`,
          `chapter=eq.${chapter}`,
          "order=verse.asc",
        ].join("&"),
        publicBibleRequestOptions,
      ),
      supabaseRestGet<BibleVerseKoRow[]>(
        [
          "bible_verses_ko?select=verse_key,text_ko,translation_name,translation_status,is_public,updated_at",
          `book_order=eq.${book.book_order}`,
          `chapter=eq.${chapter}`,
          "translation_status=eq.approved",
          "is_public=eq.true",
          "order=verse.asc,updated_at.desc",
        ].join("&"),
        publicBibleRequestOptions,
      ),
    ]);

    const sourceRow = rows[0];
    return {
      book: { ...mapBookRow(book), chapter },
      source: {
        name: sourceRow?.source_name ?? "CrossWire KJV",
        module: sourceRow?.source_module ?? "KJV",
        version: sourceRow?.source_module_version ?? null,
      },
      verses: mergeApprovedKoRows(rows.map(mapVerseRow), koRows),
    };
  } catch (error) {
    const fallback = canUseLocalBibleFallback() ? localChapterResponse(bookId, chapter) : null;
    if (fallback) return fallback;
    throw error;
  }
}

export const getPublicBibleChapter = cache(loadPublicBibleChapter);
