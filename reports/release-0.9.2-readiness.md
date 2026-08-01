# Release 0.9.2 Readiness

작성일: 2026-08-01

## 현재 판정

**GIT RELEASE READY**

0.9.1 운영 검증에서 공개 성경 API의 서버 데이터 캐시는 확인됐지만 CDN 응답 헤더가 `max-age=0`으로 남아 있음을 발견해 보완한 후속 패치다.

## 릴리즈 범위

- 성경 책 목록, 장 본문, 단일 절, 히브리어 사전 목록·상세 성공 응답에 CDN 공유 캐시 적용.
- 브라우저 5분 캐시, CDN 1일 캐시, 7일 stale-while-revalidate 정책 적용.
- 오류 응답과 개인 노트·인증·관리 API는 공유 캐시에서 제외.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 및 workspace | `0.9.1` | `0.9.2` |
| Android `versionCode` | `11` | `12` |
| 릴리즈 브랜치 | `release/0.9.1` | `release/0.9.2` |
| 태그 | `v0.9.1` | `v0.9.2` |

## 검증 게이트

| 게이트 | 상태 |
| --- | --- |
| 버전 원본 일치 | PASS - root/workspace/lock `0.9.2`, Android `versionCode=12` |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| 운영 응답 캐시 | PASS - 배포 후 공개 API 응답 헤더와 CDN HIT로 확인 |
