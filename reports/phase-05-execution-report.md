# Phase 05 Execution Report

Generated: 2026-06-21T11:23:30+09:00

## Scope

Phase 05 objective: import normalized CrossWire KJV verse data into Supabase `bible_verses_en` and validate DB integrity.

## Target DB

- Supabase project ref: `ntpjrzonhebhgfxeryvt`
- Supabase project name from CLI: `Receipt_Manage_0.0.1`
- Region: `ap-northeast-2`
- Status: `ACTIVE_HEALTHY`
- Postgres major version: 17
- Import connection path: Supabase pooler from `supabase/.temp/pooler-url`

The direct DB hostname resolved only to IPv6 and this machine could not reach that IPv6 address. Import was completed through the Supabase pooler endpoint instead.

## Execution

Steps executed against remote Supabase:

```text
1. Applied supabase/migrations/001_create_bible_books.sql through 007_create_rls_policies.sql.
2. Applied supabase/seeds/bible_books_seed.sql.
3. Ran scripts/import-kjv.mjs against normalized KJV CSV.
4. Ran scripts/validate-kjv.mjs.
5. Re-ran scripts/import-kjv.mjs to verify idempotency.
6. Re-ran scripts/validate-kjv.mjs.
```

## Import Result

```json
{
  "stagedRows": 31102,
  "targetRows": 31102,
  "distinctVerseKeys": 31102
}
```

## Validation Result

See `reports/kjv-import-validation.md`.

Summary:

- Book rows: 66
- OT book rows: 39
- NT book rows: 27
- Chapter count from books: 1,189
- Imported chapters: 1,189
- Verse rows: 31,102
- Distinct verse keys: 31,102
- Duplicate verse key groups: 0
- Duplicate book/chapter/verse groups: 0
- Empty text rows: 0
- XML-like markup rows: 0
- Missing source metadata rows: 0
- Missing sample verses: 0

## Generated Phase 05 Artifacts

- `scripts/import-kjv.mjs`
- `scripts/validate-kjv.mjs`
- `scripts/phase5-common.mjs`
- `reports/kjv-import-validation.md`
- `reports/kjv-import-errors.json`

## Completion Status

Phase 05 remote Supabase import and validation: PASS.

The app still uses fixture data until Phase 06 switches the repository/API layer to read from Supabase.
