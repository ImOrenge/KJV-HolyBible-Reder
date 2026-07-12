import { jsonWithCors, optionsWithCors } from "@/lib/api/cors";
import { getHebrewOccurrencesForVerses } from "@/lib/hebrew-dictionary";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";
import type { Verse } from "@/lib/types";

export const dynamic = "force-dynamic";

type HebrewOccurrenceRow = {
  id: string;
  lexicon_entry_id: string;
  verse_key: string;
  app_book_id: string;
  book_order: number;
  chapter: number;
  verse: number;
  surface_he: string | null;
  transliteration: string | null;
  kjv_match_text: string | null;
  ko_match_text: string | null;
  phrase_en: string | null;
  phrase_ko: string | null;
  display_priority: number;
};

type HebrewEntryKeyRow = {
  id: string;
  normalized_key: string;
};

const occurrenceSelect = [
  "id",
  "lexicon_entry_id",
  "verse_key",
  "app_book_id",
  "book_order",
  "chapter",
  "verse",
  "surface_he",
  "transliteration",
  "kjv_match_text",
  "ko_match_text",
  "phrase_en",
  "phrase_ko",
  "display_priority",
].join(",");

function canUseLocalDictionaryFallback() {
  return process.env.NODE_ENV !== "production" || process.env.KJV_LOCAL_BIBLE_FALLBACK === "1";
}

function buildInFilter(values: string[]) {
  return `in.(${values.map(encodeFilterValue).join(",")})`;
}

function mapOccurrence(row: HebrewOccurrenceRow, normalizedKey: string) {
  return {
    id: row.id,
    normalizedKey,
    verseKey: row.verse_key,
    appBookId: row.app_book_id,
    bookOrder: row.book_order,
    chapter: row.chapter,
    verse: row.verse,
    surfaceHe: row.surface_he ?? "",
    transliteration: row.transliteration ?? "",
    kjvMatchText: row.kjv_match_text ?? undefined,
    koMatchText: row.ko_match_text ?? undefined,
    phraseEn: row.phrase_en ?? undefined,
    phraseKo: row.phrase_ko ?? undefined,
    displayPriority: row.display_priority,
  };
}

export function OPTIONS() {
  return optionsWithCors();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verseKeys = (url.searchParams.get("verseKeys") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (!verseKeys.length) {
    return jsonWithCors({ occurrences: [] });
  }

  try {
    const occurrenceRows = await supabaseRestGet<HebrewOccurrenceRow[]>(
      `hebrew_word_occurrences?select=${occurrenceSelect}&verse_key=${buildInFilter(verseKeys)}&order=book_order.asc,chapter.asc,verse.asc,display_priority.asc`,
    );
    const entryIds = [...new Set(occurrenceRows.map((row) => row.lexicon_entry_id))];
    const entryRows = entryIds.length
      ? await supabaseRestGet<HebrewEntryKeyRow[]>(
          `hebrew_lexicon_entries?select=id,normalized_key&id=${buildInFilter(entryIds)}&status=eq.published`,
        )
      : [];
    const normalizedKeyById = new Map(entryRows.map((entry) => [entry.id, entry.normalized_key]));

    return jsonWithCors({
      occurrences: occurrenceRows
        .map((row) => {
          const normalizedKey = normalizedKeyById.get(row.lexicon_entry_id);
          return normalizedKey ? mapOccurrence(row, normalizedKey) : null;
        })
        .filter(Boolean),
    });
  } catch (error) {
    if (!canUseLocalDictionaryFallback()) {
      return jsonWithCors(
        { error: error instanceof Error ? error.message : "히브리어 단어 출현 정보를 불러오지 못했습니다." },
        { status: 500 },
      );
    }
  }

  const pseudoVerses: Verse[] = verseKeys.map((verseKey) => ({
    id: verseKey,
    verseKey,
    bookId: "",
    chapter: 0,
    verse: 0,
    text: "",
    translation: "KJV",
  }));

  return jsonWithCors({ occurrences: getHebrewOccurrencesForVerses(pseudoVerses) });
}
