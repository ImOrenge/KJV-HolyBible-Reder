# Phase 7: 집중 모드와 출시 게이트

## 목표

작성 중에는 필요한 본문과 구절만 보이게 하고, 전체 워크스페이스가 안전하고 접근 가능하게 동작하는지 검증한다.

## 태스크

- [ ] notes view에 focus mode 상태와 진입/종료 control을 추가한다.
- [ ] focus mode에서 navigation/list pane을 숨기고 editor와 연결 구절만 유지한다.
- [ ] 연결 구절의 한국어/영어 본문 접기 패널을 구현한다.
- [ ] focus mode layout을 desktop/mobile/large font에서 검증한다.
- [ ] revision, search, template, note link, export 회귀 test를 완료한다.
- [ ] color contrast, toolbar keyboard, screen reader, listbox 동작을 점검한다.
- [ ] Supabase account A/B RLS smoke를 수행한다.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
- [ ] web과 Expo에서 end-to-end 개인 노트 작성·저장·복원·검색·export smoke를 수행한다.

## 완료 기준

- [ ] 집중 모드는 편집 중인 본문을 가리지 않고 언제든 종료할 수 있다.
- [ ] 모든 확장 기능이 private note 경계를 넘지 않는다.
- [ ] 기존 StudyNote, rich-text note, verse link, Hebrew dictionary note insertion이 회귀하지 않는다.
