# Phase 6: 내보내기와 백업

## 목표

사용자가 자신의 개인 성경공부 데이터를 완전 백업하거나 읽기 쉬운 형식으로 보관하게 한다.

## 태스크

- [ ] versioned JSON export schema와 manifest를 정의한다.
- [ ] Markdown ZIP note renderer와 파일명 규칙을 구현한다.
- [ ] 선택 노트 PDF read-only renderer를 구현한다.
- [ ] export job table 또는 queue와 15분 만료 download URL을 구현한다.
- [ ] JSON/ZIP/PDF 요청별 인증, 소유권, rate limit을 적용한다.
- [ ] export log에서 본문을 제외한다.
- [ ] account deletion flow에 JSON export 진입점을 추가한다.
- [ ] export 실패, 만료, 재시도 UI를 구현한다.
- [ ] JSON import는 명시적으로 범위 밖임을 UI와 문서에 표시한다.

## 완료 기준

- [ ] JSON은 note document, revision metadata, tags, verse links, note links를 포함한다.
- [ ] Markdown ZIP은 외부 Markdown viewer에서 읽을 수 있다.
- [ ] 다른 사용자는 export job이나 download URL을 사용할 수 없다.

## 검증

- [ ] 작은/큰 account export와 URL 만료를 test한다.
- [ ] archived note와 verse/node link가 export에 포함되는지 확인한다.
- [ ] export audit log에 본문이 없는지 점검한다.
