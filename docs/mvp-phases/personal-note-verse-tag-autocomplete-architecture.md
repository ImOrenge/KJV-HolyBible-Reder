# 개인 노트 인라인 구절 태그 자동완성 아키텍처

## 1. 목적

개인 노트 본문에서 사용자가 `#`를 입력한 뒤 성경 권의 이름 또는 약어를 입력하면, 성경 구절 후보를 즉시 제시하고 선택한 구절을 노트의 연결 구절로 저장한다.

사용자가 보는 표기는 짧고 읽기 쉬운 `#창 1:10`으로 유지한다. 시스템은 이를 표시 문자열에 의존하지 않는 `verseKey = GEN.1.10`으로 함께 관리한다. 따라서 권 이름, 약어, 언어 표기가 바뀌어도 노트와 리더 연결은 깨지지 않는다.

이 문서는 이미 구현된 개인 노트, `PersonalNoteVerseLink`, 원격 Supabase 저장소를 확장하는 후속 아키텍처다. 새 노트 모델이나 별도 로컬 DB를 만들지 않는다.

## 2. 현재 상태 점검

| 항목 | 현재 상태 | 보완 방향 |
| --- | --- | --- |
| 개별 노트 저장 | `PersonalNote`와 `/api/me/notes`로 구현됨 | 기존 저장 계약 유지 |
| 연결 구절 | `PersonalNoteVerseLink`와 연결 구절 칩이 구현됨 | 본문 태그에서 만든 링크의 출처를 구분 |
| 본문 편집 | 구조화된 rich-text editor와 toolbar | editor selection 기준 자동완성 popover 추가 |
| 성경 권 메타데이터 | `bibleBookCodes`에 한글/영문 전체명과 약어 보유 | 자동완성 별칭의 단일 소스로 재사용 |
| 구절 태그 | 리더에서 `window.prompt`로 한 개 태그 추가 | sheet 기반 다중 태그 편집으로 교체 |
| 저장 상태 | 수동 저장과 원격 상태 문구가 있음 | 자동완성 링크 반영, 실패 복구, 미저장 표시를 명확화 |
| 모바일 | 노트 편집과 목록은 구현됨 | 모바일 키보드와 IME를 고려한 후보 sheet 필요 |

## 3. 사용자 경험

### 3.1 입력과 선택

1. 사용자는 노트 본문에서 `#`를 입력한다.
2. `#창`, `#창세`, `#Gen`처럼 권 이름의 첫 글자 또는 약어를 입력하면 일치하는 권 목록을 표시한다.
3. `#창 1`처럼 장을 입력하면 해당 장의 절 후보를 `창 1:1`, `창 1:2` 형식으로 보여준다.
4. `#창 1:10`처럼 장절이 완성되면 정확한 구절을 최상단에 표시한다.
5. 후보를 클릭하거나 Enter로 선택하면 입력 범위를 `#창 1:10`으로 바꾸고, 연결 구절 칩에도 같은 구절을 추가한다.

후보 행은 다음을 표시한다.

| 입력 단계 | 후보 행 |
| --- | --- |
| `#창` | `창세기` · `Genesis` · 50장 |
| `#창 1` | `창 1:1` · 구절 첫 문장 일부 |
| `#창 1:10` | `창 1:10` · 구절 첫 문장 일부 |

`사`처럼 여러 권과 연결되는 접두어는 임의로 한 권을 고르지 않는다. `사무엘기상`, `사무엘기하`, `사사기`, `이사야`, `사도행전` 등 일치 후보를 모두 성경 순서로 노출하고, 사용자가 권을 선택하게 한다.

### 3.2 키보드와 편집 규칙

- 위/아래 화살표로 후보를 이동하고 Enter 또는 Tab으로 선택한다.
- Escape를 누르거나 커서를 태그 범위 밖으로 옮기면 목록을 닫는다.
- 마우스 선택 뒤에도 editor selection과 다음 입력 위치를 유지한다.
- 한글 IME 조합 중에는 네트워크 요청이나 목록 갱신을 하지 않고, 조합 완료 뒤에만 검색한다.
- 후보가 없으면 `일치하는 구절이 없습니다`를 보여 주되 본문 입력은 막지 않는다.
- 노트 태그 입력란의 `창조, 묵상`과 본문 구절 태그 `#창 1:10`은 서로 다른 기능이다. 전자는 분류용 사용자 태그이고 후자는 성경 구절 링크다.

### 3.3 Rich Text 제목과 충돌 방지

제목 shortcut인 `# 제목`은 자동완성을 열지 않는다. 구절 태그는 `#` 다음에 공백 없이 권 이름, 약어 또는 숫자가 시작될 때만 인식한다.

| 본문 입력 | 결과 |
| --- | --- |
| `# 창조 묵상` | 제목 shortcut |
| `#창 1:10` | 인라인 구절 태그 |
| `본문 #Gen 1:1` | 인라인 구절 태그 |
| `https://example.com/#section` | 구절 태그 아님 |

## 4. 도메인 계약

### 4.1 표기와 영속 키

자동완성이 선택한 결과는 아래 두 값을 항상 가진다.

```ts
type VerseReferenceSuggestion = {
  verseKey: string; // "GEN.1.10"
  bookId: string; // "gen"
  chapter: number;
  verse: number;
  displayReference: string; // "창 1:10"
  displayText: string; // 현재 읽기 언어의 짧은 본문
};
```

본문에는 `#창 1:10`을 저장한다. 링크 테이블에는 `GEN.1.10`을 저장한다. 표시문을 역파싱해 데이터베이스 키를 만들지 않으며, 선택 시점의 suggestion만이 키를 만든다.

### 4.2 링크 출처

기존 `PersonalNoteVerseLink`에 아래 필드를 추가한다.

```ts
type PersonalNoteVerseLinkSource = "reader" | "inline-tag" | "dictionary";

type PersonalNoteVerseLink = {
  // existing fields...
  source: PersonalNoteVerseLinkSource;
};
```

- `reader`: 리더에서 선택한 구절 또는 기존 노트에 추가한 구절
- `inline-tag`: 본문 자동완성에서 선택한 구절
- `dictionary`: 히브리어 사전 예시 구절에서 추가한 구절

같은 노트에 같은 `verseKey`가 이미 있으면 중복 링크를 만들지 않는다. 먼저 생성된 링크의 출처는 유지하고, 본문에는 태그 표기만 삽입한다.

### 4.3 편집 후 동기화

본문을 임의로 수정했을 때 링크가 사라지는 문제를 피하기 위해 자동완성 선택 직후에만 `inline-tag` 링크를 추가한다. 사용자가 본문에서 `#창 1:10`을 지워도 연결 구절 칩은 자동 삭제하지 않는다. 링크 삭제는 칩의 제거 동작으로 명시적으로 수행한다.

이 정책은 손으로 입력한 비표준 문자열을 신뢰할 수 없는 참조로 저장하지 않고, 실수로 본문 일부를 지웠을 때 연결 구절을 잃지 않게 한다. 후속 범위에서 본문 태그와 링크 칩을 완전 동기화하려면 태그 범위 및 편집 이력을 별도 엔티티로 도입해야 한다.

## 5. 검색과 해석 파이프라인

```mermaid
flowchart LR
  A["editor input"] --> B["trigger parser"]
  B -->|"# + book prefix"| C["book alias matcher"]
  C --> D["reference suggestion service"]
  D --> E["popover or mobile sheet"]
  E --> F["replace typed range with #창 1:10"]
  F --> G["PersonalNoteVerseLink verseKey"]
  G --> H["PATCH /api/me/notes"]
```

### 5.1 클라이언트 파서

`packages/shared/src/verse-reference-autocomplete.ts`를 새 단일 파서/정규화 모듈로 둔다.

책임:

- caret 위치에서 가장 가까운 `#` 토큰 범위를 찾는다.
- 제목 shortcut, URL fragment, 공백으로 시작한 토큰을 제외한다.
- `권 이름 + 공백 + 장 + 선택적 :절`을 부분 입력 상태로 분해한다.
- 선택 시 교체할 `start`, `end`와 현재 query를 반환한다.
- 사용자에게 보일 짧은 표기 `창 1:10`을 하나의 형식으로 만든다.

이 모듈은 웹과 Expo에서 그대로 사용한다. DOM, React state, fetch를 직접 참조하지 않는다.

### 5.2 권 별칭 매처

`packages/shared/src/bible-book-codes.ts`를 메타데이터의 단일 소스로 유지한다. 전체 이름, `shortNameKo`, 영문 전체 이름, `shortNameEn`을 정규화해 prefix match한다.

첫 릴리스는 한글 약어와 영문 표준 약어만 지원한다. 비표준 약어 사전은 실제 검색 로그가 쌓인 뒤 별도 설정으로 추가한다.

### 5.3 원격 후보 조회

새 endpoint:

```http
GET /api/bible/reference-suggestions?q=%23%EC%B0%BD%201%3A10&limit=8
```

응답:

```json
{
  "query": "#창 1:10",
  "kind": "verse",
  "suggestions": [
    {
      "verseKey": "GEN.1.10",
      "bookId": "gen",
      "chapter": 1,
      "verse": 10,
      "displayReference": "창 1:10",
      "displayText": "하나님이 뭍을 땅이라..."
    }
  ]
}
```

처리 순서:

1. query를 공유 파서로 해석한다.
2. 권이 확정되지 않으면 `bibleBookCodes`에서 최대 8개 권 후보를 반환한다.
3. 권과 장이 확정되면 `bible_verses_en`과 승인된 한국어 번역 데이터를 읽어 절 후보와 짧은 본문을 만든다.
4. 장절 범위와 존재 여부는 서버에서 검증한다. 클라이언트가 보낸 `verseKey`를 신뢰하지 않는다.
5. 요청은 120ms debounce, 동일 query 취소, 최대 8개 결과로 제한한다.

권 메타데이터 검색은 클라이언트에서 즉시 수행할 수 있다. 다만 구절 본문과 실제 존재 여부는 원격 데이터를 기준으로 응답해 로컬 fixture와 운영 데이터의 불일치를 막는다.

## 6. 프론트엔드 구성

| 컴포넌트 또는 모듈 | 역할 |
| --- | --- |
| `PersonalNoteEditor` | 본문 입력, 후보 선택 후 문자열/링크 상태 반영 |
| `VerseReferenceAutocomplete` | desktop editor selection 기준 popover 위치, 키보드 선택, aria 목록 상태 |
| `VerseReferenceSuggestionList` | 권 또는 구절 후보 행 렌더링 |
| `VerseReferenceAutocompleteSheet` | Expo와 좁은 화면의 full-width 후보 sheet |
| `verse-reference-autocomplete.ts` | 트리거 감지, 부분 query 해석, display 표기 생성 |
| `/api/bible/reference-suggestions` | 원격 절 검증과 snippet 조회 |

웹은 editor selection rect에 맞춰 popover를 띄우되 viewport를 벗어나면 위쪽으로 뒤집는다. 모바일은 키보드 위의 고정 높이 후보 sheet를 사용한다. 후보 목록을 본문과 겹치는 임의의 absolute layout으로 유지하지 않는다.

접근성 계약:

- editor content 영역은 `aria-controls`, `aria-expanded`, `aria-activedescendant`를 가진다.
- 후보 목록은 `role="listbox"`, 행은 `role="option"`을 사용한다.
- 선택 변화는 짧은 live region으로 알린다.
- 포인터와 키보드 모두 같은 `selectSuggestion` 함수를 사용한다.

## 7. 저장소와 데이터베이스 변경

### 7.1 Migration

새 migration은 `user_personal_note_verse_links`에 다음을 추가한다.

```sql
alter table public.user_personal_note_verse_links
  add column source text not null default 'reader'
  check (source in ('reader', 'inline-tag', 'dictionary'));
```

기존 행은 `reader`로 보존한다. `note_id + verse_key`의 기존 unique 제약은 그대로 유지한다. RLS 권한이나 노트 본문 저장 정책은 이 기능 때문에 완화하지 않는다.

### 7.2 API 계약 변경

`POST /api/me/notes`, `PATCH /api/me/notes/{noteId}`, 데이터 snapshot 변환에 `verseLinks[].source`를 추가한다. 누락된 값은 서버가 `reader`로 처리해 기존 앱 버전과 호환한다.

자동완성 endpoint는 읽기 전용 공개 성경 데이터만 반환하며, 개인 노트나 사용자 태그를 조회하지 않는다.

## 8. 함께 보완할 노트 UX

우선순위는 아래와 같다.

1. `window.prompt` 기반 구절 태그를 `VerseTagSheet`로 교체한다. 기존 사용자 태그 검색, 생성, 다중 선택, 제거를 한 흐름으로 제공한다.
2. 연결 구절 칩에 제거 버튼과 출처 아이콘을 추가한다. 본문 태그와 리더 선택으로 추가된 링크를 구분할 수 있어야 한다.
3. 노트 본문에 자동 저장 대기 상태를 표시하고, 원격 실패 시 재시도 버튼을 제공한다. 실패한 draft와 링크 선택 결과는 보존한다.
4. `구절 삽입`은 첫 번째 연결 구절만 넣는 현재 동작 대신, 선택 가능한 연결 구절 목록을 먼저 연다.
5. 노트 검색 결과에서 본문 `#창 1:10`을 클릭하면 리더의 정확한 절로 이동하게 한다.

## 9. 테스트와 수용 기준

### 자동 테스트

- [ ] `#창`, `#창 1`, `#창 1:10`, `#Gen 1:10`의 파싱을 unit test한다.
- [ ] 제목 shortcut, URL fragment, 일반 hashtag가 구절 자동완성으로 오인되지 않음을 test한다.
- [ ] `사` 접두어가 여러 권 후보를 반환하고 하나를 임의 선택하지 않음을 test한다.
- [ ] suggestion 선택이 문자열 범위만 교체하고 커서를 뒤로 옮김을 test한다.
- [ ] 같은 `verseKey` 선택이 중복 `PersonalNoteVerseLink`를 만들지 않음을 test한다.
- [ ] `source` 누락 payload가 `reader`로 저장됨을 API test한다.
- [ ] `npm run lint`와 `npm run build`를 통과한다.

### 수동 테스트

- [ ] 노트 본문에서 `#창` 입력 시 창세기 후보가 나타난다.
- [ ] `#창 1:10` 선택 후 본문에 `#창 1:10`, 연결 칩에 창세기 1:10이 함께 나타난다.
- [ ] `# 사`가 제목 shortcut으로 유지되고, `#사`는 권 후보를 보여 준다.
- [ ] 한글 IME 조합 중에 목록이 흔들리거나 의도치 않게 선택되지 않는다.
- [ ] 모바일 키보드가 열린 상태에서도 후보를 고르고 본문 입력을 계속할 수 있다.
- [ ] 저장 후 새로고침과 다른 기기에서 같은 링크가 리더로 이동한다.
- [ ] 다른 사용자 계정은 자동완성 endpoint로 개인 노트나 태그를 읽을 수 없다.

## 10. 구현 순서

1. 공유 파서와 권 별칭 매칭을 먼저 만든다.
2. 읽기 전용 suggestion endpoint와 데이터 검증을 추가한다.
3. 웹 `PersonalNoteRichTextEditor`에 popover와 키보드 동작을 붙인다.
4. 링크 출처 migration, repository/API snapshot 매핑을 추가한다.
5. Expo sheet와 동등한 선택 흐름을 붙인다.
6. 구절 태그 sheet, 링크 제거, 저장 실패 재시도를 후속 보완으로 완료한다.
