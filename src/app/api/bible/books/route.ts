import { NextResponse } from "next/server";
import { mapBookRow, type BibleBookRow } from "@/lib/bible-db-mappers";
import { supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await supabaseRestGet<BibleBookRow[]>(
      "bible_books?select=book_order,testament,app_book_id,name_ko,name_en,chapter_count&order=book_order.asc",
    );

    return NextResponse.json({ books: rows.map(mapBookRow) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Bible books." },
      { status: 500 },
    );
  }
}
