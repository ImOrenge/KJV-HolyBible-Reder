# 랜딩 감사 수정 결과

## Agentic Run Packet

- Mode: repair + copy-pass
- Target: `/` public landing
- Date: 2026-06-23
- Source audits:
  - `reports/landing-page-pro-audit.md`
  - `reports/landing-copy-style-check.md`
- Current status: complete
- Next action: 배포 전 실제 운영 도메인에서 SEO/social preview 확인

## 반영 내역

### P1 Hydration Mismatch 수정

- `src/components/landing-page.tsx`의 inline `dangerouslySetInnerHTML` reveal bootstrap을 제거했다.
- reveal 동작은 `LandingRevealController` 한 곳에서만 처리하도록 정리했다.
- 브라우저 재검증 결과 console error/warning 없음.

### 카피 문체 수정

- Hero punch를 더 짧은 제품 약속으로 교체했다.
  - `읽던 자리와 붙잡은 구절을 한 리더노트에.`
- nav/section label을 내부 기획어보다 사용자 관점에 가깝게 조정했다.
  - `문제` -> `왜 필요한가`
  - `공부 흐름` -> `사용 흐름`
  - `실제 앱 UI` -> `앱 화면`
  - `핵심 이점` -> `읽기와 기록`
- `흐름`, `남기다`, `TTS` 반복을 줄였다.
- `TTS 듣기`는 랜딩 카피에서 `말씀 듣기`로 바꿨다.

### Trust Note 추가

- final CTA 하단에 KJV/CrossWire 출처 및 지역별 권리 확인 문구를 추가했다.
- 문구는 CTA보다 약한 보조 텍스트 스타일로 처리했다.

### SEO/Social Metadata 보강

- `APP_DESCRIPTION`을 기능 나열보다 사용자 결과 중심으로 교체했다.
- `openGraph`와 `twitter` metadata를 추가했다.

### 모바일 First View 개선

- 모바일 hero preview를 압축해 390x844에서도 다음 섹션 힌트가 보이도록 조정했다.
- 모바일 hero 안의 실제 앱 preview는 유지하되, hero frame에서는 선택 구절 중심으로 간결하게 보여준다.

## 검증 결과

### Static

- `npm run lint`: pass
- `npm run build`: pass

### Browser: Desktop 1280x720

- URL: `http://127.0.0.1:3000/`
- Console error/warning: 0
- Hero bottom: 684px
- Next section top: 704px
- Horizontal overflow: 없음 (`scrollWidth` 1265, `clientWidth` 1265)
- CTA href:
  - Primary: `/auth/login?next=/app`
  - Secondary: `/auth/sign-up`
- Reveal:
  - Initial visible: 3 / 17
  - After scroll: 5 / 17

### Browser: Mobile 390x844

- Console error/warning: 0
- Hero bottom: 711.75px
- Next section top: 711.75px
- Horizontal overflow: 없음 (`scrollWidth` 375, `clientWidth` 375)
- CTA buttons stack vertically and remain inside viewport.

### Copy Guard

Rendered landing copy에서 제거/위험 문구 미검출:

- `계정 저장`
- `이메일 로그인`
- `세션 확인`
- `Row Level Security`
- `RLS`
- `외부 OAuth`
- `모든 기기 동기화`
- `SSO`
- `OAuth`
- `완벽`
- `자동 동기화`
- `모든 기기`
- `보장`

## Visual Evidence

- `reports/landing-desktop.png`
- `reports/landing-mobile.png`

## Known Notes

- 개발 환경 스크린샷에는 Next.js dev indicator가 보일 수 있다. 앱 UI 자체의 랜딩 요소는 아니다.
- `.gitignore`의 `.vercel` 변경은 이번 수동 랜딩 패치 범위 밖이므로 건드리지 않았다.
