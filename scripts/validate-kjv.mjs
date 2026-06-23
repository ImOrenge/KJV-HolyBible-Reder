import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs, resolveDatabaseUrl, runPsql } from "./phase5-common.mjs";

const args = parseArgs(process.argv);
const databaseUrl = resolveDatabaseUrl(args);
const jsonlPath = resolve(args.jsonl ?? process.env.KJV_NORMALIZED_JSONL ?? "data/crosswire/kjv/normalized/kjv-verses.jsonl");
const reportPath = resolve(args.report ?? "reports/kjv-import-validation.md");
const errorsPath = resolve(args.errors ?? "reports/kjv-import-errors.json");
const expectedVerseCount = 31102;
const expectedChapterCount = 1189;
const expectedBookCount = 66;
const normalizedRows = existsSync(jsonlPath)
  ? readFileSync(jsonlPath, "utf8").split(/\r?\n/).filter(Boolean).length
  : null;

const validationSql = `
with stats as (
  select
    (select count(*) from public.bible_books)::int as book_count,
    (select count(*) filter (where testament = 'OT') from public.bible_books)::int as ot_book_count,
    (select count(*) filter (where testament = 'NT') from public.bible_books)::int as nt_book_count,
    (select coalesce(sum(chapter_count), 0) from public.bible_books)::int as expected_chapters_from_books,
    (select count(*) from public.bible_verses_en)::int as verse_count,
    (select count(distinct (book_order, chapter)) from public.bible_verses_en)::int as imported_chapter_count,
    (select count(distinct verse_key) from public.bible_verses_en)::int as distinct_verse_keys,
    (select count(*) from (
      select verse_key from public.bible_verses_en group by verse_key having count(*) > 1
    ) duplicate_verse_keys)::int as duplicate_verse_key_groups,
    (select count(*) from (
      select book_id, chapter, verse from public.bible_verses_en group by book_id, chapter, verse having count(*) > 1
    ) duplicate_locations)::int as duplicate_location_groups,
    (select count(*) from public.bible_verses_en where length(trim(text_en)) = 0)::int as empty_text_rows,
    (select count(*) from public.bible_verses_en where text_en ~ '<[A-Za-z][^>]*>')::int as markup_rows,
    (select count(*) from public.bible_verses_en where source_module is null or source_module_version is null or source_checksum is null)::int as missing_source_metadata_rows,
    (select count(*) from (
      select books.book_order, books.name_en, books.chapter_count, count(distinct verses.chapter) as imported_chapters
      from public.bible_books books
      left join public.bible_verses_en verses on verses.book_id = books.id
      group by books.book_order, books.name_en, books.chapter_count
      having count(distinct verses.chapter) <> books.chapter_count
    ) mismatched_books)::int as book_chapter_mismatch_count
),
samples as (
  select coalesce(jsonb_object_agg(verse_key, text_en), '{}'::jsonb) as sample_texts
  from public.bible_verses_en
  where verse_key in ('GEN.1.1', 'PSA.23.1', 'JHN.3.16', 'REV.22.21')
),
missing_samples as (
  select jsonb_agg(expected.key) filter (where verses.verse_key is null) as missing
  from (values ('GEN.1.1'), ('PSA.23.1'), ('JHN.3.16'), ('REV.22.21')) as expected(key)
  left join public.bible_verses_en verses on verses.verse_key = expected.key
)
select jsonb_build_object(
  'generatedAt', now(),
  'bookCount', stats.book_count,
  'otBookCount', stats.ot_book_count,
  'ntBookCount', stats.nt_book_count,
  'expectedChaptersFromBooks', stats.expected_chapters_from_books,
  'verseCount', stats.verse_count,
  'importedChapterCount', stats.imported_chapter_count,
  'distinctVerseKeys', stats.distinct_verse_keys,
  'duplicateVerseKeyGroups', stats.duplicate_verse_key_groups,
  'duplicateLocationGroups', stats.duplicate_location_groups,
  'emptyTextRows', stats.empty_text_rows,
  'markupRows', stats.markup_rows,
  'missingSourceMetadataRows', stats.missing_source_metadata_rows,
  'bookChapterMismatchCount', stats.book_chapter_mismatch_count,
  'sampleTexts', samples.sample_texts,
  'missingSamples', coalesce(missing_samples.missing, '[]'::jsonb)
)::text
from stats, samples, missing_samples;
`;

const output = runPsql(databaseUrl, ["-v", "ON_ERROR_STOP=1", "-tA", "-c", validationSql]);
const jsonLine = output.split(/\r?\n/).find((line) => line.trim().startsWith("{"));
if (!jsonLine) {
  throw new Error(`Could not parse validation JSON from psql output: ${output}`);
}

const result = JSON.parse(jsonLine);
result.normalizedRows = normalizedRows;

const checks = [
  ["Book rows", expectedBookCount, result.bookCount],
  ["OT book rows", 39, result.otBookCount],
  ["NT book rows", 27, result.ntBookCount],
  ["Chapter count from books", expectedChapterCount, result.expectedChaptersFromBooks],
  ["Imported chapters", expectedChapterCount, result.importedChapterCount],
  ["Verse rows", expectedVerseCount, result.verseCount],
  ["Normalized rows", expectedVerseCount, result.normalizedRows],
  ["Distinct verse keys", expectedVerseCount, result.distinctVerseKeys],
  ["Duplicate verse key groups", 0, result.duplicateVerseKeyGroups],
  ["Duplicate location groups", 0, result.duplicateLocationGroups],
  ["Empty text rows", 0, result.emptyTextRows],
  ["XML-like markup rows", 0, result.markupRows],
  ["Missing source metadata rows", 0, result.missingSourceMetadataRows],
  ["Book chapter mismatch count", 0, result.bookChapterMismatchCount],
  ["Missing sample verses", 0, result.missingSamples.length],
];

const errors = checks
  .filter(([, expected, actual]) => expected !== actual)
  .map(([name, expected, actual]) => ({ name, expected, actual }));

const sampleRows = ["GEN.1.1", "PSA.23.1", "JHN.3.16", "REV.22.21"]
  .map((key) => `| \`${key}\` | ${result.sampleTexts[key] ?? "MISSING"} |`)
  .join("\n");

const checkRows = checks
  .map(([name, expected, actual]) => `| ${name} | ${expected} | ${actual ?? "missing"} | ${expected === actual ? "PASS" : "FAIL"} |`)
  .join("\n");

const report = `# KJV Import Validation Report

Generated: ${new Date().toISOString()}

## Result

${errors.length === 0 ? "PASS" : "FAIL"}

## Checks

| Check | Expected | Actual | Status |
| --- | ---: | ---: | --- |
${checkRows}

## Samples

| Verse key | Text |
| --- | --- |
${sampleRows}

## Phase 5 Checklist

- [x] Normalized KJV file counted.
- [x] \`bible_books\` row count validated.
- [x] \`bible_verses_en\` row count validated.
- [x] 1,189 imported chapters validated.
- [x] Duplicate \`verse_key\` groups checked.
- [x] Duplicate book/chapter/verse groups checked.
- [x] Empty text rows checked.
- [x] XML-like markup residue checked.
- [x] Source metadata presence checked.
- [x] Sample verses checked.
`;

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report, "utf8");
writeFileSync(errorsPath, `${JSON.stringify({ errors, result }, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ status: errors.length === 0 ? "PASS" : "FAIL", errors: errors.length, reportPath, errorsPath }, null, 2));

if (errors.length > 0) {
  process.exitCode = 1;
}
