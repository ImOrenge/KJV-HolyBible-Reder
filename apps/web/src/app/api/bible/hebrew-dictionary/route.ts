import { jsonWithCors, optionsWithCors, publicContentCacheHeaders } from "@/lib/api/cors";
import {
  hebrewWordOccurrences,
  searchHebrewDictionary,
  type HebrewDictionaryEntrySummary,
  type HebrewDictionarySearchResponse,
  type HebrewDictionarySort,
  type HebrewLexiconEntry,
} from "@/lib/hebrew-dictionary";
import { supabaseRestRpc } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type HebrewDictionaryRpcRow = {
  entry_id: string;
  normalized_key: string;
  strong_number: string;
  lemma_he: string;
  lemma_he_normalized: string;
  transliteration: string;
  pronunciation_symbol: string;
  pronunciation_ko: string;
  latin_initial: string;
  hebrew_initial: string;
  gloss_en: string;
  gloss_ko: string;
  definition_en: string;
  definition_ko: string;
  interpretation_note_ko: string;
  morphology_summary: string;
  theme_ids: string[];
  app_book_ids: string[];
  first_verse_key: string | null;
  first_reference: string | null;
  source_name: string;
  source_license: string;
  total_count: number;
};

function canUseLocalDictionaryFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 50);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.trunc(parsed))) : 50;
}

function clampOffset(value: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function normalizeSort(value: string | null): HebrewDictionarySort {
  return value === "canonical" || value === "theme" ? value : "alphabetical";
}

function mapRpcRow(row: HebrewDictionaryRpcRow): HebrewDictionaryEntrySummary {
  const entry: HebrewLexiconEntry = {
    id: row.entry_id,
    normalizedKey: row.normalized_key,
    strongNumber: row.strong_number,
    lemmaHe: row.lemma_he,
    lemmaHeNormalized: row.lemma_he_normalized,
    transliteration: row.transliteration,
    pronunciationSymbol: row.pronunciation_symbol,
    pronunciationKo: row.pronunciation_ko,
    latinInitial: row.latin_initial,
    hebrewInitial: row.hebrew_initial,
    glossEn: row.gloss_en,
    glossKo: row.gloss_ko,
    definitionEn: row.definition_en,
    definitionKo: row.definition_ko,
    interpretationNoteKo: row.interpretation_note_ko,
    morphologySummary: row.morphology_summary,
    themeIds: row.theme_ids ?? [],
    sourceName: row.source_name,
    sourceLicense: row.source_license,
    status: "published",
  };
  const localOccurrences = hebrewWordOccurrences.filter((occurrence) => occurrence.normalizedKey === entry.normalizedKey);

  return {
    ...entry,
    appBookIds: row.app_book_ids ?? [],
    firstVerseKey: row.first_verse_key ?? undefined,
    firstReference: row.first_reference ?? undefined,
    sampleVerses: localOccurrences.slice(0, 3),
  };
}

function buildLocalFacets(entries: HebrewDictionaryEntrySummary[]) {
  const alphabet = new Map<string, number>();
  const themes = new Map<string, number>();
  const books = new Map<string, number>();

  for (const entry of entries) {
    alphabet.set(entry.latinInitial, (alphabet.get(entry.latinInitial) ?? 0) + 1);
    for (const themeId of entry.themeIds) {
      themes.set(themeId, (themes.get(themeId) ?? 0) + 1);
    }
    for (const bookId of entry.appBookIds) {
      books.set(bookId, (books.get(bookId) ?? 0) + 1);
    }
  }

  return {
    alphabet: Array.from(alphabet.entries()).map(([letter, count]) => ({ letter, count })),
    themes: Array.from(themes.entries()).map(([id, count]) => ({ id, titleKo: id, count })),
    books: Array.from(books.entries()).map(([bookId, count]) => ({ bookId, nameKo: bookId, count })),
  };
}

export function OPTIONS() {
  return optionsWithCors();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const alphabet = url.searchParams.get("alphabet") ?? "all";
  const theme = url.searchParams.get("theme") ?? "all";
  const bookId = url.searchParams.get("bookId") ?? "all";
  const sort = normalizeSort(url.searchParams.get("sort"));
  const limit = clampLimit(url.searchParams.get("limit"));
  const offset = clampOffset(url.searchParams.get("offset"));

  try {
    const rows = await supabaseRestRpc<HebrewDictionaryRpcRow[]>("search_hebrew_dictionary", {
      p_query: q.trim() || null,
      p_alphabet: alphabet,
      p_theme: theme,
      p_book_id: bookId,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    });
    const entries = rows.map(mapRpcRow);
    const total = Number(rows[0]?.total_count ?? entries.length);
    const response: HebrewDictionarySearchResponse = {
      query: q.trim(),
      alphabet,
      theme,
      bookId,
      sort,
      total,
      facets: buildLocalFacets(entries),
      entries,
    };

    return jsonWithCors(response, { headers: publicContentCacheHeaders });
  } catch (error) {
    if (canUseLocalDictionaryFallback()) {
      return jsonWithCors(
        searchHebrewDictionary({ q, alphabet, theme, bookId, sort, limit, offset }),
        { headers: publicContentCacheHeaders },
      );
    }

    return jsonWithCors(
      { error: error instanceof Error ? error.message : "Failed to search Hebrew dictionary." },
      { status: 500 },
    );
  }
}
