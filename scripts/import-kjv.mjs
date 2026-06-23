import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { csvPathForPsql, parseArgs, resolveDatabaseUrl, runPsql, sqlString } from "./phase5-common.mjs";

const args = parseArgs(process.argv);
const databaseUrl = resolveDatabaseUrl(args);
const csvPath = resolve(args.csv ?? process.env.KJV_NORMALIZED_CSV ?? "data/crosswire/kjv/normalized/kjv-verses.csv");
const tempSqlPath = resolve(".tmp/kjv-import.sql");

if (!existsSync(csvPath)) {
  throw new Error(`KJV normalized CSV not found: ${csvPath}`);
}

mkdirSync(dirname(tempSqlPath), { recursive: true });

const importSql = `
\\set ON_ERROR_STOP on
begin;

create temp table kjv_import_stage (
  book_order int not null,
  testament text not null,
  app_book_id text not null,
  osis_book_id text not null,
  verse_key_code text not null,
  chapter int not null,
  verse int not null,
  verse_key text not null,
  osis_ref text not null,
  text_en text not null,
  source_name text not null,
  source_module text not null,
  source_module_version text,
  source_version_date text,
  source_license text,
  source_checksum text,
  source_commit text,
  source_downloaded_at text
);

\\copy kjv_import_stage (book_order, testament, app_book_id, osis_book_id, verse_key_code, chapter, verse, verse_key, osis_ref, text_en, source_name, source_module, source_module_version, source_version_date, source_license, source_checksum, source_commit, source_downloaded_at) from ${sqlString(csvPathForPsql(csvPath))} with (format csv, header true, encoding 'UTF8');

insert into public.bible_verses_en (
  book_id,
  book_order,
  app_book_id,
  osis_book_id,
  chapter,
  verse,
  verse_key,
  text_en,
  source_name,
  source_module,
  source_module_version,
  source_version_date,
  source_license,
  source_checksum,
  source_commit,
  source_downloaded_at
)
select
  books.id,
  stage.book_order,
  stage.app_book_id,
  stage.osis_book_id,
  stage.chapter,
  stage.verse,
  stage.verse_key,
  stage.text_en,
  stage.source_name,
  stage.source_module,
  stage.source_module_version,
  nullif(stage.source_version_date, '')::date,
  stage.source_license,
  stage.source_checksum,
  stage.source_commit,
  nullif(stage.source_downloaded_at, '')::timestamptz
from kjv_import_stage stage
join public.bible_books books on books.book_order = stage.book_order
on conflict (verse_key) do update set
  book_id = excluded.book_id,
  book_order = excluded.book_order,
  app_book_id = excluded.app_book_id,
  osis_book_id = excluded.osis_book_id,
  chapter = excluded.chapter,
  verse = excluded.verse,
  text_en = excluded.text_en,
  source_name = excluded.source_name,
  source_module = excluded.source_module,
  source_module_version = excluded.source_module_version,
  source_version_date = excluded.source_version_date,
  source_license = excluded.source_license,
  source_checksum = excluded.source_checksum,
  source_commit = excluded.source_commit,
  source_downloaded_at = excluded.source_downloaded_at;

commit;

select jsonb_build_object(
  'stagedRows', (select count(*) from kjv_import_stage),
  'targetRows', (select count(*) from public.bible_verses_en),
  'distinctVerseKeys', (select count(distinct verse_key) from public.bible_verses_en),
  'importedAt', now()
)::text as result;
`;

writeFileSync(tempSqlPath, importSql, "utf8");

try {
  const output = runPsql(databaseUrl, ["-v", "ON_ERROR_STOP=1", "-tA", "-f", tempSqlPath]);
  console.log(output);
} finally {
  if (existsSync(tempSqlPath)) {
    unlinkSync(tempSqlPath);
  }
}
