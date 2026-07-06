import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs, resolveDatabaseUrl, runPsql, sqlString } from "./phase5-common.mjs";

const args = parseArgs(process.argv);
const databaseUrl = resolveDatabaseUrl(args);
const translationName = args["translation-name"] ?? "KJV Reader Note";
const tempSqlPath = resolve(".tmp/ko-search-backfill.sql");

const sql = `
\\set ON_ERROR_STOP on
begin;

update public.bible_verses_ko
set
  search_text_ko = public.normalize_korean_search_text(text_ko, false),
  search_text_ko_compact = public.normalize_korean_search_text(text_ko, true)
where translation_name = ${sqlString(translationName)}
  and (
    search_text_ko is null
    or search_text_ko_compact is null
    or search_text_ko is distinct from public.normalize_korean_search_text(text_ko, false)
    or search_text_ko_compact is distinct from public.normalize_korean_search_text(text_ko, true)
  );

select public.refresh_bible_verse_search_terms_ko(${sqlString(translationName)})::text as refresh_result;

commit;

select jsonb_build_object(
  'translationName', ${sqlString(translationName)},
  'publicApprovedRows', (
    select count(*)
    from public.bible_verses_ko
    where translation_name = ${sqlString(translationName)}
      and translation_status = 'approved'
      and is_public = true
  ),
  'missingSearchTextRows', (
    select count(*)
    from public.bible_verses_ko
    where translation_name = ${sqlString(translationName)}
      and translation_status = 'approved'
      and is_public = true
      and (
        nullif(search_text_ko, '') is null
        or nullif(search_text_ko_compact, '') is null
      )
  ),
  'indexedTermRows', (
    select count(*)
    from public.bible_verse_search_terms_ko
    where translation_name = ${sqlString(translationName)}
  ),
  'backfilledAt', now()
)::text as result;
`;

mkdirSync(dirname(tempSqlPath), { recursive: true });
writeFileSync(tempSqlPath, sql, "utf8");

try {
  const output = runPsql(databaseUrl, ["-v", "ON_ERROR_STOP=1", "-tA", "-f", tempSqlPath]);
  console.log(output);
} finally {
  if (existsSync(tempSqlPath)) {
    unlinkSync(tempSqlPath);
  }
}
