import { jsonWithCors, optionsWithCors } from "@/lib/api/cors";
import { hebrewLexiconEntries, hebrewWordOccurrences } from "@/lib/hebrew-dictionary";
import { encodeFilterValue, supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type HebrewEntryRow = {
  id: string;
  normalized_key: string;
  strong_number: string | null;
  lemma_he: string;
  lemma_he_normalized: string;
  transliteration: string;
  pronunciation_symbol: string | null;
  pronunciation_ko: string | null;
  latin_initial: string;
  hebrew_initial: string | null;
  gloss_en: string;
  gloss_ko: string;
  definition_en: string | null;
  definition_ko: string;
  interpretation_note_ko: string | null;
  morphology_summary: string | null;
  source_name: string;
  source_license: string;
  status: "draft" | "reviewing" | "published" | "archived";
};

type HebrewOccurrenceRow = {
  id: string;
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

const entrySelect = [
  "id",
  "normalized_key",
  "strong_number",
  "lemma_he",
  "lemma_he_normalized",
  "transliteration",
  "pronunciation_symbol",
  "pronunciation_ko",
  "latin_initial",
  "hebrew_initial",
  "gloss_en",
  "gloss_ko",
  "definition_en",
  "definition_ko",
  "interpretation_note_ko",
  "morphology_summary",
  "source_name",
  "source_license",
  "status",
].join(",");

const occurrenceSelect = [
  "id",
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapEntry(row: HebrewEntryRow) {
  return {
    id: row.id,
    normalizedKey: row.normalized_key,
    strongNumber: row.strong_number ?? "",
    lemmaHe: row.lemma_he,
    lemmaHeNormalized: row.lemma_he_normalized,
    transliteration: row.transliteration,
    pronunciationSymbol: row.pronunciation_symbol ?? row.transliteration,
    pronunciationKo: row.pronunciation_ko ?? "",
    latinInitial: row.latin_initial,
    hebrewInitial: row.hebrew_initial ?? "",
    glossEn: row.gloss_en,
    glossKo: row.gloss_ko,
    definitionEn: row.definition_en ?? "",
    definitionKo: row.definition_ko,
    interpretationNoteKo: row.interpretation_note_ko ?? "",
    morphologySummary: row.morphology_summary ?? "",
    themeIds: [],
    sourceName: row.source_name,
    sourceLicense: row.source_license,
    status: row.status,
  };
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

async function fetchEntry(entryId: string) {
  const normalizedKey = entryId.startsWith("hebrew-") ? entryId.slice("hebrew-".length) : entryId;
  const byKey = await supabaseRestGet<HebrewEntryRow[]>(
    `hebrew_lexicon_entries?select=${entrySelect}&normalized_key=eq.${encodeFilterValue(normalizedKey)}&status=eq.published&limit=1`,
  );

  if (byKey[0]) {
    return byKey[0];
  }

  if (!isUuid(entryId)) {
    return null;
  }

  const byId = await supabaseRestGet<HebrewEntryRow[]>(
    `hebrew_lexicon_entries?select=${entrySelect}&id=eq.${encodeFilterValue(entryId)}&status=eq.published&limit=1`,
  );
  return byId[0] ?? null;
}

export function OPTIONS() {
  return optionsWithCors();
}

export async function GET(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;

  try {
    const row = await fetchEntry(entryId);
    if (!row) {
      return jsonWithCors({ error: "히브리어 사전 항목을 찾을 수 없습니다." }, { status: 404 });
    }

    const occurrenceRows = await supabaseRestGet<HebrewOccurrenceRow[]>(
      `hebrew_word_occurrences?select=${occurrenceSelect}&lexicon_entry_id=eq.${encodeFilterValue(row.id)}&order=book_order.asc,chapter.asc,verse.asc,display_priority.asc`,
    );

    return jsonWithCors({
      entry: mapEntry(row),
      occurrences: occurrenceRows.map((occurrence) => mapOccurrence(occurrence, row.normalized_key)),
    });
  } catch (error) {
    if (!canUseLocalDictionaryFallback()) {
      return jsonWithCors(
        { error: error instanceof Error ? error.message : "히브리어 사전 항목을 불러오지 못했습니다." },
        { status: 500 },
      );
    }
  }

  const entry = hebrewLexiconEntries.find((item) => item.id === entryId || item.normalizedKey === entryId || `hebrew-${item.normalizedKey}` === entryId);

  if (!entry || entry.status !== "published") {
    return jsonWithCors({ error: "히브리어 사전 항목을 찾을 수 없습니다." }, { status: 404 });
  }

  return jsonWithCors({
    entry,
    occurrences: hebrewWordOccurrences.filter((occurrence) => occurrence.normalizedKey === entry.normalizedKey),
  });
}
