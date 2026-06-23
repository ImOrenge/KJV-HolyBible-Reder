# Phase 08: 검색, 운영, 공개 출시 게이트

## 목표

CrossWire KJV 전체 본문 탑재 후 검색 성능, 백업, 재탑재, 라이선스 고지, 공개 출시 기준을 정리한다.

## 입력

- 검증 완료된 `bible_verses_en`
- 앱 DB repository
- Supabase 운영 환경
- CrossWire source snapshot report

## 산출물

- `supabase/migrations/008_create_search_indexes.sql`
- `scripts/reimport-kjv.ts`
- `scripts/check-kjv-drift.ts`
- `docs/kjv-attribution-and-license.md`
- `docs/db-backup-policy.md`
- `docs/db-reimport-runbook.md`
- `reports/release-db-readiness.md`

## 작업 체크리스트

- [ ] 영어 KJV full text search strategy를 적용한다.
- [ ] `bible_verses_en.search_vector_en` 생성 방식을 확정한다.
- [ ] `text_en` update 시 search vector가 갱신되는 trigger 또는 batch를 만든다.
- [ ] 권/장 필터와 text search를 함께 쓰는 query를 검증한다.
- [ ] 한국어 승인본이 생기면 `pg_trgm` 또는 별도 검색 엔진 적용 시점을 정한다.
- [ ] CrossWire KJV attribution 문서를 작성한다.
- [ ] 앱 footer, 설정 화면, about 화면 중 출처 표시 위치를 정한다.
- [ ] DB backup 주기와 복구 절차를 정한다.
- [ ] 원문 재탑재 runbook을 작성한다.
- [ ] CrossWire 새 버전 발견 시 drift 비교 절차를 작성한다.
- [ ] staging에서 production으로 migration/import 순서를 문서화한다.
- [ ] 공개 출시 전 DB readiness report를 작성한다.

## 검색 체크리스트

- [ ] `God` 검색이 빠르게 응답한다.
- [ ] `Jesus` 검색이 빠르게 응답한다.
- [ ] `kingdom of heaven` 같은 phrase 검색 요구사항을 정한다.
- [ ] 검색 결과가 `book_order, chapter, verse` 순서로 정렬된다.
- [ ] 검색 결과에서 리더 해당 절로 이동할 수 있다.
- [ ] 검색 결과에서 강조/인용 저장을 할 수 있다.
- [ ] 검색 API가 빈 검색어와 너무 짧은 검색어를 안전하게 처리한다.

## 운영 체크리스트

- [ ] 원본 모듈 checksum을 release report에 포함한다.
- [ ] normalized 파일 checksum을 release report에 포함한다.
- [ ] import validation report를 release report에 첨부한다.
- [ ] production import 전 DB backup을 수행한다.
- [ ] production import 후 66권, 1,189장, 31,102절 검증을 다시 수행한다.
- [ ] 사용자 데이터 테이블이 원문 재탑재 중 삭제되지 않는지 검증한다.
- [ ] source module/version 변경 시 앱 about 정보도 갱신한다.
- [ ] 실패 시 rollback 또는 이전 snapshot 복원 절차가 있다.

## 공개 출시 게이트

- [ ] CrossWire KJV 출처와 라이선스 고지가 앱 또는 문서에서 확인된다.
- [ ] DB validation report가 통과 상태다.
- [ ] staging과 production의 row count가 일치한다.
- [ ] fixture 본문이 공개 환경에서 노출되지 않는다.
- [ ] 사용자 데이터 RLS가 활성화되어 있다.
- [ ] 비로그인 사용자가 개인 데이터 API에 접근할 수 없다.
- [ ] 성경 원문 public read 정책이 의도대로 동작한다.
- [ ] 관리자 외 사용자는 원문 본문을 수정할 수 없다.
- [ ] 백업과 복원 절차를 한 번 이상 리허설했다.
- [ ] 재탑재 runbook이 최신 상태다.

## 완료 기준

- 검색과 리더가 전체 CrossWire KJV 데이터에서 안정적으로 동작한다.
- 운영 환경에 원본/정규화/import/검증 이력이 남아 있다.
- 공개 출시 전 라이선스, 보안, 백업, 재탑재 게이트가 명확하다.
