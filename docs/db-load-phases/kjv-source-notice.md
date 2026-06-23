# CrossWire KJV Source Notice

Phase 1 source decision: the English Bible source for this project is the CrossWire `KJV` SWORD module.

## Source Snapshot

- Module name: `KJV`
- Book name: King James Version (1769) with Strongs Numbers and Morphology and CatchWords
- Module type: Bible
- Language: `en`
- Module version: `3.1`
- Version date: `2023-07-19`
- Minimum SWORD version: `1.5.9`
- Source type: OSIS
- Encoding: UTF-8
- Versification: KJV
- Distribution license: GPL
- Text source: <https://gitlab.com/crosswire-bible-society/kjv>

## Stored Files

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `data/crosswire/kjv/raw/KJV.zip` | 4,026,621 | `873815AA4B4123025616D1F41EAE75F412111275F4C3884E36F92D4F46DCBA1D` |
| `data/crosswire/kjv/raw/kjv.conf` | 6,313 | `A9D97BA99E04722FE516327CA5FBDA13498B554ECB972B11007467323D71608C` |
| `data/crosswire/kjv/raw/kjv.osis.xml` | 28,043,075 | `4BCBFE45722FCA396ADBEAC9C81025BBB173CB1E30296DA90864F0400CB0E3F5` |

## App Policy

- Store KJV English text as read-only source data.
- Normalize to verse-level plain text for MVP reader/search use.
- Preserve original module and OSIS source snapshot for audit and regeneration.
- Do not mix fixture Korean text with CrossWire KJV source text.
- Keep source module, version, checksum, and license metadata available in DB rows or import reports.

## Release Gate

Before public release, review the CrossWire KJV module notice, GPL distribution implications, and regional KJV rights questions for the actual release target. This project keeps the source notice visible in docs and should expose attribution in the app before production launch.
