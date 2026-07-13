# 개인 노트 Rich Text 편집기 아키텍처

## 1. 결정

개인 노트 편집기는 기존 `textarea + Markdown-lite`에서 구조화된 rich-text 문서 편집기로 확장한다. 지원 범위는 굵게, 기울임, 밑줄, 글자 크기, 글자색, 정렬, 형광 표시이며, 기존 제목·인용·목록·체크리스트·구절 삽입도 유지한다.

저장 형식은 HTML이 아니라 버전이 있는 JSON 문서다. HTML은 렌더링 결과일 뿐 저장하거나 신뢰하지 않는다. 이 결정은 다음을 보장한다.

- 웹과 Expo가 같은 서식, 구절 태그, 본문 텍스트를 동기화한다.
- 색상과 크기를 임의 CSS 문자열이 아니라 허용된 토큰으로 제한한다.
- `#창 1:10` 구절 태그를 단순 문자열이 아닌 안전한 inline node로 보존한다.
- 기존 Markdown-lite 노트를 손실 없이 읽고 순차적으로 변환할 수 있다.

## 2. 편집기 경험

### 2.1 툴바

툴바는 노트 본문 바로 위에 고정하고, 선택 영역이 없으면 이후 입력에 적용할 활성 mark 상태를 유지한다. 텍스트 서식 제어는 아이콘 버튼으로 두고 각 버튼에 tooltip과 `aria-label`을 제공한다.

| 그룹 | 제어 | 동작 |
| --- | --- | --- |
| 기록 | 실행 취소, 다시 실행, 서식 지우기 | 마지막 편집 transaction을 되돌리거나 현재 선택의 mark를 제거 |
| 문자 | 굵게, 기울임, 밑줄 | 선택 텍스트 또는 이후 입력에 mark를 토글 |
| 크기 | `작게`, `기본`, `크게`, `아주 크게`, `제목` | 허용된 크기 token만 적용 |
| 색상 | 글자색 swatch menu | 의미 있는 6개 팔레트 중 하나를 적용 |
| 형광 | 형광색 swatch menu | 대비가 검증된 5개 형광 팔레트 중 하나를 적용 |
| 문단 | 시작, 가운데, 끝, 양쪽 정렬 | 현재 paragraph 또는 heading block의 정렬 변경 |
| 구조 | 제목, 인용, 목록, 체크리스트 | block type 또는 list type 변환 |
| 성경 | 구절 태그, 연결 구절 삽입 | 커서 위치에서 구절 자동완성 또는 선택한 링크 삽입 |

글자색과 형광은 서로 독립이다. `textColor`는 글자 전경색, `highlightColor`는 배경 강조색만 바꾼다. 색상은 token으로만 저장하며 사용자가 임의의 hex 색상을 직접 입력하지 않는다.

### 2.2 레이아웃과 반응형 규칙

- 데스크톱: 첫 줄에 기록/문자/구조, 두 번째 줄에 크기·색상·정렬·성경 그룹을 둔다.
- 좁은 화면: 자주 쓰는 실행 취소, 굵게, 기울임, 밑줄, 구절 태그만 고정하고 크기·색상·정렬은 `Aa` 설정 메뉴에서 연다.
- 모바일: 선택 중인 텍스트를 가리지 않는 키보드 위 툴바와 색상/형광 bottom sheet를 사용한다.
- 각 icon button은 40px 이상의 고정 터치 영역을 가지며, 색상 메뉴의 swatch는 이름과 현재 선택 상태를 함께 읽을 수 있어야 한다.
- 선택 영역이 서로 다른 서식을 포함할 때 버튼은 `mixed` 상태를 표현하고, 단일 색상을 거짓으로 표시하지 않는다.

### 2.3 기본 동작과 보완 사항

- 붙여넣기는 plain text와 허용된 구조만 정규화해 가져오며, 외부 HTML의 style, script, iframe, 링크 추적 파라미터는 버린다.
- Enter는 현재 문단의 정렬과 입력 mark를 이어 간다. 빈 목록/인용에서 다시 Enter를 누르면 일반 문단으로 돌아온다.
- 노트 미리보기는 편집기와 동일한 JSON renderer를 사용한다. 별도 Markdown parser를 사용하지 않는다.
- 저장하지 않은 변경, 저장 중, 원격 저장 실패, 재시도 가능 상태를 툴바 오른쪽에 명시한다.
- 키보드 단축키는 `Ctrl/Cmd+B`, `I`, `U`, `Z`, `Shift+Z`를 지원한다. 모바일에는 동일 기능의 버튼을 제공한다.

## 3. 문서 모델

### 3.1 공통 JSON 계약

`packages/shared/src/personal-note-document.ts`에 플랫폼 독립 타입, 정규화, plain-text 추출기를 둔다. 웹의 Tiptap과 Expo의 Tentap 어댑터는 이 계약으로만 문서를 저장하고 읽는다.

```ts
export type PersonalNoteDocument = {
  type: "doc";
  version: 1;
  content: PersonalNoteBlock[];
};

export type PersonalNoteBlock =
  | { type: "paragraph"; attrs?: { textAlign?: TextAlign }; content?: PersonalNoteInline[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3; textAlign?: TextAlign }; content?: PersonalNoteInline[] }
  | { type: "blockquote"; attrs?: { textAlign?: TextAlign }; content?: PersonalNoteBlock[] }
  | { type: "bulletList"; content: PersonalNoteListItem[] }
  | { type: "orderedList"; content: PersonalNoteListItem[] }
  | { type: "taskList"; content: PersonalNoteTaskItem[] };

export type PersonalNoteListItem = {
  type: "listItem";
  content: PersonalNoteBlock[];
};

export type PersonalNoteTaskItem = {
  type: "taskItem";
  attrs: { checked: boolean };
  content: PersonalNoteBlock[];
};

export type PersonalNoteInline =
  | { type: "text"; text: string; marks?: PersonalNoteMark[] }
  | {
      type: "verseReference";
      attrs: { verseKey: string; bookId: string; chapter: number; verse: number; label: string };
    };

export type PersonalNoteMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "fontSize"; attrs: { value: FontSizeToken } }
  | { type: "textColor"; attrs: { value: TextColorToken } }
  | { type: "highlight"; attrs: { value: HighlightColorToken } };

export type TextAlign = "start" | "center" | "end" | "justify";
export type FontSizeToken = "sm" | "md" | "lg" | "xl" | "2xl";
export type TextColorToken = "ink" | "slate" | "crimson" | "emerald" | "blue" | "violet";
export type HighlightColorToken = "yellow" | "mint" | "sky" | "rose" | "lavender";
```

`verseReference`는 화면에서는 `#창 1:10`으로 보이는 선택 불가능한 inline atom이다. `label`은 표시용이고 `verseKey`가 영속적 참조 키다. 본문 plain text 추출 시에는 `#창 1:10`으로 내보내 검색과 복사에 사용한다.

### 3.2 서식 토큰

| 토큰 | 웹 CSS / 모바일 native style | 접근성 원칙 |
| --- | --- | --- |
| `sm`, `md`, `lg`, `xl`, `2xl` | 고정 typography scale | 사용자가 앱 기본 글자 크기를 바꿔도 비율을 유지 |
| `ink`, `slate`, `crimson`, `emerald`, `blue`, `violet` | 브랜드 토큰으로 해석 | 라이트/다크 모드 모두 4.5:1 이상 |
| `yellow`, `mint`, `sky`, `rose`, `lavender` | 형광 배경 토큰으로 해석 | 형광 위 본문이 읽히도록 전경색 자동 조정 |
| `start`, `center`, `end`, `justify` | 논리 정렬 값 | RTL 전환에도 의미 보존 |

문서 JSON에는 실제 색상값, pixel 단위 크기, 인라인 CSS를 넣지 않는다. 디자인 토큰 변경은 기존 노트를 다시 쓰지 않아도 전체에 반영된다.

## 4. 편집기 어댑터

### 4.1 웹

`apps/web`에는 Tiptap/ProseMirror 기반 `PersonalNoteRichTextEditor`를 둔다. 지원 extension은 document schema, paragraph, heading, list, task list, blockquote, text style, underline, highlight, text align, verse reference로 제한한다.

웹 어댑터의 책임:

- toolbar command와 editor transaction 연결
- 현재 selection의 mark/block 상태를 `EditorToolbarState`로 계산
- 구절 자동완성 popover의 selection rect 제공
- JSON document와 `PersonalNoteDocument`의 strict validation
- 안전한 read-only renderer 제공

### 4.2 Expo

React Native 기본 `TextInput`은 inline style 편집과 selection 보존을 안정적으로 제공하지 않으므로 rich-text 본문에는 사용하지 않는다. 1차 후보는 Tiptap 호환 JSON을 읽고 쓰는 `@10play/tentap-editor`다. 이 엔진은 editor surface 내부 WebView를 사용하며, 전체 앱 화면이나 노트 목록을 WebView로 대체하지 않는다.

모바일 어댑터의 책임:

- 동일 schema extension과 JSON 정규화 적용
- native toolbar, keyboard inset, color/highlight bottom sheet 제공
- selection update, undo/redo, keyboard shortcut 대체 행동 제공
- 구절 자동완성 후보를 native bottom sheet에서 선택한 뒤 editor command로 inline node 삽입

패키지 추가 전에는 Expo SDK 57, Expo Dev Client, Android/iOS 빌드, dark mode, 한글 IME, 키보드 열림 상태에서 최소 샘플을 검증한다. WebView 기반 editor의 성능·UX 비용이 수용 기준을 넘으면 rich-text 엔진을 교체하되 저장 JSON 계약은 변경하지 않는다. Expo Go 검증은 기본 동작 확인에만 쓰고 출시 판단 근거로 사용하지 않는다.

## 5. 구절 태그 자동완성과의 통합

이 문서는 [personal-note-verse-tag-autocomplete-architecture.md](./personal-note-verse-tag-autocomplete-architecture.md)의 `textarea` 전제를 대체한다.

1. 사용자가 편집기에서 `#창`, `#창 1`, `#창 1:10`을 입력한다.
2. 공유 파서는 현재 editor selection 주변의 텍스트 범위를 읽는다.
3. 후보를 선택하면 입력 문자열을 `verseReference` inline node로 교체한다.
4. node의 `verseKey`와 속성으로 `PersonalNoteVerseLink`를 upsert한다.
5. 렌더러와 복사/검색용 plain text는 node를 `#창 1:10`으로 표시한다.

`# 제목`은 heading shortcut으로만 처리하고 구절 자동완성을 열지 않는다. URL fragment나 일반 hashtag는 verse reference node로 바꾸지 않는다. 본문에서 verse node를 Backspace/Delete로 지우면 해당 `inline-tag` 링크도 같은 transaction에서 제거한다. 리더나 사전에서 명시적으로 추가한 링크는 삭제하지 않는다.

## 6. 저장과 마이그레이션

### 6.1 데이터 타입

```ts
export type PersonalNoteEditorFormat = "markdown-lite" | "rich-text-v1";

export type PersonalNote = {
  // existing fields...
  editorFormat: PersonalNoteEditorFormat;
  bodyDocument?: PersonalNoteDocument;
};
```

`bodyMarkdown`은 읽기 호환과 구버전 앱용 fallback으로 유지한다. rich-text 노트를 저장할 때에는 JSON에서 생성한 간단한 Markdown/plain-text projection을 넣고, 새 renderer의 원본으로 사용하지 않는다. `bodyText`는 항상 `bodyDocument`에서 추출한다.

### 6.2 Supabase

새 migration:

```sql
alter table public.user_personal_notes
  add column body_document jsonb,
  alter column editor_format set default 'rich-text-v1';

alter table public.user_personal_notes
  drop constraint if exists user_personal_notes_editor_format_check,
  add constraint user_personal_notes_editor_format_check
    check (editor_format in ('markdown-lite', 'rich-text-v1'));
```

서버 API는 JSON 크기, 최대 block 수, 최대 text node 수, token enum, `verseKey` 형식을 검증한다. 사용자 제공 HTML은 저장·렌더링·로그 기록 대상이 아니다. 기존 RLS와 소유권 정책은 그대로 유지한다.

### 6.3 기존 노트 전환

1. 읽을 때 `bodyDocument`가 있으면 `rich-text-v1` renderer를 사용한다.
2. 없고 `bodyMarkdown`이 있으면 안전한 Markdown-lite importer가 paragraph, heading, quote, list, checklist로 변환한다.
3. 변환 성공 시 사용자가 최초 저장할 때만 `bodyDocument`를 기록한다.
4. importer가 지원하지 않는 Markdown은 일반 paragraph text로 보존한다. 기존 본문을 삭제하거나 자동 재작성하지 않는다.

## 7. 보안과 검증

- [x] JSON schema 외 node, mark, attribute를 거부한다.
- [x] 색상·크기·정렬을 enum token으로 제한한다.
- [x] verse reference node의 장절과 `verseKey` 형식을 검증하고 후보는 서버 성경 데이터에서 조회한다.
- [x] body text와 Markdown projection을 JSON 문서에서 생성해 raw HTML을 저장하지 않는다.
- [ ] 모든 palette 조합을 라이트/다크 모드 대비 기준으로 점검한다.
- [ ] 붙여넣기 sanitize, undo/redo, selection 유지, 한글 IME를 웹과 모바일에서 검증한다.
- [x] `npm run lint`, `npm run typecheck`, `npm run build`를 통과한다.

### 7.1 2026-07-12 구현 상태

- 웹은 Tiptap 기반 전체 툴바, `#` 구절 후보, `[[` 노트 후보, 키보드 선택, 집중 모드를 사용한다.
- Expo는 TenTap 편집 surface만 WebView로 사용하며 undo/redo, 기본 서식, 색상, 형광, 목록, 전체 본문 크기·정렬을 제공한다.
- TenTap이 사용자 정의 참조 node를 직접 렌더링하지 못하는 동안 모바일 화면에서는 참조를 텍스트로 표시하고, 저장 직전에 공용 `verseReference`/`noteReference` node로 복원한다.
- 원격 Supabase에는 `body_document`, revision, template, note link, verse link source가 반영됐고 A/B 계정 RLS smoke를 통과했다.
- Android/iOS 실제 기기의 한글 IME, 키보드 inset, dark mode와 큰 시스템 글꼴은 출시 전 물리 기기 게이트로 남긴다.

## 8. 구현 순서

1. 공유 JSON 타입, validator, text extractor, Markdown-lite importer를 구현한다.
2. Supabase migration과 API/snapshot contract를 추가한다.
3. 웹 rich-text editor와 전체 툴바를 구현한다.
4. verse reference inline node와 자동완성 selection 연동을 구현한다.
5. Expo editor 어댑터와 native toolbar를 구현한다.
6. 기존 노트 lazy migration, 접근성, 색상 대비, 원격 동기화 회귀를 검증한다.
