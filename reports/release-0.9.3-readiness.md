# Release 0.9.3 Readiness

작성일: 2026-08-01

## 현재 판정

**GIT RELEASE READY**

Next.js 동적 함수에서 일반 `Cache-Control`이 플랫폼 기본값으로 덮어써지는 것을 운영에서 확인해, Vercel 동적 함수 전용 `CDN-Cache-Control`로 공유 캐시 정책을 분리한 패치다.

## 캐시 정책

- 브라우저: `Cache-Control: public, max-age=300, stale-while-revalidate=604800`
- Vercel CDN: `CDN-Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
- 대상: 성경 책 목록, 장, 단일 절, 히브리어 사전 목록·상세의 성공 응답
- 제외: 오류, 인증, 개인 노트, 관리 API

## 버전 및 검증

| 항목 | 결과 |
| --- | --- |
| 앱 및 workspace | `0.9.3` |
| Android `versionCode` | `13` |
| 태그 | `v0.9.3` |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| 운영 CDN 캐시 | 배포 후 연속 요청의 `x-vercel-cache: HIT`로 확인 |
