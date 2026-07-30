# Release 0.9.0 Readiness

작성일: 2026-07-30

## 현재 판정

**GIT RELEASE READY**

QT 나눔을 레거시 채널에서 분리해 Threads형 공개 소셜 커뮤니티 V2로 전환한 결과를 `release/0.9.0`에서 검증한다.

## 릴리즈 범위

- 비로그인 공개 피드, 프로필, 게시물, 검색 및 SEO 노출.
- 추천·최신·팔로잉 피드와 팔로우, 뮤트, 차단.
- 구절 기반 QT 작성, 댓글·답글, 좋아요, 리포스트·인용, 이미지 1장.
- 온보딩 닉네임·호칭·아바타를 사용하는 커뮤니티 프로필.
- 알림 필터, 운영자 신고 큐, 숨김·복원, 사용자 제한 감사 흐름.
- 레거시 커뮤니티 진입점의 V2 리다이렉트 및 레거시 mutation 폐기.
- 성경 리더 사이드 하단의 QT 커뮤니티·로그인·로그아웃 진입점.
- 서비스 역할 키가 없는 로컬 개발에서도 사용자 JWT와 RLS로 동작하는 Community V2 mutation 경로.

## 제외 범위

- DM.
- 그룹 커뮤니티.
- Android/iOS 스토어 배포와 EAS 바이너리 생성.
- GitHub Release 페이지 및 운영 환경 배포.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 및 workspace | `0.8.0` | `0.9.0` |
| Android `versionCode` | `9` | `10` |
| Android package | `com.kjvreader` | 유지 |
| 릴리즈 브랜치 | `release/0.8.0` | `release/0.9.0` |
| 태그 | `v0.8.0` | `v0.9.0` |

## 검증 게이트

| 게이트 | 상태 |
| --- | --- |
| 버전 원본 일치 | PASS - root/workspace/lock `0.9.0`, Android `versionCode=10` |
| `npm run typecheck` | PASS - web/mobile/shared |
| `npm run lint` | PASS |
| `npm run build` | PASS - Next.js 16.2.11, 17개 정적 페이지 생성 |
| `npm run study-ui:validate` | PASS |
| `npm run structure:mobile` | PASS - QT social community 포함 |
| `npm run expo:doctor` | PASS - 20/20 |
| `npm run db:smoke-community:v2` | PASS - 온보딩, 피드, 관계, 알림, 운영, revision, RLS, DM/group 부재 |
| 실제 Community V2 API smoke | PASS - 공개 SEO·검색·이미지·소셜 동작·운영 숨김/복원·계정 격리 |
| Supabase migration parity | PASS - local/remote `20260730231500`까지 일치 |
| `npm audit --omit=dev --audit-level=high` | WARN - moderate 10, high/critical 0; 자동 전체 수정은 Expo 46 breaking downgrade 요구 |

## 데이터베이스 보강

- Community V2 프로필과 소셜 mutation에 최소 열 권한 및 소유자 RLS를 적용했다.
- 게시물·댓글 idempotency key는 현재 사용자의 scalar lookup 함수로만 조회한다.
- hashtag count는 DB trigger가 관리해 클라이언트의 counter update 권한을 제거했다.
- 알림 row는 신뢰된 outbox trigger가 materialize하며 push 전달은 service-role worker가 계속 담당한다.
- 운영자와 작성자는 필요한 비공개 상태만 RLS로 조회하고, 소프트 삭제는 작성자 식별을 감사용으로 보존한다.

## 릴리즈 운영 경계

- 이 문서는 Git 소스 릴리즈의 준비 상태를 기록한다.
- `main` fast-forward, `v0.9.0` 태그 및 원격 push는 이 문서 commit 이후 릴리즈 절차에서 원격 ref로 검증한다.
- EAS 빌드, 앱 스토어 제출, GitHub Release 페이지, 운영 배포는 별도 승인과 증거가 필요한 후속 결과다.
