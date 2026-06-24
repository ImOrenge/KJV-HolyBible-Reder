# 성경 단어 주석과 해석 가이드 구현 아키텍처

## 1. 목표

성경 리더 안에서 사용자가 본문을 읽다가 어려운 단어, KJV 특유 표현, 신학 용어, 역사/문화 배경이 필요한 표현을 바로 이해할 수 있게 한다. 본문 자체를 변경하지 않고, `verse_key` 기준의 별도 주석 레이어를 얹어 짧은 뜻과 문맥 해석을 제공한다.

이 기능은 개인 노트가 아니라 앱이 제공하는 검수된 학습 가이드 콘텐츠다. 사용자는 주석을 읽고 필요하면 자신의 노트로 가져갈 수 있지만, 공개 주석 원문을 직접 수정하지 않는다.

## 2. 현재 코드/문서 기준

- 리더는 `src/components/kjv-mvp-app.tsx`에서 절 단위 `Verse`를 렌더링한다.
- `Verse` 타입은 `src/lib/types.ts`에 있으며 `verseKey`, `text`, `textEn`, `textKo`, `translationStatus`를 가질 수 있다.
- 성경 데이터는 DB 전환 후 `verse_key`를 장기 식별자로 사용한다.
- `DB-plan.Md`의 `translation_terms`는 KJV-to-Korean 번역 용어 통일용이다.
- `docs/db-load-phases/phase-04-crosswire-extraction-normalization.md`는 CrossWire 원문 heading, note, Strong/morphology markup을 본문 plain text에 섞지 않고, 후속 확장 시 `bible_verse_annotations` 같은 별도 테이블을 두라고 정한다.

따라서 단어 주석은 본문 필드나 번역문 필드가 아니라 별도 도메인으로 구현한다.

## 3. 범위

### 포함

- 리더에서 주석이 있는 단어/표현 표시
- 단어/표현 클릭 시 해석 패널 표시
- 주석 유형 분류: 단어 뜻, 신학 용어, KJV 표현, 역사/문화 배경, 번역 주의
- 현재 장의 주석을 한 번에 조회하는 API
- Supabase DB 저장 구조와 public read 정책
- 검수된 주석만 사용자에게 노출
- 주석 내용을 개인 노트로 복사/추가하는 액션

### 제외

- 성경 본문에 HTML/Markdown 주석을 직접 삽입
- 사용자가 공개 주석을 직접 편집하는 기능
- 실시간 AI 해석 자동 생성
- Strong/morphology 원본 markup을 그대로 본문에 복원
- 주석 없는 모든 단어를 자동 사전화하는 기능
- 신학적으로 논쟁적인 장문 주석 제공

## 4. 사용자 경험

### 리더 표시

주석이 있는 단어/표현은 본문 안에서 얇은 밑줄 또는 점선 밑줄로 표시한다.

- 일반 단어 뜻: 점선 밑줄
- 신학 용어: 강조색 밑줄
- 배경 설명: 작은 정보 아이콘 또는 점선 밑줄
- 번역 주의: 한국어 번역 모드에서만 표시 가능

절 전체 버튼 구조를 유지하되, 주석 트리거는 내부 `<button>` 또는 접근 가능한 inline control로 둔다. 클릭 이벤트는 절 선택 이벤트와 충돌하지 않게 `event.stopPropagation()`을 사용한다.

### 해석 패널

주석 트리거를 누르면 `WordAnnotationPanel`을 연다.

데스크톱:

- 리더 패널 하단 또는 우측 보조 패널
- 선택한 주석이 바뀌면 패널 내용만 갱신

모바일:

- 하단 바텀시트
- 하단 네비게이션, TTS 오버레이, 선택 액션시트와 겹치지 않게 z-index와 bottom offset을 분리

패널 내용:

- 단어/표현
- 분류 배지
- 짧은 뜻
- 문맥 해석
- 필요 시 KJV 표현/번역 주의
- 관련 구절 목록
- `내 노트에 추가`
- `닫기`

### 내 노트에 추가

`내 노트에 추가`를 누르면 현재 구절의 verse note modal을 열고 다음 형식을 note draft 뒤에 추가한다.

```text
[단어 해석] soul
뜻: 혼, 생명, 사람 자신을 가리킬 수 있는 KJV 주요 용어
문맥: 이 구절에서는 단순한 감정이 아니라 사람의 내적 생명 전체를 가리킨다.
```

기존 노트가 있으면 덮어쓰지 않고 하단에 추가한다.

## 5. 데이터 모델

### 5.1 `bible_annotation_terms`

사용자에게 보여줄 주석의 본문이다.

```sql
create table public.bible_annotation_terms (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null,
  display_term text not null,
  term_en text,
  term_ko text,
  category text not null
    check (category in ('lexical', 'theology', 'kjv_expression', 'history_culture', 'translation_note')),
  short_definition_ko text not null,
  interpretation_note_ko text not null,
  context_note_ko text,
  source_note text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewing', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_key)
);
```

필드 기준:

| 필드 | 용도 |
| --- | --- |
| `normalized_key` | `soul`, `holy_ghost`, `son_of_man` 같은 내부 canonical key |
| `display_term` | UI에 표시할 대표 표현 |
| `category` | UI 배지와 필터 기준 |
| `short_definition_ko` | 한두 문장 뜻 |
| `interpretation_note_ko` | 해당 용어를 이해하기 위한 핵심 해석 |
| `context_note_ko` | 문화/역사/문맥 설명 |
| `source_note` | 내부 검수자가 참고한 출처/주의점 |
| `status` | `published`만 공개 리더에 노출 |

### 5.2 `bible_annotation_occurrences`

어떤 주석이 어떤 구절의 어느 표현에 붙는지 저장한다.

```sql
create table public.bible_annotation_occurrences (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.bible_annotation_terms(id) on delete cascade,
  verse_key text not null,
  language text not null check (language in ('en', 'ko')),
  match_text text not null,
  occurrence_index int not null default 1,
  start_offset int,
  end_offset int,
  display_priority int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_id, verse_key, language, match_text, occurrence_index)
);
```

앵커 정책:

- 기본 기준은 `match_text + occurrence_index`다.
- `start_offset/end_offset`은 캐시 필드로만 사용한다.
- 서버 또는 클라이언트는 현재 표시할 본문에서 `match_text`의 n번째 occurrence를 찾아 range를 확정한다.
- 확정된 substring이 `match_text`와 정확히 일치하지 않으면 그 occurrence는 렌더링하지 않고 검증 리포트에 남긴다.
- offset 단위는 JavaScript 문자열 slice 기준인 UTF-16 code unit으로 통일한다.

이 방식은 번역문 교정이나 원문 재탑재로 offset이 틀어져도 `match_text + occurrence_index`로 재해석할 수 있게 한다.

### 5.3 `bible_annotation_related_verses`

주석 패널에서 연결할 관련 구절이다.

```sql
create table public.bible_annotation_related_verses (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.bible_annotation_terms(id) on delete cascade,
  verse_key text not null,
  label text,
  note text,
  display_order int not null default 100,
  unique(term_id, verse_key)
);
```

### 5.4 `translation_terms`와의 관계

`translation_terms`는 번역 일관성을 위한 내부 용어 사전이다. `bible_annotation_terms`는 사용자에게 보여주는 해석 가이드다.

연결이 필요하면 후속으로 `translation_term_id uuid references translation_terms(id)`를 nullable로 추가한다. 초기 MVP에서는 강결합하지 않는다.

## 6. API 설계

### 6.1 현재 장 주석 조회

```http
GET /api/bible/annotations?verseKeys=GEN.1.1,GEN.1.2&language=en
```

응답:

```json
{
  "language": "en",
  "verses": [
    {
      "verseKey": "GEN.1.1",
      "annotations": [
        {
          "occurrenceId": "uuid",
          "termId": "uuid",
          "category": "theology",
          "displayTerm": "God",
          "matchText": "God",
          "startOffset": 7,
          "endOffset": 10,
          "shortDefinitionKo": "하나님을 가리키는 일반 명칭",
          "summary": "창조 주체로서의 하나님을 가리킨다."
        }
      ]
    }
  ]
}
```

동작:

- `verseKeys`는 최대 200개까지 허용한다.
- `language`는 `en | ko`만 허용한다.
- `published` 상태의 term만 반환한다.
- unresolved occurrence는 기본 응답에서 제외한다.
- 관리자 검증 API에서는 unresolved 목록을 별도로 볼 수 있게 한다.

### 6.2 주석 상세 조회

```http
GET /api/bible/annotations/{termId}
```

응답:

```json
{
  "id": "uuid",
  "displayTerm": "soul",
  "category": "theology",
  "shortDefinitionKo": "혼, 생명, 사람 자신을 가리킬 수 있는 KJV 주요 용어",
  "interpretationNoteKo": "문맥에 따라 사람의 내적 생명, 생명 자체, 또는 인격 전체를 가리킨다.",
  "contextNoteKo": "KJV에서는 soul이 현대 영어의 감정적 의미보다 넓게 쓰이는 경우가 많다.",
  "relatedVerses": [
    {
      "verseKey": "GEN.2.7",
      "label": "living soul",
      "note": "사람이 living soul이 되는 장면"
    }
  ]
}
```

상세 조회는 패널에서 필요할 때 호출한다. 현재 장 조회 응답에는 패널 첫 화면에 필요한 요약만 포함한다.

## 7. 프론트엔드 구현

### 7.1 상태와 데이터 흐름

리더에서 장을 열면 다음 순서로 동작한다.

1. `fetchBibleChapter(bookId, chapter)`로 구절 목록을 가져온다.
2. `chapterVerses.map(v => v.verseKey ?? v.id)`로 `verseKeys`를 만든다.
3. `fetchBibleAnnotations(verseKeys, readingLanguage)`를 호출한다.
4. `annotationsByVerseKey` 맵을 만든다.
5. 절 렌더링 시 `renderVerseTextWithAnnotations(verse, annotations)`로 본문을 조각 렌더링한다.

새 상태:

```ts
type ActiveWordAnnotation = {
  occurrenceId: string;
  termId: string;
  verseKey: string;
  displayTerm: string;
};

const [annotationsByVerseKey, setAnnotationsByVerseKey] = useState<Map<string, ResolvedVerseAnnotation[]>>(new Map());
const [activeWordAnnotation, setActiveWordAnnotation] = useState<ActiveWordAnnotation | null>(null);
const [annotationStatus, setAnnotationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
```

### 7.2 본문 조각 렌더링

`renderVerseTextWithAnnotations`는 하나의 문자열과 resolved ranges를 입력받아 다음을 반환한다.

- 일반 텍스트 조각
- 주석 트리거 조각

규칙:

- range는 `startOffset` 오름차순으로 정렬한다.
- 겹치는 range가 있으면 `display_priority`가 낮은 항목을 우선한다.
- 같은 시작점이면 긴 match를 우선한다.
- 겹쳐서 선택되지 못한 주석은 패널에는 노출하지 않는다.
- 공백과 문장부호는 원문 그대로 유지한다.
- 검색/복사/TTS는 기존 plain text를 사용한다. 주석 트리거 텍스트를 별도 포함하지 않는다.

예시 렌더 구조:

```tsx
<span className="verse-text">
  In the beginning{" "}
  <button className="word-annotation-trigger" type="button">God</button>
  {" "}created the heaven and the earth.
</span>
```

### 7.3 패널 컴포넌트

`WordAnnotationPanel` props:

```ts
type WordAnnotationPanelProps = {
  active: ActiveWordAnnotation;
  onClose: () => void;
  onOpenVerse: (verseKey: string) => void;
  onAppendToNote: (payload: WordAnnotationNotePayload) => void;
};
```

패널 내부:

- `termId`로 상세 조회
- loading skeleton
- error state
- category badge
- 관련 구절 버튼
- 내 노트에 추가

### 7.4 CSS

추가 클래스:

- `.verse-text`
- `.word-annotation-trigger`
- `.word-annotation-trigger.category-theology`
- `.word-annotation-trigger.category-history-culture`
- `.word-annotation-panel`
- `.word-annotation-backdrop`
- `.word-annotation-related-list`

모바일:

- 768px 이하에서 패널은 fixed bottom sheet
- `mobile-bottom-nav`, `selection-action-sheet`, `player-bar`와 z-index 충돌을 피한다.
- TTS 오버레이가 열려 있으면 패널은 TTS보다 위에 뜨거나, TTS 오버레이를 유지한 채 패널 bottom offset을 올린다. 초기 구현은 패널을 더 높은 z-index로 띄운다.

## 8. 콘텐츠 작성 기준

### 주석 길이

- `short_definition_ko`: 80자 이하 권장
- `interpretation_note_ko`: 300자 이하 권장
- `context_note_ko`: 500자 이하 권장

### 문체

- 단정적 교리 해설보다 본문 이해를 돕는 설명으로 쓴다.
- 특정 교단 논쟁은 피한다.
- KJV 표현, 성경 문맥, 번역상 주의점을 구분한다.
- 불확실한 내용은 `source_note`에 내부 검토 메모로 남기고 published 하지 않는다.

### 금지

- "이 구절은 반드시 이렇게 적용해야 한다" 같은 직접 적용 강요
- 본문에 없는 해석을 확정적으로 추가
- 한국어 번역문의 검수 전 표현을 주석 근거로 사용
- 출처가 불분명한 원어 의미 단정

## 9. 콘텐츠 seed 예시

초기 seed는 창세기 1-3장, 요한복음 1장, 요한복음 3장, 시편 23편부터 시작한다.

예시:

| normalized_key | display_term | category | short_definition_ko |
| --- | --- | --- | --- |
| `god` | God | theology | 창조주 하나님을 가리키는 일반 명칭 |
| `spirit_of_god` | Spirit of God | theology | 하나님의 영을 가리키는 표현 |
| `light` | light | lexical | 창조 기사에서 하나님이 부르신 빛 |
| `serpent` | serpent | history_culture | 창세기 3장에 등장하는 뱀 |
| `only_begotten_son` | only begotten Son | kjv_expression | KJV 특유의 아들 칭호 표현 |
| `born_again` | born again | kjv_expression | 다시 태어남을 가리키는 요한복음 표현 |

## 10. 관리와 검수 흐름

초기 구현은 seed 파일과 migration으로 시작한다. 어드민 UI는 후속으로 둔다.

단계:

1. `data/annotations/seed-word-annotations.jsonl` 작성
2. validation script로 필수 필드, category, verse_key, match_text occurrence 확인
3. Supabase seed 또는 migration으로 삽입
4. `status='published'` 항목만 리더 API에 노출
5. 후속 어드민에서 draft/review/publish workflow 추가

검수 체크:

- [ ] `verse_key`가 실제 `bible_verses_en` 또는 승인된 `bible_verses_ko`에 존재한다.
- [ ] `match_text`가 해당 language 본문에 존재한다.
- [ ] `occurrence_index`가 정확하다.
- [ ] 주석이 본문 의미를 과도하게 확장하지 않는다.
- [ ] source/license 문제가 있는 외부 자료를 그대로 복사하지 않았다.
- [ ] published 상태는 검수자만 설정한다.

## 11. 권한과 보안

공개 사용자:

- published 주석 read 가능
- 주석을 개인 노트에 복사 가능
- 공개 주석 생성/수정/삭제 불가

관리자:

- draft/reviewing 주석 조회 가능
- 주석 생성/수정 가능
- published 전환 가능

RLS 기준:

```sql
alter table public.bible_annotation_terms enable row level security;
alter table public.bible_annotation_occurrences enable row level security;
alter table public.bible_annotation_related_verses enable row level security;

create policy "published annotation terms are public readable"
on public.bible_annotation_terms
for select
using (status = 'published');
```

관리자 write 정책은 기존 admin/RBAC 정책과 같은 방식으로 `admin` 또는 `content_editor` 역할을 확인한다.

## 12. 성능 기준

- 현재 장 기준 주석 조회는 한 번의 API call로 끝낸다.
- 장당 annotation occurrence가 300개를 넘지 않게 시작한다.
- 응답 payload가 커지면 상세 설명은 term detail API로 lazy load한다.
- 주석 fetch 실패는 본문 렌더링을 막지 않는다.
- annotation API는 `verse_key`, `language`, `status` 인덱스를 사용한다.

권장 인덱스:

```sql
create index bible_annotation_occurrences_verse_language_idx
on public.bible_annotation_occurrences(verse_key, language);

create index bible_annotation_terms_status_category_idx
on public.bible_annotation_terms(status, category);
```

## 13. 접근성

- 주석 트리거는 키보드 포커스 가능해야 한다.
- trigger `aria-label` 예: `God 단어 해석 열기`
- 패널은 `role="dialog"`와 `aria-modal`을 사용한다.
- Escape로 닫을 수 있게 한다.
- 모바일 바텀시트는 포커스가 뒤 본문으로 새지 않게 한다.
- 색상만으로 주석 유형을 구분하지 않고 배지/텍스트도 제공한다.

## 14. 구현 페이즈

### Phase A: 문서와 타입 계약

- [ ] 이 문서를 기준으로 `WordAnnotationTerm`, `WordAnnotationOccurrence`, `ResolvedVerseAnnotation` 타입을 정의한다.
- [ ] API 응답 타입을 `src/lib/bible-api-types.ts`에 추가한다.
- [ ] fixture seed 10개를 작성한다.
- [ ] annotation range resolver helper를 작성한다.

완료 기준:

- [ ] 타입만으로 리더와 API가 공유할 계약이 명확하다.
- [ ] fixture에서 match_text resolution이 성공한다.

### Phase B: 로컬/fixture 기반 리더 통합

- [ ] 현재 장 verseKeys로 주석 fixture를 조회한다.
- [ ] `annotationsByVerseKey` 상태를 만든다.
- [ ] 절 본문에 annotation trigger를 렌더링한다.
- [ ] `WordAnnotationPanel`을 만든다.
- [ ] 패널에서 관련 구절 열기를 지원한다.
- [ ] 내 노트에 추가 액션을 기존 note modal과 연결한다.

완료 기준:

- [ ] 창세기/요한복음 fixture 구절에서 주석이 보인다.
- [ ] 주석 클릭 시 패널이 열린다.
- [ ] 주석 없는 장은 기존과 동일하게 동작한다.

### Phase C: Supabase DB와 API

- [ ] migration으로 annotation tables를 만든다.
- [ ] published public read RLS를 적용한다.
- [ ] `GET /api/bible/annotations`를 만든다.
- [ ] `GET /api/bible/annotations/[termId]`를 만든다.
- [ ] seed import script를 작성한다.
- [ ] unresolved occurrence 검증 script를 작성한다.

완료 기준:

- [ ] API가 published 주석만 반환한다.
- [ ] 잘못된 match_text는 사용자 응답에서 제외된다.
- [ ] 리더는 DB API로 주석을 표시한다.

### Phase D: 콘텐츠 검수와 운영

- [ ] seed 주석 50개를 작성한다.
- [ ] 검수 체크리스트를 통과한 항목만 published 처리한다.
- [ ] admin 편집 UI 초안을 설계한다.
- [ ] category별 표시 정책을 QA한다.
- [ ] 모바일 바텀시트와 TTS/선택 액션 충돌을 검증한다.

완료 기준:

- [ ] 주요 리더 플로우에서 주석이 학습 보조 역할을 한다.
- [ ] 콘텐츠가 본문/번역 데이터와 분리되어 재배포 가능하다.

## 15. 테스트 계획

명령:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm audit --audit-level=moderate`

단위/정적 테스트:

- [ ] `resolveAnnotationRanges(text, occurrences)`가 n번째 occurrence를 정확히 찾는다.
- [ ] 겹치는 occurrence에서 priority가 적용된다.
- [ ] 존재하지 않는 match_text는 unresolved로 분류된다.
- [ ] 주석 조각 렌더링 후 전체 textContent가 원문과 동일하다.

브라우저 수동 검증:

- [ ] 리더에서 주석 단어가 표시된다.
- [ ] 클릭/탭 시 해석 패널이 열린다.
- [ ] 패널 닫기, 관련 구절 열기, 내 노트 추가가 동작한다.
- [ ] 주석 없는 장에서 UI가 비어 보이거나 깨지지 않는다.
- [ ] 모바일 폭에서 바텀시트가 화면 밖으로 넘치지 않는다.
- [ ] TTS 재생 중에도 주석 패널이 조작 가능하다.
- [ ] 구절 복사/TTS는 주석 텍스트를 끼워 넣지 않는다.

## 16. 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| 주석이 본문 해석을 과도하게 단정함 | category와 검수 상태를 두고 published 전 검수한다. |
| 번역문 수정으로 offset이 틀어짐 | `match_text + occurrence_index`를 primary anchor로 사용한다. |
| 본문 클릭과 주석 클릭이 충돌함 | 주석 trigger에서 이벤트 전파를 막고 접근 가능한 inline button을 쓴다. |
| 모바일 하단 UI와 패널이 겹침 | z-index와 bottom offset을 별도 설계하고 모바일 QA를 필수화한다. |
| 외부 주석 자료 저작권 문제 | seed는 직접 작성한 요약만 넣고 `source_note`는 내부 참고용으로 둔다. |
| 모든 단어에 주석을 달아 화면이 복잡해짐 | 초기에는 핵심 용어와 난해 표현 중심으로 제한한다. |

## 17. 최종 수용 기준

- [ ] 본문 plain text와 주석 데이터가 분리되어 있다.
- [ ] `verse_key` 기준으로 주석을 조회한다.
- [ ] published 주석만 일반 사용자에게 노출된다.
- [ ] 주석 표시가 구절 선택, 강조, 인용, TTS, 복사 기능을 깨지 않는다.
- [ ] 주석 패널이 데스크톱과 모바일에서 모두 사용 가능하다.
- [ ] 주석 내용을 개인 노트로 가져갈 수 있다.
- [ ] 주석 없는 구절/장에서도 기존 리더 경험이 유지된다.
