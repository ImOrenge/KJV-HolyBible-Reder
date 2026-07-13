# UI/UX 개편 P0-P1 진행 기록

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

- 웹 URL과 모바일 route params adapter
- typography, elevation, safe area token
- 개편 전 viewport screenshot과 action 수 측정
- component taxonomy와 legacy adapter 계약
- 개인정보 제외 analytics event allowlist
