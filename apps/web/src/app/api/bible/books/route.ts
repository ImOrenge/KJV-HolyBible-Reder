import { jsonWithCors, optionsWithCors, publicContentCacheHeaders } from "@/lib/api/cors";
import { mapBookRow, type BibleBookRow } from "@/lib/bible-db-mappers";
import { getBooks } from "@/lib/bible-repository";
import { supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsWithCors();
}

function canUseLocalBibleFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

export async function GET() {
  try {
    const rows = await supabaseRestGet<BibleBookRow[]>(
      "bible_books?select=book_order,testament,app_book_id,name_ko,name_en,chapter_count&order=book_order.asc",
    );

    return jsonWithCors({ books: rows.map(mapBookRow) }, { headers: publicContentCacheHeaders });
  } catch (error) {
    if (canUseLocalBibleFallback()) {
      return jsonWithCors({ books: getBooks() }, { headers: publicContentCacheHeaders });
    }

    return jsonWithCors(
      { error: error instanceof Error ? error.message : "Failed to load Bible books." },
      { status: 500 },
    );
  }
}
