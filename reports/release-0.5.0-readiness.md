# Release 0.5.0 Readiness

작성일: 2026-07-13

## 현재 판정

**HOLD - 코드와 원격 DB는 검증됐지만 릴리즈 범위 확정이 필요하다.**

개인 성경노트 고도화와 히브리어 사전은 릴리즈 게이트를 통과했다. 다만 현재 작업 트리에 구약 번역과 QT 커뮤니티 문서 변경이 섞여 있고, 원격 Supabase에는 별도 QT 작업 트리의 마이그레이션 6건이 이미 적용돼 있다. 릴리즈 브랜치, 버전 변경, 태그 생성은 이 범위를 확정한 뒤 진행한다.

## 제안 버전

| 항목 | 현재 | 제안 |
| --- | --- | --- |
| 앱 버전 | `0.4.0` | `0.5.0` |
| Android `versionCode` | `4` | `5` |
| Android package | `com.kjvreader` | 유지 |
| EAS profile | `production` / app-bundle | 유지 |

## 릴리즈 후보 기능

- 개인 성경노트 리치 텍스트 편집기: 굵게, 기울임, 밑줄, 크기, 색상, 정렬, 형광, 목록, 체크리스트, 실행 취소/다시 실행.
- `#` 구절 참조 자동완성: 권 후보와 `창 1:10` 형식의 구절 후보, 선택 시 구절 링크 생성.
- 노트 템플릿, 버전 이력, 백링크, 검색, 보관, JSON/Markdown/PDF 내보내기.
- 히브리어 사전 검색과 알파벳·테마·성경 권·정렬 필터, 한글/영문 뜻, 음역·발음, 예시 구절.
- 웹·모바일 공용 개인노트 문서 모델과 원격 Supabase 저장소.
- 모바일 웹의 노트·사전 작업공간 단일 열 레이아웃.

## 이번 점검에서 수정한 결함

- `#창`이 정확한 책 약어로 해석된 뒤 장 번호가 없다는 이유로 빈 배열을 반환하던 API를 수정했다.
- 프로덕션 API에서 `#창`은 창세기 권 후보, `#창 1:10`은 `GEN.1.10` 구절 후보를 반환한다.
- 390px 폭에서 노트와 사전의 두 열 그리드가 잘리고 겹치던 문제를 단일 열로 수정했다.
- 모바일 노트 템플릿의 긴 첫 항목을 전체 폭으로 배치했다.

## 검증 결과

| 게이트 | 결과 |
| --- | --- |
| `npm run typecheck` | PASS - mobile, web, shared |
| `npm run lint` | PASS |
| `npm run build` | PASS - Next.js 16.2.9 production build |
| `npm run expo:doctor` | PASS - 20/20 |
| Expo web export | PASS - `.tmp/release-0.5.0-mobile-web` |
| `npm run style:mobile` | PASS |
| `npm run structure:mobile` | PASS |
| `npm run lexicon:validate` | PASS - 6 entries, 6 occurrences, 6 theme links |
| `npm run db:smoke-notes` | PASS - revision 2, unchanged-save, account isolation |
| `supabase db lint --linked --level warning --fail-on error` | PASS - no schema errors |
| 모바일 브라우저 390x844 | PASS - 노트/사전 321px 단일 열, 문서 가로 넘침 없음 |
| 구절 자동완성 브라우저 | PASS - `#창`, `#창 1:10`, 링크 선택 |
| EAS 인증 | PASS - `nicholas0913` Owner |

## 원격 DB 상태

개인노트 마이그레이션은 로컬과 원격이 일치한다.

- `20260712124409_personal_note_rich_text_workspace.sql`
- `20260712131954_personal_note_workspace_hardening.sql`

원격에는 아래 QT 커뮤니티 마이그레이션이 추가로 적용돼 있으나 현재 작업 트리에는 없다. 원본은 `D:\kjv-educator-worktrees\qt-community-ranking`의 커밋 `628f7787`, `0709ee2b`에 있다.

- `20260712141001_qt_community_ranking.sql`
- `20260712141247_qt_community_ranking_indexes.sql`
- `20260712141720_qt_community_authenticated_api.sql`
- `20260712142431_tighten_community_reaction_visibility.sql`
- `20260712143730_align_community_profile_visibility.sql`
- `20260712144549_validate_community_reading_evidence.sql`

원격 마이그레이션 이력을 저장소보다 앞선 상태로 방치하면 다음 DB 배포가 불명확해진다. `0.5.0`에는 QT 기능 전체를 병합하거나, 최소한 이미 적용된 6개 마이그레이션 파일을 릴리즈 소스에 포함해야 한다.

## 스태시 확인

`stash@{0}`은 2026-07-11의 `release/0.4.0` 작업 보존본이다. 현재 릴리즈 후보 코드의 누락 원본이나 QT 마이그레이션은 없다.

- `artifacts/kjv-reader-note-0.4.0-com.kjvreader.aab` - 47,982,202 bytes
- `artifacts/mobile-avd-current.png`
- `artifacts/mobile-avd-guest-after-fix.png`

스태시는 적용하거나 삭제하지 않았다. 과거 AAB는 패키지·서명 기준 비교용으로만 사용한다.

## 알려진 잔여 위험

- `npm audit --omit=dev --audit-level=high`는 종료 코드 0이지만 Expo의 `xcode -> uuid` 경로에 moderate 10건을 보고한다. 자동 강제 수정은 Expo 46으로 내리는 breaking change이므로 적용하지 않는다.
- 실제 Android/iOS 기기에서 TenTap 편집기의 한글 IME, 키보드 높이, 선택 영역 동작을 최종 확인해야 한다.
- 현재 사전 seed는 6개 단어이므로 기능 릴리즈에는 충분하지만 콘텐츠 릴리즈 범위로는 작다.
- EAS의 마지막 성공 production AAB는 `0.4.0`, build `4`다. `0.5.0` AAB는 범위 확정과 버전 커밋 후 생성해야 한다.

## 릴리즈 체크리스트

- [x] 웹·공유·모바일 타입 검사
- [x] 린트와 프로덕션 빌드
- [x] Expo Doctor와 웹 번들 export
- [x] 원격 개인노트 RLS·리비전 스모크
- [x] 원격 DB lint
- [x] 데스크톱·모바일 브라우저 핵심 흐름 확인
- [x] `#` 구절 자동완성 결함 수정과 재검증
- [x] 모바일 노트·사전 레이아웃 결함 수정과 재검증
- [ ] 포함 기능과 제외 작업 확정
- [ ] 원격 선행 QT 마이그레이션 6건을 릴리즈 소스에 반영
- [ ] 릴리즈 대상만 선택 커밋
- [ ] `release/0.5.0` 생성
- [ ] 모든 workspace와 Expo 버전을 `0.5.0`, Android `versionCode`를 `5`로 변경
- [ ] 최종 회귀 검증
- [ ] EAS production AAB 생성 및 package/signing 검증
- [ ] `main` 병합, `v0.5.0` 태그, 원격 push

## 릴리즈 결정 필요

권장 범위는 **개인노트 + 히브리어 사전 + 이미 원격에 적용된 QT 마이그레이션 이력**이다. 번역 JSONL·번역 리포트와 QT UI 전체는 별도 작업으로 유지한다. QT UI까지 함께 출시할 경우 별도 작업 트리의 두 커밋을 먼저 통합하고 전체 회귀 검증을 다시 실행한다.
