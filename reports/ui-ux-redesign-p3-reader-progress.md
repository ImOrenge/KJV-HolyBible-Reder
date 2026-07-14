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

## 남은 작업

- `ReaderScreen` 데이터 조회·저장·TTS orchestration을 `KjvMvpApp`에서 분리한다.
- 원어 marker 자체의 keyboard/tap action을 context panel에 직접 연결한다.
- TTS 자동 scroll, 복사, 저장, 다중 선택을 자동 interaction test로 고정한다.
- tablet/mobile sheet의 drag snap과 keyboard 회피를 구현한다.
- Expo Reader에 동일한 route params와 새 context surface 계약을 적용한다.
