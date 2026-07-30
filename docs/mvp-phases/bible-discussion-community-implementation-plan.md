# 성경 토론 커뮤니티 구현 계획

> 상태: 폐기된 레거시 설계 기록. 2026-07-28부터 화면·클라이언트·API 계약과 Data API 권한을 종료했다. 공개 SNS 제품 방향과 신규 구현 계약은 [`qt-social-community-architecture.md`](./qt-social-community-architecture.md)를 따른다. 이 문서는 비공개 archive로 보존한 `discussion_*` 데이터의 이력·전환 근거로만 유지한다.

## Summary

성경 토론 커뮤니티는 현재 v0 MVP에 바로 포함하지 않는다. 기존 MVP 문서는 커뮤니티 기능을 제외 범위로 두고 있고, 번역 피드백 아키텍처도 공개 토론 게시판을 비목표로 분리한다. 따라서 이 기능은 개인 리더, 실제 Auth/DB/RLS, 번역 피드백 리뷰 큐가 안정화된 뒤 붙이는 후속 모듈로 설계한다.

초기 커뮤니티는 범용 게시판이 아니라 "구절에 연결된 성경 공부 토론"이어야 한다. 사용자는 읽는 중인 구절에서 질문이나 묵상 나눔을 시작하고, 다른 사용자는 같은 구절 맥락 안에서 댓글을 남긴다. 관리자와 모더레이터는 신고 큐에서 부적절한 콘텐츠를 숨기거나 잠그고, 모든 조정 작업은 감사 로그로 남긴다.

## Source References

- `kjv-educater.md`
- `docs/mvp-phases/README.md`
- `docs/mvp-phases/mvp-implementation-plan.md`
- `docs/mvp-phases/phase-03-study-tools-highlights-favorites.md`
- `docs/mvp-phases/phase-06-release-readiness.md`
- `docs/mvp-phases/translation-feedback-admin-rbac-architecture.md`
- `docs/mvp-phases/user-data-security-management-policy.md`
- `src/lib/auth/rbac.ts`
- `src/lib/auth/server-rbac.ts`
- `supabase/migrations/20260624023400_feedback_admin_rbac.sql`

## Scope Decision

현재 기준의 권장 결정:

- v0 MVP에는 포함하지 않는다.
- 공개 출시 전에는 최소한 실제 Supabase Auth, 사용자 데이터 RLS, 신고/모더레이션 정책이 있어야 한다.
- 번역 피드백 큐와 섞지 않는다. 번역 품질 제보는 `번역 의견`, 사용자 간 대화는 `토론`으로 분리한다.
- 첫 릴리스는 인증 사용자만 쓰기 가능하게 한다.
- 공개 읽기는 모더레이션 안정화 후 별도 phase에서 결정한다.
- 성경 공부 그룹, 공개 프로필, DM, 실시간 채팅은 첫 커뮤니티 릴리스에서 제외한다.

추천 출시 순서:

```text
개인 리더 MVP
-> 실제 Auth/DB/RLS 전환
-> 번역 피드백 및 어드민 RBAC 안정화
-> 구절 연결 토론 MVP
-> 신고/모더레이션 큐
-> 검색, 알림, 공개 읽기, 그룹
```

## Goals

- 사용자가 구절, 장, 권 단위로 토론 스레드를 만들 수 있다.
- 리더에서 선택한 구절의 토론 목록과 댓글 수를 확인할 수 있다.
- 토론 작성 시 KJV 본문과 현재 한국어 번역의 reference snapshot을 저장한다.
- 사용자는 스레드에 댓글을 작성하고 본인 글을 제한적으로 수정/삭제할 수 있다.
- 부적절한 스레드와 댓글을 신고할 수 있다.
- 모더레이터는 신고 큐에서 숨김, 복구, 잠금, 삭제 처리, 사유 기록을 할 수 있다.
- 일반 사용자는 숨김/삭제 처리된 콘텐츠를 볼 수 없다.
- 모더레이션, 신고 처리, 역할 변경은 감사 가능해야 한다.

## Non-goals

- v0 MVP 필수 기능 편입
- 익명 게시와 익명 신고
- 범용 자유게시판
- 교단별 공식 답변이나 신학 판정 시스템
- DM, 팔로우, 공개 프로필 중심 SNS
- 실시간 채팅
- 성경 공부 그룹과 그룹별 권한
- 외부 번역문 복사 기반 토론 자료 저장
- 공개 SEO 인덱싱

## Product UX

### Reader Entry Point

리더에서 구절을 선택했을 때 액션 메뉴에 `토론`을 둔다.

권장 배치:

- 구절 텍스트 옆에 항상 노출되는 버튼을 늘리지 않는다.
- 기존 구절 선택 액션 바 또는 하단 시트에 `강조`, `인용 저장`, `복사`, `번역 의견`, `토론` 순으로 배치한다.
- `번역 의견`은 번역 오류/표현 문제 제보용이고, `토론`은 사용자 간 질문/나눔용이다.
- 구절에 활성 토론이 있으면 작은 count badge만 보여준다.

비로그인 사용자:

- 토론 목록 읽기는 초기에는 비활성 또는 제한한다.
- `토론 참여`를 누르면 로그인 안내를 보여준다.
- 공개 읽기를 나중에 켜더라도 작성, 댓글, 신고는 로그인 사용자만 허용한다.

### Community Route

권장 route:

```txt
/app/community
/app/community/threads/[threadId]
/app/community?verseKey=GEN.1.1
/admin/discussions
/admin/discussions/reports
/admin/discussions/threads/[threadId]
```

`/app/community`는 앱 shell 안의 학습 도구로 다룬다. 별도 랜딩 페이지나 마케팅 화면을 만들지 않는다.

### Thread Types

첫 릴리스의 토론 유형:

| 유형 | 목적 |
| --- | --- |
| `question` | 구절 의미, 문맥, 단어 사용 질문 |
| `observation` | 읽으며 발견한 점 공유 |
| `application` | 삶의 적용과 묵상 나눔 |
| `cross_reference` | 관련 구절 연결 |
| `translation_context` | 번역 표현 자체가 아니라 문맥 이해 토론 |

`translation_context`는 번역 피드백 큐로 바로 연결하지 않는다. 실제 오역/표현 문제는 `번역 의견`으로 제출하게 안내한다.

### Report Button Placement

리포트 버튼은 구절 자체가 아니라 사용자 생성 콘텐츠에 붙인다.

권장 위치:

- 스레드 제목/본문 우측 상단의 더보기 메뉴 안: `신고`
- 각 댓글 우측 상단의 더보기 메뉴 안: `신고`
- 모바일에서는 댓글 카드 하단 보조 액션에 더보기 아이콘을 둔다.
- 리더의 구절 액션 메뉴에는 `신고`를 두지 않는다. 리더에는 `번역 의견`과 `토론`만 둔다.

이유:

- 구절 본문 문제는 번역 피드백이고, 사용자 콘텐츠 문제는 신고다.
- 모든 구절마다 신고 버튼을 보이면 번역 오류 제보, 본문 신고, 사용자 신고가 섞인다.
- 신고는 빈도가 낮은 조치이므로 primary button이 아니라 overflow action이 맞다.

신고 사유:

```text
spam
harassment
hate_or_abuse
off_topic
copyright_or_external_translation
private_information
other
```

## Role Model

기존 `app_private.user_roles` 기반을 재사용하되, 번역 검수 역할과 커뮤니티 역할을 분리한다.

| 역할 | 대상 | 핵심 권한 |
| --- | --- | --- |
| authenticated member | 로그인 사용자 | 스레드/댓글 작성, 본인 글 수정, 신고 |
| `discussion_moderator` | 커뮤니티 모더레이터 | 신고 큐 조회, 콘텐츠 숨김/복구/잠금, 신고 처리 |
| `community_manager` | 커뮤니티 운영자 | 모더레이터 권한 전체, 카테고리/정책 설정, 운영 리포트 조회 |
| `admin` | 시스템 관리자 | 역할 부여/회수, 전체 감사 로그 조회 |

정책:

- `reader`는 별도 role row가 아니라 인증된 일반 사용자 상태로 취급한다.
- `feedback_reviewer`, `translator`, `lead_reviewer`는 토론 모더레이션 권한을 자동으로 갖지 않는다.
- `admin`은 역할 관리 권한을 가지지만, 일상 모더레이션 UI에서는 `discussion_moderator` 또는 `community_manager` 역할을 명시적으로 요구하는 편이 감사에 유리하다.
- 기존 role check constraint에는 `discussion_moderator`, `community_manager`를 추가하는 migration이 필요하다.

## Database Architecture

### User Public Profiles

커뮤니티에서는 이메일을 노출하지 않는다. 공개 표시명만 분리 저장한다.

```sql
create table public.user_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

초기에는 avatar, bio, public profile page를 제외한다.

### Discussion Threads

```sql
create table public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('verse', 'chapter', 'book', 'general')),
  verse_key text,
  book_order int check (book_order between 1 and 66),
  chapter int check (chapter > 0),
  verse int check (verse > 0),
  title text not null check (length(trim(title)) between 4 and 120),
  body text not null check (length(trim(body)) between 4 and 4000),
  thread_type text not null default 'question'
    check (thread_type in ('question', 'observation', 'application', 'cross_reference', 'translation_context')),
  kjv_text_snapshot text,
  ko_text_snapshot text,
  status text not null default 'open'
    check (status in ('open', 'locked', 'hidden', 'deleted')),
  visibility text not null default 'members'
    check (visibility in ('members', 'public')),
  comment_count int not null default 0 check (comment_count >= 0),
  report_count int not null default 0 check (report_count >= 0),
  last_activity_at timestamptz not null default now(),
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discussion_threads_scope_check check (
    (scope_type = 'verse' and verse_key is not null and book_order is not null and chapter is not null and verse is not null)
    or (scope_type = 'chapter' and verse_key is null and book_order is not null and chapter is not null)
    or (scope_type = 'book' and verse_key is null and book_order is not null)
    or (scope_type = 'general' and verse_key is null)
  )
);
```

권장 indexes:

```sql
create index discussion_threads_scope_idx
on public.discussion_threads(scope_type, verse_key, book_order, chapter, last_activity_at desc);

create index discussion_threads_status_activity_idx
on public.discussion_threads(status, visibility, last_activity_at desc);

create index discussion_threads_author_idx
on public.discussion_threads(author_id, created_at desc);
```

### Discussion Comments

초기 댓글은 flat comment로 시작한다. `parent_comment_id`는 1-depth 답글을 열어야 할 때 추가한다.

```sql
create table public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 3000),
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'deleted')),
  report_count int not null default 0 check (report_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discussion_comments_thread_idx
on public.discussion_comments(thread_id, created_at asc);

create index discussion_comments_author_idx
on public.discussion_comments(author_id, created_at desc);
```

### Discussion Reports

```sql
create table public.discussion_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  thread_id uuid references public.discussion_threads(id) on delete cascade,
  comment_id uuid references public.discussion_comments(id) on delete cascade,
  reason text not null check (
    reason in (
      'spam',
      'harassment',
      'hate_or_abuse',
      'off_topic',
      'copyright_or_external_translation',
      'private_information',
      'other'
    )
  ),
  details text check (details is null or length(trim(details)) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint discussion_reports_target_check check (
    (target_type = 'thread' and thread_id is not null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null)
  )
);
```

중복 신고 방지:

```sql
create unique index discussion_reports_open_thread_unique
on public.discussion_reports(reporter_id, thread_id)
where target_type = 'thread' and status in ('open', 'reviewing');

create unique index discussion_reports_open_comment_unique
on public.discussion_reports(reporter_id, comment_id)
where target_type = 'comment' and status in ('open', 'reviewing');
```

### Moderation Events

```sql
create table public.discussion_moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('thread', 'comment', 'report', 'user')),
  target_id uuid not null,
  event_type text not null check (
    event_type in (
      'thread_created',
      'comment_created',
      'reported',
      'report_status_changed',
      'hidden',
      'restored',
      'locked',
      'unlocked',
      'deleted',
      'moderator_note'
    )
  ),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## RLS And Grants

기본 원칙:

- `public` schema의 새 테이블은 모두 RLS를 활성화한다.
- 브라우저에는 service role key를 절대 노출하지 않는다.
- 일반 사용자는 visible/open 콘텐츠만 읽고, hidden/deleted 콘텐츠는 읽지 못한다.
- 일반 사용자는 본인 글만 제한적으로 수정할 수 있다.
- status, report_count, comment_count, locked_by 같은 운영 필드는 일반 사용자가 직접 수정하지 못하게 한다.
- 모더레이션 처리는 서버 route에서 현재 사용자의 role을 확인한 뒤 수행한다.
- `security definer` helper가 필요하면 exposed schema인 `public`이 아니라 private schema에 둔다.

권장 read 정책:

```sql
alter table public.user_public_profiles enable row level security;
alter table public.discussion_threads enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_reports enable row level security;
alter table public.discussion_moderation_events enable row level security;

create policy "Members can read visible discussion threads"
on public.discussion_threads
for select
to authenticated
using (
  status in ('open', 'locked')
  or app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])
);

create policy "Members can read visible discussion comments"
on public.discussion_comments
for select
to authenticated
using (
  status = 'visible'
  or app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin'])
);
```

권장 write 정책:

```sql
create policy "Members can create discussion threads"
on public.discussion_threads
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'open'
  and visibility = 'members'
  and comment_count = 0
  and report_count = 0
  and locked_by is null
  and locked_at is null
);

create policy "Members can create visible comments"
on public.discussion_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'visible'
);

create policy "Members can report discussion content"
on public.discussion_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and moderator_id is null
  and resolved_at is null
);
```

업데이트는 가능하면 API route를 통해 처리한다. 직접 table update를 열어야 한다면 column-level grant와 RLS를 함께 사용한다.

## API Architecture

Reader and community APIs:

```txt
GET    /api/discussions/threads?verseKey=GEN.1.1&cursor=...
POST   /api/discussions/threads
GET    /api/discussions/threads/[threadId]
PATCH  /api/discussions/threads/[threadId]
POST   /api/discussions/threads/[threadId]/comments
PATCH  /api/discussions/comments/[commentId]
POST   /api/discussions/reports
```

Admin and moderation APIs:

```txt
GET    /api/admin/discussions/reports
PATCH  /api/admin/discussions/reports/[reportId]
PATCH  /api/admin/discussions/threads/[threadId]/moderation
PATCH  /api/admin/discussions/comments/[commentId]/moderation
GET    /api/admin/discussions/audit
```

API 원칙:

- 클라이언트가 보낸 `kjv_text_snapshot`, `ko_text_snapshot`은 신뢰하지 않는다. 서버가 `verse_key`로 본문을 다시 조회한다.
- 입력은 plain text 또는 제한된 markdown만 받는다.
- HTML은 저장하지 않는다.
- 본문 길이, URL 개수, 반복 제출을 서버에서 제한한다.
- 신고 API는 같은 사용자의 같은 target open report 중복을 거절한다.
- 모더레이션 API는 `discussion_moderator`, `community_manager`, `admin` 중 하나를 요구한다.
- role 변경은 기존 `/admin/users/roles` 체계를 확장하되 audit event를 남긴다.

## UI Architecture

추천 파일 구조:

```txt
src/
  app/
    app/
      community/
        page.tsx
        threads/
          [threadId]/page.tsx
    api/
      discussions/
        threads/route.ts
        threads/[threadId]/route.ts
        threads/[threadId]/comments/route.ts
        comments/[commentId]/route.ts
        reports/route.ts
      admin/
        discussions/
          reports/route.ts
          reports/[reportId]/route.ts
          threads/[threadId]/moderation/route.ts
          comments/[commentId]/moderation/route.ts
    admin/
      discussions/
        page.tsx
        reports/page.tsx
        threads/[threadId]/page.tsx
  components/
    community/
      discussion-entry-point.tsx
      discussion-thread-list.tsx
      discussion-thread-form.tsx
      discussion-thread-detail.tsx
      discussion-comment-list.tsx
      discussion-report-menu.tsx
    admin/
      discussion-report-queue.tsx
      discussion-moderation-panel.tsx
  lib/
    discussions/
      discussion-types.ts
      discussion-validation.ts
      discussion-repository.ts
    auth/
      rbac.ts
      server-rbac.ts
```

기존 `src/components/kjv-mvp-app.tsx`에는 최소한의 entry point만 붙인다.

- 선택 구절 action menu에 `토론` 추가
- 선택 구절의 thread count lazy load
- thread create modal 또는 `/app/community?verseKey=...` 이동
- 로그인하지 않은 사용자의 작성 CTA 처리

## Moderation Queue UX

경로:

```txt
/admin/discussions
/admin/discussions/reports
/admin/discussions/threads/[threadId]
```

신고 큐 컬럼:

- 대상 유형: thread/comment
- 구절 또는 범위
- 신고 사유
- 신고 수
- 현재 상태
- 작성자
- 신고자
- 마지막 활동일
- 담당 모더레이터

상세 화면:

- 신고 대상 원문
- KJV/한국어 reference context
- 신고 사유와 상세 설명
- 같은 target의 신고 목록
- 작성자의 최근 신고/제재 이력
- 모더레이션 이벤트 타임라인

주요 액션:

- `dismiss_report`
- `hide_content`
- `restore_content`
- `lock_thread`
- `unlock_thread`
- `soft_delete_content`
- `add_moderator_note`

첫 릴리스에서는 사용자 정지/차단을 포함하지 않는다. 필요하면 `community_user_restrictions`를 별도 phase에서 추가한다.

## Implementation Phases

### Phase C-00: Policy And Scope Lock

작업 체크리스트:

- [ ] 커뮤니티가 v0 MVP 밖이라는 결정을 유지할지 확인한다.
- [ ] 공개 읽기 허용 여부를 결정한다. 권장은 초기 `members` only다.
- [ ] 커뮤니티 가이드라인 문구를 작성한다.
- [ ] 외부 번역문 인용/복사 제한 정책을 정한다.
- [ ] 신고 사유와 모더레이션 조치 범위를 확정한다.
- [ ] 표시명 정책을 정한다.

수용 기준:

- [ ] 번역 피드백과 토론의 사용자 문구가 분리되어 있다.
- [ ] 신고/모더레이션 정책이 운영자가 설명 가능한 수준으로 정리되어 있다.
- [ ] 공개 프로필, 그룹, DM, 실시간 채팅이 제외 범위로 유지된다.

### Phase C-01: Schema, RBAC, RLS Foundation

작업 체크리스트:

- [ ] `app_private.user_roles` role check에 `discussion_moderator`, `community_manager`를 추가한다.
- [ ] `current_user_app_roles()`와 TS `appRoles`를 새 역할에 맞춘다.
- [ ] `user_public_profiles`를 추가한다.
- [ ] `discussion_threads`를 추가한다.
- [ ] `discussion_comments`를 추가한다.
- [ ] `discussion_reports`를 추가한다.
- [ ] `discussion_moderation_events`를 추가한다.
- [ ] RLS, grant, indexes를 migration에 작성한다.
- [ ] 최초 모더레이터 bootstrap 절차를 문서화한다.

수용 기준:

- [ ] authenticated user만 thread/comment/report를 생성할 수 있다.
- [ ] 일반 사용자는 hidden/deleted 콘텐츠를 조회할 수 없다.
- [ ] 모더레이터는 신고 큐와 숨김 콘텐츠를 조회할 수 있다.
- [ ] role 없는 사용자는 모더레이션 update를 할 수 없다.
- [ ] 모든 exposed table에 RLS가 켜져 있다.

### Phase C-02: Verse-anchored Thread MVP

작업 체크리스트:

- [ ] 구절 선택 액션에 `토론`을 추가한다.
- [ ] `GET /api/discussions/threads`를 만든다.
- [ ] `POST /api/discussions/threads`를 만든다.
- [ ] `GET /api/discussions/threads/[threadId]`를 만든다.
- [ ] 스레드 작성 폼을 만든다.
- [ ] 구절 reference snapshot을 서버에서 저장한다.
- [ ] `/app/community` 목록을 만든다.
- [ ] `/app/community/threads/[threadId]` 상세 화면을 만든다.

수용 기준:

- [ ] 로그인 사용자가 선택 구절에서 토론을 만들 수 있다.
- [ ] 같은 구절의 토론 목록을 볼 수 있다.
- [ ] 잘못된 `verse_key`는 거절된다.
- [ ] hidden/deleted 상태는 일반 목록에 나오지 않는다.
- [ ] 비로그인 사용자는 작성 대신 로그인 안내를 본다.

### Phase C-03: Comments And Report Flow

작업 체크리스트:

- [ ] 댓글 작성 API와 UI를 만든다.
- [ ] 본인 스레드/댓글 수정 정책을 구현한다.
- [ ] 스레드/댓글 overflow menu에 `신고`를 추가한다.
- [ ] 신고 제출 modal을 만든다.
- [ ] `POST /api/discussions/reports`를 만든다.
- [ ] 중복 신고와 너무 긴 상세 설명을 검증한다.
- [ ] thread/comment `report_count` 갱신 방식을 정한다.

수용 기준:

- [ ] 사용자가 스레드에 댓글을 남길 수 있다.
- [ ] 사용자가 본인 글만 수정할 수 있다.
- [ ] 사용자가 본인 콘텐츠를 신고할 수 없거나, 신고해도 moderation queue에 의미 없는 중복이 생기지 않는다.
- [ ] 같은 target에 대한 같은 사용자의 open report는 중복 생성되지 않는다.

### Phase C-04: Admin Moderation Queue

작업 체크리스트:

- [ ] `/admin/discussions/reports` queue를 만든다.
- [ ] 신고 상세 화면을 만든다.
- [ ] 숨김/복구/잠금/삭제 API를 만든다.
- [ ] 모더레이터 note를 남긴다.
- [ ] `discussion_moderation_events`를 append한다.
- [ ] 관리자 화면에서 thread context와 댓글 context를 함께 보여준다.

수용 기준:

- [ ] `discussion_moderator` 이상만 신고 큐에 접근한다.
- [ ] 권한 없는 사용자의 URL 직접 접근과 API 직접 호출이 실패한다.
- [ ] 숨김 처리된 콘텐츠는 일반 사용자에게 보이지 않는다.
- [ ] 모든 모더레이션 액션은 event로 남는다.

### Phase C-05: Discovery, Search, Notifications

작업 체크리스트:

- [ ] 권/장/구절별 토론 count를 최적화한다.
- [ ] 최신 토론, 답변 없는 질문, 내가 참여한 토론 필터를 만든다.
- [ ] 간단한 텍스트 검색을 추가한다.
- [ ] 내가 작성한 thread/comment 목록을 만든다.
- [ ] 댓글 알림 또는 이메일 알림은 별도 결정으로 둔다.

수용 기준:

- [ ] 사용자가 현재 읽는 구절과 관련된 토론을 빠르게 찾을 수 있다.
- [ ] 모더레이션으로 숨김 처리된 콘텐츠는 검색 결과에도 나오지 않는다.
- [ ] 알림을 켜기 전에도 핵심 토론 흐름이 동작한다.

### Phase C-06: Public Read Or Groups

후속 확장 후보:

- 공개 read-only 토론 페이지
- 공개 SEO 인덱싱
- 성경 공부 그룹
- 그룹별 비공개 토론
- 사용자 제한/정지 체계
- 신뢰도 기반 자동 숨김
- 실시간 댓글

이 phase는 운영 정책과 모더레이션 여력이 확인된 뒤 시작한다.

## Test Plan

RLS smoke test:

- [ ] 계정 A가 verse thread를 만든다.
- [ ] 계정 B가 thread를 읽고 댓글을 단다.
- [ ] 계정 B는 계정 A의 thread body를 수정할 수 없다.
- [ ] 계정 A가 status를 `hidden`으로 직접 insert/update하려 하면 실패한다.
- [ ] 계정 B가 댓글을 신고한다.
- [ ] role 없는 계정은 신고 큐를 조회할 수 없다.
- [ ] `discussion_moderator`는 신고 큐를 조회하고 thread를 숨길 수 있다.
- [ ] 숨긴 thread는 일반 사용자 목록과 상세에서 보이지 않는다.

API and validation test:

- [ ] thread API는 client snapshot을 신뢰하지 않고 서버에서 구절을 재조회한다.
- [ ] 없는 `verse_key`는 404 또는 validation error를 반환한다.
- [ ] title/body/comment 길이 제한이 동작한다.
- [ ] HTML 입력이 escape 또는 거절된다.
- [ ] 같은 target open report 중복 제출이 거절된다.
- [ ] locked thread에는 일반 댓글 작성이 실패한다.

UI manual test:

- [ ] 리더에서 선택 구절의 `토론` 액션을 열 수 있다.
- [ ] 비로그인 사용자는 작성 대신 로그인 안내를 본다.
- [ ] 로그인 사용자는 구절 토론을 만들 수 있다.
- [ ] thread detail에서 댓글을 작성할 수 있다.
- [ ] thread와 comment의 더보기 메뉴에서 신고할 수 있다.
- [ ] `/admin/discussions/reports`에서 신고를 처리할 수 있다.

## Open Decisions

- 토론 읽기를 초기부터 공개할지, 로그인 사용자에게만 열지.
- flat comments로 충분한지, 1-depth reply를 바로 넣을지.
- 표시명을 필수로 받을지, 자동 생성할지.
- thread edit window를 몇 분으로 제한할지.
- `admin`이 커뮤니티 모더레이션 권한을 자동 포함할지.
- 신고 누적 시 자동 숨김을 둘지.
- 외부 한국어 번역문을 장문 인용한 토론을 어떻게 처리할지.
- 공개 SEO를 열 경우 라이선스와 운영 부담을 어떻게 재평가할지.

## Done Definition

- [ ] 커뮤니티가 현재 MVP 제외 범위인 점이 문서와 이슈에서 명확하다.
- [ ] 로그인 사용자는 구절 연결 토론을 만들고 댓글을 남길 수 있다.
- [ ] 리더의 `번역 의견`과 `토론` 액션이 혼동되지 않는다.
- [ ] 신고 버튼은 사용자 생성 콘텐츠의 overflow menu에만 있다.
- [ ] 일반 사용자는 숨김/삭제 콘텐츠를 볼 수 없다.
- [ ] 모더레이터는 신고 큐에서 조치하고 감사 로그를 남길 수 있다.
- [ ] 새 테이블의 RLS, grant, role check가 검증되었다.
- [ ] 공개 읽기, 그룹, 실시간 채팅은 별도 후속 phase로 남아 있다.
