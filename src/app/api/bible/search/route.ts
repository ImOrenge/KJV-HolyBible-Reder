import { NextResponse } from "next/server";
import {
  mapVerseRow,
  mergeApprovedKoRows,
  type BibleVerseEnRow,
  type BibleVerseKoRow,
} from "@/lib/bible-db-mappers";
import type { BibleSearchResponse } from "@/lib/bible-api-types";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      const empty: BibleSearchResponse = {
        query,
        source: { name: "CrossWire KJV", module: "KJV", version: null },
        verses: [],
      };
      return NextResponse.json(empty);
    }

    const rows = await supabaseRestGet<BibleVerseEnRow[]>(
      [
        "bible_verses_en?select=app_book_id,chapter,verse,verse_key,text_en,source_name,source_module,source_module_version",
        `text_en=ilike.*${encodeFilterValue(query)}*`,
        "order=book_order.asc,chapter.asc,verse.asc",
        "limit=50",
      ].join("&"),
    );

    const verseKeyFilter = rows.map((row) => encodeFilterValue(row.verse_key)).join(",");
    const koRows = verseKeyFilter
      ? await supabaseRestGet<BibleVerseKoRow[]>(
          [
            "bible_verses_ko?select=verse_key,text_ko,translation_name,translation_status,is_public,updated_at",
            `verse_key=in.(${verseKeyFilter})`,
            "translation_status=eq.approved",
            "is_public=eq.true",
            "order=updated_at.desc",
          ].join("&"),
        )
      : [];

    const sourceRow = rows[0];
    const response: BibleSearchResponse = {
      query,
      source: {
        name: sourceRow?.source_name ?? "CrossWire KJV",
        module: sourceRow?.source_module ?? "KJV",
        version: sourceRow?.source_module_version ?? null,
      },
      verses: mergeApprovedKoRows(rows.map(mapVerseRow), koRows),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search Bible text." },
      { status: 500 },
    );
  }
}
