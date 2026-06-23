# DB 성경 데이터 탑재 페이즈 문서

이 폴더는 [`DB-plan.Md`](../../DB-plan.Md)의 데이터베이스 설계를 실제 성경전서 탑재 작업으로 전환하기 위한 실행 문서 모음이다. 데이터 원천은 CrossWire의 `KJV` SWORD 모듈로 고정한다.

## 공통 전제

- 영어 원문 기준 데이터는 CrossWire `KJV` 모듈이다.
- KJV 원문은 읽기 전용 기준 데이터로 취급하고 앱에서 직접 수정하지 않는다.
- DB에는 MVP 기준으로 절 단위 plain text를 먼저 탑재한다.
- 원본 모듈, 모듈 메타데이터, 변환 산출물, 검증 리포트는 재현 가능하게 보존한다.
- 한국어 자체 번역은 영어 KJV 탑재 완료 후 별도 상태 관리 테이블에서 점진적으로 생성한다.
- 사용자 읽기 기록, 강조, 인용 구절은 `verse_key`와 원문 verse id에 연결한다.

## 페이즈 목록

| Phase | 파일 | 핵심 목표 | 완료 게이트 |
| --- | --- | --- | --- |
| 1 | [phase-01-source-policy-and-snapshot.md](./phase-01-source-policy-and-snapshot.md) | CrossWire KJV 모듈 소스, 라이선스, 원본 스냅샷 확정 | 필수 |
| 2 | [phase-02-schema-and-migrations.md](./phase-02-schema-and-migrations.md) | 성경 본문 탑재용 DB 스키마와 migration 준비 | 필수 |
| 3 | [phase-03-book-metadata-and-keys.md](./phase-03-book-metadata-and-keys.md) | 66권 메타데이터와 `verse_key` 규칙 확정 | 필수 |
| 4 | [phase-04-crosswire-extraction-normalization.md](./phase-04-crosswire-extraction-normalization.md) | CrossWire 모듈에서 절 단위 normalized 데이터 생성 | 필수 |
| 5 | [phase-05-import-and-integrity-validation.md](./phase-05-import-and-integrity-validation.md) | DB import와 구조/본문 무결성 검증 | 필수 |
| 6 | [phase-06-app-repository-switch.md](./phase-06-app-repository-switch.md) | fixture 리더를 DB 기반 KJV 리더로 전환 | 필수 |
| 7 | [phase-07-korean-translation-pipeline.md](./phase-07-korean-translation-pipeline.md) | 한국어 자체 번역 생성/검수 파이프라인 준비 | 후속 필수 |
| 8 | [phase-08-search-operations-release-gates.md](./phase-08-search-operations-release-gates.md) | 검색, 백업, 재탑재, 공개 출시 게이트 정리 | 필수 |

## 최종 산출물

- `supabase/migrations/*` DB schema, index, RLS migration
- `supabase/seeds/bible_books_seed.sql`
- `data/crosswire/kjv/raw/*` 원본 모듈 스냅샷
- `data/crosswire/kjv/normalized/kjv-verses.jsonl`
- `scripts/import-kjv.ts`
- `scripts/validate-kjv.ts`
- `reports/kjv-import-validation.md`
- 앱의 DB 기반 `BibleRepository` 구현
- CrossWire KJV 출처/라이선스 고지 문서

## 공통 체크리스트

- [ ] CrossWire `KJV` 모듈을 데이터 원천으로 명시한다.
- [ ] 원본 파일과 변환 파일을 구분해 저장한다.
- [ ] import script는 재실행 가능해야 한다.
- [ ] 같은 `verse_key`를 중복 삽입하지 않는다.
- [ ] 66권, 1,189장, 31,102절 기준을 검증한다.
- [ ] CrossWire 모듈에서 verse가 아닌 제목, 주석, Strong/morphology markup을 본문 plain text에 섞지 않는다.
- [ ] 원본 모듈 메타데이터와 라이선스 고지를 앱/문서에 남긴다.
- [ ] 공개 출시 전 KJV 사용 가능 범위와 지역별 이슈를 재확인한다.
- [ ] fixture 본문과 실제 KJV 본문이 섞여 보이지 않도록 전환 게이트를 둔다.
- [ ] 한국어 번역은 `approved` 전까지 기본 공개 본문으로 노출하지 않는다.

## 참고 자료

- CrossWire KJV module info: <https://crosswire.org/sword/modules/ModInfo.jsp?modName=KJV>
- CrossWire Bible Texts and Translations: <https://www.crosswire.org/sword/modules/ModDisp.jsp?modType=Bibles>
- CrossWire OSIS overview: <https://crosswire.org/osis/>
- CrossWire KJV background: <https://wiki.crosswire.org/CrossWire_KJV>
