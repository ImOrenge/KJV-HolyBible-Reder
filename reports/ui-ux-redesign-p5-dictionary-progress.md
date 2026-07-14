# UI/UX 개편 P5 히브리어 사전 진행 보고서

> 작업 기준: `develop/2026-07-13-first-login-onboarding`
>
> 갱신일: 2026-07-14

## 구현 범위

- 웹 사전을 compact list + detail 2-pane으로 재구성했다.
- alphabet/theme/book filter를 popover로, sort를 독립 select로 구성했다.
- active filter chip, 전체 초기화, 한영 뜻, 음역·발음기호·한국어 발음과 첫 출현 구절을 목록에 제공한다.
- 실제 출현형 히브리어를 목록과 상세에서 `mark`로 강조한다.
- 검색어, 선택 단어, alphabet/theme/book/sort를 `/app/study/dictionary` query state로 직렬화한다.
- Reader 출현 구절 이동 후 browser back에서 동일 단어와 filter state를 복원한다.
- 웹 `900px` 이하에서는 list/detail을 동시에 표시하지 않으며 `단어 목록`은 선택 URL도 해제한다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| `npm run study-ui:validate` | 통과 |
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과 |
| `npm run lexicon:validate` | 6개 단어, 6개 출현, 6개 테마 연결 통과 |
| Expo V2 `npm run browser:reader -- --single=true ...` | 통과 |
| 1440px compact 2-pane | 통과 |
| 390px list/detail 단일 pane | 통과 |
| `entry=reshith` Reader 왕복 복원 | 통과 |
| query/theme/sort deep-link reload | 통과 |
| 390px/1440px horizontal overflow | 없음 |
| 브라우저 console error | 없음 |

## 남은 작업

- Expo 네이티브 dictionary list/detail stack과 filter sheet
- `내 노트에 추가`의 새 노트/기존 노트 선택 및 `StudyContext` 유지
- 목록 scroll 위치 복원
- 인증된 원격 전체 사전 데이터와 filter 조합 smoke
- P5 통합 검색과 보관함 개편
