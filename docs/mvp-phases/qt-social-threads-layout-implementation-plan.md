# QT 소셜 Threads 레이아웃 구현 계획

> 상태: 구현 완료. 타입·린트·production build·원격 DB smoke·공개 desktop/mobile 브라우저 검증 통과. 실제 키 기반 인증 API smoke는 환경 gate
> 작성일: 2026-07-26
> 기준 문서: `qt-social-community-architecture.md`
> 변경 게이트: `behavioral` + `style-contract`
> 적용 범위: `apps/web`의 `/community` 공개 SNS 화면

## 1. 목표

Meta Threads의 정보 구조와 상호작용 밀도를 벤치마킹해 QT 커뮤니티의 검색, 프로필, 활동 알림, 새 QT 작성 경험을 하나의 일관된 SNS 화면 체계로 재구성한다.

Threads는 레이아웃과 상호작용의 참고 기준으로만 사용한다. 색상, 문구, 데이터, 아이콘 조합은 KJV 앱의 기존 디자인 토큰과 QT 도메인 계약을 따른다.

이번 계획에서 고정하는 조건은 다음과 같다.

- 중앙 콘텐츠 열은 데스크톱 최대 `640px`, 작성 dialog는 최대 `620px`를 유지한다.
- 왼쪽 고정 navigation과 모바일 상·하단 navigation을 유지한다.
- 피드 작성창은 닫힌 상태가 기본이며 trigger를 눌렀을 때만 modal로 연다.
- 비로그인 사용자는 공개 피드와 검색 결과를 읽을 수 있다.
- 프로필의 표시 이름, 사진, 호칭은 온보딩 `user_profiles` 동기화 값을 권위 원본으로 사용한다.
- 온보딩 미완료 계정에는 커뮤니티 프로필을 만들지 않으며 auth metadata fallback을 사용하지 않는다.
- 커뮤니티에서 수정 가능한 항목은 handle, bio, 공개 여부, 호칭 공개 여부뿐이다.
- 기존 `/api/community/*`는 `/api/community/v2`를 제외하고 `410 Gone`으로 종료하며 `discussion_*` 데이터는 client grant가 없는 archive로만 남긴다.
- DM, 그룹, 실시간 채팅, 비공개 계정은 화면·API·DB 범위에 추가하지 않는다.
- 개인 노트, 하이라이트, 읽기 기록은 검색·추천·공개 프로필에 노출하지 않는다.
- Threads의 흑백 팔레트를 복제하지 않고 `apps/web/src/app/globals.css`의 앱 컬러를 사용한다.

## 2. 확인한 Threads 벤치마크 요소

2026-07-26 로그인된 Threads 데스크톱 화면에서 직접 확인한 구조를 기준으로 한다.

| 화면 | 확인한 구조 | QT 적용 | 적용하지 않는 요소 |
| --- | --- | --- | --- |
| 공통 shell | 왼쪽 고정 text navigation, 중앙 단일 열, 넓은 오른쪽 여백 | 홈·검색·새 QT·알림·프로필, 성경 읽기 복귀 | DM, 그룹 진입점 |
| 검색 | 상단 검색창, filter icon, topic chips, 연속된 사용자 결과 행, 우측 팔로우 버튼 | 공개 QT·사람·구절·해시태그 검색과 추천 프로필 | 별도 우측 안내 카드 |
| 프로필 | 상단 handle header, avatar가 우측인 hero, 전체 폭 action, underline tabs | QT 나눔·답글·미디어·리포스트, 온보딩 연동 프로필 | Instagram 연결 등 외부 서비스 전용 기능 |
| 활동 | `활동` header와 filter dropdown, 구분선 기반 연속 행 | 전체·팔로우·답글·언급·인용 QT·리포스트·좋아요 | 추천 게시물을 알림처럼 삽입하는 동작 |
| 새 글 | dim backdrop, 중앙 modal, 저자 행, borderless editor, toolbar, footer action | 구절 연결, QT 본문, 이미지, 해시태그, 댓글 정책 | GIF, 음악, 위치, DM 공유 |

## 3. 현재 구현과 목표 차이

| 영역 | 현재 | 목표 |
| --- | --- | --- |
| 검색 | 제목 카드, 결과 종류별 독립 카드, 우측 안내 sidebar | 상단 검색 surface와 filter tabs 아래 하나의 연속 결과 열 |
| 추천 사용자 | 검색어가 없으면 안내 문구만 표시 | 검색어가 없으면 공개 추천 프로필을 표시 |
| 프로필 | hero와 tabs는 구현됨 | handle page header, 검색·overflow action, completion 카드의 수평 탐색 완성 |
| 알림 | 고정 `알림` 제목과 전체 목록 | `활동` 제목, URL 기반 filter dropdown, 필터된 cursor pagination |
| 작성 | modal이지만 라벨이 붙은 일반 form 필드 묶음 | 저자 context와 본문 중심의 borderless 작성 surface |
| 작성 초안 | React state만 사용 | modal을 닫았다 열어도 유지되는 session draft와 명시적 폐기 |
| CSS | `.community-*` namespace와 앱 token 매핑이 존재 | namespace를 보존하면서 화면별 element/state 계약을 추가 |

데이터 모델은 이미 검색, 프로필, 알림, 게시물, 이미지, 댓글 정책을 지원한다. 기본 구현은 새 migration 없이 진행한다. 알림 filter는 기존 `community_notifications.event_type`에 query 조건만 추가한다.

## 4. 컴포넌트 경계

기존 `.community-*` namespace와 `community-social.css`를 공개 CSS 계약으로 유지한다. 화면 구조를 나누되 범용 디자인 시스템으로 성급하게 승격하지 않고 `community-social` feature 안에 둔다.

| 컴포넌트 | 종류 | 책임 | 서버/클라이언트 |
| --- | --- | --- | --- |
| `CommunityPageHeader` | feature layout | 중앙 열의 title, back, search, overflow slot | 서버 기본, slot 주입 |
| `CommunitySearchForm` | feature form | `q`, `type` URL 상태, submit, clear, filter tabs | client island |
| `CommunityProfileResultRow` | data display | avatar, handle, bio, follower 수, follow action | 서버 row + client button |
| `CommunityFollowButton` | feature action | follow mutation과 pending/error state | client |
| `CommunityActivityFilter` | feature control | filter menu, URL 전환, 선택 상태 | client island |
| `CommunityNotificationList` | data display | filtered page, read 처리, cursor load | client |
| `CommunityProfileHeader` | feature composite | handle header, hero, counts, action/overflow | 서버 + 기존 action island |
| `CommunityProfileCompletion` | feature feedback | 미완료 항목 수와 가로 scroll 카드 | 서버 |
| `CommunityComposer` | feature form/dialog | trigger, dialog lifecycle, draft, 제출 | client |

### 4.1 공개 props/API 변경 원칙

- 기존 `CommunityComposer`의 `profile`, `signedIn`, `initialOpen`, `initialQuotedPostId`, `onCreated`는 유지한다.
- `CommunityNotificationList`에는 선택된 `filter`를 추가하되 기존 `initialPage` 계약을 유지한다.
- 프로필 follow 동작은 `CommunityProfileActions`에서 재사용 가능한 `CommunityFollowButton`으로 추출한다. profile의 mute, block, report overflow는 기존 컴포넌트에 남긴다.
- 새 prop은 우선 optional 또는 내부 전용으로 추가하며 기존 호출부를 한 번에 깨는 rename은 하지 않는다.
- class rename 대신 `.community-search-*`, `.community-activity-*`, `.community-profile-*`, `.community-composer-*` element class를 additive하게 추가한다.

## 5. 단계별 실행 계획

### P0. 계약 고정과 기준선 기록

목표: 기존 동작과 사용자 변경을 보존한 상태에서 변경 범위를 고정한다.

대상 파일:

- `docs/mvp-phases/qt-social-community-architecture.md`
- `artifacts/component-passports/community-home-panel.yaml`
- `apps/web/src/app/community/community-social.css`
- `apps/web/src/app/community/layout.tsx`

작업:

- [ ] `rg`로 `.community-*` class, 컴포넌트 import, public prop 사용처를 다시 수집한다.
- [ ] 데스크톱 `1440x900`, 축소 desktop `1024x768`, mobile `390x844`의 현재 화면을 기준 캡처한다.
- [ ] 앱 token 매핑(`--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`)을 변경 금지 계약으로 기록한다.
- [ ] composer의 기본 닫힘, 로그인 redirect, 공개 프로필 gate를 회귀 기준으로 기록한다.
- [ ] 기존 dirty worktree의 관련 파일 diff를 별도로 확인하고 사용자 변경을 덮어쓰지 않는다.

수용 기준:

- 현재 route와 API 계약 목록이 기준 캡처 및 passport와 일치한다.
- DM·그룹·외부 서비스 전용 UI가 구현 항목에 들어가지 않는다.

검증:

- `git diff -- apps/web/src/app/community apps/web/src/components/community-social apps/web/src/lib/community-v2-server.ts`
- `rg -n "community-(search|activity|profile|composer)" apps/web/src`

롤백: 문서와 캡처만 추가하므로 코드 롤백은 없다.

### P1. 공통 중앙 열 header와 CSS 계약

목표: 검색, 활동, 프로필이 같은 중앙 열 header 구조를 공유하게 한다.

대상 파일:

- 신규 `apps/web/src/components/community-social/community-page-header.tsx`
- `apps/web/src/app/community/community-social.css`
- `apps/web/src/app/community/search/page.tsx`
- `apps/web/src/app/community/notifications/page.tsx`
- `apps/web/src/app/community/u/[handle]/page.tsx`

작업:

- [ ] `CommunityPageHeader`에 `title`, `leading`, `actions`, `sticky` slot을 정의한다.
- [ ] 중앙 열 내부에서만 sticky가 작동하고 왼쪽 rail과 mobile topbar의 z-index를 침범하지 않게 한다.
- [ ] 중앙 콘텐츠 외곽 `640px`, dialog `620px`, separator 기반 surface를 CSS 변수로 명시한다.
- [ ] 모든 색은 community token alias를 통해 앱 전역 token에서만 가져온다.
- [ ] desktop 우측 공간은 비워 두고 home/search/profile에 별도 sidebar를 추가하지 않는다.

수용 기준:

- 세 화면의 header 높이·경계선·정렬이 동일하다.
- `820px` 이하에서 중복 header가 생기지 않으며 mobile topbar 아래에 자연스럽게 배치된다.
- hard-coded black/white 색상이 추가되지 않는다.

검증: 세 viewport에서 header, sticky, focus ring, light/dark theme를 수동 확인한다.

롤백: 새 header import를 제거하면 각 page의 기존 heading으로 복귀할 수 있어야 한다.

### P2. 새 QT 작성 modal 재구성

목표: 일반 설정 form처럼 보이는 modal을 본문 작성 중심 surface로 바꾼다.

대상 파일:

- `apps/web/src/components/community-social/community-composer.tsx`
- `apps/web/src/components/community-social/community-feed-view.tsx`
- `apps/web/src/app/community/u/[handle]/page.tsx`
- `apps/web/src/app/community/community-social.css`
- 필요 시 신규 `apps/web/src/components/community-social/community-composer-toolbar.tsx`

구조 계약:

1. header: `취소` / `새 QT` 또는 `인용 QT` / `초안 폐기`
2. author row: avatar, display name, `@handle`
3. verse area: 1~10개 verse key chip과 추가·삭제 control
4. editor: label border가 없는 title(선택)과 QT body
5. toolbar: 이미지, 구절, 해시태그, 댓글 정책
6. footer: 공개 범위 안내와 게시 button

작업:

- [ ] `<dialog>`와 현재 trigger는 유지하고 modal 기본 닫힘을 보장한다.
- [ ] `initialOpen` 또는 `initialQuotedPostId`일 때만 인증·공개 프로필 조건을 통과한 뒤 연다.
- [ ] 빈 modal의 게시 button을 disabled 처리하고 본문 10자·구절 1개 조건을 UI에서 즉시 안내한다.
- [ ] 현재 API payload의 `title`, `body`, `verseKeys`, `hashtags`, `quotedPostId`를 그대로 유지한다.
- [ ] `commentPolicy`를 `everyone | none`으로 전송하며 서버의 기존 validation을 사용한다.
- [ ] 이미지 1장과 alt text를 toolbar에서 관리하고 MIME/용량의 서버 검증은 유지한다.
- [ ] session draft key를 `community:composer:draft:v1`로 두고 본문·구절·해시태그·댓글 정책만 저장한다. 파일 객체는 저장하지 않는다.
- [ ] 성공 시 draft를 삭제하고 dialog를 닫는다. 취소는 draft를 보존하고 `초안 폐기`만 내용을 초기화한다.
- [ ] Escape, backdrop close 정책, focus return, pending 중 close 방지를 검증한다.
- [ ] 인용 작성에서는 원문 요약을 editor 아래에 유지한다.

수용 기준:

- `/community` 최초 진입 시 modal이 열려 있지 않다.
- rail 또는 trigger의 `새로운 QT`로만 modal이 열린다.
- 키보드만으로 열기, 필드 이동, 제출, 취소가 가능하고 닫힌 뒤 trigger로 focus가 돌아온다.
- 로그인하지 않았으면 `next`가 보존된 로그인 route로 이동한다.
- 공개 프로필이 없으면 `/community/settings`로 이동한다.

검증:

- 작성 성공, validation 실패, 이미지 실패 후 재시도, 인용 QT, Escape, mobile keyboard를 수동 검증한다.
- `npm run typecheck -w @kjv/web`
- `npm run lint -w @kjv/web`

롤백: payload와 dialog root는 유지하므로 새 내부 markup/CSS만 이전 구조로 되돌릴 수 있다.

### P3. 검색 화면 재구성

목표: 검색 전에는 팔로우 추천을, 검색 후에는 선택한 범위의 결과를 연속된 한 열로 보여 준다.

대상 파일:

- `apps/web/src/app/community/search/page.tsx`
- 신규 `apps/web/src/components/community-social/community-search-form.tsx`
- 신규 `apps/web/src/components/community-social/community-profile-result-row.tsx`
- 신규 `apps/web/src/components/community-social/community-follow-button.tsx`
- `apps/web/src/components/community-social/community-profile-actions.tsx`
- `apps/web/src/lib/community-v2-server.ts`
- `apps/web/src/app/community/community-social.css`

URL 계약:

```text
/community/search?q={query}&type=all|posts|users|verses|tags
```

작업:

- [ ] 상단에 실제 GET search form을 배치하고 `q`, `type`을 URL의 source of truth로 사용한다.
- [ ] 검색 범위는 `전체 / QT / 사람 / 구절 / 태그`로 제공하고 선택 상태를 `aria-current`로 표시한다.
- [ ] 검색어가 없으면 `팔로우 추천` 제목과 공개 활성 프로필을 표시한다.
- [ ] 추천 프로필은 viewer 본인, 차단·뮤트 관계, 비공개·restricted profile을 제외하고 follower 수와 최신 공개 활동을 이용한 결정적 정렬을 사용한다.
- [ ] 새 table 없이 `getCommunitySuggestedProfiles(service, viewerId, limit)` server query를 추가한다.
- [ ] 사람 결과 row에 avatar, display name, handle, bio 최대 3줄, follower 수, 우측 follow button을 표시한다.
- [ ] `CommunityFollowButton`을 `CommunityProfileActions`에서도 재사용해 follow mutation을 중복 구현하지 않는다.
- [ ] QT, 구절, 태그 결과는 종류별 떠 있는 카드 대신 중앙 열의 separator section으로 렌더링한다.
- [ ] 2자 미만, 결과 없음, server error 상태를 서로 다른 문구와 live region으로 표현한다.
- [ ] 우측 `검색 범위` sidebar를 제거하고 개인정보 안내는 검색 empty/help text에 짧게 포함한다.

수용 기준:

- 비로그인 상태에서 검색과 추천 프로필이 SSR되고 follow button은 로그인으로 유도한다.
- 검색 type을 바꿔도 query가 유지되고 새로고침·뒤로 가기가 동일한 화면을 복원한다.
- 팔로우 성공 후 버튼 상태가 즉시 바뀌고 실패 시 해당 row 안에서 오류를 알린다.
- blocked profile과 moderation 대상 게시물이 결과에 나타나지 않는다.

검증:

- 빈 검색, 1자, 사람, QT, 구절, 태그, 결과 없음, 한글 query, URL 직접 진입을 확인한다.
- 기존 `smoke:community:v2`의 search assertions를 유지하고 추천 profile query의 exclusion test를 추가한다.

롤백: 추천 query와 새 presentation을 제거해도 기존 `searchCommunity` 계약은 그대로 남는다.

### P4. 활동 알림과 filter dropdown

목표: 알림을 Threads형 `활동` 화면으로 정리하되 QT 이벤트 의미를 정확히 유지한다.

대상 파일:

- `packages/shared/src/community/notifications.ts`
- `packages/shared/src/community/client.ts`
- `apps/web/src/lib/community-v2-server.ts`
- `apps/web/src/app/api/community/v2/[...segments]/route.ts`
- `apps/web/src/app/community/notifications/page.tsx`
- `apps/web/src/components/community-social/community-notification-list.tsx`
- 신규 `apps/web/src/components/community-social/community-activity-filter.tsx`
- `apps/web/src/app/community/community-social.css`

URL/API 계약:

```text
/community/notifications?filter=all|follows|replies|mentions|quotes|reposts|likes
/api/community/v2/notifications?filter={filter}&cursor={cursor}&limit=30
```

filter와 event mapping:

| filter | event type |
| --- | --- |
| `all` | 전체 |
| `follows` | `follow` |
| `replies` | `comment`, `reply` |
| `mentions` | `mention` |
| `quotes` | `quote` |
| `reposts` | `repost` |
| `likes` | `like_post`, `like_comment` |

`moderation`은 `all`에만 포함하고 일반 social filter로 분리하지 않는다.

작업:

- [ ] shared에 `CommunityNotificationFilter`와 allowlist를 추가한다.
- [ ] page에서 filter를 검증하고 유효하지 않으면 `all`로 정규화한다.
- [ ] server query에 event filter를 cursor보다 먼저 적용해 페이지 간 누락·중복을 방지한다.
- [ ] unread count는 선택 filter가 아니라 계정 전체 unread 수를 유지한다.
- [ ] header를 `활동`과 filter dropdown으로 바꾸고 `모두 읽음`은 보조 action으로 둔다.
- [ ] 각 행에 event context, actor, 시간, unread 상태를 표시하고 separator 기반 연속 목록을 유지한다.
- [ ] dropdown은 native button/menu semantics, Escape close, outside click, focus return을 지원한다.
- [ ] `loadMore` 요청에 현재 filter를 포함한다.

수용 기준:

- URL 직접 진입, 새로고침, 뒤로 가기에서 filter가 유지된다.
- 필터 변경 후 이전 filter의 cursor/items가 섞이지 않는다.
- 좋아요에는 게시물·댓글 좋아요가 모두 포함된다.
- empty state가 filter별로 구분된다.

검증:

- event type별 fixture로 filter mapping과 cursor를 검증한다.
- mark read 후 전체 unread 수와 row 상태가 일치하는지 확인한다.
- `npm run typecheck`, `npm run lint`, 인증 API smoke를 실행한다.

롤백: filter parameter를 생략하면 기존 전체 알림 query와 동일하게 동작해야 한다.

### P5. 프로필 화면 완성

목표: 온보딩 연동 정체성을 보존하면서 Threads형 profile hierarchy를 완성한다.

대상 파일:

- `apps/web/src/app/community/u/[handle]/page.tsx`
- 신규 `apps/web/src/components/community-social/community-profile-header.tsx`
- 신규 `apps/web/src/components/community-social/community-profile-completion.tsx`
- `apps/web/src/components/community-social/community-profile-actions.tsx`
- `apps/web/src/app/community/community-social.css`

작업:

- [ ] 중앙 열 맨 위에 handle 중심 page header와 검색, overflow action을 배치한다.
- [ ] hero는 display name·handle·bio를 좌측, 큰 avatar를 우측에 둔다.
- [ ] follower·following·QT 수와 전체 폭 `프로필 편집` 또는 `팔로우` action을 유지한다.
- [ ] profile tabs는 `QT 나눔 / 답글 / 미디어 / 리포스트` URL 계약을 유지한다.
- [ ] 현재 사용자 `QT 나눔` tab에만 닫힌 composer trigger를 표시한다.
- [ ] completion은 `소개 추가 / 첫 QT 나눔 / 10명 팔로우 / 사진 확인` 중 실제 미완료 항목만 계산한다.
- [ ] completion 카드에 icon, title, 설명, action을 넣고 desktop/mobile 모두 수평 scroll과 scroll snap을 사용한다.
- [ ] avatar·display name·honorific은 `user_profiles` 동기화 결과를 표시하며 page에서 별도 편집 필드를 만들지 않는다.
- [ ] 타인 profile의 mute, block, report는 overflow 안에 유지하고 팔로우를 주 action으로 둔다.

수용 기준:

- 네 tab의 URL, SSR metadata, empty state가 유지된다.
- 본인/타인/비로그인 profile action이 각각 올바르다.
- 온보딩 nickname·avatar 변경 후 동기화된 공개 profile이 표시된다.
- bio가 길거나 avatar가 없어도 header layout이 깨지지 않는다.

검증:

- 본인·타인·비로그인, 4개 tab, completion 0~4개, 긴 bio, mobile horizontal scroll을 확인한다.
- onboarding profile synchronization DB smoke를 유지한다.

롤백: data fetch와 tab query를 바꾸지 않으므로 새 header/completion presentation만 제거할 수 있다.

### P6. 반응형·접근성·상태 안정화

목표: 네 화면의 keyboard, mobile, loading/error 상태를 출시 수준으로 맞춘다.

대상 파일:

- `apps/web/src/app/community/community-social.css`
- P1~P5에서 추가·수정한 client component
- `artifacts/component-passports/community-home-panel.yaml`

작업:

- [ ] `1440`, `1024`, `820`, `390`, `320px`에서 overflow와 tap target을 점검한다.
- [ ] interactive target 최소 `42px`, visible focus, `aria-current`, `aria-expanded`, `aria-controls`를 적용한다.
- [ ] dialog와 menu의 focus trap/return, Escape, pending, error live region을 검증한다.
- [ ] `prefers-reduced-motion`에서 불필요한 transition을 제거한다.
- [ ] 긴 handle, 3줄 bio, 긴 한국어 QT, 긴 구절 reference를 stress test한다.
- [ ] client island 밖의 검색·프로필·초기 알림 데이터는 server component에서 가져온다.
- [ ] passport에 추가 컴포넌트, CSS namespace, interaction validation을 반영한다.

수용 기준:

- 가로 page scroll이 없고 중앙 열과 mobile navigation이 겹치지 않는다.
- keyboard만으로 검색 filter, 활동 filter, follow, composer를 사용할 수 있다.
- JavaScript가 실행되기 전에도 공개 검색·프로필의 핵심 내용이 HTML에 존재한다.

롤백: 화면별 신규 selector 블록을 독립적으로 되돌릴 수 있도록 page selector 간 결합을 금지한다.

### P7. 통합 검증과 출시 게이트

목표: 디자인 유사성보다 제품 계약과 실제 사용 흐름을 우선해 완료 여부를 판정한다.

자동 검증:

```powershell
npm run typecheck
npm run lint
npm run build
npm run db:smoke-community:v2
npm run smoke:community:v2
```

`smoke:community:v2`는 실제 `SUPABASE_SERVICE_ROLE_KEY`가 준비된 환경에서만 실행한다. placeholder key로 인한 실패는 UI 성공으로 간주하지 않고 환경 gate로 기록한다.

브라우저 검증 matrix:

| 상태 | 홈/작성 | 검색 | 활동 | 프로필 |
| --- | --- | --- | --- | --- |
| 비로그인 | 공개 피드, 작성 시 로그인 | 공개 검색과 추천 | 로그인 redirect | 공개 profile |
| 로그인·profile 미설정 | 설정 안내 | 검색 가능, follow 시 설정 유도 | 알림 목록 | settings 유도 |
| 로그인·profile 설정 | 작성·인용 성공 | follow toggle | filter/read/load more | 본인·타인 action |
| mobile | bottom nav, keyboard | sticky search | menu와 scroll | tabs와 completion scroll |

시각 검증:

- 기준 viewport별 before/after screenshot을 같은 경로와 데이터로 비교한다.
- 앱 light/dark theme에서 color token 매핑과 대비를 확인한다.
- Threads와 비교할 항목은 정보 계층, 간격, 연속 열, modal 동작으로 제한한다.
- Threads의 브랜드 색, 문구, 로고, 고유 asset을 복제하지 않는다.

완료 조건:

- [ ] 검색, 활동, 프로필, composer가 동일한 중앙 열과 header 체계를 사용한다.
- [ ] composer는 기본 닫힘이며 정상·인용·오류·초안 흐름이 동작한다.
- [ ] 공개 검색, 추천 profile, follow, 활동 filter, profile tab이 URL과 API 계약을 지킨다.
- [ ] 앱 컬러, 온보딩 profile 원본, 공개/인증 경계가 유지된다.
- [ ] DM과 그룹 관련 route, component, API, table이 추가되지 않는다.
- [ ] typecheck, lint, production build가 통과한다.
- [ ] 실제 key 기반 API smoke와 mobile browser smoke 결과가 별도로 기록된다.

## 6. 구현 순서와 병합 단위

안전한 병합 순서는 `P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7`이다. 각 단계는 다음 단위로 독립 리뷰할 수 있게 유지한다.

1. 공통 header와 CSS token 계약
2. composer 구조·draft·접근성
3. 검색 surface·추천 profile·follow 추출
4. 활동 filter의 shared/API/UI 수직 slice
5. profile header·completion
6. 반응형·접근성·passport·검증 증거

P3와 P4는 서로 데이터 계약이 겹치지 않지만, 둘 다 `community-social.css`를 수정하므로 selector namespace를 분리하고 순차 병합한다.

## 7. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| modal이 query 때문에 매 방문마다 열림 | `compose=1` 또는 명시적 trigger만 `initialOpen`으로 전달하고 닫힘을 기본값으로 테스트 |
| filtered notification cursor 누락 | event filter를 DB query에서 cursor 이전에 적용하고 filter별 cursor fixture 검증 |
| follow 로직 중복 | `CommunityFollowButton` 하나로 추출하고 profile/search가 같은 mutation 사용 |
| 검색 추천이 개인정보를 사용 | 공개 profile과 공개 SNS 활동만 query하고 개인 학습 repository import 금지 |
| Threads 색상 모방으로 앱 정체성 훼손 | community alias가 앱 전역 token만 참조하도록 CSS 검토 |
| dirty worktree 충돌 | 단계 시작 전 관련 파일 diff 확인, 관련 없는 변경 비수정, 파일 단위 rollback |
| mobile dialog keyboard 가림 | `max-height`, 내부 scroll, safe-area padding, 실제 mobile viewport 검증 |

## 8. 최종 산출물

- 검색·활동·프로필·새 QT 화면 구현
- shared notification filter 계약과 API query 확장
- 추천 profile server query와 재사용 follow action
- `.community-*` CSS 계약 및 component passport 갱신
- desktop/mobile before-after 캡처
- typecheck, lint, build, API/DB/browser 검증 기록

## 9. 구현 결과 (2026-07-26)

- 공통 `CommunityPageHeader`, 검색 form/result row, 재사용 follow button을 추가했다.
- 작성 dialog를 기본 닫힘, session draft, borderless editor, 구절·이미지·해시태그·댓글 정책 toolbar 구조로 전환했다.
- 검색 초기 추천과 URL 기반 `전체 / QT / 사람 / 구절 / 태그` 결과를 단일 연속 열로 전환했다.
- 활동 화면에 `모두 / 팔로우 / 답글 / 언급 / 인용 QT / 리포스트 / 좋아요` filter와 filter-aware cursor pagination을 구현했다.
- 프로필을 온보딩 identity 원본, handle header, 4개 tab, 가로 completion 카드 구조로 전환했다.
- 공개 검색의 정규화 column 최소 권한 migration을 원격 DB에 적용하고 private honorific column이 anon에 공개되지 않는 smoke assertion을 추가했다.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:smoke-community:v2`가 통과했다.
- `1440x900`과 `390x844` 브라우저에서 중앙 `640px` 열, full text rail, mobile navigation, 가로 overflow 부재, 작성 dialog 기본 닫힘, 공개 검색을 확인했다.
- `npm run smoke:community:v2`는 placeholder `SUPABASE_SERVICE_ROLE_KEY`를 감지하고 test user 생성 전에 중단됐다.
