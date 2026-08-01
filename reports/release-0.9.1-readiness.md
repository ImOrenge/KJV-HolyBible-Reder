# Release 0.9.1 Readiness

작성일: 2026-08-01

## 현재 판정

**GIT RELEASE READY**

웹 리더의 화면 전환 성능, 공개 성경 색인, AdSense 로딩 범위와 공개 응답 캐시 정책을 개선한 패치 릴리즈다.

## 릴리즈 범위

- `/app` 내부 화면 전환에서 불필요한 서버 탐색과 중복 공개 성경 요청 제거.
- 공개 성경 장·사전 응답에 공유 캐시와 브라우저 재검증 정책 적용.
- 리더의 반복 레이아웃 측정 제거와 IntersectionObserver 기반 절 관측.
- 노트 편집기 지연 로딩으로 초기 앱 번들 분리.
- 공개 성경 1,189개 장의 SSR 본문, 고유 metadata, canonical과 sitemap 노출.
- `ads.txt` 제공, AdSense 스크립트의 랜딩 전용 지연 로딩, 개인정보 광고 쿠키 고지.

## 제외 범위

- AdSense 콘솔의 CMP 게시, 페이지 제외와 사이트 재검토 승인.
- Google Search Console의 sitemap 제출 및 색인 처리 결과.
- Android/iOS 스토어 제출과 EAS 바이너리 생성.
- GitHub Release 페이지 수동 생성.

## 버전

| 항목 | 이전 | 대상 |
| --- | --- | --- |
| 앱 및 workspace | `0.9.0` | `0.9.1` |
| Android `versionCode` | `10` | `11` |
| Android package | `com.kjvreader` | 유지 |
| 릴리즈 브랜치 | `release/0.9.0` | `release/0.9.1` |
| 태그 | `v0.9.0` | `v0.9.1` |

## 검증 게이트

| 게이트 | 상태 |
| --- | --- |
| 버전 원본 일치 | PASS - root/workspace/lock `0.9.1`, Android `versionCode=11` |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |

## 성능 및 공개 노출 근거

- 대시보드에서 리더로 전환하는 4배 CPU·Slow 4G 측정에서 INP가 494ms에서 62ms로 감소했다.
- 같은 전환에서 CLS가 0.214에서 0으로 감소했다.
- sitemap 생성 대상은 정적 페이지 4개와 KJV 전체 1,189개 장이다.
- 개인 노트·인증·관리 API는 공개 캐시 대상에서 제외한다.

## 릴리즈 운영 경계

- `main` fast-forward, `v0.9.1` 태그와 원격 push 후 원격 ref를 검증한다.
- Git push로 연결된 Vercel 배포 결과는 운영 URL의 `ads.txt`, sitemap, reader metadata로 별도 확인한다.
- AdSense 승인 여부는 Google의 콘텐츠·정책 심사를 거치므로 이 Git 릴리즈만으로 보장하지 않는다.
