import { NextResponse } from "next/server";
import {
  mapKoSearchRow,
  mapVerseRow,
  mergeApprovedKoRows,
  type BibleVerseEnRow,
  type BibleVerseKoRow,
  type BibleVerseKoSearchRow,
} from "@/lib/bible-db-mappers";
import type { BibleSearchResponse, BibleSource } from "@/lib/bible-api-types";
import { getConfiguredPublicKoTranslationName } from "@/lib/public-ko-translation";
import { getBook } from "@/lib/bible-repository";
import {
  clampSearchLimit,
  clampSearchOffset,
  normalizeBibleSearchLanguage,
  normalizeBibleSearchQuery,
  normalizeBibleSearchSort,
  normalizeBookFilter,
  normalizeKoreanSearchText,
  normalizeTestamentFilter,
} from "@/lib/korean-search";
import { encodeFilterValue, supabaseRestGet, supabaseRestRpc } from "@/lib/supabase-rest";
import type { Verse } from "@/lib/types";

export const dynamic = "force-dynamic";

const defaultSource: BibleSource = { name: "CrossWire KJV", module: "KJV", version: null };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q") ?? "";
    const query = normalizeBibleSearchQuery(rawQuery);
    const lang = normalizeBibleSearchLanguage(url.searchParams.get("lang"));
    const sort = normalizeBibleSearchSort(url.searchParams.get("sort"));
    const testament = normalizeTestamentFilter(url.searchParams.get("testament"));
    const bookId = normalizeBookFilter(url.searchParams.get("bookId"));
    const limit = clampSearchLimit(url.searchParams.get("limit"));
    const offset = clampSearchOffset(url.searchParams.get("offset"));
    const translationName = url.searchParams.get("translation")?.trim() || getConfiguredPublicKoTranslationName();
    const compactQuery = normalizeKoreanSearchText(query, { compact: true });

    if (query.length > 80) {
      return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
    }

    if (compactQuery.length < 2) {
      const empty: BibleSearchResponse = {
        query,
        normalizedQuery: query,
        lang,
        sort,
        total: 0,
        source: defaultSource,
        verses: [],
      };
      return NextResponse.json(empty);
    }

    if (lang === "ko") {
      const response = await searchKorean({ query, translationName, testament, bookId, limit, offset, sort });
      return NextResponse.json(response);
    }

    if (lang === "all") {
      const [koResponse, enResponse] = await Promise.all([
        searchKorean({ query, translationName, testament, bookId, limit, offset, sort }),
        searchEnglish({ query, testament, bookId, limit, offset }),
      ]);
      const verses = mergeSearchResults(koResponse.verses, enResponse.verses).slice(0, limit);
      const response: BibleSearchResponse = {
        query,
        normalizedQuery: query,
        lang,
        sort,
        total: Math.max(koResponse.total ?? 0, verses.length),
        source: koResponse.source.name !== defaultSource.name ? koResponse.source : enResponse.source,
        verses,
      };
      return NextResponse.json(response);
    }

    const response = await searchEnglish({ query, testament, bookId, limit, offset });
    return NextResponse.json({ ...response, lang, sort });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search Bible text." },
      { status: 500 },
    );
  }
}

async function searchKorean({
  query,
  translationName,
  testament,
  bookId,
  limit,
  offset,
  sort,
}: {
  query: string;
  translationName: string;
  testament: "OT" | "NT" | null;
  bookId: string | null;
  limit: number;
  offset: number;
  sort: "canonical" | "relevance";
}): Promise<BibleSearchResponse> {
  const rows = await supabaseRestRpc<BibleVerseKoSearchRow[]>("search_bible_verses_ko", {
    p_query: query,
    p_translation_name: translationName,
    p_testament: testament,
    p_book_id: bookId,
    p_limit: limit,
    p_offset: offset,
    p_sort: sort,
  });
  const sourceRow = rows[0];

  return {
    query,
    normalizedQuery: normalizeKoreanSearchText(query),
    lang: "ko",
    sort,
    total: Number(sourceRow?.total_count ?? rows.length),
    source: {
      name: sourceRow?.source_name ?? defaultSource.name,
      module: sourceRow?.source_module ?? defaultSource.module,
      version: sourceRow?.source_module_version ?? defaultSource.version,
    },
    verses: rows.map(mapKoSearchRow),
  };
}

async function searchEnglish({
  query,
  testament,
  bookId,
  limit,
  offset,
}: {
  query: string;
  testament: "OT" | "NT" | null;
  bookId: string | null;
  limit: number;
  offset: number;
}): Promise<BibleSearchResponse> {
  const filters = [
    "bible_verses_en?select=app_book_id,book_order,chapter,verse,verse_key,text_en,source_name,source_module,source_module_version",
    `text_en=ilike.*${encodeFilterValue(query)}*`,
    bookId ? `app_book_id=eq.${encodeFilterValue(bookId)}` : "",
    testament === "OT" ? "book_order=lte.39" : "",
    testament === "NT" ? "book_order=gte.40" : "",
    "order=book_order.asc,chapter.asc,verse.asc",
    `limit=${limit}`,
    `offset=${offset}`,
  ].filter(Boolean);

  const rows = await supabaseRestGet<(BibleVerseEnRow & { book_order: number })[]>(filters.join("&"));

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

  return {
    query,
    normalizedQuery: query,
    lang: "en",
    sort: "canonical",
    total: rows.length,
    source: {
      name: sourceRow?.source_name ?? defaultSource.name,
      module: sourceRow?.source_module ?? defaultSource.module,
      version: sourceRow?.source_module_version ?? defaultSource.version,
    },
    verses: mergeApprovedKoRows(rows.map(mapVerseRow), koRows),
  };
}

function mergeSearchResults(primary: Verse[], secondary: Verse[]) {
  const byKey = new Map<string, Verse>();
  for (const verse of [...primary, ...secondary]) {
    byKey.set(verse.verseKey ?? verse.id, { ...byKey.get(verse.verseKey ?? verse.id), ...verse });
  }

  return Array.from(byKey.values()).sort((left, right) => {
    const leftBookOrder = getBook(left.bookId)?.order ?? 0;
    const rightBookOrder = getBook(right.bookId)?.order ?? 0;
    return leftBookOrder - rightBookOrder || left.chapter - right.chapter || left.verse - right.verse;
  });
}
