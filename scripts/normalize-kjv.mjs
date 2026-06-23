import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const expectedVerseCount = 31102;
const root = process.cwd();
const osisPath = `${root}/data/crosswire/kjv/raw/kjv.osis.xml`;
const bookMapPath = `${root}/data/crosswire/kjv/book-map.json`;
const sourceMetadataPath = `${root}/data/crosswire/kjv/source-metadata.json`;
const jsonlPath = `${root}/data/crosswire/kjv/normalized/kjv-verses.jsonl`;
const csvPath = `${root}/data/crosswire/kjv/normalized/kjv-verses.csv`;
const chapterCountsPath = `${root}/data/crosswire/kjv/normalized/kjv-chapter-counts.json`;
const reportPath = `${root}/reports/kjv-normalization-report.md`;

function ensureFileDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function write(path, content) {
  ensureFileDir(path);
  writeFileSync(path, content, "utf8");
}

function decodeXmlEntities(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function normalizeWhitespace(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function stripNonTextMarkup(value) {
  return decodeXmlEntities(
    value
      .replace(/<note\b[\s\S]*?<\/note>/g, "")
      .replace(/<title\b[\s\S]*?<\/title>/g, "")
      .replace(/<milestone\b[^>]*\/>/g, "")
      .replace(/<lb\b[^>]*\/>/g, " ")
      .replace(/<w\b[^>]*\/>/g, "")
      .replace(/<[^>]+>/g, ""),
  );
}

function csvValue(value) {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function parseOsisReference(reference) {
  const match = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(reference);
  if (!match) {
    return null;
  }

  return {
    osisBookId: match[1],
    chapter: Number(match[2]),
    verse: Number(match[3]),
  };
}

const bookMap = JSON.parse(readFileSync(bookMapPath, "utf8"));
const sourceMetadata = JSON.parse(readFileSync(sourceMetadataPath, "utf8"));
const booksByOsis = new Map(bookMap.books.map((book) => [book.osisBookId, book]));
const osis = readFileSync(osisPath, "utf8");
const versePattern = /<verse\b[^>]*osisID="([^"]+)"[^>]*sID="([^"]+)"[^>]*\/>([\s\S]*?)<verse\b[^>]*eID="\2"[^>]*\/>/g;

const rows = [];
const errors = [];
const seen = new Set();
const chapters = new Map();
let match;

while ((match = versePattern.exec(osis)) !== null) {
  const [, osisId, sId, body] = match;
  if (osisId !== sId) {
    errors.push({ type: "verse-id-mismatch", osisId, sId });
    continue;
  }

  const reference = parseOsisReference(osisId);
  if (!reference) {
    errors.push({ type: "invalid-osis-reference", osisId });
    continue;
  }

  const book = booksByOsis.get(reference.osisBookId);
  if (!book) {
    errors.push({ type: "unknown-book", osisId, osisBookId: reference.osisBookId });
    continue;
  }

  const textEn = normalizeWhitespace(stripNonTextMarkup(body));
  const verseKey = `${book.verseKeyCode}.${reference.chapter}.${reference.verse}`;

  if (seen.has(verseKey)) {
    errors.push({ type: "duplicate-verse-key", osisId, verseKey });
    continue;
  }

  if (!textEn) {
    errors.push({ type: "empty-text", osisId, verseKey });
    continue;
  }

  seen.add(verseKey);

  const row = {
    bookOrder: book.bookOrder,
    testament: book.testament,
    appBookId: book.appBookId,
    osisBookId: book.osisBookId,
    verseKeyCode: book.verseKeyCode,
    nameKo: book.nameKo,
    nameEn: book.nameEn,
    chapter: reference.chapter,
    verse: reference.verse,
    verseKey,
    osisRef: osisId,
    textEn,
    sourceName: sourceMetadata.sourceName,
    sourceModule: sourceMetadata.moduleName,
    sourceModuleVersion: sourceMetadata.moduleVersion,
    sourceVersionDate: sourceMetadata.moduleVersionDate,
    sourceLicense: sourceMetadata.distributionLicense,
    sourceChecksum: sourceMetadata.files.find((file) => file.path.endsWith("kjv.osis.xml"))?.sha256 ?? null,
    sourceCommit: sourceMetadata.gitSource.commit,
    sourceDownloadedAt: sourceMetadata.downloadedAt,
  };

  rows.push(row);
  const chapterKey = `${book.bookOrder}:${reference.chapter}`;
  chapters.set(chapterKey, (chapters.get(chapterKey) ?? 0) + 1);
}

rows.sort((left, right) => (
  left.bookOrder - right.bookOrder ||
  left.chapter - right.chapter ||
  left.verse - right.verse
));

const actualChapterKeys = new Set(chapters.keys());
const missingChapters = [];
for (const book of bookMap.books) {
  for (let chapter = 1; chapter <= book.chapterCount; chapter += 1) {
    const key = `${book.bookOrder}:${chapter}`;
    if (!actualChapterKeys.has(key)) {
      missingChapters.push({ appBookId: book.appBookId, osisBookId: book.osisBookId, chapter });
    }
  }
}

const leftoverMarkupRows = rows
  .filter((row) => /<\/?[A-Za-z][^>]*>/.test(row.textEn))
  .map((row) => row.verseKey);

const chapterCounts = bookMap.books.map((book) => ({
  bookOrder: book.bookOrder,
  appBookId: book.appBookId,
  osisBookId: book.osisBookId,
  nameEn: book.nameEn,
  chapterCount: book.chapterCount,
  importedChapters: Array.from({ length: book.chapterCount }, (_, index) => {
    const chapter = index + 1;
    return {
      chapter,
      verseCount: chapters.get(`${book.bookOrder}:${chapter}`) ?? 0,
    };
  }),
}));

const sampleKeys = ["GEN.1.1", "PSA.23.1", "JHN.3.16", "REV.22.21"];
const sampleRows = Object.fromEntries(
  sampleKeys.map((key) => [key, rows.find((row) => row.verseKey === key)?.textEn ?? null]),
);

write(jsonlPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
write(chapterCountsPath, `${JSON.stringify(chapterCounts, null, 2)}\n`);

const csvHeader = [
  "book_order",
  "testament",
  "app_book_id",
  "osis_book_id",
  "verse_key_code",
  "chapter",
  "verse",
  "verse_key",
  "osis_ref",
  "text_en",
  "source_name",
  "source_module",
  "source_module_version",
  "source_version_date",
  "source_license",
  "source_checksum",
  "source_commit",
  "source_downloaded_at",
];

const csvRows = rows.map((row) => [
  row.bookOrder,
  row.testament,
  row.appBookId,
  row.osisBookId,
  row.verseKeyCode,
  row.chapter,
  row.verse,
  row.verseKey,
  row.osisRef,
  row.textEn,
  row.sourceName,
  row.sourceModule,
  row.sourceModuleVersion,
  row.sourceVersionDate,
  row.sourceLicense,
  row.sourceChecksum,
  row.sourceCommit,
  row.sourceDownloadedAt,
].map(csvValue).join(","));

write(csvPath, `${csvHeader.join(",")}\n${csvRows.join("\n")}\n`);

const status = {
  verseCount: rows.length,
  expectedVerseCount,
  bookCount: new Set(rows.map((row) => row.bookOrder)).size,
  chapterCount: chapters.size,
  expectedChapterCount: 1189,
  errors: errors.length,
  missingChapters: missingChapters.length,
  leftoverMarkupRows: leftoverMarkupRows.length,
  duplicateVerseKeys: rows.length - seen.size,
};

const passed = status.verseCount === expectedVerseCount
  && status.bookCount === 66
  && status.chapterCount === 1189
  && status.errors === 0
  && status.missingChapters === 0
  && status.leftoverMarkupRows === 0
  && Object.values(sampleRows).every(Boolean);

const report = `# KJV Normalization Report

Generated: ${new Date().toISOString()}

## Source

- Source: ${sourceMetadata.sourceName}
- Module: ${sourceMetadata.moduleName}
- Module version: ${sourceMetadata.moduleVersion}
- Version date: ${sourceMetadata.moduleVersionDate}
- OSIS checksum: \`${status.verseCount ? rows[0].sourceChecksum : "n/a"}\`
- Git commit: \`${sourceMetadata.gitSource.commit}\`

## Outputs

- JSONL: \`data/crosswire/kjv/normalized/kjv-verses.jsonl\`
- CSV: \`data/crosswire/kjv/normalized/kjv-verses.csv\`
- Chapter counts: \`data/crosswire/kjv/normalized/kjv-chapter-counts.json\`

## Validation

| Check | Expected | Actual | Status |
| --- | ---: | ---: | --- |
| Verse rows | ${expectedVerseCount} | ${status.verseCount} | ${status.verseCount === expectedVerseCount ? "PASS" : "FAIL"} |
| Books | 66 | ${status.bookCount} | ${status.bookCount === 66 ? "PASS" : "FAIL"} |
| Chapters | 1,189 | ${status.chapterCount} | ${status.chapterCount === 1189 ? "PASS" : "FAIL"} |
| Parse errors | 0 | ${status.errors} | ${status.errors === 0 ? "PASS" : "FAIL"} |
| Missing chapters | 0 | ${status.missingChapters} | ${status.missingChapters === 0 ? "PASS" : "FAIL"} |
| Leftover XML-like markup rows | 0 | ${status.leftoverMarkupRows} | ${status.leftoverMarkupRows === 0 ? "PASS" : "FAIL"} |

## Samples

| Verse key | Text |
| --- | --- |
${sampleKeys.map((key) => `| \`${key}\` | ${sampleRows[key] ?? "MISSING"} |`).join("\n")}

## Phase 4 Checklist

- [x] CrossWire OSIS source read from pinned snapshot.
- [x] Canonical verse milestones extracted.
- [x] Notes, headings, milestones, Strong/morphology markup excluded from plain text.
- [x] JSONL generated.
- [x] CSV generated.
- [x] 66 books validated.
- [x] 1,189 chapters validated.
- [x] 31,102 verses validated.
- [x] Sample verse keys validated.

## Result

${passed ? "PASS" : "FAIL"}
`;

write(reportPath, report);

if (!passed) {
  console.error(JSON.stringify({ status, sampleRows, errors: errors.slice(0, 20), missingChapters: missingChapters.slice(0, 20), leftoverMarkupRows: leftoverMarkupRows.slice(0, 20) }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(status, null, 2));
}
