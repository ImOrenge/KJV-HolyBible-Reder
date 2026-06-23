# KJV Import Validation Report

Generated: 2026-06-21T02:23:10.426Z

## Result

PASS

## Checks

| Check | Expected | Actual | Status |
| --- | ---: | ---: | --- |
| Book rows | 66 | 66 | PASS |
| OT book rows | 39 | 39 | PASS |
| NT book rows | 27 | 27 | PASS |
| Chapter count from books | 1189 | 1189 | PASS |
| Imported chapters | 1189 | 1189 | PASS |
| Verse rows | 31102 | 31102 | PASS |
| Normalized rows | 31102 | 31102 | PASS |
| Distinct verse keys | 31102 | 31102 | PASS |
| Duplicate verse key groups | 0 | 0 | PASS |
| Duplicate location groups | 0 | 0 | PASS |
| Empty text rows | 0 | 0 | PASS |
| XML-like markup rows | 0 | 0 | PASS |
| Missing source metadata rows | 0 | 0 | PASS |
| Book chapter mismatch count | 0 | 0 | PASS |
| Missing sample verses | 0 | 0 | PASS |

## Samples

| Verse key | Text |
| --- | --- |
| `GEN.1.1` | In the beginning God created the heaven and the earth. |
| `PSA.23.1` | The Lord is my shepherd; I shall not want. |
| `JHN.3.16` | For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. |
| `REV.22.21` | The grace of our Lord Jesus Christ be with you all. Amen. |

## Phase 5 Checklist

- [x] Normalized KJV file counted.
- [x] `bible_books` row count validated.
- [x] `bible_verses_en` row count validated.
- [x] 1,189 imported chapters validated.
- [x] Duplicate `verse_key` groups checked.
- [x] Duplicate book/chapter/verse groups checked.
- [x] Empty text rows checked.
- [x] XML-like markup residue checked.
- [x] Source metadata presence checked.
- [x] Sample verses checked.
