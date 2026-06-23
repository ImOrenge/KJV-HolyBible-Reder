# Phase 07 Execution Report

실행일: 2026-06-21

## 결과

PILOT APPROVED / READER SWITCH PASS

## 실행 범위

- 범위: Genesis 1장 `GEN.1.1` - `GEN.1.31`
- 번역명: `KJV Korean Study Translation`
- 상태: `approved`
- 공개 여부: `is_public=true`
- 문체 방향: KJV 절 구조와 성경 고유 문체 보존

## 생성 산출물

- `data/translations/ko/kjv-study-draft.jsonl`
- `supabase/seeds/translation_terms_seed.sql`
- `scripts/import-ko-translation.mjs`
- `scripts/validate-ko-translation.mjs`
- `docs/translation-style-guide.md`
- `docs/translation-review-workflow.md`
- `reports/ko-translation-validation.md`

## DB 반영

- `translation_terms`: 30개 seed 적용
- `bible_verses_ko`: Genesis 1장 승인본 31절 적재
- 상태별 count: `approved=31`
- 공개 row: 31
- anon REST `bible_verses_ko?app_book_id=gen&chapter=1`: 31 rows
- anon REST `bible_verses_ko?verse_key=JHN.3.16`: 0 rows
- reader chapter API `gen/1`: 31 verses, 31 `textKo` rows
- reader chapter API `jhn/3`: 36 verses, 0 `textKo` rows

## 검증

- `node scripts/import-ko-translation.mjs --seed-terms`: PASS
- `node scripts/import-ko-translation.mjs`: PASS
- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- 구조 검증:
  - JSONL 31 rows
  - DB 31 rows
  - missing expected rows 0
  - orphan Korean rows 0
  - empty text rows 0
  - invalid status rows 0
  - public non-approved rows 0
  - approved rows 31
- 용어 검수 warning:
  - `GEN.1.16`: KJV `light`를 `광명체`로 번역한 항목. 창세기 1장 문맥상 의도된 번역이나 장 단위 검수 때 확인 필요.

## 다음 작업

- Genesis 1장 문체/용어 검수
- `GEN.1.16`의 `light`/`광명체` 처리 규칙 확정
- Genesis 2-3장 장 단위 검수
- Genesis 4장 장 단위 검수
- Genesis 5장 장 단위 검수
- Genesis 6장 장 단위 검수
- Genesis 7장 장 단위 검수
- Genesis 8장 장 단위 검수
- Genesis 9장 장 단위 검수
- Genesis 10장 장 단위 검수
- Genesis 11장 장 단위 검수
- Genesis 12장 장 단위 검수
- Genesis 13장 장 단위 검수
- Genesis 14장 장 단위 검수
- Genesis 15장 장 단위 검수
- Genesis 16장 장 단위 검수
- Genesis 17장 장 단위 검수
- Genesis 18장 장 단위 검수
- Genesis 19장 장 단위 검수
- Genesis 20장 장 단위 검수
- Genesis 21장 장 단위 검수
- Genesis 22장 장 단위 검수
- Genesis 23장 장 단위 검수
- Genesis 24장 장 단위 검수
- Genesis 25장 장 단위 검수
- Genesis 26장 장 단위 검수
- Genesis 27장 장 단위 검수
- Genesis 28장 장 단위 검수
- Genesis 29장 장 단위 검수
- Genesis 30장 장 단위 검수
- Genesis 31장 장 단위 검수
- Genesis 32장 장 단위 검수
- Genesis 33장 장 단위 검수
- Genesis 34장 장 단위 검수
- Genesis 35장 장 단위 검수
- Genesis 38장 장 단위 검수
- Genesis 39장 초본 생성

## 용어 업데이트

- 적용일: 2026-06-21
- 원칙: `sign`, `signs`는 `표적`이 아니라 `징조`로 번역한다.
- 반영: `GEN.1.14`의 `표적들과`를 `징조들과`로 수정
- DB import 결과: changed existing rows 1, translation review row 1
- 검증: `GEN.1.14` API 응답에 `징조` 포함, `표적` 미포함

## Genesis 2 초본

- 적용일: 2026-06-21
- 범위: `GEN.2.1` - `GEN.2.25`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 56, total target rows 56
- 검증 보고서: `reports/genesis-02-translation-report.md`
- 용어 수정: `rested` 핵심 용어를 `안식`으로 통일

## Genesis 3 초본

- 적용일: 2026-06-21
- 범위: `GEN.3.1` - `GEN.3.24`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 80, total target rows 80
- 검증 보고서: `reports/genesis-03-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/3` 24 verses, 공개 `textKo` rows 0
- 용어 수정: `rested` 핵심 용어를 `안식`으로 통일

## Genesis 4 초본

- 적용일: 2026-06-21
- 범위: `GEN.4.1` - `GEN.4.26`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 106, total target rows 106
- 검증 보고서: `reports/genesis-04-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/4` 26 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 106
- 용어 수: 97

## Genesis 5 초본

- 적용일: 2026-06-21
- 범위: `GEN.5.1` - `GEN.5.32`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 138, total target rows 138
- 검증 보고서: `reports/genesis-05-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/5` 32 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 138
- 용어 수: 113

## Genesis 6 초본

- 적용일: 2026-06-21
- 범위: `GEN.6.1` - `GEN.6.22`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 160, total target rows 160
- 검증 보고서: `reports/genesis-06-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/6` 22 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 160
- 용어 수: 145

## Genesis 7 초본

- 적용일: 2026-06-21
- 범위: `GEN.7.1` - `GEN.7.24`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 184, total target rows 184
- 검증 보고서: `reports/genesis-07-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/7` 24 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 184
- 용어 수: 162

## Genesis 8 초본

- 적용일: 2026-06-21
- 범위: `GEN.8.1` - `GEN.8.22`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 206, total target rows 206
- 검증 보고서: `reports/genesis-08-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/8` 22 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 206
- 용어 수: 189

## Genesis 9 초본

- 적용일: 2026-06-21
- 범위: `GEN.9.1` - `GEN.9.29`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 235, total target rows 235
- 검증 보고서: `reports/genesis-09-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/9` 29 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 235
- 용어 수: 222

## Genesis 10 초본

- 적용일: 2026-06-21
- 범위: `GEN.10.1` - `GEN.10.32`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 267, total target rows 267
- 검증 보고서: `reports/genesis-10-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/10` 32 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 267
- 용어 수: 285

## Genesis 11 초본

- 적용일: 2026-06-21
- 범위: `GEN.11.1` - `GEN.11.32`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 299, total target rows 299
- 검증 보고서: `reports/genesis-11-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/11` 32 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 299
- 용어 수: 316

## Genesis 12 초본

- 적용일: 2026-06-21
- 범위: `GEN.12.1` - `GEN.12.20`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 319, total target rows 319
- 검증 보고서: `reports/genesis-12-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/12` 20 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 319
- 용어 수: 346

## Genesis 13 초본

- 적용일: 2026-06-21
- 범위: `GEN.13.1` - `GEN.13.18`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 337, total target rows 337
- 검증 보고서: `reports/genesis-13-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/13` 18 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 337
- 용어 수: 380

## Genesis 14 초본

- 적용일: 2026-06-21
- 범위: `GEN.14.1` - `GEN.14.24`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 361, total target rows 361
- 검증 보고서: `reports/genesis-14-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/14` 24 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 361
- 용어 수: 409
- 용어 메모: `rested`는 `안식` 계열로 유지. `Amorite`는 공통 어근 `아모리` 검증으로 민족표의 `아모리 족속`과 인물 수식의 `아모리 사람`을 모두 허용.

## Genesis 15 초본

- 적용일: 2026-06-21
- 범위: `GEN.15.1` - `GEN.15.21`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 382, total target rows 382
- 검증 보고서: `reports/genesis-15-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/15` 21 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 382
- 용어 수: 454
- 용어 메모: `Canaanites`는 공통 어근 `가나안` 검증으로 민족표의 `가나안 족속`과 경계 목록의 `가나안 사람들`을 모두 허용.

## Genesis 16 초본

- 적용일: 2026-06-21
- 범위: `GEN.16.1` - `GEN.16.16`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 398, total target rows 398
- 검증 보고서: `reports/genesis-16-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/16` 16 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 398
- 용어 수: 491
- 용어 메모: `judge`, `conceived`처럼 이전 장과 충돌하는 넓은 용어는 `will I judge`, `went in unto Hagar, and she conceived`, `had conceived`로 좁혀 검증.

## Genesis 17 초본

- 적용일: 2026-06-21
- 범위: `GEN.17.1` - `GEN.17.27`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 425, total target rows 425
- 검증 보고서: `reports/genesis-17-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/17` 27 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 425
- 용어 수: 524
- 용어 메모: `stranger`, `ninety years old`처럼 다른 문맥과 충돌한 넓은 검증어는 `shall be a stranger`, `Sarah, that is ninety years old`로 좁혀 검증.

## Genesis 18 초본

- 적용일: 2026-06-21
- 범위: `GEN.18.1` - `GEN.18.33`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 458, total target rows 458
- 검증 보고서: `reports/genesis-18-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/18` 33 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 458
- 용어 수: 564
- 용어 메모: `rest yourselves`는 사용자 지정 `rest/rested=안식` 기준에 맞추어 `안식하소서`로 검증.

## Genesis 19 초본

- 적용일: 2026-06-21
- 범위: `GEN.19.1` - `GEN.19.38`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 496, total target rows 496
- 검증 보고서: `reports/genesis-19-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/19` 38 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 496
- 용어 수: 608
- 용어 메모: `firstborn`, `younger`, `my soul shall live`처럼 이전 장과 충돌하는 넓은 검증어는 구문 단위 또는 공통 어근으로 좁혀 검증.

## Genesis 20 초본

- 적용일: 2026-06-21
- 범위: `GEN.20.1` - `GEN.20.18`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 514, total target rows 514
- 검증 보고서: `reports/genesis-20-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/20` 18 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 514
- 용어 수: 636
- 용어 메모: `bare children`은 창세기 6장과 충돌하지 않도록 `his maidservants; and they bare children` 구문 단위로 좁혀 검증.

## Genesis 21 초본

- 적용일: 2026-06-21
- 범위: `GEN.21.1` - `GEN.21.34`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 548, total target rows 548
- 검증 보고서: `reports/genesis-21-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/21` 34 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 548
- 용어 수: 677
- 용어 메모: `Beer-sheba`, `everlasting God`, `God took him`, `Sheba, and Dedan`, `and Sheba,` 등을 좁은 구문 단위로 검증. `rested=안식` 기준은 기존 창세기 2/8/18 규칙으로 유지.

## Genesis 22 초본

- 적용일: 2026-06-21
- 범위: `GEN.22.1` - `GEN.22.24`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 572, total target rows 572
- 검증 보고서: `reports/genesis-22-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/22` 24 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 572
- 용어 수: 726
- 용어 메모: `offering`은 22장 `burnt offering=번제`와 충돌하지 않도록 `offering unto the Lord`, `his offering` 구문 단위로 좁혀 검증. `Jehovah-jireh`, `thine only son`, `Rebekah` 등은 22장 핵심 구문/고유명사로 고정.

## Genesis 23 초본

- 적용일: 2026-06-21
- 범위: `GEN.23.1` - `GEN.23.20`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 592, total target rows 592
- 검증 보고서: `reports/genesis-23-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/23` 20 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 592
- 용어 수: 755
- 용어 메모: `stranger and a sojourner`, `cave of Machpelah`, `four hundred shekels of silver`, `were made sure` 등을 막벨라 매입 문맥에 맞춘 구문 단위로 검증.

## Genesis 24 초본

- 적용일: 2026-06-21
- 범위: `GEN.24.1` - `GEN.24.67`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 659, total target rows 659
- 검증 보고서: `reports/genesis-24-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/24` 67 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 659
- 용어 수: 811
- 용어 메모: `eldest servant of his house`, `draw water`, `Laban`, `Sarah's tent`, `comforted after his mother's death` 등 리브가 혼인 여정 핵심 구문을 검증. `Lord God`은 `주 하나님`, `covered`는 `덮` 기준에 맞추어 조정.

## Genesis 25 초본

- 적용일: 2026-06-21
- 범위: `GEN.25.1` - `GEN.25.34`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 693, total target rows 693
- 검증 보고서: `reports/genesis-25-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/25` 34 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 693
- 용어 수: 883
- 용어 메모: `Keturah`, `gave up the ghost`, `gathered to his people`, `birthright`, `pottage of lentiles` 등 그두라 자손, 죽음 공식, 야곱과 에서 기사 핵심 구문을 검증. 사용자 지정 `rested = 안식` 기준은 기존 Genesis 2/8/18/21-24 메모와 동일하게 유지.

## Genesis 26 초본

- 적용일: 2026-06-21
- 범위: `GEN.26.1` - `GEN.26.35`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 728, total target rows 728
- 검증 보고서: `reports/genesis-26-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/26` 35 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 728
- 용어 수: 942
- 용어 메모: `Abimelech king of the Philistines`, `Esek`, `Sitnah`, `Rehoboth`, `Shebah`, `Judith`, `grief of mind` 등 이삭의 그랄 체류, 우물 분쟁, 에서의 헷 사람 아내 기사 핵심 구문을 검증. `Rehoboth`는 기존 기준에 따라 `르호보트`로 유지.

## Genesis 27 초본

- 적용일: 2026-06-21
- 범위: `GEN.27.1` - `GEN.27.46`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 774, total target rows 774
- 검증 보고서: `reports/genesis-27-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/27` 46 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 774
- 용어 수: 1008
- 용어 메모: `savoury meat`, `my soul may bless thee`, `dew of heaven`, `fatness of the earth`, `supplanted me`, `daughters of Heth` 등 이삭의 축복과 야곱의 변장, 에서의 탄식, 하란 도피 준비 구문을 검증. `venison=사냥한 고기`, `birthright=장자권` 기준은 기존 Genesis 25 규칙과 동일하게 유지.

## Genesis 28 초본

- 적용일: 2026-06-21
- 범위: `GEN.28.1` - `GEN.28.22`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 796, total target rows 796
- 검증 보고서: `reports/genesis-28-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/28` 22 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 796
- 용어 수: 1055
- 용어 메모: `God Almighty`, `blessing of Abraham`, `ladder`, `angels of God`, `house of God`, `gate of heaven`, `Beth-el`, `vowed a vow`, `tenth` 등 야곱의 밧단아람 파송, 벧엘 꿈, 서원 구문을 검증. 기존 `Padan-aram=밧단아람`, `Beer-sheba=브엘세바`, `Haran=하란` 표기는 유지.

## Genesis 29 초본

- 적용일: 2026-06-21
- 범위: `GEN.29.1` - `GEN.29.35`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 831, total target rows 831
- 검증 보고서: `reports/genesis-29-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/29` 35 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 831
- 용어 수: 1117
- 용어 메모: `Rachel`, `Leah`, `Zilpah`, `Bilhah`, `Reuben`, `Simeon`, `Levi`, `Judah`, `beguiled me`, `left bearing` 등 야곱의 우물 도착, 레아/라헬 혼인, 레아의 출산 기사 핵심 구문을 검증. 기존 `barren=불임`, `affliction=고난`, `flocks=양 떼` 기준은 유지.

## Genesis 30 초본

- 적용일: 2026-06-21
- 범위: `GEN.30.1` - `GEN.30.43`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 874, total target rows 874
- 검증 보고서: `reports/genesis-30-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/30` 43 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 874
- 용어 수: 1158
- 용어 메모: `Dan`, `Naphtali`, `Gad`, `Asher`, `Issachar`, `Zebulun`, `Dinah`, `Joseph`, `mandrakes`, `ringstraked`, `speckled`, `spotted`, `brown` 등 여종 출산, 합환채 교환, 요셉 출산, 품삯 가축 분리 구문을 검증. 기존 `barren=불임`, `left bearing=낳기를 그쳤`, `flocks=양 떼` 기준은 유지.

## Genesis 31 초본

- 적용일: 2026-06-21
- 범위: `GEN.31.1` - `GEN.31.55`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 929, total target rows 929
- 검증 보고서: `reports/genesis-31-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/31` 55 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 929
- 용어 수: 1221
- 용어 메모: `Laban's sons`, `God of Beth-el`, `images`, `camel's furniture`, `custom of women`, `fear of Isaac`, `Jegar-sahadutha`, `Galeed`, `Mizpah` 등 야곱의 도주, 라헬의 드라빔 은닉, 라반과 야곱의 언약 구문을 검증. 사용자 지정 `rested = 안식`, `sign/signs = 징조` 기준은 기존 규칙으로 유지.

## Genesis 32 초본

- 적용일: 2026-06-21
- 범위: `GEN.32.1` - `GEN.32.32`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 961, total target rows 961
- 검증 보고서: `reports/genesis-32-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/32` 32 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 961
- 용어 수: 1283
- 용어 메모: `Mahanaim`, `land of Seir`, `country of Edom`, `two bands`, `God of my father Abraham`, `present for Esau`, `ford Jabbok`, `Peniel`, `Penuel`, `sinew which shrank` 등 에서 대면 준비와 얍복 나루 씨름 구문을 검증. Genesis 32 term warning은 0개.

## Genesis 33 초본

- 적용일: 2026-06-21
- 범위: `GEN.33.1` - `GEN.33.20`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 981, total target rows 981
- 검증 보고서: `reports/genesis-33-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/33` 20 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 981
- 용어 수: 1314
- 용어 메모: `hindermost`, `bowed himself to the ground seven times`, `fell on his neck`, `receive my present`, `dealt graciously with me`, `Succoth`, `Shalem`, `children of Hamor`, `El-elohe-Israel` 등 야곱과 에서의 재회, 예물 수락, 숙곳/세겜 정착 구문을 검증. Genesis 33 term warning은 0개.

## Genesis 34 초본

- 적용일: 2026-06-21
- 범위: `GEN.34.1` - `GEN.34.31`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 1012, total target rows 1012
- 검증 보고서: `reports/genesis-34-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/34` 31 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 1012
- 용어 수: 1365
- 용어 메모: `Shechem the son of Hamor the Hivite`, `defiled her`, `wrought folly in Israel`, `uncircumcised`, `one people`, `slew all the males`, `spoiled the city`, `Canaanites and the Perizzites`, `as with an harlot` 등 디나와 세겜 기사, 할례 조건, 시므온/레위의 보복 구문을 검증. Genesis 34 term warning은 0개.

## Genesis 35 초본

- 적용일: 2026-06-21
- 범위: `GEN.35.1` - `GEN.35.29`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 1041, total target rows 1041
- 검증 보고서: `reports/genesis-35-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/35` 29 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 1041
- 용어 수: 1391
- 용어 메모: `strange gods`, `terror of God`, `El-beth-el`, `Allon-bachuth`, `God Almighty`, `drink offering`, `Ephrath`, `Ben-oni`, `Benjamin`, `Beth-lehem`, `tower of Edar` 등 벧엘 귀환, 라헬의 죽음, 야곱 아들 목록, 이삭의 죽음 구문을 검증. Genesis 35 term warning은 0개.

## Genesis 36 초본

- 적용일: 2026-06-21
- 범위: `GEN.36.1` - `GEN.36.43`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 1084, total target rows 1084
- 검증 보고서: `reports/genesis-36-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/36` 43 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 1084
- 용어 수: 1471
- 용어 메모: `generations of Esau`, `duke/dukes`, `Seir the Horite`, `Edomites`, `reigned in his stead`, `Bela the son of Beor`, `Saul of Rehoboth by the river`, `Baal-hanan`, `Mehetabel`, `Magdiel`, `Iram` 등 에서/에돔 족보와 에돔 왕 목록 구문을 검증. Genesis 36 term warning은 0개.

## Genesis 37 초본

- 적용일: 2026-06-21
- 범위: `GEN.37.1` - `GEN.37.36`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 1120, total target rows 1120
- 검증 보고서: `reports/genesis-37-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/37` 36 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 1120
- 용어 수: 1501
- 용어 메모: `generations of Jacob`, `coat of many colours`, `made obeisance`, `Dothan`, `Ishmeelites`, `Midianites merchantmen`, `twenty pieces of silver`, `Potiphar`, `captain of the guard` 등 요셉의 꿈과 팔림 기사 구문을 검증. Genesis 37 term warning은 0개.

## Genesis 38 초본

- 적용일: 2026-06-22
- 범위: `GEN.38.1` - `GEN.38.30`
- 상태: `ai_translated`
- 공개 여부: `is_public=false`
- DB import 결과: staged rows 1150, total target rows 1150
- 검증 보고서: `reports/genesis-38-translation-report.md`
- 공개 API 확인: `/api/bible/books/gen/chapters/38` 30 verses, 공개 `textKo` rows 0
- 전체 한국어 번역 row: 1150
- 용어 수: 1538
- 용어 메모: `Adullamite`, `Hirah`, `Shuah`, `Er`, `Onan`, `Shelah`, `Tamar`, `Timnath`, `pledge`, `signet`, `bracelets`, `staff`, `scarlet thread`, `Pharez`, `Zarah` 등 유다와 다말 기사 구문을 검증. Genesis 38 term warning은 0개.
