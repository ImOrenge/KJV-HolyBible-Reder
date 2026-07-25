# 개인 노트 텍스트 편집기와 구절 태그 구현 아키텍처

## 1. 목표

사용자가 성경을 읽으며 개인 노트를 독립된 학습 기록으로 작성, 편집, 저장, 검색, 재사용할 수 있게 한다. 노트는 단순 장/절 메모가 아니라 제목, 본문, 연결 구절, 태그를 가진 개별 엔티티다.

기존 `StudyNote`는 장 또는 절 하나에 붙은 단일 텍스트 메모에 가깝다. 이 개선은 기존 노트를 확장해 다음을 지원한다.

- 노트 텍스트 편집기
- 노트 개별 저장
- 하나의 노트에 여러 성경 구절 연결
- 성경 구절 자체에 태그 지정
- 노트에 태그 지정
- 리더, 노트 목록, 검색, 사전/주석 패널에서 노트로 가져오기

## 1.1 Rich Text 확장

초기 Markdown-lite 결정은 구현 출발점으로 유지하되, 개인 노트의 현재 편집기 기준은 구조화된 rich-text 문서 모델이다. 굵게, 기울임, 밑줄, 글자 크기, 글자색, 정렬, 형광과 inline 구절 태그는 JSON 문서로 저장한다. 상세 계약과 마이그레이션은 [personal-note-rich-text-editor-architecture.md](./personal-note-rich-text-editor-architecture.md)를 우선한다.

## 1.2 성경공부 워크스페이스 확장

rich-text 편집기 이후에는 revision 복구, 구절 역참조, 원격 검색, template, 노트 링크, export, 집중 모드를 하나의 private study workspace로 확장한다. 상세 데이터 계약과 개별 Phase는 [personal-note-study-workspace-architecture.md](./personal-note-study-workspace-architecture.md)를 우선한다.

이 기능은 공개 주석이나 번역 피드백이 아니라 사용자의 private study data다. localStorage 검증은 가능하지만 공개 출시에서는 Supabase Auth 사용자별 DB 저장과 RLS가 필수다.

## 2. 현재 코드/문서 기준

- `packages/shared/src/types.ts`에는 `StudyNote`가 있으며 `scope: "chapter" | "verse"`, `bookId`, `chapter`, `verseId`, `note`를 가진다.
- `UserDataState.studyNotes`는 배열이지만 현재 UX는 장/절 대상의 노트 modal 중심이다.
- `apps/web/src/components/kjv-mvp-app.tsx`에는 `noteTarget`, `noteDraft`, `saveStudyNote`, `deleteStudyNote`, `.note-textarea` 기반 편집 UI가 있다.
- `phase-03-study-tools-highlights-favorites.md`는 개인 성경 공부 노트 전체 기능을 제외 범위로 둔다.
- `frontend-enhancement-plan.md`는 기본 장/절 노트까지 완료된 상태로 기록한다.
- `user-data-security-management-policy.md`는 노트 본문을 User Private 데이터로 분류하고 로그에 원문을 남기지 않도록 정한다.
- `supabase-email-auth-architecture.md`는 개인 데이터 DB 전환 시 `user_study_notes` 추가 검토를 명시한다.

따라서 이 문서는 기본 장/절 노트의 후속 확장이다. 기존 `StudyNote` 데이터를 버리지 않고 새 노트 모델로 마이그레이션할 수 있어야 한다.

## 3. 범위

### 포함

- 노트 전용 화면 또는 패널
- 제목, 본문, 태그, 연결 구절을 가진 개별 노트 저장
- 구조화된 rich-text 텍스트 편집기와 미리보기
- 리더에서 선택 구절을 새 노트에 연결
- 리더에서 선택 구절을 기존 노트에 추가
- 성경 구절 자체에 태그 지정
- 노트 태그 지정
- 노트 목록 검색, 태그 필터, 권별 필터, 최근 수정순/성경순 정렬
- localStorage 모델과 Supabase DB 모델
- 계정별 RLS, membership 테이블 소유권 검증

### 제외

- 공동 편집
- 공개 공유 노트
- 실시간 동기화 presence
- 이미지/파일 첨부
- 공동 편집과 실시간 cursor
- AI 노트 자동 생성
- 노트 import와 외부 서비스 동기화
- 커뮤니티 게시글 전환

## 4. 사용자 경험

### 4.1 노트 화면

새 화면 이름은 `노트`로 둔다. `ViewKey`에는 `notes`를 추가한다.

노트 화면 구성:

- 웹 `/app/study/notes`: 검색, 태그/권별 필터, 보관함, 내보내기와 노트 목록
- 웹 `/app/study/notes/[noteId]`: 선택 노트 편집기와 optional inspector
- 목록에서 노트를 선택하거나 새 노트를 생성하면 별도 편집 URL로 전환한다.
- 편집 화면의 연결 구절, 태그, 최근 저장 상태는 editor와 inspector가 담당한다.
- 웹과 모바일 모두 목록과 편집기를 동시에 렌더링하지 않는다.

모바일:

- 목록과 편집기는 한 화면에 동시에 두지 않는다.
- 목록에서 노트를 탭하면 full-screen editor로 전환한다.
- 연결 구절과 태그 관리는 bottom sheet로 분리한다.

### 4.2 리더에서 노트 작성

절 액션 메뉴와 다중 선택 액션 시트에 다음 액션을 추가한다.

- `새 노트`
- `기존 노트에 추가`
- `구절 태그`

동작:

- `새 노트`: 선택 구절을 연결한 빈 노트를 만들고 편집기를 연다.
- `기존 노트에 추가`: 노트 선택 sheet를 열고 선택 구절을 해당 노트에 연결한다.
- `구절 태그`: 구절 자체에 태그를 지정한다. 노트를 만들지 않아도 동작한다.

선택 구절이 여러 개면 하나의 노트에 여러 `verse link`를 만든다. 구절 본문은 노트 본문에 자동 복사하지 않고, 연결 구절 칩으로 보관한다. 사용자가 원하면 `본문 인용 삽입` 버튼으로 편집기 본문에 복사한다.

### 4.3 노트 편집기

편집기는 공통 JSON 문서 모델을 기준으로 웹 rich-text adapter와 Expo rich-text adapter를 사용한다. HTML 기반 저장과 앱 전체 WebView 전환은 하지 않는다. 모바일 IME, selection, undo 리스크는 adapter 검증과 단계적 도입으로 관리한다.

Toolbar:

| 도구 | 동작 |
| --- | --- |
| 실행 취소/다시 실행 | 문서 transaction을 되돌리거나 재적용 |
| 굵게/기울임/밑줄 | 선택 영역 또는 이후 입력에 문자 mark 적용 |
| 크기/글자색/형광 | 허용된 design token을 선택해 적용 |
| 정렬 | 현재 문단 또는 제목 block의 논리 정렬 변경 |
| 제목/인용/목록/체크 | 현재 block을 구조적으로 변환 |
| 구절 삽입 | 연결 구절 또는 자동완성 결과를 inline verse node로 삽입 |
| 미리보기 | 동일 JSON renderer의 read-only 전환 |

편집기 필드:

- 제목
- 연결 구절 칩
- 태그 입력
- 구조화된 rich-text 본문 편집 영역
- 저장 상태: 저장됨, 저장 중, 저장 실패, 로컬 임시저장
- 저장 버튼

저장 정책:

- 사용자는 명시적으로 `저장`할 수 있다.
- 편집 중에는 local draft를 debounce 저장한다.
- 서버 저장 실패 시 local draft를 유지한다.
- 노트는 id 단위로 개별 저장한다.
- 같은 구절에 여러 노트를 저장할 수 있다.
- 노트 삭제는 기본 hard delete로 시작하되, DB 전환 후에는 `archived_at` soft delete를 검토한다.

## 5. 데이터 모델

### 5.1 TypeScript 타입

기존 `StudyNote`는 호환 레이어로 유지하고, 새 모델을 추가한다.

```ts
export type PersonalNoteStatus = "active" | "archived";
export type PersonalNoteEditorFormat = "markdown-lite" | "rich-text-v1";

export type PersonalNote = {
  id: string;
  userId: string;
  title: string;
  bodyMarkdown: string;
  bodyDocument?: PersonalNoteDocument;
  bodyText: string;
  editorFormat: PersonalNoteEditorFormat;
  status: PersonalNoteStatus;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastSavedAt?: string;
};

export type PersonalNoteVerseLink = {
  id: string;
  userId: string;
  noteId: string;
  verseKey: string;
  bookId: string;
  chapter: number;
  verse: number;
  selectedText?: string;
  linkOrder: number;
  createdAt: string;
};

export type PersonalNoteTag = {
  noteId: string;
  tagId: string;
};

export type VerseTag = {
  id: string;
  userId: string;
  verseKey: string;
  bookId: string;
  chapter: number;
  verse: number;
  tagId: string;
  sourceNoteId?: string;
  createdAt: string;
};
```

`UserDataState` 확장:

```ts
export type UserDataState = {
  // existing fields...
  studyNotes: StudyNote[];
  personalNotes: PersonalNote[];
  personalNoteVerseLinks: PersonalNoteVerseLink[];
  personalNoteTags: PersonalNoteTag[];
  verseTags: VerseTag[];
};
```

### 5.2 localStorage 마이그레이션

기존 `studyNotes`는 다음 규칙으로 새 노트에 복사할 수 있다.

- `StudyNote.scope = "chapter"` -> 제목: `창세기 1장 노트`
- `StudyNote.scope = "verse"` -> 제목: `창세기 1:1 노트`
- `note` -> `bodyMarkdown`, `bodyText`
- verse note는 `personalNoteVerseLinks` 1개 생성
- chapter note는 verse link 없이 `bookId/chapter` metadata를 title/body에 남김
- 기존 `studyNotes`는 즉시 삭제하지 않고 읽기 전용 legacy fallback으로 둔다.

## 6. Supabase 데이터 모델

개인 데이터 테이블은 `public` schema에 두되 RLS와 최소 grant를 반드시 적용한다.

### 6.1 `user_personal_notes`

```sql
create table public.user_personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body_markdown text not null default '',
  body_text text not null default '',
  editor_format text not null default 'markdown-lite'
    check (editor_format in ('markdown-lite')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  check (char_length(title) <= 120),
  check (char_length(body_markdown) <= 50000)
);
```

### 6.2 `user_personal_note_verse_links`

```sql
create table public.user_personal_note_verse_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  verse_key text not null,
  app_book_id text not null,
  chapter int not null,
  verse int not null,
  selected_text text,
  link_order int not null default 100,
  created_at timestamptz not null default now(),
  unique(note_id, verse_key)
);
```

### 6.3 `user_personal_note_tags`

기존 `user_tags`를 재사용한다.

```sql
create table public.user_personal_note_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.user_personal_notes(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);
```

### 6.4 `user_verse_tags`

구절 자체를 태그하는 테이블이다. 노트가 없어도 사용할 수 있다.

```sql
create table public.user_verse_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null,
  app_book_id text not null,
  chapter int not null,
  verse int not null,
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  source_note_id uuid references public.user_personal_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, verse_key, tag_id)
);
```

## 7. RLS 정책

기본 원칙:

- `user_personal_notes`는 `auth.uid() = user_id`로 CRUD를 허용한다.
- membership 테이블은 `user_id`도 검증하고 부모 note/tag 소유권도 `exists`로 검증한다.
- `anon` role에는 grant하지 않는다.
- `authenticated` role에만 필요한 CRUD를 grant한다.
- UPDATE 정책에는 SELECT 정책도 필요하다.

예시:

```sql
alter table public.user_personal_notes enable row level security;

create policy "Users can read own personal notes"
on public.user_personal_notes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own personal notes"
on public.user_personal_notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own personal notes"
on public.user_personal_notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own personal notes"
on public.user_personal_notes
for delete
to authenticated
using ((select auth.uid()) = user_id);
```

membership 테이블은 부모 note가 같은 사용자 소유인지 확인한다.

```sql
create policy "Users can manage own note verse links"
on public.user_personal_note_verse_links
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = note_id
      and note.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.user_personal_notes note
    where note.id = note_id
      and note.user_id = (select auth.uid())
  )
);
```

## 8. API 설계

### 8.1 노트 목록

```http
GET /api/me/notes?q=믿음&tagId=uuid&bookId=gen&sort=updated
```

응답:

```json
{
  "total": 12,
  "notes": [
    {
      "id": "uuid",
      "title": "창세기 1장 창조 묵상",
      "excerpt": "빛과 어둠의 구분...",
      "updatedAt": "2026-07-10T00:00:00.000Z",
      "tags": [{ "id": "uuid", "name": "창조" }],
      "verses": [{ "verseKey": "GEN.1.1", "reference": "창세기 1:1" }]
    }
  ]
}
```

### 8.2 노트 생성

```http
POST /api/me/notes
```

```json
{
  "title": "창세기 1장 창조 묵상",
  "bodyMarkdown": "",
  "verseLinks": [
    { "verseKey": "GEN.1.1", "bookId": "gen", "chapter": 1, "verse": 1 }
  ],
  "tagIds": ["uuid"]
}
```

### 8.3 노트 수정

```http
PATCH /api/me/notes/{noteId}
```

수정 가능:

- title
- bodyMarkdown
- pinned
- status
- verseLinks
- tagIds

서버는 rich-text 문서에서 `bodyText`를 추출해 저장한다. `bodyMarkdown`은 구버전 호환용 fallback이며 새 rich-text renderer의 원본이 아니다.

### 8.4 노트 삭제

```http
DELETE /api/me/notes/{noteId}
```

초기 localStorage 구현은 hard delete로 동작한다. DB 전환 후에는 `status = 'archived'` 또는 `archived_at` soft delete를 기본으로 검토한다.

### 8.5 구절 태그

```http
POST /api/me/verse-tags
DELETE /api/me/verse-tags/{verseTagId}
GET /api/me/verse-tags?verseKey=GEN.1.1
```

구절 태그는 노트와 독립적으로 저장한다. 다만 노트에서 생성된 태그는 `sourceNoteId`를 optional로 남길 수 있다.

## 9. 프론트엔드 구현

### 9.1 새 View

```ts
type ViewKey =
  | "dashboard"
  | "reader"
  | "progress"
  | "highlights"
  | "favorites"
  | "search"
  | "notes"
  | "settings";
```

Nav:

- 데스크톱 nav에 `노트` 추가
- 모바일 bottom nav에는 바로 넣지 않고 `빠른이동` 또는 홈 `공부` 탭에서 진입한다.
- 노트 기능이 핵심 사용 흐름이 되면 모바일 bottom nav의 `인용`과 `노트` 위치를 재검토한다.

### 9.2 컴포넌트

권장 컴포넌트:

- `PersonalNotesView`
- `PersonalNoteList`
- `PersonalNoteEditor`
- `NoteEditorToolbar`
- `LinkedVerseChips`
- `NoteTagInput`
- `VerseTagSheet`
- `AppendToNoteSheet`

### 9.3 편집기 상태

```ts
type PersonalNoteDraft = {
  id: string | null;
  title: string;
  bodyMarkdown: string;
  linkedVerseIds: string[];
  tagIds: string[];
  dirty: boolean;
  saving: boolean;
  error: string | null;
};
```

저장 흐름:

1. 새 노트 버튼 또는 리더 액션으로 draft 생성
2. 사용자가 제목/본문/태그/연결 구절 편집
3. local draft debounce 저장
4. 저장 버튼 클릭 시 repository/API 저장
5. 성공하면 `lastSavedAt` 갱신
6. 실패하면 draft와 오류 상태 유지

### 9.4 Rich Text 렌더링

허용 node와 mark는 `PersonalNoteDocument` schema에 정의된 항목으로 제한한다. HTML 입력은 저장하거나 렌더링하지 않으며, preview는 같은 schema의 read-only renderer를 쓴다. 구버전 Markdown-lite는 importer로 읽되, 기존 본문을 자동 삭제하거나 변형하지 않는다.

## 10. 검색과 필터

노트 목록 필터:

| 필터 | 기준 |
| --- | --- |
| 검색어 | title, bodyText |
| 태그 | note tags |
| 권 | linked verse bookId |
| 구절 태그 | verseTags |
| 정렬 | updated, created, bible, title |

성경순 정렬:

1. 연결 구절이 있으면 첫 연결 구절 기준
2. 연결 구절이 없으면 최근 수정순 뒤로 배치

구절 태그 화면:

- 리더에서 현재 구절의 태그 칩을 표시한다.
- 태그 클릭 시 해당 태그가 붙은 구절 목록으로 이동한다.
- 노트 목록에서도 동일 태그로 필터링할 수 있다.

## 11. 기존 기능과의 관계

| 기존 기능 | 관계 |
| --- | --- |
| Highlight note | 강조 자체에 붙는 짧은 메모로 유지 |
| Favorite memo | 인용 보관함 사용 맥락 메모로 유지 |
| StudyNote | legacy 장/절 노트로 유지 후 새 `PersonalNote`로 마이그레이션 |
| Word annotation `내 노트에 추가` | 새 노트 생성 또는 현재 열린 노트에 삽입 |
| Hebrew dictionary `내 노트에 추가` | 새 노트 생성 또는 현재 열린 노트에 삽입 |
| Tags | 기존 사용자 태그를 노트, 인용, 구절 태그에서 재사용 |

중복을 줄이기 위해 장기적으로는 `StudyNote` modal을 `PersonalNoteEditor`의 compact mode로 대체한다.

## 12. 구현 페이즈

### Phase A: 문서와 타입 계약

- [ ] `PersonalNote`, `PersonalNoteVerseLink`, `PersonalNoteTag`, `VerseTag` 타입을 추가한다.
- [ ] `UserDataState`에 새 배열을 추가한다.
- [ ] localStorage 마이그레이션 규칙을 작성한다.
- [ ] 기존 `StudyNote`와의 호환 정책을 확정한다.

완료 기준:

- [ ] 기존 노트 데이터가 사라지지 않는다.
- [ ] 새 노트는 여러 구절과 여러 태그를 가질 수 있다.

### Phase B: 로컬 노트 편집기

- [ ] `notes` view를 추가한다.
- [ ] 노트 목록과 편집기 layout을 만든다.
- [ ] toolbar가 rich-text selection에 구조화된 mark와 block을 적용한다.
- [ ] 노트별 개별 저장을 구현한다.
- [ ] local draft와 저장 실패 상태를 구현한다.

완료 기준:

- [ ] 사용자는 새 노트를 만들고 개별 저장할 수 있다.
- [ ] 저장 실패가 기존 draft를 잃지 않는다.
- [ ] 새로고침 후 노트가 유지된다.

### Phase C: 구절 연결과 구절 태그

- [ ] 리더 단일 구절 액션에 `새 노트`, `기존 노트에 추가`, `구절 태그`를 추가한다.
- [ ] 다중 선택 액션에서 여러 구절을 하나의 노트에 연결할 수 있게 한다.
- [ ] 구절 태그 sheet를 만든다.
- [ ] 리더에서 구절 태그 칩을 표시한다.
- [ ] 노트 상세에서 연결 구절을 추가/제거/정렬할 수 있게 한다.

완료 기준:

- [ ] 하나의 노트에 여러 구절이 연결된다.
- [ ] 노트 없이도 구절에 태그를 붙일 수 있다.
- [ ] 태그가 붙은 구절을 다시 찾을 수 있다.

### Phase D: 검색, 필터, 기존 노트 마이그레이션

- [ ] 노트 목록 검색을 구현한다.
- [ ] 태그 필터를 구현한다.
- [ ] 권별 필터를 구현한다.
- [ ] 최근 수정순/성경순/제목순 정렬을 구현한다.
- [ ] 기존 `StudyNote`를 `PersonalNote`로 복사하는 마이그레이션을 구현한다.

완료 기준:

- [ ] 사용자는 노트가 많아도 검색/필터로 찾을 수 있다.
- [ ] 기존 장/절 노트가 새 노트 목록에 표시된다.

### Phase E: Supabase DB 전환

- [ ] migration으로 `user_personal_notes` 계열 테이블을 만든다.
- [ ] RLS와 grant를 migration에 포함한다.
- [ ] localStorage repository와 Supabase repository의 매핑을 맞춘다.
- [ ] 계정 A/B 교차 접근 테스트를 작성한다.
- [ ] 로그에 note body가 남지 않는지 검증한다.

완료 기준:

- [ ] 로그인 계정 기준으로 노트가 동기화된다.
- [ ] 다른 계정의 노트를 읽거나 수정할 수 없다.
- [ ] membership 테이블이 다른 사용자 note/tag에 연결될 수 없다.

## 13. 테스트 계획

자동 검증:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] rich-text document validator와 Markdown-lite importer unit test
- [ ] localStorage migration unit test

수동 검증:

- [ ] 새 노트를 만들고 제목/본문을 저장한다.
- [ ] 굵게, 인용, 목록, 체크리스트 toolbar가 동작한다.
- [ ] 창세기 1:1과 창세기 1:2를 하나의 노트에 연결한다.
- [ ] 연결 구절을 노트 본문에 인용으로 삽입한다.
- [ ] 구절에 `창조` 태그를 붙인다.
- [ ] 같은 태그로 노트와 구절을 찾는다.
- [ ] 노트를 삭제해도 구절 태그 정책이 의도대로 유지된다.
- [ ] 모바일에서 편집기, 태그 sheet, 연결 구절 sheet가 화면 밖으로 넘치지 않는다.

Supabase 검증:

- [ ] 계정 A로 노트를 만든다.
- [ ] 계정 B로 계정 A의 note id를 직접 요청해도 실패한다.
- [ ] 계정 B가 계정 A note에 verse link를 insert할 수 없다.
- [ ] 계정 B가 계정 A tag를 자신의 note에 연결할 수 없다.
- [ ] update/delete가 own row에만 동작한다.

## 14. 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| 텍스트 편집기가 복잡해져 리더 UX를 압도함 | 자주 쓰는 문자 도구만 고정하고, 크기·색상·정렬은 추가 메뉴로 분리한다. |
| 기존 StudyNote와 새 노트가 중복 표시됨 | legacy read-only 표시와 migration 완료 플래그를 둔다. |
| 구절 태그와 노트 태그가 혼동됨 | UI에서 `구절 태그`와 `노트 태그`를 별도 섹션으로 표시한다. |
| 다대다 membership RLS가 누락됨 | 부모 note/tag 소유권 `exists` 정책을 필수화한다. |
| 노트 본문이 로그에 남음 | 에러 로그에는 note id와 operation만 남기고 body는 마스킹한다. |
| 모바일에서 긴 노트 편집이 불편함 | full-screen editor와 고정 저장 bar를 사용한다. |

## 15. 최종 수용 기준

- [ ] 사용자는 노트를 개별 엔티티로 만들고 저장할 수 있다.
- [ ] 노트는 제목, 본문, 연결 구절, 태그를 가진다.
- [ ] 하나의 노트에 여러 성경 구절을 연결할 수 있다.
- [ ] 성경 구절 자체에 태그를 지정할 수 있다.
- [ ] 노트 편집기는 rich-text toolbar와 동일 schema preview를 제공한다.
- [ ] 기존 장/절 StudyNote 데이터가 유실되지 않는다.
- [ ] 검색/태그/권별 필터로 노트를 다시 찾을 수 있다.
- [ ] 공개 출시 DB 전환 시 RLS가 사용자별 노트 소유권을 보장한다.
