# Release 0.7.1 Readiness

작성일: 2026-07-14

## 현재 판정

**ANDROID RELEASE ARTIFACT VERIFIED**

`develop/2026-07-13-first-login-onboarding@b28732ed`의 UI/UX 개편 통합 결과를 `release/0.7.1`에서 검증했다. 정적 검사, 웹 production build, Expo export, 원격 Supabase 회귀 검사와 Android production AAB 검증이 통과했다. 실제 Android/iOS 기기 UX와 OAuth deep link는 외부 확인 게이트로 남긴다.

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
| 버전 원본 일치 | PASS - workspace `0.7.1`, Android `versionCode=7` |
| `npm run typecheck` | PASS - web/mobile/shared |
| `npm run lint` | PASS |
| `npm run build` | PASS - Next.js 16.2.9, 17개 route 생성 |
| `npm run expo:doctor` | PASS - 20/20 |
| Reader/Study UI/Notes/Dictionary 계약 | PASS - reader, study UI, lexicon, note draft/client/privacy/snapshot |
| 모바일 구조·스타일 | PASS |
| Expo Android export | PASS - 998 modules, Hermes bundle 생성 |
| Supabase migration·DB lint | PASS - 원격 migration 일치, schema error 없음 |
| 원격 onboarding·notes·community smoke | PASS - 사용자 격리, revision/snapshot, 커뮤니티 정리 확인 |
| `npm audit --omit=dev --audit-level=high` | PASS - high/critical 0, moderate 10 |
| production 웹 반응형 smoke | PASS - community/notes/dictionary 390·1440px, reader 1440px |
| Android production AAB | PASS - EAS build `6d4a1c2b-71bd-4812-9414-88e0a2683b84` |
| AAB 구조 검사 | PASS - bundletool 1.18.3 `validate` |
| AAB manifest package/version | PASS - `com.kjvreader`, `0.7.1` (`7`) |
| AAB upload signing certificate | PASS - 기존 Play upload 인증서와 일치 |

## Android 산출물

| 항목 | 값 |
| --- | --- |
| EAS build | `6d4a1c2b-71bd-4812-9414-88e0a2683b84` |
| 앱 소스 commit | `515cc3bc8164d2e7cc72fbc35ee3ea03b6af9ef2` |
| EAS artifact | `https://expo.dev/artifacts/eas/72i9PAALSD5kRAsWXL9hbofKatc06aBLmjvv5zoCuR8.aab` |
| 로컬 검증본 | `.tmp/release-0.7.1/kjv-reader-note-0.7.1-7.aab` |
| 파일 크기 | `49,929,322 bytes` |
| SHA-256 | `DBFDA8B5FF17076FE093F734F5A701572CA9D637AAAF28D56DB80FD15410A2C0` |
| package | `com.kjvreader` |
| version | `versionName=0.7.1`, `versionCode=7` |
| 인증서 SHA-1 | `9F:51:A8:96:1B:EA:0A:35:53:8A:A8:CF:64:D6:3F:23:19:4F:6A:5F` |
| 인증서 SHA-256 | `E8:45:72:72:39:60:D4:A4:B4:A8:91:C8:ED:74:6A:9B:46:27:F9:1C:51:0B:8F:E3:E2:C0:EE:3C:2B:37:E9:D0` |

## Git 흐름

- 소스: `develop/2026-07-13-first-login-onboarding@b28732ed`
- 릴리즈 worktree: `D:\kjv-educator-worktrees\release-0.7.1`
- 통합 대상 시작점: `main@c04431ec`
- 원격 push와 배포는 별도 publish/deploy 요청 전까지 수행하지 않는다.

## 잔여 게이트와 알려진 위험

- 실제 Android/iOS 기기에서 OAuth deep link, keyboard, safe area와 커뮤니티 신고 확인창을 점검한다.
- 브라우저 자동 검증은 production 서버의 390px/1440px viewport에서 통과했지만 실제 기기의 OS별 입력기와 브라우저 chrome은 별도 확인한다.
- audit의 moderate 10건은 Expo/xcode/uuid 의존성 경로이며 high/critical 취약점은 없다. 강제 수정은 Expo major downgrade를 요구하므로 이번 릴리즈에서는 적용하지 않는다.
- 로컬 `.env`의 service-role 값은 현재 원격 프로젝트 키와 일치하지 않는다. 원격 DB 검증은 인증된 Supabase CLI에서 받은 임시 키로 수행했으며 키를 파일에 저장하지 않았다.
- 원격 push, Play Console 업로드와 실제 배포는 이 릴리즈 준비 범위에 포함하지 않는다.
