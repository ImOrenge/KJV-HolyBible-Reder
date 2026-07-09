import { jsonWithCors, optionsWithCors } from "@/lib/api/cors";
import { buildVerseKey } from "@/lib/bible-client";
import { fixtureVerses } from "@/lib/bible-data";
import { mapVerseRow, mergeApprovedKoRows, type BibleVerseEnRow, type BibleVerseKoRow } from "@/lib/bible-db-mappers";
import type { BibleVerseResponse } from "@/lib/bible-api-types";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    verseKey: string;
  }>;
};

export function OPTIONS() {
  return optionsWithCors();
}

function canUseLocalBibleFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

function localVerseResponse(verseKey: string): BibleVerseResponse | null {
  const normalizedKey = verseKey.toUpperCase();
  const verse = fixtureVerses.find((item) => (
    item.id.toUpperCase() === normalizedKey
    || buildVerseKey(item.bookId, item.chapter, item.verse).toUpperCase() === normalizedKey
  ));

  return verse
    ? {
        source: {
          name: "Local fixture",
          module: "KJV fixture",
          version: "dev",
        },
        verse,
      }
    : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { verseKey } = await context.params;
    const [row] = await supabaseRestGet<BibleVerseEnRow[]>(
      [
        "bible_verses_en?select=app_book_id,chapter,verse,verse_key,text_en,source_name,source_module,source_module_version",
        `verse_key=eq.${encodeFilterValue(verseKey)}`,
        "limit=1",
      ].join("&"),
    );

    if (!row) {
      return jsonWithCors({ error: "Bible verse not found." }, { status: 404 });
    }

    const koRows = await supabaseRestGet<BibleVerseKoRow[]>(
      [
        "bible_verses_ko?select=verse_key,text_ko,translation_name,translation_status,is_public,updated_at",
        `verse_key=eq.${encodeFilterValue(verseKey)}`,
        "translation_status=eq.approved",
        "is_public=eq.true",
        "order=updated_at.desc",
        "limit=10",
      ].join("&"),
    );

    const response: BibleVerseResponse = {
      verse: mergeApprovedKoRows([mapVerseRow(row)], koRows)[0],
      source: {
        name: row.source_name,
        module: row.source_module,
        version: row.source_module_version,
      },
    };

    return jsonWithCors(response);
  } catch (error) {
    const { verseKey } = await context.params;
    const fallback = canUseLocalBibleFallback() ? localVerseResponse(verseKey) : null;
    if (fallback) {
      return jsonWithCors(fallback);
    }

    return jsonWithCors(
      { error: error instanceof Error ? error.message : "Failed to load Bible verse." },
      { status: 500 },
    );
  }
}
