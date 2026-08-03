# Release 0.8.0 Readiness

작성일: 2026-07-25

## 현재 판정

**ANDROID RELEASE APK VERIFIED**

`develop/2026-07-25-personal-note-release`의 개인 노트 목록/편집 분리 결과를 `release/0.8.0`에서 검증한다. 진행 중인 QT 커뮤니티 피드 개편은 이 릴리즈에서 제외한다.

## 릴리즈 범위

- 웹 `/app/study/notes` 목록 우선 화면.
- 웹 `/app/study/notes/[noteId]` 독립 편집 화면과 optional inspector.
- 노트 선택·생성·목록 복귀·새로고침·브라우저 history에 대한 `personalNote.noteId` route 복원.
- 노트 목록의 수정일, 본문 요약, 연결 구절, 태그 정보.
- 개인 노트 UI/UX 아키텍처, 구현 플랜, component passport 갱신.

## 제외 범위회원가입·로그인
성경 권·장 이동과 본문 읽기
개인 노트 작성·저장·재접속
히브리어 사전 검색
글자 크기와 모바일 화면 확인

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
| Android preview APK | PASS - EAS build `5ebe8e8d-8be2-4092-87ee-118298049a75` |
| APK package/version/signing/hash | PASS - `com.kjvreader`, `0.8.0` (`8`), v2 signature |
| main fast-forward와 원격 push | PENDING |

## Android 산출물

| 항목 | 값 |
| --- | --- |
| EAS build | `5ebe8e8d-8be2-4092-87ee-118298049a75` |
| 앱 소스 commit | `9fa9920be3be3b5c25b189ddeea82c312c35b17b` |
| EAS artifact | `https://expo.dev/artifacts/eas/qQGFtJLlqRVlzQa_tI7ASrFf9MiWfsd8m4o7_5DXuZ8.apk` |
| 로컬 검증본 | `D:\kjv-educator-artifacts\kjv-reader-note-0.8.0-8.apk` |
| 파일 크기 | `73,252,096 bytes` |
| SHA-256 | `3BAEFFDEFA761623936C9F13F67B143522E38755A11D763E9404E45CD2920049` |
| package | `com.kjvreader` |
| version | `versionName=0.8.0`, `versionCode=8` |
| 서명 방식 | APK Signature Scheme v2 |
| 인증서 SHA-1 | `9F:51:A8:96:1B:EA:0A:35:53:8A:A8:CF:64:D6:3F:23:19:4F:6A:5F` |
| 인증서 SHA-256 | `E8:45:72:72:39:60:D4:A4:B4:A8:91:C8:ED:74:6A:9B:46:27:F9:1C:51:0B:8F:E3:E2:C0:EE:3C:2B:37:E9:D0` |

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
