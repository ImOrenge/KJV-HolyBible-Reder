# KJV Source Snapshot Report

Generated: 2026-06-20T22:31:18+09:00

## Phase 1 Result

CrossWire `KJV` has been selected as the canonical English source for DB loading.

## Downloaded Artifacts

| Artifact | Source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `KJV.zip` | <https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/KJV.zip> | 4,026,621 | `873815AA4B4123025616D1F41EAE75F412111275F4C3884E36F92D4F46DCBA1D` |
| `kjv.conf` | <https://www.crosswire.org/ftpmirror/pub/sword/raw/mods.d/kjv.conf> | 6,313 | `A9D97BA99E04722FE516327CA5FBDA13498B554ECB972B11007467323D71608C` |
| `kjv.osis.xml` | CrossWire GitLab `d490be7e34762deb2c76cb2c1306d4808e27890d` | 28,043,075 | `4BCBFE45722FCA396ADBEAC9C81025BBB173CB1E30296DA90864F0400CB0E3F5` |

## Module Metadata

- Module name: `KJV`
- Book name: King James Version (1769) with Strongs Numbers and Morphology and CatchWords
- Module type: Bible
- Language: `en`
- Module version: `3.1`
- Version date: `2023-07-19`
- Minimum SWORD version: `1.5.9`
- Source type: OSIS
- Versification: KJV
- Distribution license: GPL
- Text source: <https://gitlab.com/crosswire-bible-society/kjv>

## ZIP Structure

```text
modules/texts/ztext/kjv/nt.bzs
modules/texts/ztext/kjv/ot.bzs
modules/texts/ztext/kjv/ot.bzv
modules/texts/ztext/kjv/nt.bzv
modules/texts/ztext/kjv/ot.bzz
modules/texts/ztext/kjv/nt.bzz
mods.d/kjv.conf
```

## Extraction Decision

No local SWORD CLI such as `diatheke` or `mod2osis` was available. The checked-in extraction path therefore uses the CrossWire module `TextSource` OSIS file at the pinned GitLab commit while preserving the distributed raw ZIP. This keeps Phase 4 reproducible without implementing the SWORD zText binary format in this project.

## Phase 1 Checklist

- [x] CrossWire `KJV` module selected.
- [x] Raw ZIP stored.
- [x] Module conf stored.
- [x] OSIS source stored from CrossWire TextSource.
- [x] Checksums recorded.
- [x] Source notice created.
- [x] Release license review gate documented.
