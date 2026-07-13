# Phase 6: 품질과 출시 게이트

## 목표

rich-text 노트가 보안, 접근성, 동기화, 성능 기준을 충족하는지 확인하고 출시 가능한 상태로 만든다.

## 태스크

- [ ] JSON validator, importer, bodyText extractor unit test를 완료한다.
- [ ] toolbar command, mixed selection, verse node component test를 완료한다.
- [ ] paste sanitize와 raw HTML 차단 test를 완료한다.
- [ ] 모든 text/highlight palette를 라이트/다크 모드 대비 기준으로 점검한다.
- [ ] 스크린리더에서 toolbar, swatch, 후보 listbox를 점검한다.
- [ ] 원격 Supabase 계정 A/B 격리 smoke test를 수행한다.
- [ ] 저장 실패 후 draft, selection, verse node 재시도 흐름을 점검한다.
- [ ] 기존 Markdown-lite 노트, 구절 링크, 리더 이동 회귀를 점검한다.
- [ ] `npm run lint`를 실행한다.
- [ ] `npm run typecheck`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] 웹과 모바일의 핵심 노트 작성 흐름을 수동 smoke test한다.

## 완료 기준

- [ ] 사용자는 주요 서식과 구절 태그를 저장하고 다른 기기에서 다시 볼 수 있다.
- [ ] 서버는 허용되지 않은 JSON node, mark, token, verse key를 거부한다.
- [ ] 다른 사용자는 개인 노트 본문과 연결 구절을 읽거나 변경할 수 없다.
- [ ] 기존 노트와 리더·사전 연결 기능이 회귀하지 않는다.
- [ ] 색상만으로 의미를 전달하지 않고 모든 툴바 제어가 접근 가능하다.

## 출시 산출물

- [ ] migration 적용 기록
- [ ] API/공통 문서 계약 test 결과
- [ ] 웹/Expo smoke 결과
- [ ] 접근성 및 색상 대비 점검 결과
- [ ] 알려진 모바일 editor 제약과 운영 대응 문서
