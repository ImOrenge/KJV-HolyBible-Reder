# Release 0.7.1 Readiness

작성일: 2026-07-14

## 현재 판정

**RELEASE CANDIDATE VALIDATION IN PROGRESS**

`develop/2026-07-13-first-login-onboarding@b28732ed`의 UI/UX 개편 통합 결과를 `release/0.7.1`에서 검증한다. 검증과 Android production AAB 확인 전에는 `main` 통합 및 `v0.7.1` 태그를 완료 상태로 간주하지 않는다.

## 릴리즈 범위

- 웹 sidebar 기반 AppShell과 QT 커뮤니티 독립 route 및 내부 탭.
- 모바일 Reader V2 표시 계층, 선택 구절 action sheet와 문맥 복귀 stack.
- 모바일 개인 노트 목록/편집 화면 분리, compact toolbar, draft 복구와 충돌 해결.
- 웹 개인 노트 list/editor/inspector 작업 공간과 생성 dialog.
- 웹 히브리어 사전 2-pane, 검색·필터·선택 단어 URL state와 출현형 강조.
- 개인 노트 snapshot 보존 migration과 원격 노트 저장 계약.
- 모바일 QT 커뮤니티 이전 화면, 신고 동작과 개인정보 비공개 경계.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 및 workspace | `0.6.1` | `0.7.1` |
| Android `versionCode` | `6` | `7` |
| Android package | `com.kjvreader` | 유지 |
| 릴리즈 브랜치 | `release/0.6.1` | `release/0.7.1` |
| 로컬 태그 | 없음 | `v0.7.1` |

## 검증 게이트

| 게이트 | 상태 |
| --- | --- |
| 버전 원본 일치 | PENDING |
| `npm run typecheck` | PENDING |
| `npm run lint` | PENDING |
| `npm run build` | PENDING |
| `npm run expo:doctor` | PENDING |
| Reader/Study UI/Notes/Dictionary 계약 | PENDING |
| 모바일 구조·스타일 | PENDING |
| Expo Android export | PENDING |
| Supabase migration·DB lint | PENDING |
| 원격 onboarding·notes·community smoke | PENDING |
| `npm audit --omit=dev --audit-level=high` | PENDING |
| Android production AAB | PENDING |
| AAB manifest package/version | PENDING |
| AAB upload signing certificate | PENDING |

## Git 흐름

- 소스: `develop/2026-07-13-first-login-onboarding@b28732ed`
- 릴리즈 worktree: `D:\kjv-educator-worktrees\release-0.7.1`
- 통합 대상: `main@c04431ec`
- 원격 push와 배포는 별도 publish/deploy 요청 전까지 수행하지 않는다.

## 외부 확인 게이트

- 실제 Android/iOS 기기에서 OAuth deep link, keyboard, safe area와 커뮤니티 신고 확인창을 점검한다.
- Play Console 업로드 전 최종 AAB의 package, versionCode, versionName과 업로드 인증서를 다시 확인한다.
