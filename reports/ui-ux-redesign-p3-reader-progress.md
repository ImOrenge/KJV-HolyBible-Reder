# UI/UX 개편 P3 Reader 진행 기록

## 구현 범위

- `NEXT_PUBLIC_READER_V2`로 기존 Reader와 새 Reader를 독립 전환한다.
- `ReaderHeader`, `ReaderVerseRow`, `ReaderVerseActions`를 각각 독립 파일로 분리했다.
- 웹 `1440px`에서 `장 탐색 | 최대 760px 본문 | 공부 패널` 3-pane을 사용한다.
- `769~1199px`에서는 선택 구절 패널을 하단 중앙 sheet로 전환한다.
- `768px` 이하에서는 AppShell 상단 바를 Reader 전용 header로 대체하고 하단 action sheet를 사용한다.
- 장 탐색기는 현재 장 주변 최대 12개만 표시하고 전체 장은 장 선택 sheet에서 연다.

## 선택 구절 작업

- 절 탭 직후 `노트 / 원어 / 연결 / 저장` context surface를 연다.
- 원어 출현 데이터가 있는 절에만 `원어` 탭을 표시한다.
- `창 1:1` 원어 탭에서 히브리어, 음역, 발음, 한영 뜻을 표시한다.
- 원어 항목에서 사전으로 이동한 뒤 browser back 시 같은 절과 원어 탭을 복원한다.
- 모바일에서 약 `520ms` long press로 다중 선택 mode에 진입한다.
- 기존 좌우 swipe 장 이동과 long press timer를 분리했다.

## Expo Reader V2

- `EXPO_PUBLIC_READER_V2`로 기존 Expo Reader와 새 native 표시 계층을 독립 전환한다.
- `ReaderHeader`, `ReaderVerseRow`, `ReaderVerseActionsSheet`를 `apps/mobile/src/components/reader`로 분리했다.
- `EN / KR / 동시` segmented control과 한영 동시 본문을 추가했다.
- 절을 약 `520ms` long press하면 다중 선택 mode로 진입한다.
- 단일 구절 action sheet에서 복사, 읽기, 강조, 구절 노트, 번역 의견, 인용 저장, 성경노트를 시작한다.
- 다중 선택 sheet는 복사, 인용 저장, 새 노트, 읽기, 선택 해제를 제공한다.
- action sheet는 TTS player bottom offset, iOS/Android keyboard 회피, 펼침/compact 2단계 drag snap을 적용한다.
- `useMobileReaderController`가 장 조회, 진입 절, 선택 범위, 현재 읽기 절, 첫 절 scroll, 읽음 완료를 소유한다.
- `useMobileReaderTts`가 재생 queue, 반복, 일시정지, 이전/다음 절, 현재 재생 절을 소유한다.
- `packages/shared/src/reader-orchestration.ts`가 웹/모바일 공통 Reader target, 범위 선택, 현재 절, TTS queue 규칙을 제공한다.
- `packages/shared/src/mobile-study-navigation.ts`가 private text를 제외한 모바일 route serializer와 tab/reset/push/pop transition을 제공한다.
- `useMobileStudyNavigation`이 기존 `activeView` 렌더러 앞에서 route stack과 Android hardware back을 관리한다.
- 검색, 노트, 사전, 보관함에서 Reader로 이동할 때 권·장·절과 return target을 보존한다.
- 사전 출현 구절은 해당 절 Reader를 열고 뒤로 가면 동일 사전 항목 route로 복귀한다.
- `PersonalNoteListScreen`과 `PersonalNoteEditorScreen`은 noteId route에 따라 상호 배타 렌더링된다.
- Reader -> 노트 목록 -> 새 노트 편집기 -> 목록 -> Reader stack 복귀를 자동 검증한다.
- TenTap CSS 주입은 bridge `isReady` 이후에만 실행해 Expo Web/느린 WebView 초기화 race를 방지한다.
- 모바일 노트 편집기의 세 줄 toolbar를 compact primary toolbar와 opt-in advanced toolbar로 분리했다.
- TenTap `avoidIosKeyboard`와 전용 `KeyboardAvoidingView`를 연결해 toolbar와 마지막 편집 줄의 keyboard 회피 계약을 추가했다.
- `packages/shared/src/personal-note-draft.ts`가 사용자·노트별 AsyncStorage key, 500ms debounce 저장, 최신 draft 판정과 저장 완료 draft 정리를 제공한다.
- 회원탈퇴와 로컬 데이터 초기화는 사용자별 draft index와 AsyncStorage key scan을 함께 사용해 남은 초안을 제거한다.
- 편집기 header는 임시 저장, 서버 저장 중, 서버 저장 완료, 서버 저장 실패를 live region으로 구분한다.

Expo Web `390x844` 검증:

- 창세기 1장 31절과 `EN / KR / 동시` control이 수평 overflow 없이 표시된다.
- 동시 보기에서 한국어 본문과 KJV 영어 본문이 같은 구절 행에 표시된다.
- 단일 구절 action sheet의 7개 동작과 compact snap state가 노출된다.
- 약 `620ms` long press 후 1개 구절 다중 선택 sheet가 열린다.
- `창세기 1장 -> 2장 -> 1장` 복귀 후 1절이 보이고 현재 위치가 `창세기 1:1`로 유지된다.
- 선택 mode에서 1절과 3절을 누르면 1~3절이 연속 범위로 선택된다.
- Reader의 명령 검색에서 검색 화면을 push하고 이전 버튼으로 창세기 1장에 복귀한다.
- Reader에서 노트 목록과 새 편집기를 왕복할 때 목록과 편집기가 동시에 렌더링되지 않는다.
- 노트 기본 toolbar에서 advanced toolbar를 열고 닫아도 편집 화면과 route stack이 유지된다.
- 저장 버튼 없이 제목을 수정한 뒤 목록으로 나갔다가 같은 노트를 열면 AsyncStorage draft가 복구된다.
- 증거: `reports/ui-ux-redesign-screenshots/expo-reader-v2-mobile-390.png`

## 브라우저 검증

- `1440x1000`
  - 3-pane `210px / 595px / 320px`
  - 집중 읽기에서 좌우 pane 숨김, 본문 `760px`
  - horizontal overflow와 Next.js error overlay 없음
- `1024x900`
  - 장 탐색 `190px`, 본문 `535px`
  - 선택 구절 sheet가 본문 상단과 선택 절을 가리지 않음
  - horizontal overflow 없음
- `390x844`
  - 일반 진입에서 본문 시작점 `130px`
  - 절 탭 시 선택 구절 sheet 즉시 노출
  - 저장 탭의 강조 swatch 5개와 저장한 말씀 action 노출
  - long press 1개 절 선택, quick swipe로 다음 장 이동
  - bottom tab 및 TTS offset 적용, horizontal overflow 없음
- `320x800`, `768x900`
  - 본문 시작점 각각 `130px`, `140px`
  - 번역 segmented control과 icon action이 줄바꿈되지 않음
  - horizontal overflow와 error overlay 없음
- Reader V2 flag off
  - 기존 toolbar와 상·하단 action row 유지
  - `/app/read/exo/2?verse=EXO.2.3` 선택 절 유지

긴 권 탐색 검증:

- `시편 75편`에서 현재 위치 주변 `70~81편` 12개만 표시한다.
- `전체 150장` action으로 기존 전체 장 선택 sheet를 연다.

Reader orchestration 검증:

- `npm run reader:validate`: 진입 target, 역방향 범위 선택, 읽기 line 계산, 선택 mode 자동 scroll 억제, TTS queue/index 경계를 검증한다.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run structure:mobile`, `npm run style:mobile`: 통과.
- `npm run expo:doctor`: 20/20 checks 통과.
- `npm run note-draft:validate`: 사용자/노트 key 격리, 최신 draft 복구, 저장 완료 draft 정리, 손상 JSON 무시를 통과.
- `npm run browser:reader -- --single=true --port=9360`: Reader -> Search -> Reader와 Reader -> Notes -> local draft 저장/복구 -> Reader stack 복귀를 포함해 통과.

## 남은 작업

- 웹 `ReaderScreen` 데이터 조회·저장·TTS orchestration을 `KjvMvpApp`에서 분리한다.
- 원어 marker 자체의 keyboard/tap action을 context panel에 직접 연결한다.
- 실제 clipboard, 원격 저장, 기기 TTS를 Android/iOS interaction test로 고정한다.
- iOS swipe back과 앱 재시작 후 route stack 복원을 Expo Router 전환 단계에서 적용한다.
- Expo Reader V2의 drag snap과 keyboard 회피를 Android/iOS 실제 기기에서 검증한다.
- 모바일 revision conflict를 활성화하기 전에 `replace_user_data_snapshot`의 personal-note delete/reinsert를 보존형 RPC로 교체한다.
