# 성경노트 페이즈별 태스크 체크리스트

## 1. 목표

개인 성경노트를 제목, 본문, 연결 구절, 태그를 가진 개별 저장 단위로 구현한다. 기존 장/절 노트는 유실하지 않고 새 `PersonalNote` 모델로 확장한다.

기준 아키텍처: [personal-note-editor-architecture.md](./personal-note-editor-architecture.md)

## 2. Phase A: 데이터 계약과 마이그레이션 설계

### 태스크

- [ ] `PersonalNote` 타입을 정의한다.
- [ ] `PersonalNoteVerseLink` 타입을 정의한다.
- [ ] `PersonalNoteTag` 타입을 정의한다.
- [ ] `VerseTag` 타입을 정의한다.
- [ ] `UserDataState`에 `personalNotes`를 추가한다.
- [ ] `UserDataState`에 `personalNoteVerseLinks`를 추가한다.
- [ ] `UserDataState`에 `personalNoteTags`를 추가한다.
- [ ] `UserDataState`에 `verseTags`를 추가한다.
- [ ] 기존 `StudyNote`를 읽기 전용 legacy 데이터로 유지하는 정책을 확정한다.
- [ ] `StudyNote.scope = "chapter"` 마이그레이션 규칙을 정의한다.
- [ ] `StudyNote.scope = "verse"` 마이그레이션 규칙을 정의한다.
- [ ] localStorage schema version을 올리는 방식을 정한다.
- [ ] 노트 본문 최대 길이와 제목 최대 길이를 정한다.
- [ ] 노트 body에서 검색용 `bodyText`를 추출하는 규칙을 정한다.

### 완료 기준

- [ ] 기존 장/절 노트가 새 모델 설계에서 사라지지 않는다.
- [ ] 하나의 노트가 여러 구절을 연결할 수 있다.
- [ ] 하나의 노트가 여러 태그를 가질 수 있다.
- [ ] 구절 태그가 노트 없이도 독립적으로 저장될 수 있다.

## 3. Phase B: 로컬 노트 화면과 텍스트 편집기

### 태스크

- [ ] `ViewKey`에 `notes`를 추가한다.
- [ ] 데스크톱 내비게이션에서 노트 화면 진입점을 추가한다.
- [ ] 모바일 진입점을 빠른이동 또는 공부 영역에 추가한다.
- [ ] `PersonalNotesView` 컴포넌트를 만든다.
- [x] `PersonalNoteListScreen` 컴포넌트를 만든다.
- [x] `PersonalNoteEditorScreen` 컴포넌트를 만든다.
- [ ] `NoteEditorToolbar` 컴포넌트를 만든다.
- [ ] 제목 입력 필드를 구현한다.
- [ ] 본문 `textarea` 편집 영역을 구현한다.
- [ ] Markdown-lite preview 전환을 구현한다.
- [ ] 굵게 toolbar 동작을 구현한다.
- [ ] 기울임 toolbar 동작을 구현한다.
- [ ] 인용 toolbar 동작을 구현한다.
- [ ] 목록 toolbar 동작을 구현한다.
- [ ] 체크리스트 toolbar 동작을 구현한다.
- [ ] 저장 버튼을 구현한다.
- [ ] 저장됨, 저장 중, 저장 실패 상태를 표시한다.
- [ ] local draft debounce 저장을 구현한다.
- [ ] 새 노트 생성 흐름을 구현한다.
- [ ] 노트 삭제 흐름을 구현한다.

### 완료 기준

- [ ] 사용자가 새 노트를 만들 수 있다.
- [ ] 노트가 id 단위로 개별 저장된다.
- [ ] 새로고침 후에도 로컬 노트가 유지된다.
- [ ] 저장 실패 시 작성 중인 draft가 사라지지 않는다.
- [x] 모바일에서 목록과 편집기가 서로 겹치지 않는다.

## 4. Phase C: 리더 연동, 구절 연결, 구절 태그

### 태스크

- [ ] 절 액션 메뉴에 `새 노트`를 추가한다.
- [ ] 절 액션 메뉴에 `기존 노트에 추가`를 추가한다.
- [ ] 절 액션 메뉴에 `구절 태그`를 추가한다.
- [ ] 다중 선택 액션에서 여러 구절을 새 노트에 연결한다.
- [ ] 다중 선택 액션에서 여러 구절을 기존 노트에 추가한다.
- [ ] `AppendToNoteSheet`를 구현한다.
- [ ] `VerseTagSheet`를 구현한다.
- [ ] `LinkedVerseChips`를 구현한다.
- [ ] 노트 상세에서 연결 구절을 추가한다.
- [ ] 노트 상세에서 연결 구절을 제거한다.
- [ ] 노트 상세에서 연결 구절 순서를 조정한다.
- [ ] 연결 구절의 본문 인용 삽입 버튼을 구현한다.
- [ ] 리더에서 구절 태그 칩을 표시한다.
- [ ] 같은 구절에 여러 노트를 연결할 수 있게 한다.

### 완료 기준

- [ ] 창세기 1:1과 창세기 1:2를 하나의 노트에 연결할 수 있다.
- [ ] 선택 구절을 기존 노트에 추가할 수 있다.
- [ ] 노트 없이도 구절에 태그를 붙일 수 있다.
- [ ] 구절 태그가 리더에서 다시 보인다.
- [ ] 구절 복사, 강조, TTS 흐름이 노트 액션으로 깨지지 않는다.

## 5. Phase D: 노트 검색과 필터

### 태스크

- [ ] 노트 제목 검색을 구현한다.
- [ ] 노트 본문 검색을 구현한다.
- [ ] 노트 태그 필터를 구현한다.
- [ ] 구절 태그 필터를 구현한다.
- [ ] 권별 필터를 구현한다.
- [ ] 최근 수정순 정렬을 구현한다.
- [ ] 생성순 정렬을 구현한다.
- [ ] 성경순 정렬을 구현한다.
- [ ] 제목순 정렬을 구현한다.
- [ ] 빈 결과 상태를 구현한다.
- [ ] 검색어와 필터 상태를 화면 전환 후에도 유지한다.

### 완료 기준

- [ ] 노트가 많아도 검색어로 다시 찾을 수 있다.
- [ ] 태그로 노트와 구절을 다시 찾을 수 있다.
- [ ] 권별 필터가 연결 구절 기준으로 동작한다.
- [ ] 성경순 정렬은 첫 연결 구절 기준으로 동작한다.

## 6. Phase E: Supabase 저장소와 RLS 전환

### 태스크

- [ ] `user_personal_notes` migration을 작성한다.
- [ ] `user_personal_note_verse_links` migration을 작성한다.
- [ ] `user_personal_note_tags` migration을 작성한다.
- [ ] `user_verse_tags` migration을 작성한다.
- [ ] 각 테이블에 RLS를 활성화한다.
- [ ] `authenticated` role 전용 grant를 설정한다.
- [ ] `anon` role 쓰기 권한이 없음을 확인한다.
- [ ] 노트 CRUD RLS 정책을 작성한다.
- [ ] verse link membership 소유권 정책을 작성한다.
- [ ] note tag membership 소유권 정책을 작성한다.
- [ ] verse tag 소유권 정책을 작성한다.
- [ ] localStorage repository와 Supabase repository 인터페이스를 맞춘다.
- [ ] `GET /api/me/notes`를 구현한다.
- [ ] `POST /api/me/notes`를 구현한다.
- [ ] `PATCH /api/me/notes/{noteId}`를 구현한다.
- [ ] `DELETE /api/me/notes/{noteId}`를 구현한다.
- [ ] `POST /api/me/verse-tags`를 구현한다.
- [ ] `DELETE /api/me/verse-tags/{verseTagId}`를 구현한다.
- [ ] 로그에서 노트 본문이 출력되지 않게 마스킹한다.

### 완료 기준

- [ ] 로그인 계정 기준으로 노트가 저장된다.
- [ ] 다른 계정의 note id를 직접 요청해도 읽을 수 없다.
- [ ] 다른 계정의 note에 verse link를 추가할 수 없다.
- [ ] 다른 계정의 tag를 자신의 note에 연결할 수 없다.
- [ ] 서버 오류 로그에 노트 본문 원문이 남지 않는다.

## 7. Phase F: 검증과 출시 준비

### 자동 검증

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Markdown-lite helper unit test를 추가한다.
- [ ] localStorage migration unit test를 추가한다.
- [ ] RLS 교차 계정 테스트를 추가한다.

### 수동 검증

- [ ] 새 노트를 만들고 저장한다.
- [ ] 기존 장/절 노트가 새 노트 목록에 표시되는지 확인한다.
- [ ] 연결 구절을 본문에 인용으로 삽입한다.
- [ ] 구절 태그를 추가하고 같은 태그로 다시 찾는다.
- [ ] 모바일에서 편집기, 태그 sheet, 연결 구절 sheet가 화면 밖으로 넘치지 않는지 확인한다.

### 최종 수용 기준

- [ ] 성경노트는 개별 저장 엔티티로 동작한다.
- [ ] 노트는 제목, 본문, 연결 구절, 태그를 가진다.
- [ ] 구절 자체 태그와 노트 태그가 구분된다.
- [ ] 기존 `StudyNote` 데이터가 유실되지 않는다.
- [ ] 공개 출시 저장소에서는 사용자별 RLS가 적용된다.
