# Phase 4: 성경공부 템플릿

## 목표

반복되는 묵상·설교·단어 연구 기록을 일정한 구조로 빠르게 시작하게 한다.

## 태스크

- [ ] 관찰·해석·적용·기도 template을 rich-text JSON으로 정의한다.
- [ ] 설교 준비 template을 정의한다.
- [ ] 히브리어 단어 연구 template을 정의한다.
- [ ] 새 노트 생성 시 template picker를 구현한다.
- [ ] template 적용 시 새 note draft에 deep copy한다.
- [ ] `user_personal_note_templates` table, RLS, CRUD를 추가한다.
- [ ] user template name, preview, duplicate, archive flow를 구현한다.
- [ ] template에 verseReference/noteReference가 있을 때 복제 정책을 정의한다.

## 완료 기준

- [ ] 선택한 template은 새 note의 본문만 초기화하고 기존 note를 바꾸지 않는다.
- [ ] 기본 template은 offline/local draft에서도 시작할 수 있다.
- [ ] 사용자 template은 다른 계정에 노출되지 않는다.

## 검증

- [ ] template deep copy와 JSON validation test를 작성한다.
- [ ] desktop/mobile template picker를 확인한다.
- [ ] template로 생성한 노트의 remote 저장을 smoke test한다.
