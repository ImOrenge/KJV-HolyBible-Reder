import { bibleBookByAppId, type AppBookId } from "./bible-book-codes";
import type { Verse } from "./types";

export type HebrewDictionarySort = "alphabetical" | "canonical" | "theme";

export type HebrewDictionaryTheme = {
  id: string;
  titleKo: string;
  descriptionKo: string;
  displayOrder: number;
};

export type HebrewWordOccurrence = {
  id: string;
  normalizedKey: string;
  verseKey: string;
  appBookId: string;
  bookOrder: number;
  chapter: number;
  verse: number;
  surfaceHe: string;
  transliteration: string;
  kjvMatchText?: string;
  koMatchText?: string;
  phraseEn?: string;
  phraseKo?: string;
  displayPriority: number;
};

export type HebrewLexiconEntry = {
  id: string;
  normalizedKey: string;
  strongNumber: string;
  lemmaHe: string;
  lemmaHeNormalized: string;
  transliteration: string;
  pronunciationSymbol: string;
  pronunciationKo: string;
  latinInitial: string;
  hebrewInitial: string;
  glossEn: string;
  glossKo: string;
  definitionEn: string;
  definitionKo: string;
  interpretationNoteKo: string;
  morphologySummary: string;
  themeIds: string[];
  sourceName: string;
  sourceLicense: string;
  status: "draft" | "reviewing" | "published" | "archived";
};

export type HebrewDictionaryEntrySummary = HebrewLexiconEntry & {
  sampleVerses: HebrewWordOccurrence[];
  appBookIds: string[];
  firstVerseKey?: string;
  firstReference?: string;
};

export type HebrewDictionarySearchParams = {
  q?: string;
  alphabet?: string;
  theme?: string;
  bookId?: string;
  sort?: HebrewDictionarySort;
  limit?: number;
  offset?: number;
};

export type HebrewDictionarySearchResponse = {
  query: string;
  alphabet: string;
  theme: string;
  bookId: string;
  sort: HebrewDictionarySort;
  total: number;
  facets: {
    alphabet: Array<{ letter: string; count: number }>;
    themes: Array<{ id: string; titleKo: string; count: number }>;
    books: Array<{ bookId: string; nameKo: string; count: number }>;
  };
  entries: HebrewDictionaryEntrySummary[];
};

export const hebrewDictionaryThemes: HebrewDictionaryTheme[] = [
  {
    id: "biblical-world-structure",
    titleKo: "성경속 세상의 구조",
    descriptionKo: "하늘, 땅, 물, 빛, 어둠처럼 성경의 세계 묘사를 이루는 기본 어휘",
    displayOrder: 10,
  },
  {
    id: "genesis-primeval",
    titleKo: "창세기 1-11장",
    descriptionKo: "창조, 타락, 홍수, 민족 기원의 핵심어",
    displayOrder: 20,
  },
  {
    id: "genesis-patriarchs",
    titleKo: "창세기 12-50장",
    descriptionKo: "족장 이야기의 언약, 복, 땅, 후손 어휘",
    displayOrder: 30,
  },
  {
    id: "isaiah-core",
    titleKo: "이사야 핵심어",
    descriptionKo: "심판, 거룩함, 회복, 종의 언어",
    displayOrder: 40,
  },
];

export const hebrewLexiconEntries: HebrewLexiconEntry[] = [
  {
    id: "hebrew-reshith",
    normalizedKey: "reshith",
    strongNumber: "H7225",
    lemmaHe: "רֵאשִׁית",
    lemmaHeNormalized: "ראשית",
    transliteration: "reshith",
    pronunciationSymbol: "reshith",
    pronunciationKo: "레쉬트",
    latinInitial: "R",
    hebrewInitial: "ר",
    glossEn: "beginning, first",
    glossKo: "시작, 처음",
    definitionEn: "The beginning or first part of an ordered sequence.",
    definitionKo: "시작이나 첫머리를 가리키는 말이다.",
    interpretationNoteKo: "창세기 1:1에서는 창조 사건의 출발점을 가리킨다.",
    morphologySummary: "명사",
    themeIds: ["genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
  {
    id: "hebrew-bara",
    normalizedKey: "bara",
    strongNumber: "H1254",
    lemmaHe: "בָּרָא",
    lemmaHeNormalized: "ברא",
    transliteration: "bara",
    pronunciationSymbol: "bara",
    pronunciationKo: "바라",
    latinInitial: "B",
    hebrewInitial: "ב",
    glossEn: "create",
    glossKo: "창조하다",
    definitionEn: "To bring into being or shape by divine action in the creation account.",
    definitionKo: "하나님의 창조 행위를 나타내는 동사다.",
    interpretationNoteKo: "창세기 1장의 시작에서 하나님이 하늘과 땅을 창조하신 행위를 말한다.",
    morphologySummary: "동사",
    themeIds: ["genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
  {
    id: "hebrew-elohim",
    normalizedKey: "elohim",
    strongNumber: "H430",
    lemmaHe: "אֱלֹהִים",
    lemmaHeNormalized: "אלהים",
    transliteration: "elohim",
    pronunciationSymbol: "elohim",
    pronunciationKo: "엘로힘",
    latinInitial: "E",
    hebrewInitial: "א",
    glossEn: "God",
    glossKo: "하나님",
    definitionEn: "A common Hebrew designation for God, used prominently in Genesis 1.",
    definitionKo: "하나님을 가리키는 대표적인 히브리어 명칭이다.",
    interpretationNoteKo: "창세기 1장에서는 창조의 주체로 반복해서 등장한다.",
    morphologySummary: "명사",
    themeIds: ["genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
  {
    id: "hebrew-shamayim",
    normalizedKey: "shamayim",
    strongNumber: "H8064",
    lemmaHe: "שָׁמַיִם",
    lemmaHeNormalized: "שמים",
    transliteration: "shamayim",
    pronunciationSymbol: "shamayim",
    pronunciationKo: "샤마임",
    latinInitial: "S",
    hebrewInitial: "ש",
    glossEn: "heavens, sky",
    glossKo: "하늘",
    definitionEn: "The heavens or sky, often paired with the earth.",
    definitionKo: "하늘 또는 하늘들을 가리키며 땅과 짝을 이루어 쓰인다.",
    interpretationNoteKo: "창세기 1:1에서는 땅과 함께 창조 세계 전체를 포괄한다.",
    morphologySummary: "명사",
    themeIds: ["biblical-world-structure", "genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
  {
    id: "hebrew-erets",
    normalizedKey: "erets",
    strongNumber: "H776",
    lemmaHe: "אֶרֶץ",
    lemmaHeNormalized: "ארץ",
    transliteration: "erets",
    pronunciationSymbol: "erets",
    pronunciationKo: "에레츠",
    latinInitial: "E",
    hebrewInitial: "א",
    glossEn: "earth, land",
    glossKo: "땅, 땅덩어리",
    definitionEn: "Earth, land, or territory depending on context.",
    definitionKo: "문맥에 따라 땅, 땅덩어리, 지역을 가리킨다.",
    interpretationNoteKo: "창세기 1:1에서는 하늘과 함께 창조된 세계를 표현한다.",
    morphologySummary: "명사",
    themeIds: ["biblical-world-structure", "genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
  {
    id: "hebrew-or",
    normalizedKey: "or",
    strongNumber: "H216",
    lemmaHe: "אוֹר",
    lemmaHeNormalized: "אור",
    transliteration: "or",
    pronunciationSymbol: "or",
    pronunciationKo: "오르",
    latinInitial: "O",
    hebrewInitial: "א",
    glossEn: "light",
    glossKo: "빛",
    definitionEn: "Light, especially as ordered over against darkness in Genesis 1.",
    definitionKo: "어둠과 구분되는 빛을 가리킨다.",
    interpretationNoteKo: "창세기 1:3-4에서 하나님이 빛을 부르시고 어둠과 나누신다.",
    morphologySummary: "명사",
    themeIds: ["biblical-world-structure", "genesis-primeval"],
    sourceName: "Strong's Hebrew / OSHB reference",
    sourceLicense: "Public Domain / CC BY 4.0 reference metadata",
    status: "published",
  },
];

export const hebrewWordOccurrences: HebrewWordOccurrence[] = [
  {
    id: "occ-reshith-gen-1-1",
    normalizedKey: "reshith",
    verseKey: "GEN.1.1",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 1,
    surfaceHe: "בְּרֵאשִׁית",
    transliteration: "bereshith",
    kjvMatchText: "In the beginning",
    koMatchText: "처음에",
    phraseEn: "In the beginning",
    phraseKo: "처음에",
    displayPriority: 10,
  },
  {
    id: "occ-bara-gen-1-1",
    normalizedKey: "bara",
    verseKey: "GEN.1.1",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 1,
    surfaceHe: "בָּרָא",
    transliteration: "bara",
    kjvMatchText: "created",
    koMatchText: "창조하셨다",
    phraseEn: "created",
    phraseKo: "창조하셨다",
    displayPriority: 20,
  },
  {
    id: "occ-elohim-gen-1-1",
    normalizedKey: "elohim",
    verseKey: "GEN.1.1",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 1,
    surfaceHe: "אֱלֹהִים",
    transliteration: "elohim",
    kjvMatchText: "God",
    koMatchText: "하나님",
    phraseEn: "God",
    phraseKo: "하나님",
    displayPriority: 30,
  },
  {
    id: "occ-shamayim-gen-1-1",
    normalizedKey: "shamayim",
    verseKey: "GEN.1.1",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 1,
    surfaceHe: "הַשָּׁמַיִם",
    transliteration: "hashamayim",
    kjvMatchText: "the heaven",
    koMatchText: "하늘",
    phraseEn: "the heaven",
    phraseKo: "하늘",
    displayPriority: 40,
  },
  {
    id: "occ-erets-gen-1-1",
    normalizedKey: "erets",
    verseKey: "GEN.1.1",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 1,
    surfaceHe: "הָאָרֶץ",
    transliteration: "haerets",
    kjvMatchText: "the earth",
    koMatchText: "땅",
    phraseEn: "the earth",
    phraseKo: "땅",
    displayPriority: 50,
  },
  {
    id: "occ-or-gen-1-3",
    normalizedKey: "or",
    verseKey: "GEN.1.3",
    appBookId: "gen",
    bookOrder: 1,
    chapter: 1,
    verse: 3,
    surfaceHe: "אוֹר",
    transliteration: "or",
    kjvMatchText: "light",
    koMatchText: "빛",
    phraseEn: "Let there be light",
    phraseKo: "빛이 있으라",
    displayPriority: 10,
  },
];

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function getEntryOccurrences(entry: HebrewLexiconEntry) {
  return hebrewWordOccurrences
    .filter((occurrence) => occurrence.normalizedKey === entry.normalizedKey)
    .sort((left, right) => left.bookOrder - right.bookOrder || left.chapter - right.chapter || left.verse - right.verse);
}

function getEntrySearchText(entry: HebrewLexiconEntry, occurrences: HebrewWordOccurrence[]) {
  return [
    entry.normalizedKey,
    entry.strongNumber,
    entry.lemmaHe,
    entry.lemmaHeNormalized,
    entry.transliteration,
    entry.pronunciationSymbol,
    entry.pronunciationKo,
    entry.glossEn,
    entry.glossKo,
    entry.definitionEn,
    entry.definitionKo,
    entry.interpretationNoteKo,
    occurrences.map((occurrence) => `${occurrence.surfaceHe} ${occurrence.transliteration} ${occurrence.phraseEn ?? ""} ${occurrence.phraseKo ?? ""}`).join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase("ko-KR");
}

function summarizeEntry(entry: HebrewLexiconEntry): HebrewDictionaryEntrySummary {
  const occurrences = getEntryOccurrences(entry);
  const firstOccurrence = occurrences[0];
  const appBookIds = Array.from(new Set(occurrences.map((occurrence) => occurrence.appBookId)));

  return {
    ...entry,
    appBookIds,
    firstVerseKey: firstOccurrence?.verseKey,
    firstReference: firstOccurrence ? formatHebrewDictionaryReference(firstOccurrence) : undefined,
    sampleVerses: occurrences.slice(0, 3),
  };
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function formatHebrewDictionaryReference(occurrence: Pick<HebrewWordOccurrence, "appBookId" | "chapter" | "verse">) {
  const book = bibleBookByAppId.get(occurrence.appBookId as AppBookId);
  const bookName = book ? book.shortNameKo : occurrence.appBookId;
  return `${bookName} ${occurrence.chapter}:${occurrence.verse}`;
}

export function searchHebrewDictionary(params: HebrewDictionarySearchParams = {}): HebrewDictionarySearchResponse {
  const query = normalizeSearchText(params.q ?? "");
  const alphabet = (params.alphabet ?? "all").toUpperCase();
  const theme = params.theme ?? "all";
  const bookId = params.bookId ?? "all";
  const sort = params.sort ?? "alphabetical";
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let summaries = hebrewLexiconEntries
    .filter((entry) => entry.status === "published")
    .map((entry) => {
      const occurrences = getEntryOccurrences(entry);
      return {
        summary: summarizeEntry(entry),
        searchText: getEntrySearchText(entry, occurrences),
      };
    });

  if (query) {
    summaries = summaries.filter(({ searchText }) => searchText.includes(query));
  }

  if (alphabet !== "ALL") {
    summaries = summaries.filter(({ summary }) => summary.latinInitial === alphabet);
  }

  if (theme !== "all") {
    summaries = summaries.filter(({ summary }) => summary.themeIds.includes(theme));
  }

  if (bookId !== "all") {
    summaries = summaries.filter(({ summary }) => summary.appBookIds.includes(bookId));
  }

  summaries = summaries.sort((left, right) => {
    if (sort === "canonical") {
      const leftFirst = left.summary.sampleVerses[0];
      const rightFirst = right.summary.sampleVerses[0];
      return (
        (leftFirst?.bookOrder ?? 999) - (rightFirst?.bookOrder ?? 999) ||
        (leftFirst?.chapter ?? 999) - (rightFirst?.chapter ?? 999) ||
        (leftFirst?.verse ?? 999) - (rightFirst?.verse ?? 999)
      );
    }

    if (sort === "theme" && theme !== "all") {
      return left.summary.themeIds.indexOf(theme) - right.summary.themeIds.indexOf(theme);
    }

    return left.summary.transliteration.localeCompare(right.summary.transliteration);
  });

  const entries = summaries.map(({ summary }) => summary);
  const pagedEntries = entries.slice(offset, offset + limit);
  const alphabetCounts = countBy(entries.map((entry) => entry.latinInitial));
  const themeCounts = countBy(entries.flatMap((entry) => entry.themeIds));
  const bookCounts = countBy(entries.flatMap((entry) => entry.appBookIds));

  return {
    query,
    alphabet,
    theme,
    bookId,
    sort,
    total: entries.length,
    facets: {
      alphabet: Array.from(alphabetCounts.entries())
        .map(([letter, count]) => ({ letter, count }))
        .sort((left, right) => left.letter.localeCompare(right.letter)),
      themes: hebrewDictionaryThemes
        .map((dictionaryTheme) => ({
          id: dictionaryTheme.id,
          titleKo: dictionaryTheme.titleKo,
          count: themeCounts.get(dictionaryTheme.id) ?? 0,
        }))
        .filter((facet) => facet.count > 0),
      books: Array.from(bookCounts.entries()).map(([facetBookId, count]) => {
        const book = bibleBookByAppId.get(facetBookId as AppBookId);
        return { bookId: facetBookId, nameKo: book?.nameKo ?? facetBookId, count };
      }),
    },
    entries: pagedEntries,
  };
}

export function getHebrewOccurrencesForVerses(verses: Verse[]) {
  const verseKeys = new Set(verses.map((verse) => verse.verseKey ?? verse.id));
  return hebrewWordOccurrences
    .filter((occurrence) => verseKeys.has(occurrence.verseKey))
    .map((occurrence) => ({
      occurrence,
      entry: hebrewLexiconEntries.find((entry) => entry.normalizedKey === occurrence.normalizedKey && entry.status === "published"),
    }))
    .filter((item): item is { occurrence: HebrewWordOccurrence; entry: HebrewLexiconEntry } => Boolean(item.entry))
    .sort((left, right) => left.occurrence.displayPriority - right.occurrence.displayPriority);
}
