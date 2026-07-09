import { jsonWithCors, optionsWithCors } from "@/lib/api/cors";
import {
  mapBookRow,
  mapVerseRow,
  mergeApprovedKoRows,
  type BibleBookRow,
  type BibleVerseEnRow,
  type BibleVerseKoRow,
} from "@/lib/bible-db-mappers";
import type { BibleChapterResponse } from "@/lib/bible-api-types";
import { getBook, getVerses } from "@/lib/bible-repository";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    bookId: string;
    chapter: string;
  }>;
};

export function OPTIONS() {
  return optionsWithCors();
}

function canUseLocalBibleFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

function localChapterResponse(bookId: string, chapter: number): BibleChapterResponse | null {
  const book = getBook(bookId);
  if (!book || chapter > book.chapterCount) {
    return null;
  }

  return {
    book: {
      ...book,
      chapter,
    },
    source: {
      name: "Local fixture",
      module: "KJV fixture",
      version: "dev",
    },
    verses: getVerses(bookId, chapter),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { bookId, chapter: chapterParam } = await context.params;
    const chapter = Number(chapterParam);

    if (!bookId || !Number.isInteger(chapter) || chapter < 1) {
      return jsonWithCors({ error: "Invalid book or chapter." }, { status: 400 });
    }

    const encodedBookId = encodeFilterValue(bookId);
    const [book] = await supabaseRestGet<BibleBookRow[]>(
      `bible_books?select=book_order,testament,app_book_id,name_ko,name_en,chapter_count&app_book_id=eq.${encodedBookId}&limit=1`,
    );

    if (!book || chapter > book.chapter_count) {
      return jsonWithCors({ error: "Bible chapter not found." }, { status: 404 });
    }

    const rows = await supabaseRestGet<BibleVerseEnRow[]>(
      [
        "bible_verses_en?select=app_book_id,chapter,verse,verse_key,text_en,source_name,source_module,source_module_version",
        `app_book_id=eq.${encodedBookId}`,
        `chapter=eq.${chapter}`,
        "order=verse.asc",
      ].join("&"),
    );

    const koRows = await supabaseRestGet<BibleVerseKoRow[]>(
      [
        "bible_verses_ko?select=verse_key,text_ko,translation_name,translation_status,is_public,updated_at",
        `book_order=eq.${book.book_order}`,
        `chapter=eq.${chapter}`,
        "translation_status=eq.approved",
        "is_public=eq.true",
        "order=verse.asc,updated_at.desc",
      ].join("&"),
    );

    const verses = mergeApprovedKoRows(rows.map(mapVerseRow), koRows);
    const sourceRow = rows[0];
    const response: BibleChapterResponse = {
      book: {
        ...mapBookRow(book),
        chapter,
      },
      source: {
        name: sourceRow?.source_name ?? "CrossWire KJV",
        module: sourceRow?.source_module ?? "KJV",
        version: sourceRow?.source_module_version ?? null,
      },
      verses,
    };

    return jsonWithCors(response);
  } catch (error) {
    const { bookId, chapter: chapterParam } = await context.params;
    const chapter = Number(chapterParam);
    const fallback = Number.isInteger(chapter) && canUseLocalBibleFallback()
      ? localChapterResponse(bookId, chapter)
      : null;
    if (fallback) {
      return jsonWithCors(fallback);
    }

    return jsonWithCors(
      { error: error instanceof Error ? error.message : "Failed to load Bible chapter." },
      { status: 500 },
    );
  }
}
