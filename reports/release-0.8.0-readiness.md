# Release 0.8.0 Readiness

작성일: 2026-07-25

## 현재 판정

**RELEASE VALIDATION IN PROGRESS**

`develop/2026-07-25-personal-note-release`의 개인 노트 목록/편집 분리 결과를 `release/0.8.0`에서 검증한다. 진행 중인 QT 커뮤니티 피드 개편은 이 릴리즈에서 제외한다.

## 릴리즈 범위

- 웹 `/app/study/notes` 목록 우선 화면.
- 웹 `/app/study/notes/[noteId]` 독립 편집 화면과 optional inspector.
- 노트 선택·생성·목록 복귀·새로고침·브라우저 history에 대한 `personalNote.noteId` route 복원.
- 노트 목록의 수정일, 본문 요약, 연결 구절, 태그 정보.
- 개인 노트 UI/UX 아키텍처, 구현 플랜, component passport 갱신.

## 제외 범위

- QT 커뮤니티 Threads형 피드와 작성 모달.
- QT thread detail, 답글, 커뮤니티 V2 API와 migration.
- 진행 중인 QT 관련 웹·모바일 컴포넌트 변경.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 및 workspace | `0.7.1` | `0.8.0` |
| Android `versionCode` | `7` | `8` |
| Android package | `com.kjvreader` | 유지 |
| 릴리즈 브랜치 | `release/0.7.1` | `release/0.8.0` |
| 태그 | `v0.7.1` | `v0.8.0` |

## 검증 게이트

| 게이트 | 상태 |
| --- | --- |
| 버전 원본 일치 | PASS - workspace `0.8.0`, Android `versionCode=8` |
| `npm run typecheck` | PASS - web/mobile/shared |
| `npm run lint` | PASS |
| `npm run build` | PASS - Next.js 16.2.9, 17개 app route 생성 |
| Study UI/Notes 계약 | PASS - study UI, note client/draft/privacy/snapshot |
| 모바일 구조 | PASS |
| `npm run expo:doctor` | PASS - 20/20 |
| Expo SDK 57 patch 호환성 | PASS - Expo 권장 patch 버전으로 동기화 |
| Next.js 보안 patch | PASS - `16.2.11` |
| `npm audit --omit=dev --audit-level=high` | WARN - high 4, moderate 10; 남은 항목은 Next/Expo 전이 의존성의 강제 breaking fix 경로 |
| Android preview APK | PENDING |
| APK package/version/signing/hash | PENDING |
| main fast-forward와 원격 push | PENDING |

## Android 산출물

| 항목 | 값 |
| --- | --- |
| EAS build | PENDING |
| EAS artifact | PENDING |
| 로컬 검증본 | PENDING |
| 파일 크기 | PENDING |
| SHA-256 | PENDING |
| package | `com.kjvreader` |
| version | `versionName=0.8.0`, `versionCode=8` |
| 인증서 | PENDING |

## Git 흐름

- feature: `feat/2026-07-25-personal-note-release@da4708bf`
- develop: `develop/2026-07-25-personal-note-release@da4708bf`
- release worktree: `D:\kjv-educator-worktrees\release-0.8.0`
- 통합 대상 시작점: `main@0f377f9d`
- 원래 main의 QT 작업은 named stash로 보존한 뒤 릴리즈 push 후 복원한다.

## 잔여 게이트와 알려진 위험

- npm audit는 production 의존성에서 moderate 10건, high 4건을 보고한다. 직접 Next.js 권고는 `16.2.11`로 갱신했으며 남은 PostCSS/Sharp/Expo 전이 경로의 자동 수정은 Next 9 또는 Expo 46으로의 breaking downgrade를 요구하므로 적용하지 않는다.
- 실제 Android 기기의 입력기, safe area, 인증 세션은 설치 후 수동 smoke가 필요하다.
- 개인 노트 원격 저장은 기존 Supabase 계약을 유지하며 이번 릴리즈는 migration을 추가하지 않는다.
