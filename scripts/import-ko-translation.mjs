import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { csvPathForPsql, parseArgs, resolveDatabaseUrl, runPsql, sqlString } from "./phase5-common.mjs";

const allowedStatuses = new Set(["draft", "ai_translated", "reviewing", "reviewed", "approved", "needs_check"]);
const args = parseArgs(process.argv);
const databaseUrl = resolveDatabaseUrl(args);
const jsonlPath = resolve(args.jsonl ?? "data/translations/ko/kjv-study-draft.jsonl");
const termsPath = resolve(args.terms ?? "supabase/seeds/translation_terms_seed.sql");
const tempCsvPath = resolve(".tmp/ko-translation-import.csv");
const tempSqlPath = resolve(".tmp/ko-translation-import.sql");
const defaultTranslationName = args["translation-name"] ?? "KJV Korean Study Translation";
const defaultStatus = args.status ?? "ai_translated";

if (!existsSync(jsonlPath)) {
  throw new Error(`Korean translation JSONL not found: ${jsonlPath}`);
}

if (!allowedStatuses.has(defaultStatus)) {
  throw new Error(`Invalid default translation status: ${defaultStatus}`);
}

if (args["seed-terms"] && existsSync(termsPath)) {
  runPsql(databaseUrl, ["-v", "ON_ERROR_STOP=1", "-f", termsPath]);
}

const rows = readFileSync(jsonlPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => parseDraftLine(line, index + 1));

if (!rows.length) {
  throw new Error(`Korean translation JSONL is empty: ${jsonlPath}`);
}

const seenKeys = new Set();
for (const row of rows) {
  if (seenKeys.has(`${row.verseKey}:${row.translationName}`)) {
    throw new Error(`Duplicate verseKey/translationName in JSONL: ${row.verseKey}`);
  }
  seenKeys.add(`${row.verseKey}:${row.translationName}`);
}

mkdirSync(dirname(tempCsvPath), { recursive: true });
writeFileSync(
  tempCsvPath,
  [
    ["verse_key", "text_ko", "translation_name", "translation_status", "is_public", "reviewer_note"]
      .map(csvEscape)
      .join(","),
    ...rows.map((row) =>
      [
        row.verseKey,
        row.textKo,
        row.translationName,
        row.translationStatus,
        row.isPublic ? "true" : "false",
        row.reviewerNote,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n") + "\n",
  "utf8",
);

const importSql = `
\\set ON_ERROR_STOP on
begin;

create temp table ko_translation_stage (
  verse_key text not null,
  text_ko text not null,
  translation_name text not null,
  translation_status text not null,
  is_public boolean not null,
  reviewer_note text
);

\\copy ko_translation_stage (verse_key, text_ko, translation_name, translation_status, is_public, reviewer_note) from ${sqlString(csvPathForPsql(tempCsvPath))} with (format csv, header true, encoding 'UTF8');

create temp table ko_translation_changes as
select
  ko.id as ko_verse_id,
  ko.text_ko as previous_text,
  stage.text_ko as revised_text,
  stage.reviewer_note
from ko_translation_stage stage
join public.bible_verses_ko ko
  on ko.verse_key = stage.verse_key
 and ko.translation_name = stage.translation_name
where ko.text_ko is distinct from stage.text_ko;

insert into public.bible_verses_ko (
  en_verse_id,
  book_id,
  book_order,
  app_book_id,
  chapter,
  verse,
  verse_key,
  text_ko,
  translation_name,
  translation_status,
  is_public,
  reviewer_note
)
select
  en.id,
  en.book_id,
  en.book_order,
  en.app_book_id,
  en.chapter,
  en.verse,
  en.verse_key,
  stage.text_ko,
  stage.translation_name,
  stage.translation_status,
  stage.is_public,
  nullif(stage.reviewer_note, '')
from ko_translation_stage stage
join public.bible_verses_en en on en.verse_key = stage.verse_key
on conflict (verse_key, translation_name) do update set
  en_verse_id = excluded.en_verse_id,
  book_id = excluded.book_id,
  book_order = excluded.book_order,
  app_book_id = excluded.app_book_id,
  chapter = excluded.chapter,
  verse = excluded.verse,
  text_ko = excluded.text_ko,
  translation_status = excluded.translation_status,
  is_public = excluded.is_public,
  reviewer_note = excluded.reviewer_note,
  updated_at = now();

insert into public.translation_reviews (
  ko_verse_id,
  previous_text,
  revised_text,
  review_status,
  comment
)
select
  changes.ko_verse_id,
  changes.previous_text,
  changes.revised_text,
  'revised',
  coalesce(nullif(changes.reviewer_note, ''), 'Updated by Phase 07 Korean translation import.')
from ko_translation_changes changes;

commit;

select jsonb_build_object(
  'stagedRows', (select count(*) from ko_translation_stage),
  'changedExistingRows', (select count(*) from ko_translation_changes),
  'translationName', ${sqlString(defaultTranslationName)},
  'targetRows', (
    select count(*)
    from public.bible_verses_ko
    where translation_name = ${sqlString(defaultTranslationName)}
  ),
  'importedAt', now()
)::text as result;
`;

writeFileSync(tempSqlPath, importSql, "utf8");

try {
  const output = runPsql(databaseUrl, ["-v", "ON_ERROR_STOP=1", "-tA", "-f", tempSqlPath]);
  console.log(output);
} finally {
  for (const path of [tempCsvPath, tempSqlPath]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}

function parseDraftLine(line, lineNumber) {
  let parsed;
  try {
    parsed = JSON.parse(line.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Invalid JSON at ${jsonlPath}:${lineNumber}: ${error.message}`);
  }

  const verseKey = parsed.verseKey ?? parsed.verse_key;
  const textKo = parsed.textKo ?? parsed.text_ko;
  const translationName = parsed.translationName ?? parsed.translation_name ?? defaultTranslationName;
  const translationStatus = parsed.translationStatus ?? parsed.translation_status ?? parsed.status ?? defaultStatus;
  const isPublic = Boolean(parsed.isPublic ?? parsed.is_public ?? false);
  const reviewerNote = parsed.reviewerNote ?? parsed.reviewer_note ?? "";

  if (!verseKey || typeof verseKey !== "string") {
    throw new Error(`Missing verseKey at ${jsonlPath}:${lineNumber}`);
  }

  if (!textKo || typeof textKo !== "string" || !textKo.trim()) {
    throw new Error(`Missing textKo at ${jsonlPath}:${lineNumber}`);
  }

  if (!allowedStatuses.has(translationStatus)) {
    throw new Error(`Invalid translationStatus at ${jsonlPath}:${lineNumber}: ${translationStatus}`);
  }

  if (isPublic && translationStatus !== "approved") {
    throw new Error(`Only approved translations may be public at ${jsonlPath}:${lineNumber}: ${verseKey}`);
  }

  return {
    verseKey,
    textKo: textKo.trim(),
    translationName,
    translationStatus,
    isPublic,
    reviewerNote,
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
