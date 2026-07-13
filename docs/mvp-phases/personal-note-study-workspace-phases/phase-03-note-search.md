# Phase 3: 노트 검색

## 목표

노트가 많아져도 제목, 본문, 태그, 권, 구절 참조로 다시 찾을 수 있게 한다.

## 태스크

- [ ] title/body_text용 `pg_trgm` index와 tag/link join index를 작성한다.
- [ ] `GET /api/me/notes/search` cursor pagination contract를 구현한다.
- [ ] 일반 검색어, verseKey/구절 표기, tag, book, 상태, sort filter를 구현한다.
- [ ] server highlight 범위 또는 match token 응답을 구현한다.
- [ ] 노트 목록을 remote search 결과와 연결한다.
- [ ] 검색 결과에서 본문, 태그, 구절 참조를 안전하게 강조한다.
- [ ] archived note와 active note의 기본 노출 정책을 구현한다.
- [ ] query/filter/sort 상태를 URL 또는 view state에 보존한다.

## 완료 기준

- [ ] `창조`, `#창 1:10`, 태그명, 권 filter로 같은 note를 찾을 수 있다.
- [ ] 결과는 전체 본문 HTML을 반환하지 않는다.
- [ ] 검색 결과 highlight는 XSS 없이 렌더링된다.

## 검증

- [ ] 검색 필터 조합과 cursor API test를 작성한다.
- [ ] Korean/English/verseKey 검색 smoke를 수행한다.
- [ ] RLS와 query latency를 확인한다.
