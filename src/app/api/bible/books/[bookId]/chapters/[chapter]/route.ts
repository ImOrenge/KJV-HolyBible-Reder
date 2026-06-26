import { NextResponse } from "next/server";
import {
  mapBookRow,
  mapVerseRow,
  mergeApprovedKoRows,
  type BibleBookRow,
  type BibleVerseEnRow,
  type BibleVerseKoRow,
} from "@/lib/bible-db-mappers";
import type { BibleChapterResponse } from "@/lib/bible-api-types";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    bookId: string;
    chapter: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { bookId, chapter: chapterParam } = await context.params;
    const chapter = Number(chapterParam);

    if (!bookId || !Number.isInteger(chapter) || chapter < 1) {
      return NextResponse.json({ error: "Invalid book or chapter." }, { status: 400 });
    }

    const encodedBookId = encodeFilterValue(bookId);
    const [book] = await supabaseRestGet<BibleBookRow[]>(
      `bible_books?select=book_order,testament,app_book_id,name_ko,name_en,chapter_count&app_book_id=eq.${encodedBookId}&limit=1`,
    );

    if (!book || chapter > book.chapter_count) {
      return NextResponse.json({ error: "Bible chapter not found." }, { status: 404 });
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

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Bible chapter." },
      { status: 500 },
    );
  }
}
