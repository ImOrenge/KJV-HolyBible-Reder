# New Testament Translation Progress

Updated: 2026-06-27

## Result

COMPLETE

## Translation

- Translation name: `KJV Reader Note`
- Source: `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- Target directory: `data/translations/ko/books/`
- Import script: `scripts/import-ko-translation.mjs`
- Status policy: `approved`, `isPublic=true`
- Reviewer note: `NT fast raw translation by book. Verification skipped by request.`

## Current Counts

| Scope | Rows |
| --- | ---: |
| Old Testament imported | 23,145 |
| New Testament source target | 7,957 |
| New Testament translated/imported | 7,957 |
| New Testament remaining | 0 |
| Total `KJV Reader Note` imported | 31,102 |
| Final target | 31,102 |

## Completed New Testament Books

| File | Book | Rows | DB import | Local structure check |
| --- | --- | ---: | --- | --- |
| `040-mat-matthew.jsonl` | Matthew | 1,071 | PASS | PASS |
| `041-mrk-mark.jsonl` | Mark | 678 | PASS | PASS |
| `042-luk-luke.jsonl` | Luke | 1,151 | PASS | PASS |
| `043-jhn-john.jsonl` | John | 879 | PASS | PASS |
| `044-act-acts.jsonl` | Acts | 1,007 | PASS | PASS |
| `045-rom-romans.jsonl` | Romans | 433 | PASS | PASS |
| `046-1co-1-corinthians.jsonl` | 1 Corinthians | 437 | PASS | PASS |
| `047-2co-2-corinthians.jsonl` | 2 Corinthians | 257 | PASS | PASS |
| `048-gal-galatians.jsonl` | Galatians | 149 | PASS | PASS |
| `049-eph-ephesians.jsonl` | Ephesians | 155 | PASS | PASS |
| `050-php-philippians.jsonl` | Philippians | 104 | PASS | PASS |
| `051-col-colossians.jsonl` | Colossians | 95 | PASS | PASS |
| `052-1th-1-thessalonians.jsonl` | 1 Thessalonians | 89 | PASS | PASS |
| `053-2th-2-thessalonians.jsonl` | 2 Thessalonians | 47 | PASS | PASS |
| `054-1ti-1-timothy.jsonl` | 1 Timothy | 113 | PASS | PASS |
| `055-2ti-2-timothy.jsonl` | 2 Timothy | 83 | PASS | PASS |
| `056-tit-titus.jsonl` | Titus | 46 | PASS | PASS |
| `057-phm-philemon.jsonl` | Philemon | 25 | PASS | PASS |
| `058-heb-hebrews.jsonl` | Hebrews | 303 | PASS | PASS |
| `059-jas-james.jsonl` | James | 108 | PASS | PASS |
| `060-1pe-1-peter.jsonl` | 1 Peter | 105 | PASS | PASS |
| `061-2pe-2-peter.jsonl` | 2 Peter | 61 | PASS | PASS |
| `062-1jn-1-john.jsonl` | 1 John | 105 | PASS | PASS |
| `063-2jn-2-john.jsonl` | 2 John | 13 | PASS | PASS |
| `064-3jn-3-john.jsonl` | 3 John | 14 | PASS | PASS |
| `065-jud-jude.jsonl` | Jude | 25 | PASS | PASS |
| `066-rev-revelation.jsonl` | Revelation | 404 | PASS | PASS |

## In-progress New Testament Books

None.

## Verification Evidence

Local scan for all generated/imported New Testament JSONL files:

```json
{
  "files": 27,
  "totalRows": 7957,
  "sourceRows": 7957,
  "seen": 7957,
  "errors": []
}
```

Acts full-book validator:

```json
{
  "status": "PASS",
  "errors": 0,
  "jsonlRows": 1007,
  "translationName": "KJV Reader Note",
  "dbRowsInScope": 1007
}
```

Final Supabase check for `KJV Reader Note`:

```json
{
  "sourceRows": 31102,
  "sourceOtRows": 23145,
  "sourceNtRows": 7957,
  "totalRows": 31102,
  "distinctVerseKeys": 31102,
  "otRows": 23145,
  "ntRows": 7957,
  "approvedPublicRows": 31102,
  "badRows": 0,
  "missingEnRows": 0,
  "missingNtRows": 0,
  "extraKoRows": 0,
  "actsRows": 1007,
  "actsFirstVerse": "ACT.1.1",
  "actsLastVerse": "ACT.28.31",
  "firstVerse": "GEN.1.1",
  "lastVerse": "REV.22.21"
}
```

API check:

```json
[
  {
    "book": "act",
    "chapter": 28,
    "status": 200,
    "totalVerses": 31,
    "koVerses": 31,
    "first": "ACT.28.1",
    "last": "ACT.28.31",
    "translationNames": ["KJV Reader Note"]
  }
]
```

## Next Queue

- [x] New Testament full translation/import complete.
