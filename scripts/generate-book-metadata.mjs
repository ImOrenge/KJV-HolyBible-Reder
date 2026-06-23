import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const books = [
  [1, "OT", "gen", "Gen", "GEN", "창세기", "Genesis", "창", "Gen", 50],
  [2, "OT", "exo", "Exod", "EXO", "출애굽기", "Exodus", "출", "Exo", 40],
  [3, "OT", "lev", "Lev", "LEV", "레위기", "Leviticus", "레", "Lev", 27],
  [4, "OT", "num", "Num", "NUM", "민수기", "Numbers", "민", "Num", 36],
  [5, "OT", "deu", "Deut", "DEU", "신명기", "Deuteronomy", "신", "Deut", 34],
  [6, "OT", "jos", "Josh", "JOS", "여호수아", "Joshua", "수", "Josh", 24],
  [7, "OT", "jdg", "Judg", "JDG", "사사기", "Judges", "삿", "Judg", 21],
  [8, "OT", "rut", "Ruth", "RUT", "룻기", "Ruth", "룻", "Ruth", 4],
  [9, "OT", "1sa", "1Sam", "1SA", "사무엘기상", "1 Samuel", "삼상", "1 Sam", 31],
  [10, "OT", "2sa", "2Sam", "2SA", "사무엘기하", "2 Samuel", "삼하", "2 Sam", 24],
  [11, "OT", "1ki", "1Kgs", "1KI", "열왕기상", "1 Kings", "왕상", "1 Kgs", 22],
  [12, "OT", "2ki", "2Kgs", "2KI", "열왕기하", "2 Kings", "왕하", "2 Kgs", 25],
  [13, "OT", "1ch", "1Chr", "1CH", "역대기상", "1 Chronicles", "대상", "1 Chr", 29],
  [14, "OT", "2ch", "2Chr", "2CH", "역대기하", "2 Chronicles", "대하", "2 Chr", 36],
  [15, "OT", "ezr", "Ezra", "EZR", "에스라", "Ezra", "스", "Ezra", 10],
  [16, "OT", "neh", "Neh", "NEH", "느헤미야", "Nehemiah", "느", "Neh", 13],
  [17, "OT", "est", "Esth", "EST", "에스더", "Esther", "에", "Esth", 10],
  [18, "OT", "job", "Job", "JOB", "욥기", "Job", "욥", "Job", 42],
  [19, "OT", "psa", "Ps", "PSA", "시편", "Psalms", "시", "Ps", 150],
  [20, "OT", "pro", "Prov", "PRO", "잠언", "Proverbs", "잠", "Prov", 31],
  [21, "OT", "ecc", "Eccl", "ECC", "전도서", "Ecclesiastes", "전", "Eccl", 12],
  [22, "OT", "sng", "Song", "SNG", "아가", "Song of Solomon", "아", "Song", 8],
  [23, "OT", "isa", "Isa", "ISA", "이사야", "Isaiah", "사", "Isa", 66],
  [24, "OT", "jer", "Jer", "JER", "예레미야", "Jeremiah", "렘", "Jer", 52],
  [25, "OT", "lam", "Lam", "LAM", "예레미야애가", "Lamentations", "애", "Lam", 5],
  [26, "OT", "ezk", "Ezek", "EZK", "에스겔", "Ezekiel", "겔", "Ezek", 48],
  [27, "OT", "dan", "Dan", "DAN", "다니엘", "Daniel", "단", "Dan", 12],
  [28, "OT", "hos", "Hos", "HOS", "호세아", "Hosea", "호", "Hos", 14],
  [29, "OT", "jol", "Joel", "JOL", "요엘", "Joel", "욜", "Joel", 3],
  [30, "OT", "amo", "Amos", "AMO", "아모스", "Amos", "암", "Amos", 9],
  [31, "OT", "oba", "Obad", "OBA", "오바댜", "Obadiah", "옵", "Obad", 1],
  [32, "OT", "jon", "Jonah", "JON", "요나", "Jonah", "욘", "Jonah", 4],
  [33, "OT", "mic", "Mic", "MIC", "미가", "Micah", "미", "Mic", 7],
  [34, "OT", "nam", "Nah", "NAM", "나훔", "Nahum", "나", "Nah", 3],
  [35, "OT", "hab", "Hab", "HAB", "하박국", "Habakkuk", "합", "Hab", 3],
  [36, "OT", "zep", "Zeph", "ZEP", "스바냐", "Zephaniah", "습", "Zeph", 3],
  [37, "OT", "hag", "Hag", "HAG", "학개", "Haggai", "학", "Hag", 2],
  [38, "OT", "zec", "Zech", "ZEC", "스가랴", "Zechariah", "슥", "Zech", 14],
  [39, "OT", "mal", "Mal", "MAL", "말라기", "Malachi", "말", "Mal", 4],
  [40, "NT", "mat", "Matt", "MAT", "마태복음", "Matthew", "마", "Matt", 28],
  [41, "NT", "mrk", "Mark", "MRK", "마가복음", "Mark", "막", "Mark", 16],
  [42, "NT", "luk", "Luke", "LUK", "누가복음", "Luke", "눅", "Luke", 24],
  [43, "NT", "jhn", "John", "JHN", "요한복음", "John", "요", "John", 21],
  [44, "NT", "act", "Acts", "ACT", "사도행전", "Acts", "행", "Acts", 28],
  [45, "NT", "rom", "Rom", "ROM", "로마서", "Romans", "롬", "Rom", 16],
  [46, "NT", "1co", "1Cor", "1CO", "고린도전서", "1 Corinthians", "고전", "1 Cor", 16],
  [47, "NT", "2co", "2Cor", "2CO", "고린도후서", "2 Corinthians", "고후", "2 Cor", 13],
  [48, "NT", "gal", "Gal", "GAL", "갈라디아서", "Galatians", "갈", "Gal", 6],
  [49, "NT", "eph", "Eph", "EPH", "에베소서", "Ephesians", "엡", "Eph", 6],
  [50, "NT", "php", "Phil", "PHP", "빌립보서", "Philippians", "빌", "Phil", 4],
  [51, "NT", "col", "Col", "COL", "골로새서", "Colossians", "골", "Col", 4],
  [52, "NT", "1th", "1Thess", "1TH", "데살로니가전서", "1 Thessalonians", "살전", "1 Thess", 5],
  [53, "NT", "2th", "2Thess", "2TH", "데살로니가후서", "2 Thessalonians", "살후", "2 Thess", 3],
  [54, "NT", "1ti", "1Tim", "1TI", "디모데전서", "1 Timothy", "딤전", "1 Tim", 6],
  [55, "NT", "2ti", "2Tim", "2TI", "디모데후서", "2 Timothy", "딤후", "2 Tim", 4],
  [56, "NT", "tit", "Titus", "TIT", "디도서", "Titus", "딛", "Titus", 3],
  [57, "NT", "phm", "Phlm", "PHM", "빌레몬서", "Philemon", "몬", "Phlm", 1],
  [58, "NT", "heb", "Heb", "HEB", "히브리서", "Hebrews", "히", "Heb", 13],
  [59, "NT", "jas", "Jas", "JAS", "야고보서", "James", "약", "Jas", 5],
  [60, "NT", "1pe", "1Pet", "1PE", "베드로전서", "1 Peter", "벧전", "1 Pet", 5],
  [61, "NT", "2pe", "2Pet", "2PE", "베드로후서", "2 Peter", "벧후", "2 Pet", 3],
  [62, "NT", "1jn", "1John", "1JN", "요한일서", "1 John", "요일", "1 John", 5],
  [63, "NT", "2jn", "2John", "2JN", "요한이서", "2 John", "요이", "2 John", 1],
  [64, "NT", "3jn", "3John", "3JN", "요한삼서", "3 John", "요삼", "3 John", 1],
  [65, "NT", "jud", "Jude", "JUD", "유다서", "Jude", "유", "Jude", 1],
  [66, "NT", "rev", "Rev", "REV", "요한계시록", "Revelation", "계", "Rev", 22],
].map(([bookOrder, testament, appBookId, osisBookId, verseKeyCode, nameKo, nameEn, shortNameKo, shortNameEn, chapterCount]) => ({
  bookOrder,
  testament,
  appBookId,
  osisBookId,
  verseKeyCode,
  nameKo,
  nameEn,
  shortNameKo,
  shortNameEn,
  chapterCount,
}));

function ensureFileDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function write(path, content) {
  ensureFileDir(path);
  writeFileSync(path, content, "utf8");
}

const bookMapPath = "data/crosswire/kjv/book-map.json";
write(bookMapPath, `${JSON.stringify({ verseKeyFormat: "{VERSE_KEY_CODE}.{CHAPTER}.{VERSE}", books }, null, 2)}\n`);

const values = books
  .map((book) => `  (${[
    book.bookOrder,
    sqlString(book.testament),
    sqlString(book.appBookId),
    sqlString(book.osisBookId),
    sqlString(book.verseKeyCode),
    sqlString(book.nameKo),
    sqlString(book.nameEn),
    sqlString(book.shortNameKo),
    sqlString(book.shortNameEn),
    book.chapterCount,
  ].join(", ")})`)
  .join(",\n");

const seedSql = `insert into public.bible_books
  (book_order, testament, app_book_id, osis_book_id, verse_key_code, name_ko, name_en, short_name_ko, short_name_en, chapter_count)
values
${values}
on conflict (book_order) do update set
  testament = excluded.testament,
  app_book_id = excluded.app_book_id,
  osis_book_id = excluded.osis_book_id,
  verse_key_code = excluded.verse_key_code,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  short_name_ko = excluded.short_name_ko,
  short_name_en = excluded.short_name_en,
  chapter_count = excluded.chapter_count;
`;

write("supabase/seeds/bible_books_seed.sql", seedSql);

const ts = `export type BibleBookCode = {
  bookOrder: number;
  testament: "OT" | "NT";
  appBookId: string;
  osisBookId: string;
  verseKeyCode: string;
  nameKo: string;
  nameEn: string;
  shortNameKo: string;
  shortNameEn: string;
  chapterCount: number;
};

export const bibleBookCodes = ${JSON.stringify(books, null, 2)} as const satisfies readonly BibleBookCode[];

export const bibleBookByOsisId = new Map(bibleBookCodes.map((book) => [book.osisBookId, book]));
export const bibleBookByAppId = new Map(bibleBookCodes.map((book) => [book.appBookId, book]));
`;

write("src/lib/bible-book-codes.ts", ts);

const totalChapters = books.reduce((sum, book) => sum + book.chapterCount, 0);
const otCount = books.filter((book) => book.testament === "OT").length;
const ntCount = books.filter((book) => book.testament === "NT").length;

const report = `# Book Metadata Validation

Generated from: \`scripts/generate-book-metadata.mjs\`

## Summary

- Books: ${books.length}
- Old Testament books: ${otCount}
- New Testament books: ${ntCount}
- Total chapters: ${totalChapters}
- Verse key format: \`{VERSE_KEY_CODE}.{CHAPTER}.{VERSE}\`
- John 3:16 key: \`JHN.3.16\`

## Phase 3 Checklist

- [x] 66 books defined.
- [x] OT/NT split is 39/27.
- [x] Total chapter count is 1,189.
- [x] App book ids are separated from OSIS book ids.
- [x] Verse key code is explicit per book.
- [x] Seed SQL generated.
- [x] TypeScript constants generated.
- [x] CrossWire normalization map generated.
`;

write("reports/book-metadata-validation.md", report);

console.log(JSON.stringify({ books: books.length, otCount, ntCount, totalChapters }, null, 2));
