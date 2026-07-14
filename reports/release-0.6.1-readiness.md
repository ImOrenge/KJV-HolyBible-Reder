# Release 0.6.1 Readiness

작성일: 2026-07-14

## 현재 판정

**ANDROID RELEASE ARTIFACT VERIFIED - 운영 OAuth 설정과 실기기 검증은 남아 있다.**

`main@336db1c6`을 기준으로 첫 로그인 온보딩과 QT 커뮤니티·랭킹 기능을 통합했다. 웹·Expo 빌드, 원격 커뮤니티 API, 마이그레이션, DB lint, 반응형 UI와 EAS production AAB 검증을 통과했다.

## 릴리즈 범위

- 첫 로그인 프로필 온보딩: 닉네임, 이름, 호칭, 프로필 사진.
- 웹·Expo Supabase Google OAuth와 이메일 인증.
- 홈 커뮤니티 탭: QT 나눔, 질문, 관찰, 적용, 관련 구절 토론.
- 커뮤니티 댓글, 도움 반응, 신고, 프로필 표시명과 랭킹 참여 설정.
- 성경 통독 완료와 커뮤니티 참여 기반 포인트·레벨·주간/월간/전체 랭킹.
- 통독 완료 증거 검증과 커뮤니티 데이터 RLS 정책.
- `main`에 이미 포함된 성경 공부 AppShell 및 Reader V2 변경.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 버전 | `0.5.0` | `0.6.1` |
| Android `versionCode` | `5` | `6` |
| Android package | `com.kjvreader` | 유지 |
| 태그 후보 | `v0.5.0` | `v0.6.1` |

## 커뮤니티 마이그레이션

- `20260712141001_qt_community_ranking.sql`
- `20260712141247_qt_community_ranking_indexes.sql`
- `20260712141720_qt_community_authenticated_api.sql`
- `20260712142431_tighten_community_reaction_visibility.sql`
- `20260712143730_align_community_profile_visibility.sql`
- `20260712144549_validate_community_reading_evidence.sql`

## 검증 결과

| 게이트 | 결과 |
| --- | --- |
| `npm run typecheck` | PASS - mobile, web, shared |
| `npm run lint` | PASS |
| `npm run build` | PASS - Next.js 16.2.9, 커뮤니티 API 11개 포함 |
| `npm run expo:doctor` | PASS - 20/20 |
| Expo Android export | PASS - 986 modules, Android Hermes bundle |
| EAS production AAB | PASS - build `c7b504c8-9fe3-4f40-be88-3434c051ef30`, commit `eee2c3db` |
| AAB manifest | PASS - `com.kjvreader`, version `0.6.1`, versionCode `6` |
| AAB signing | PASS - 기존 Play 업로드 인증서 SHA-1/SHA-256 일치 |
| 커뮤니티 원격 스모크 | PASS - 16P/2P, 댓글 1, 도움 1, 랭킹 2 |
| 스모크 사용자 cleanup | PASS - 최근 잔존 테스트 사용자 0명 |
| `supabase migration list --linked` | PASS - 로컬/원격 전체 일치 |
| `supabase db lint --linked --level warning --fail-on error` | PASS - schema errors 0 |
| `npm run structure:mobile` | PASS |
| `npm run style:mobile` | PASS |
| `npm run study-ui:validate` | PASS |
| 390px/1440px 브라우저 | PASS - 커뮤니티 탭 표시, 가로 넘침과 콘솔 오류 없음 |
| `npm audit --omit=dev --audit-level=high` | PASS - high/critical 0, moderate 10 |
| `npm run audit:mobile-clicks` | BLOCKED - 연결된 Android 기기/에뮬레이터 없음 |

## Android production 산출물

- EAS build: `c7b504c8-9fe3-4f40-be88-3434c051ef30` (`FINISHED`)
- EAS source commit: `eee2c3db41f6878238082795f42b502a5d7f4c97`
- AAB: [Expo artifact](https://expo.dev/artifacts/eas/8evrtOEqlPl8MToZ7VB8kNiYT_3zkZRGbl45-UYPCPo.aab)
- AAB SHA-256: `FA8BA7E46DC70756C352B297DC12020B272913AE4BFEC683C9D3475D40C5C4EB`
- Package/version: `com.kjvreader`, `0.6.1 (6)`
- Signing SHA-1: `9F:51:A8:96:1B:EA:0A:35:53:8A:A8:CF:64:D6:3F:23:19:4F:6A:5F`
- Signing SHA-256: `E8:45:72:72:39:60:D4:A4:B4:A8:91:C8:ED:74:6A:9B:46:27:F9:1C:51:0B:8F:E3:E2:C0:EE:3C:2B:37:E9:D0`
- 로컬 검증 파일: `.tmp/release-0.6.1/kjv-reader-note-0.6.1-6.aab` (Git 제외)

## 검증 중 수정한 결함

- 최신 온보딩·Reader V2 구조와 커뮤니티 홈 탭의 import, view type, shared export 충돌을 통합했다.
- 커뮤니티 스모크가 테스트 사용자 삭제 오류를 무시하던 문제를 수정했다.
- 테스트 사용자는 병렬 삭제 대신 순차 삭제하며 각 Admin API 오류를 확인한다.
- 재검증 후 최근 생성된 커뮤니티 스모크 사용자가 0명임을 원격 DB에서 확인했다.

## 외부 릴리즈 게이트

- Supabase URL Configuration의 Site URL과 Redirect URL을 `https://www.kjvreadernote.app` 기준으로 맞춰야 한다.
- Google Cloud OAuth Web Client의 redirect URI는 `https://ntpjrzonhebhgfxeryvt.supabase.co/auth/v1/callback`이어야 한다.
- 연결된 Android 기기 또는 에뮬레이터에서 `audit:mobile-clicks`와 실기기 UI를 확인해야 한다.
- `release/0.6.1` 원격 push, `main` 병합, `v0.6.1` 태그와 배포는 아직 수행하지 않는다.

## 알려진 잔여 위험

- Expo 의존성의 `uuid` 경로에서 moderate 취약점 10건이 보고된다. 강제 자동 수정은 Expo 메이저 다운그레이드를 유발하므로 적용하지 않는다.
- 로컬 `.env`의 기존 `SUPABASE_SERVICE_ROLE_KEY`는 현재 프로젝트 키와 일치하지 않는다. 검증에서는 인증된 Supabase CLI가 반환한 키를 프로세스 메모리에서만 사용했으며 저장소에는 기록하지 않았다.
- 실제 Android/iOS 기기에서 Google OAuth 딥링크, 온보딩 프로필 사진, 커뮤니티 입력 키보드 동작을 최종 확인해야 한다.
