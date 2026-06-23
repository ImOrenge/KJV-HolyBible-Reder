# KJV Normalization Report

Generated: 2026-06-20T13:37:23.207Z

## Source

- Source: CrossWire KJV
- Module: KJV
- Module version: 3.1
- Version date: 2023-07-19
- OSIS checksum: `4BCBFE45722FCA396ADBEAC9C81025BBB173CB1E30296DA90864F0400CB0E3F5`
- Git commit: `d490be7e34762deb2c76cb2c1306d4808e27890d`

## Outputs

- JSONL: `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- CSV: `data/crosswire/kjv/normalized/kjv-verses.csv`
- Chapter counts: `data/crosswire/kjv/normalized/kjv-chapter-counts.json`

## Validation

| Check | Expected | Actual | Status |
| --- | ---: | ---: | --- |
| Verse rows | 31102 | 31102 | PASS |
| Books | 66 | 66 | PASS |
| Chapters | 1,189 | 1189 | PASS |
| Parse errors | 0 | 0 | PASS |
| Missing chapters | 0 | 0 | PASS |
| Leftover XML-like markup rows | 0 | 0 | PASS |

## Samples

| Verse key | Text |
| --- | --- |
| `GEN.1.1` | In the beginning God created the heaven and the earth. |
| `PSA.23.1` | The Lord is my shepherd; I shall not want. |
| `JHN.3.16` | For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. |
| `REV.22.21` | The grace of our Lord Jesus Christ be with you all. Amen. |

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

PASS
