# MVP 구현 페이즈 문서

이 폴더는 [`kjv-educater.md`](../../kjv-educater.md)의 PRD를 구현 가능한 MVP 단계로 나눈 문서 모음이다.

## 페이즈 목록

전체 실행 계획은 [mvp-implementation-plan.md](./mvp-implementation-plan.md)를 기준으로 한다.

| Phase | 파일 | 핵심 목표 | MVP 게이트 |
| --- | --- | --- | --- |
| 1 | [phase-01-foundation-and-reader.md](./phase-01-foundation-and-reader.md) | 프로젝트 기초, 인증, 성경 데이터 모델, 성경 리더 | 필수 |
| 2 | [phase-02-reading-progress-dashboard.md](./phase-02-reading-progress-dashboard.md) | 마지막 읽은 위치, 읽음 완료, 통독률, 대시보드 | 필수 |
| 3 | [phase-03-study-tools-highlights-favorites.md](./phase-03-study-tools-highlights-favorites.md) | 구절 강조, 인용 구절 저장, 태그, 복사 | 필수 |
| 4 | [phase-04-tts-player.md](./phase-04-tts-player.md) | Web Speech API 기반 기본 TTS | 필수 |
| 5 | [phase-05-search-optimization-mobile.md](./phase-05-search-optimization-mobile.md) | 검색, 필터, 성능, 모바일 사용성 | 권장 |
| 6 | [phase-06-release-readiness.md](./phase-06-release-readiness.md) | 라이선스, 보안, 접근성, 배포, 피드백 수집 | 필수 |

## 후속 프론트엔드 보강

- [frontend-enhancement-plan.md](./frontend-enhancement-plan.md): 7번 데이터 내보내기/가져오기를 제외한 프론트엔드 추가 기능 계획.
- [mobile-view-optimization-prd.md](./mobile-view-optimization-prd.md): 홈 세부 탭, 모바일 하단 네비게이션, 빠른이동 중심 IA 최적화 PRD.
- [landing-page-scope.md](./landing-page-scope.md): 공개 첫 페이지 랜딩 구조, 로그인 유도, 계정/SSO 설명 스코프.
- [supabase-email-auth-architecture.md](./supabase-email-auth-architecture.md): mock auth를 Supabase 이메일 로그인으로 전환하기 위한 구현 아키텍처.
- [user-data-security-management-policy.md](./user-data-security-management-policy.md): Supabase Auth/RLS 전환을 위한 유저 데이터 보안관리 정책.
- [translation-feedback-admin-rbac-architecture.md](./translation-feedback-admin-rbac-architecture.md): 번역 피드백 폼, 어드민 리뷰 큐, RBAC 권한 체계 구현 아키텍처.

## 전체 구현 원칙

- MVP는 "성경 통독을 이어가고, 중요한 구절을 표시하고, 자주 인용하는 구절을 저장하며, TTS로 들을 수 있는 개인 성경 공부 도구"로 제한한다.
- 현재 v0 MVP에서는 계정 OAuth를 mock session으로 구현한다.
- KJV 흠정역 성경전서 전체 본문 삽입은 DB 구현 단계 이후로 미룬다.
- KJV 흠정역 본문 라이선스는 실제 DB seed와 공개 배포 전에 최종 검증한다.
- 본문 사용 권한이 확정되기 전에는 전체 본문 DB 배포를 막고, 샘플 fixture나 사용자가 직접 업로드하는 개인용 구조로 개발한다.
- 개인 데이터는 v0에서 local/mock storage로 구현하되, 실제 출시 전에는 계정별 분리와 서버 측 권한 검증 또는 Row Level Security를 적용한다.
- 브라우저 TTS는 MVP 범위이며 고품질 AI 음성, 오프라인 모드, 구절 이미지 생성, 커뮤니티 기능은 제외한다.

## MVP 출시 기준

- Phase 1, 2, 3, 4, 6의 수용 기준이 충족되어야 한다.
- Phase 5의 검색 기능은 PRD의 개발 단계에는 포함되어 있으나, PRD의 "MVP에 반드시 포함할 기능" 목록에는 없다. 출시 일정이 촉박하면 Phase 5는 P1 후속 범위로 분리할 수 있다.
- v0 MVP의 필수 개인 데이터는 mock 사용자 기준으로 저장되어야 한다.
- 공개 출시 MVP의 필수 개인 데이터는 로그인 계정 기준으로 다른 기기에서 동기화되어야 한다.
- 성경 본문, 강조, 인용 구절, 읽음 상태, 설정은 새로고침 후에도 유지되어야 한다.

## 공통 체크리스트

- [ ] PRD 기능 범위와 제외 범위를 구현 이슈에 반영한다.
- [ ] 각 Phase 시작 전 이전 Phase의 수용 기준을 재확인한다.
- [ ] v0에서는 mock auth와 mock/local storage 경계를 명확히 표시한다.
- [ ] 공개 출시 전 모든 개인 데이터 API에 인증과 사용자 소유권 검증을 적용한다.
- [ ] 모바일 브라우저에서 핵심 흐름을 직접 검증한다.
- [ ] 본문 라이선스 결정을 문서화한다.
- [ ] MVP 출시 전 Phase 6 체크리스트를 완료한다.
