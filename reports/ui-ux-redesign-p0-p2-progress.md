# UI/UX 개편 P0-P2 진행 기록

## 기준

- 기록일: 2026-07-13
- 작업 브랜치: `develop/2026-07-13-first-login-onboarding`
- 시작 커밋: `408dcfc1`
- 기준 문서: `docs/mvp-phases/bible-study-ui-ux-redesign-plan.md`

## P0 온보딩 게이트

### 완료 증거

- `supabase migration list --linked`
  - local `20260713100929`
  - remote `20260713100929`
- `npm run db:smoke-onboarding`
  - private profile 자기 계정 조회 성공
  - 타 계정 private profile 조회/수정 차단
  - authenticated 사용자 public profile 조회 성공
  - nickname unique constraint 확인
  - `profile-avatars` bucket 설정과 네 개 RLS policy 확인
  - transaction rollback으로 smoke 데이터 복원

### 남은 게이트

- 웹 API를 통한 nickname 중복 `409` 응답 검증
- avatar API의 MIME, signature, 2MB 제한 검증
- 완료 사용자의 웹/모바일 재로그인 우회 검증
- 계정 삭제 시 profile과 avatar object 정리 검증
- Android/iOS 실제 기기 image picker, keyboard, 재시도 검증

## P1 공통 계약

### 구현

- `packages/shared/src/study-ui.ts`
  - `StudyContext`, `StudyContextSource`, `StudyReturnTarget`
  - 성경 권/장/구절 키와 내부 복귀 경로 validation
  - query parse/serialize와 panel parse
  - query 직렬화에서 `selectedText` 제외
  - `uiShellV2`, `readerV2`, `notesV2` flag resolver
  - light/dark semantic color token
  - spacing, touch target, sidebar, scripture 폭, radius, line-height token
- 웹 `NEXT_PUBLIC_*` flag adapter
- 모바일 `EXPO_PUBLIC_*` flag adapter

### 자동 검증

- `npm run study-ui:validate`
  - context validation
  - 구절 중복 제거
  - 잘못된 권/장/구절/외부 복귀 경로 차단
  - private selected text query 제외
  - feature flag normalization
  - semantic token 주요 값 확인
- `npm run typecheck`
  - `@kjv/mobile` 통과
  - `@kjv/web` 통과
  - `@kjv/shared` 통과
- `npm run lint`
  - 웹 ESLint 통과
- `npm run build`
  - Next.js production build와 `/onboarding`, `/api/onboarding`, `/api/onboarding/avatar` route 생성 통과
- `npm run expo:doctor`
  - Expo 프로젝트 검사 20/20 통과

### 남은 작업

- 모바일 route params adapter
- typography, elevation, safe area token
- 개편 전 viewport screenshot과 action 수 측정
- 전체 기존 UI의 component taxonomy 분류

## P2 AppShell과 탐색

### 구현

- 웹 `StudyAppShell`
  - `1024px` 이상 232px sidebar, `768~1023px` 72px sidebar
  - `767px` 이하 오늘/성경/공부/보관함/설정 5개 하단 탐색
  - 상단 본문 검색, 명령 검색, profile account slot
  - 현재 화면의 `aria-current`와 좌측 indicator
  - 기존 `KjvMvpApp`의 controlled `activeView` adapter
  - `/app?view=` URL과 browser history 연결
- Expo 앱
  - 오늘/성경/공부/보관함/설정 5개 하단 탭
  - 기존 빠른 이동을 header 명령 검색으로 이동
  - feature flag off에서 기존 하단 탐색 유지
- 공통
  - legacy view와 목표 route/5영역 mapping
  - note body, 선택 본문, 검색 원문을 받지 않는 navigation event allowlist

### 브라우저 검증

- 웹 `NEXT_PUBLIC_UI_SHELL_V2=1`, `http://127.0.0.1:3003/app`
  - `320`, `390`, `1440px`에서 horizontal overflow 없음
  - sidebar, mobile 5-tab, active indicator, account slot 렌더링 확인
  - 노트와 히브리어 사전 URL 전환 및 browser back 확인
  - 명령 검색 필터와 화면 이동 확인
  - desktop dialog 중앙 정렬, mobile command sheet 좌우/하단 12px 확인
- 웹 feature flag off, `http://127.0.0.1:3005/app`
  - 새 Shell 미렌더링, 기존 header/tabbar 유지
  - console error 없음
- Expo Web `EXPO_PUBLIC_UI_SHELL_V2=1`, `http://127.0.0.1:8084`
  - 비회원 진입 후 5개 탭 렌더링 확인
  - 공부, 보관함, 설정, 명령 검색, 히브리어 사전 이동 확인
  - `EXPO_PUBLIC_KJV_API_BASE_URL=http://127.0.0.1:3003`에서 창세기 1장 API `200`
  - console error와 horizontal overflow 없음
  - React Native Web 기존 `shadow*` deprecation warning 1건은 별도 정리 대상
- 캡처
  - `reports/ui-ux-redesign-screenshots/web-desktop-1440.png`
  - `reports/ui-ux-redesign-screenshots/web-mobile-390.png`
  - `reports/ui-ux-redesign-screenshots/expo-mobile-390.png`

### 남은 작업

- 웹 목표 `/app/...` route와 forward navigation
- 모바일 tab/stack router, Android back, iOS swipe back
- sync/TTS mini-player Shell slot과 safe-area/keyboard 책임 분리
- `768`, `1024px` 캡처와 Android/iOS 실제 기기 검증
- Reader, Notes, Dictionary를 legacy adapter에서 독립 screen/pane으로 분리
