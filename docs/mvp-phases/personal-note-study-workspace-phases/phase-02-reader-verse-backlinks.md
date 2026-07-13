# Phase 2: 리더 구절 역참조

## 목표

리더에서 현재 구절에 연결된 개인 노트를 빠르게 찾고 해당 노트로 이동한다.

## 태스크

- [ ] `user_id, verse_key` 역참조 index를 추가한다.
- [ ] `GET /api/me/verse-notes`를 구현한다.
- [ ] active note만 반환하고 excerpt 길이를 제한한다.
- [ ] result에 note title, excerpt, tag, updatedAt, link source를 포함한다.
- [ ] reader 선택 구절 상세에 역참조 섹션을 추가한다.
- [ ] 노트 결과 click이 정확한 note와 verse context를 열게 한다.
- [ ] 10개 초과 시 노트 검색의 verse filter로 이동하게 한다.

## 완료 기준

- [ ] `GEN.1.10`과 연결된 개인 노트를 reader에서 볼 수 있다.
- [ ] 다른 사용자의 노트는 결과에 포함되지 않는다.
- [ ] reader, inline-tag, dictionary 출처의 연결이 모두 표시된다.

## 검증

- [ ] verse key별 empty, one, many 결과 API test를 작성한다.
- [ ] reader desktop/mobile에서 이동과 빈 상태를 확인한다.
- [ ] 대량 link 데이터에서 query plan과 응답 시간을 확인한다.
