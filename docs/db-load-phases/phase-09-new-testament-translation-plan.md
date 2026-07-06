# Phase 09: 신약 전권 한국어 번역 실행 플랜

## 목표

CrossWire KJV 신약 원문 27권 전체를 `KJV Reader Note` 한국어 번역 JSONL로 권별 생성하고, 구조 검증 후 Supabase `bible_verses_ko`에 import한다. 구약 번역과 동일하게 성경 고유 문체를 유지하되, 이번 플랜은 빠른 전권 탑재를 우선하고 의미 단위 정밀 검수는 후속 단계로 분리한다.

## 기준 상태

- 원문 기준: `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- 권 메타데이터: `data/crosswire/kjv/book-map.json`
- 번역명: `KJV Reader Note`
- 신약 범위: `MAT.1.1` - `REV.22.21`
- 신약 규모: 27권, 260장, 7,957절
- 구약 import 완료 후 최종 전체 목표: 66권, 31,102절
- JSONL 저장 위치: `data/translations/ko/books/`
- import 스크립트: `scripts/import-ko-translation.mjs`
- 검증 기준 문서: `docs/translation-style-guide.md`, `docs/translation-review-workflow.md`

## 기본 탑재 정책

- 신약도 구약과 같은 권별 JSONL 파일로 분리한다.
- 권별 파일이 완성되면 즉시 구조 검증 후 import한다.
- 빠른 탑재 요청이 유지되는 동안 기본 row 상태는 `approved`, `isPublic=true`로 둔다.
- 정밀 의미 검수는 별도 후속 작업으로 남기며, row의 `reviewerNote`에 빠른 초본 탑재임을 기록한다.
- 기존 한국어 성경 번역 문장을 그대로 베끼지 않는다.
- KJV 원문에 없는 해설을 `textKo` 본문에 넣지 않는다.

## JSONL Row 형식

```json
{"translationName":"KJV Reader Note","translationStatus":"approved","isPublic":true,"bookId":"mat","chapter":1,"verse":1,"verseKey":"MAT.1.1","textKo":"...","reviewerNote":"NT fast raw translation by book. Verification skipped by request."}
```

필수 규칙:

- `verseKey`는 원문 `verse_key`와 1:1로 일치해야 한다.
- `bookId`는 앱 권 ID, 예: `mat`, `jhn`, `rev`를 사용한다.
- 한 파일 안에 같은 `verseKey`가 두 번 나오면 실패로 본다.
- `textKo`는 빈 문자열이면 안 된다.
- 공개 row는 반드시 `translationStatus="approved"`와 `isPublic=true`를 동시에 만족해야 한다.

## 번역 문체 및 용어 기준

공통 유지:

- 성경 고유 문체, 반복 구조, 절 단위 호흡을 보존한다.
- `sign`, `signs`, `token` 계열은 문맥상 `징조`, `징표`로 처리하고 `표적`은 쓰지 않는다.
- `rest`, `rested`가 신학적 안식 문맥이면 `안식` 어근을 유지한다.
- `God`은 `하나님`, `Lord`는 `주`, `Spirit`은 `영`, `Holy Ghost`는 `성령`을 기본값으로 둔다.
- `soul`은 `혼`, `flesh`는 `육체`, `righteousness`는 `의`, `salvation`은 `구원`을 기본값으로 둔다.

신약 우선 용어 후보:

| KJV term | 기본 번역 | 비고 |
| --- | --- | --- |
| Jesus Christ | 예수 그리스도 | 이름과 칭호를 분리하지 않는다. |
| Christ | 그리스도 | 메시아 설명을 본문에 추가하지 않는다. |
| gospel | 복음 | 복음서/서신 모두 동일 기본값. |
| kingdom of heaven | 하늘의 왕국 | 기존 스타일 가이드 기준 유지. |
| kingdom of God | 하나님의 왕국 | 기존 스타일 가이드 기준 유지. |
| repent | 회개하다 | 명령문은 `회개하라` 계열. |
| faith | 믿음 | 서신에서 일관성 유지. |
| grace | 은혜 | |
| apostle | 사도 | |
| disciple | 제자 | |
| parable | 비유 | |
| synagogue | 회당 | |
| Pharisees | 바리새인들 | |
| Sadducees | 사두개인들 | |
| Gentiles | 이방인들 | |
| church | 교회 | |
| cross | 십자가 | |
| resurrection | 부활 | |
| baptism, baptize | 침례, 침례를 주다 | 최종 검수에서 `세례`와 비교 검토 가능. |
| Comforter | 보혜사 | 요한복음 문맥에서 재확인. |
| Word | 말씀 | 요한복음 1장 대문자 `Word` 기준. |
| charity | 사랑 | 고린도전서 13장 핵심 용어. |
| mystery | 신비 | 서신 문맥별 검수 필요. |
| beast | 짐승 | 요한계시록 문맥에서는 고정 검수 필요. |

## 금지/주의 스캔

권별 생성 후 최소한 다음 패턴을 `textKo`에 대해 검사한다.

```text
표적|쉬셨느니라|쉬셨니라|쉬셨기|안식하셨기|하프로|불 나팔|주\s+의|withheld
```

추가 검사:

- `[A-Za-z]{3,}`가 `textKo`에 남아 있으면 실패 후보로 본다.
- `verseKey`, `chapter`, `verse`가 원문과 다르면 실패로 본다.
- 같은 권 안에서 예수, 그리스도, 성령, 복음, 믿음, 의, 은혜 같은 핵심 용어가 흔들리면 검수 후보로 기록한다.

## 권별 범위

| 순서 | 권 | English | appBookId | verseKey | 장 | 절 |
| ---: | --- | --- | --- | --- | ---: | ---: |
| 40 | 마태복음 | Matthew | `mat` | `MAT` | 28 | 1,071 |
| 41 | 마가복음 | Mark | `mrk` | `MRK` | 16 | 678 |
| 42 | 누가복음 | Luke | `luk` | `LUK` | 24 | 1,151 |
| 43 | 요한복음 | John | `jhn` | `JHN` | 21 | 879 |
| 44 | 사도행전 | Acts | `act` | `ACT` | 28 | 1,007 |
| 45 | 로마서 | Romans | `rom` | `ROM` | 16 | 433 |
| 46 | 고린도전서 | 1 Corinthians | `1co` | `1CO` | 16 | 437 |
| 47 | 고린도후서 | 2 Corinthians | `2co` | `2CO` | 13 | 257 |
| 48 | 갈라디아서 | Galatians | `gal` | `GAL` | 6 | 149 |
| 49 | 에베소서 | Ephesians | `eph` | `EPH` | 6 | 155 |
| 50 | 빌립보서 | Philippians | `php` | `PHP` | 4 | 104 |
| 51 | 골로새서 | Colossians | `col` | `COL` | 4 | 95 |
| 52 | 데살로니가전서 | 1 Thessalonians | `1th` | `1TH` | 5 | 89 |
| 53 | 데살로니가후서 | 2 Thessalonians | `2th` | `2TH` | 3 | 47 |
| 54 | 디모데전서 | 1 Timothy | `1ti` | `1TI` | 6 | 113 |
| 55 | 디모데후서 | 2 Timothy | `2ti` | `2TI` | 4 | 83 |
| 56 | 디도서 | Titus | `tit` | `TIT` | 3 | 46 |
| 57 | 빌레몬서 | Philemon | `phm` | `PHM` | 1 | 25 |
| 58 | 히브리서 | Hebrews | `heb` | `HEB` | 13 | 303 |
| 59 | 야고보서 | James | `jas` | `JAS` | 5 | 108 |
| 60 | 베드로전서 | 1 Peter | `1pe` | `1PE` | 5 | 105 |
| 61 | 베드로후서 | 2 Peter | `2pe` | `2PE` | 3 | 61 |
| 62 | 요한일서 | 1 John | `1jn` | `1JN` | 5 | 105 |
| 63 | 요한이서 | 2 John | `2jn` | `2JN` | 1 | 13 |
| 64 | 요한삼서 | 3 John | `3jn` | `3JN` | 1 | 14 |
| 65 | 유다서 | Jude | `jud` | `JUD` | 1 | 25 |
| 66 | 요한계시록 | Revelation | `rev` | `REV` | 22 | 404 |

## 파일명 규칙

- `040-mat-matthew.jsonl`
- `041-mrk-mark.jsonl`
- `042-luk-luke.jsonl`
- `043-jhn-john.jsonl`
- `044-act-acts.jsonl`
- `045-rom-romans.jsonl`
- `046-1co-1-corinthians.jsonl`
- `047-2co-2-corinthians.jsonl`
- `048-gal-galatians.jsonl`
- `049-eph-ephesians.jsonl`
- `050-php-philippians.jsonl`
- `051-col-colossians.jsonl`
- `052-1th-1-thessalonians.jsonl`
- `053-2th-2-thessalonians.jsonl`
- `054-1ti-1-timothy.jsonl`
- `055-2ti-2-timothy.jsonl`
- `056-tit-titus.jsonl`
- `057-phm-philemon.jsonl`
- `058-heb-hebrews.jsonl`
- `059-jas-james.jsonl`
- `060-1pe-1-peter.jsonl`
- `061-2pe-2-peter.jsonl`
- `062-1jn-1-john.jsonl`
- `063-2jn-2-john.jsonl`
- `064-3jn-3-john.jsonl`
- `065-jud-jude.jsonl`
- `066-rev-revelation.jsonl`

## 실행 페이즈

### NT-0: 사전 점검

목표: 신약 번역을 시작하기 전에 원문 범위, 기존 구약 import 상태, 용어 기준을 고정한다.

체크리스트:

- [ ] `data/crosswire/kjv/normalized/kjv-verses.jsonl`에서 `bookOrder >= 40` 범위가 7,957절인지 확인한다.
- [ ] `data/crosswire/kjv/book-map.json`에서 신약 27권, 260장인지 확인한다.
- [ ] 기존 구약 `KJV Reader Note` row가 23,145절인지 확인한다.
- [ ] 신약 권별 파일명이 기존 구약 파일명 규칙과 충돌하지 않는지 확인한다.
- [ ] `docs/translation-style-guide.md`에 신약 핵심 용어가 부족하면 먼저 보강한다.
- [ ] `translation_terms` seed에 신약 핵심 용어 후보를 추가할지 결정한다.

완료 게이트:

- [ ] 신약 source row count 7,957 확인.
- [ ] 구약 import baseline 23,145 확인.
- [ ] 신약 최종 target row 31,102 확정.

### NT-1: 복음서 파일럿

목표: 복음서 문체, 예수 말씀, 족보, 비유, 요한복음 신학 용어를 작은 범위에서 먼저 고정한다.

권장 파일럿 범위:

- [ ] `MAT.1` 족보와 탄생 기사
- [ ] `MAT.5` 산상수훈 문체
- [ ] `JHN.1` `Word`, `Light`, `Lamb of God` 용어
- [ ] `MRK.1` 빠른 서술체와 `straightway` 처리
- [ ] `LUK.1` 긴 문장과 찬가 문체

체크리스트:

- [ ] 파일럿 장별 JSONL을 생성한다.
- [ ] `Jesus`, `Christ`, `Lord`, `Spirit`, `gospel`, `kingdom` 용어가 흔들리지 않는지 확인한다.
- [ ] `sign`이 `표적`으로 번역되지 않았는지 확인한다.
- [ ] `textKo`에 영어 잔존이 없는지 확인한다.
- [ ] 파일럿 결과를 바탕으로 신약 용어 후보를 업데이트한다.

완료 게이트:

- [ ] 파일럿 장 전체 row 수가 원문과 일치한다.
- [ ] 파일럿 금지어 스캔 0건.
- [ ] 복음서 전권 진행에 필요한 핵심 용어가 확정된다.

### NT-2: 복음서 전권 번역 및 import

범위: 마태복음, 마가복음, 누가복음, 요한복음 89장 3,779절.

체크리스트:

- [ ] `040-mat-matthew.jsonl` 1,071절 생성.
- [ ] `041-mrk-mark.jsonl` 678절 생성.
- [ ] `042-luk-luke.jsonl` 1,151절 생성.
- [ ] `043-jhn-john.jsonl` 879절 생성.
- [ ] 각 권별 source row 수와 JSONL row 수를 비교한다.
- [ ] 각 권별 forbidden scan, 영어 잔존 scan을 실행한다.
- [ ] 각 권별 `node scripts/import-ko-translation.mjs --jsonl <file>`을 실행한다.
- [ ] 각 권 import 후 DB target row 증가량을 확인한다.

완료 게이트:

- [ ] 복음서 3,779절 모두 DB에 import.
- [ ] 복음서 중복 `verseKey` 0건.
- [ ] 복음서 공개 승인 row 3,779건.

### NT-3: 사도행전 번역 및 import

범위: 사도행전 28장 1,007절.

체크리스트:

- [ ] `044-act-acts.jsonl` 1,007절 생성.
- [ ] 성령, 사도, 교회, 이방인, 침례, 복음 전파 용어를 일관되게 유지한다.
- [ ] 설교문 인용과 역사 서술의 문체를 구분한다.
- [ ] 구조 검증과 forbidden scan을 실행한다.
- [ ] Supabase import를 실행한다.

완료 게이트:

- [ ] 사도행전 1,007절 DB import.
- [ ] `ACT.1.1` - `ACT.28.31` 범위 누락 0건.

### NT-4: 바울서신 번역 및 import

범위: 로마서 - 빌레몬서 13권 87장 2,033절.

체크리스트:

- [ ] `045-rom-romans.jsonl` 433절 생성.
- [ ] `046-1co-1-corinthians.jsonl` 437절 생성.
- [ ] `047-2co-2-corinthians.jsonl` 257절 생성.
- [ ] `048-gal-galatians.jsonl` 149절 생성.
- [ ] `049-eph-ephesians.jsonl` 155절 생성.
- [ ] `050-php-philippians.jsonl` 104절 생성.
- [ ] `051-col-colossians.jsonl` 95절 생성.
- [ ] `052-1th-1-thessalonians.jsonl` 89절 생성.
- [ ] `053-2th-2-thessalonians.jsonl` 47절 생성.
- [ ] `054-1ti-1-timothy.jsonl` 113절 생성.
- [ ] `055-2ti-2-timothy.jsonl` 83절 생성.
- [ ] `056-tit-titus.jsonl` 46절 생성.
- [ ] `057-phm-philemon.jsonl` 25절 생성.
- [ ] 믿음, 은혜, 의, 율법, 육체, 영, 구원, 교회, 소망, 사랑 용어를 권 전체에서 일관되게 유지한다.
- [ ] 각 권별 구조 검증과 import를 실행한다.

완료 게이트:

- [ ] 바울서신 2,033절 DB import.
- [ ] 모든 권에서 missing, extra, duplicate 0건.

### NT-5: 히브리서 및 공동서신 번역 및 import

범위: 히브리서 - 유다서 8권 35장 734절.

체크리스트:

- [ ] `058-heb-hebrews.jsonl` 303절 생성.
- [ ] `059-jas-james.jsonl` 108절 생성.
- [ ] `060-1pe-1-peter.jsonl` 105절 생성.
- [ ] `061-2pe-2-peter.jsonl` 61절 생성.
- [ ] `062-1jn-1-john.jsonl` 105절 생성.
- [ ] `063-2jn-2-john.jsonl` 13절 생성.
- [ ] `064-3jn-3-john.jsonl` 14절 생성.
- [ ] `065-jud-jude.jsonl` 25절 생성.
- [ ] 히브리서의 제사장, 언약, 희생, 장막 용어를 구약 번역과 맞춘다.
- [ ] 요한서신의 사랑, 빛, 생명, 진리 용어를 요한복음과 맞춘다.
- [ ] 각 권별 구조 검증과 import를 실행한다.

완료 게이트:

- [ ] 히브리서 및 공동서신 734절 DB import.
- [ ] 구약 인용 및 율법 용어 충돌 후보를 기록한다.

### NT-6: 요한계시록 번역 및 import

범위: 요한계시록 22장 404절.

체크리스트:

- [ ] `066-rev-revelation.jsonl` 404절 생성.
- [ ] 계시문학의 반복 구조를 유지한다.
- [ ] 어린양, 짐승, 용, 인, 나팔, 대접, 보좌, 새 예루살렘 용어를 고정한다.
- [ ] 상징을 해설문으로 풀어 쓰지 않는다.
- [ ] 구조 검증과 forbidden scan을 실행한다.
- [ ] Supabase import를 실행한다.

완료 게이트:

- [ ] 요한계시록 404절 DB import.
- [ ] `REV.1.1` - `REV.22.21` 범위 누락 0건.

### NT-7: 신약 전체 완료 검증

목표: 로컬 JSONL, DB import, 공개 조회 상태가 모두 같은 결과를 가리키는지 확인한다.

로컬 검증 체크리스트:

- [ ] 신약 권별 JSONL 파일 27개 존재.
- [ ] 로컬 신약 JSONL 총 row 7,957.
- [ ] 원문 신약 row 7,957.
- [ ] missing `verseKey` 0건.
- [ ] extra `verseKey` 0건.
- [ ] duplicate `verseKey` 0건.
- [ ] invalid status 0건.
- [ ] forbidden pattern 0건.
- [ ] `textKo` 영어 잔존 0건.

DB 검증 체크리스트:

- [ ] `KJV Reader Note` 전체 row 31,102.
- [ ] 신약 row 7,957.
- [ ] 구약 row 23,145 유지.
- [ ] distinct `verse_key` 31,102.
- [ ] approved/public row 31,102.
- [ ] bad row 0.
- [ ] 첫 신약 절 `MAT.1.1` 존재.
- [ ] 마지막 신약 절 `REV.22.21` 존재.

앱 확인 체크리스트:

- [ ] 성경 리더에서 `EN/KR` 스위치가 신약 장에서도 동작한다.
- [ ] `MAT.1`, `JHN.1`, `ROM.1`, `REV.22`에서 한국어 본문이 표시된다.
- [ ] 승인본 없는 fallback 메시지가 신약 완료 후 남아 있지 않다.
- [ ] 검색 API가 신약 한국어 본문을 포함해 동작한다.

## 권별 반복 실행 템플릿

각 권마다 다음 순서를 반복한다.

1. 원문 범위 확인
   - [ ] `appBookId`, `verseKeyCode`, 장 수, 절 수 확인.
2. 번역 JSONL 생성
   - [ ] 권별 파일명 규칙 준수.
   - [ ] row 형식 준수.
   - [ ] 성경 문체와 용어 기준 적용.
3. 로컬 구조 검증
   - [ ] source row 수와 JSONL row 수 일치.
   - [ ] missing, extra, duplicate 0건.
   - [ ] forbidden pattern 0건.
   - [ ] 영어 잔존 0건.
4. DB import
   - [ ] `node scripts/import-ko-translation.mjs --jsonl data/translations/ko/books/<file>.jsonl`
   - [ ] `stagedRows`가 해당 권 절 수와 일치.
   - [ ] `changedExistingRows`는 재import 때만 발생.
5. 완료 기록
   - [ ] 권별 row 수와 import 결과를 실행 리포트에 기록.
   - [ ] 후속 의미 검수 후보를 별도로 기록.

## 최종 산출물

- 신약 권별 번역 JSONL 27개
- `reports/nt-translation-validation.md`
- `reports/nt-import-validation.md`
- 필요 시 `docs/translation-style-guide.md` 신약 용어 보강
- Supabase `bible_verses_ko` 내 신약 approved/public row 7,957개
- 전체 `KJV Reader Note` approved/public row 31,102개

## 완료 기준

- 신약 27권 7,957절이 권별 JSONL로 존재한다.
- 신약 7,957절이 Supabase에 import되어 있다.
- 전체 한국어 번역 row가 31,102절이며, 모든 row가 `approved` 및 `is_public=true`다.
- `MAT.1.1`부터 `REV.22.21`까지 누락, 중복, 상태 오류, 금지어 스캔 오류가 없다.
- 앱 리더에서 구약과 신약 모두 `EN/KR` 스위칭이 가능하다.

