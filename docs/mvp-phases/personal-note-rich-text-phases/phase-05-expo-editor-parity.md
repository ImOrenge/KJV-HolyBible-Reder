# Phase 5: Expo 편집기 동등성

## 목표

Expo 앱에서 웹과 같은 JSON 문서, 서식, 구절 태그를 편집할 수 있게 하고, 한글 입력과 모바일 키보드 동작을 검증한다.

## 태스크

- [ ] Expo SDK 57의 Expo Dev Client에서 TenTap 최소 편집기를 검증한다.
- [ ] 공통 JSON schema와 token을 native editor extension으로 매핑한다.
- [ ] native undo/redo, 굵게, 기울임, 밑줄을 연결한다.
- [ ] 글자 크기, 글자색, 형광, 정렬 menu를 구현한다.
- [ ] 색상과 형광 bottom sheet를 구현한다.
- [ ] keyboard inset, scroll, selection 유지 동작을 구현한다.
- [ ] 구절 자동완성 후보를 native sheet에서 선택해 verse node로 삽입한다.
- [ ] WebView가 rich-text editing surface 밖으로 확장되지 않음을 확인한다.
- [ ] 입력 지연, 키보드 회피, 스크롤을 측정해 WebView UX 비용을 평가한다.
- [ ] 지원 기준을 넘지 못할 때 교체 가능한 editor adapter 경계를 문서화한다.

## 완료 기준

- [ ] 동일 노트를 웹과 모바일에서 열어도 서식과 verse node가 유지된다.
- [ ] 한글 IME 조합 중 selection, toolbar, 자동완성이 깨지지 않는다.
- [ ] 모바일 툴바와 키보드가 편집 본문 또는 후보 목록을 가리지 않는다.
- [ ] Expo Go의 기본 확인과 Dev Client 출시 검증이 구분된다.

## 검증

- [ ] Android/iOS physical device 또는 simulator에서 입력/저장을 확인한다.
- [ ] 라이트/다크 모드와 큰 시스템 글꼴에서 layout을 확인한다.
- [ ] 장문 노트에서 scroll, undo/redo, paste 성능을 측정한다.
- [ ] 웹에서 저장한 서식 노트를 모바일에서, 모바일에서 저장한 노트를 웹에서 확인한다.
