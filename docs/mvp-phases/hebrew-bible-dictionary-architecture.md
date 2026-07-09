# 구약 히브리어 성경단어 사전 구현 아키텍처

## 1. 목표

구약 본문을 읽는 사용자가 히브리어 핵심 단어의 원형, 발음, 한영 의미, 문맥 해석, 출현 예시 구절을 한 화면에서 확인할 수 있게 한다. 이 기능은 일반 본문 검색이 아니라 원어 기반 학습 사전이다.

사전은 성경 본문과 번역문을 직접 수정하지 않는다. `verse_key`를 기준으로 히브리어 단어 항목과 출현 구절을 별도 도메인으로 저장하고, 리더와 사전 화면에서 같은 데이터를 조회한다.

초기 범위는 구약 중심으로 제한한다. 계시록은 원문이 헬라어이므로 1차 히브리어 사전에 직접 포함하지 않고, 후속에서 "계시록의 구약 배경어" 또는 별도 헬라어 사전으로 다룬다.

## 2. 현재 코드/문서 기준

- 리더는 `apps/web/src/components/kjv-mvp-app.tsx`에서 절 단위 `Verse`를 렌더링한다.
- `Verse` 타입은 `packages/shared/src/types.ts`에 있으며 `verseKey`, `textEn`, `textKo`, `translationStatus`를 가진다.
- 성경 데이터 API는 `apps/web/src/app/api/bible/*` 라우트와 `packages/shared/src/bible-api-types.ts` 응답 타입을 공유한다.
- `word-annotation-interpretation-guide-architecture.md`는 본문 필드와 주석 도메인을 분리하는 방향을 이미 정한다.
- `korean-keyword-search-engine-architecture.md`는 검색 결과와 리더 이동의 장기 식별자로 `verseKey`를 사용한다.
- `translation_terms`는 번역 일관성용 내부 용어 사전이고, 히브리어 사전은 사용자에게 노출되는 원어 학습 콘텐츠다.

따라서 히브리어 사전은 기존 `bible_annotation_terms`에 억지로 합치지 않고, 원어 사전 전용 테이블을 둔다. 단, 리더 안의 표시 방식과 노트 추가 흐름은 기존 단어 주석 설계를 재사용한다.

## 3. 범위

### 포함

- 구약 히브리어 단어의 대표 항목 관리
- 히브리어 원형, 음역, 한글 발음, Strong 번호, 한영 뜻, 짧은 해석 제공
- 단어가 출현하는 예시 구절 목록
- 테마별 사전 탐색: 성경속 세상의 구조, 창세기, 이사야
- 리더에서 현재 장에 연결된 히브리어 단어 표시
- 단어 상세 패널에서 `내 노트에 추가`
- Supabase DB 저장 구조, public read 정책, 검수 상태
- seed 파일과 validation script 기반의 초기 콘텐츠 운영

### 제외

- 구약 전체 히브리어 단어 자동 전수 사전화
- 사용자가 공개 사전 항목을 직접 편집하는 기능
- AI가 실시간으로 원어 뜻을 생성하는 기능
- 히브리어 본문 전체를 리더 본문으로 대체하는 기능
- 계시록 헬라어 원어 사전
- 교단별 논쟁 주석이나 장문 신학 논문식 해설
- 외부 자료의 원문 사전 설명을 그대로 복사해 공개하는 방식

## 4. 1차 테마 전략

초기 테마는 사용자가 성경 읽기 중 반복적으로 만나는 구조어와 구약 대표 본문으로 제한한다.

| 테마 ID | 표시명 | 목적 | 1차 범위 |
| --- | --- | --- | --- |
| `biblical-world-structure` | 성경속 세상의 구조 | 성경이 세계를 묘사할 때 반복되는 공간/창조/질서 어휘 이해 | 하늘, 땅, 물, 깊음, 빛, 어둠, 궁창, 바다, 산, 광야, 성전, 도시 |
| `genesis-primeval` | 창세기 1-11장 | 창조, 타락, 홍수, 민족 기원의 핵심어 이해 | 창조, 시작, 사람, 생명, 혼, 선악, 씨, 저주, 언약, 이름 |
| `genesis-patriarchs` | 창세기 12-50장 | 족장 이야기의 언약/복/땅/후손 어휘 이해 | 복, 약속, 후손, 땅, 제단, 꿈, 형제, 구속 |
| `isaiah-core` | 이사야 핵심어 | 예언서의 심판/거룩함/회복/종의 언어 이해 | 거룩함, 남은 자, 종, 시온, 위로, 열방, 영광, 의 |

계시록 연결은 후속 테마 `revelation-old-testament-background`로 둔다. 이 테마는 히브리어 단어 자체보다 구약 본문에서 온 상징과 구절 연결을 다루므로, 1차 히브리어 사전 MVP에는 넣지 않는다.

## 5. 사용자 경험

### 5.1 사전 화면

새 사전 화면은 검색 화면과 별도 탭으로 둔다.

- 검색 입력: 히브리어, 음역, 한글 뜻, 영어 gloss, Strong 번호
- 테마 탭: 성경속 세상의 구조, 창세기 1-11장, 창세기 12-50장, 이사야
- 결과 카드: 히브리어 원형, 한글 발음, 한영 핵심 뜻, 대표 구절, 테마 배지
- 상세 패널: 정의, 문맥 해석, 형태 요약, 출현 예시, 관련 단어, 출처/라이선스

검색 화면의 "본문 검색"과 사전 화면의 "단어 검색"은 UI 문구에서 분명히 구분한다.

### 5.2 리더 안 단어 표시

현재 장에 히브리어 사전 출현 데이터가 있으면 절 옆에 작은 원어 버튼 또는 본문 아래 단어 칩을 표시한다.

초기 구현은 본문 내부 substring 밑줄보다 안전한 방식으로 시작한다.

- 절 카드 하단: `히브리어: רֵאשִׁית · אֱלֹהִים · אֶרֶץ`
- 단어 칩 클릭 시 `HebrewLexiconPanel` 열림
- 구절 선택, 강조, 인용, TTS, 복사와 충돌하지 않음

본문 내부 하이라이트는 후속으로 둔다. KJV 영어 본문과 히브리어 원문은 단어 순서와 대응이 항상 1:1이 아니므로, 1차에서 영어 substring offset에 무리하게 앵커하지 않는다.

### 5.3 상세 패널

패널 내용:

- 히브리어 원형과 실제 출현 형태
- 음역과 한글 발음
- Strong 번호
- 영어 뜻
- 한국어 뜻
- 짧은 정의
- 문맥 해석
- 형태 요약
- 예시 구절
- 테마
- 출처/라이선스
- `내 노트에 추가`

`내 노트에 추가` 형식:

```text
[히브리어 단어] רֵאשִׁית (reshith, 레쉬트)
뜻: 시작, 처음 / beginning, first
문맥: 창세기 1:1에서 창조 사건의 시작을 가리킨다.
예시: GEN.1.1
```

## 6. 데이터 모델

### 6.1 `hebrew_lexicon_entries`

히브리어 단어의 대표 사전 항목이다.

```sql
create table public.hebrew_lexicon_entries (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null,
  strong_number text,
  lemma_he text not null,
  lemma_he_normalized text not null,
  transliteration text,
  pronunciation_ko text,
  gloss_en text not null,
  gloss_ko text not null,
  definition_ko text not null,
  interpretation_note_ko text,
  morphology_summary text,
  part_of_speech text,
  source_name text,
  source_url text,
  source_license text,
  attribution_text text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewing', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_key),
  unique(strong_number)
);
```

필드 기준:

| 필드 | 용도 |
| --- | --- |
| `normalized_key` | 내부 canonical key. 예: `reshith`, `elohim`, `erets` |
| `strong_number` | Strong 번호. 예: `H7225` |
| `lemma_he` | 히브리어 대표 원형 |
| `lemma_he_normalized` | 검색/중복 제거용 정규화 문자열 |
| `transliteration` | 로마자 음역 |
| `pronunciation_ko` | 한국어 독자를 위한 발음 보조 |
| `gloss_en` | 짧은 영어 뜻 |
| `gloss_ko` | 짧은 한국어 뜻 |
| `definition_ko` | 사용자에게 보여줄 사전 정의 |
| `interpretation_note_ko` | 성경 문맥 이해를 돕는 해석 |
| `morphology_summary` | 명사/동사형 등 간단한 형태 정보 |
| `source_*` | 데이터 출처와 라이선스 추적 |
| `status` | `published`만 공개 사용자에게 노출 |

### 6.2 `hebrew_word_occurrences`

단어가 어떤 구절에 나오는지 저장한다.

```sql
create table public.hebrew_word_occurrences (
  id uuid primary key default gen_random_uuid(),
  lexicon_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  verse_key text not null,
  app_book_id text not null,
  book_order int not null,
  chapter int not null,
  verse int not null,
  surface_he text,
  surface_he_normalized text,
  transliteration text,
  kjv_match_text text,
  ko_match_text text,
  occurrence_index int not null default 1,
  morphology_code text,
  phrase_en text,
  phrase_ko text,
  display_priority int not null default 100,
  source_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lexicon_entry_id, verse_key, surface_he, occurrence_index)
);
```

앵커 정책:

- 기본 연결은 `verse_key + lexicon_entry_id`다.
- 히브리어 원문 실제 형태는 `surface_he`에 저장한다.
- KJV 영어 본문 대응은 보조 필드 `kjv_match_text`로만 둔다.
- 한국어 대응은 검수된 경우에만 `ko_match_text`에 둔다.
- 리더 1차 구현은 본문 substring offset 대신 절 하단 단어 칩을 사용한다.
- 후속으로 본문 내부 하이라이트를 넣을 때만 `match_text + occurrence_index` resolver를 적용한다.

### 6.3 `hebrew_dictionary_themes`

사전 탐색 테마를 저장한다.

```sql
create table public.hebrew_dictionary_themes (
  id text primary key,
  title_ko text not null,
  description_ko text not null,
  scope_note_ko text,
  display_order int not null default 100,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.4 `hebrew_theme_entries`

사전 항목과 테마의 연결이다.

```sql
create table public.hebrew_theme_entries (
  theme_id text not null references public.hebrew_dictionary_themes(id) on delete cascade,
  lexicon_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  reason_ko text,
  display_order int not null default 100,
  primary key (theme_id, lexicon_entry_id)
);
```

### 6.5 `hebrew_related_entries`

동일 어근, 대조어, 자주 함께 읽는 단어를 연결한다.

```sql
create table public.hebrew_related_entries (
  entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  related_entry_id uuid not null references public.hebrew_lexicon_entries(id) on delete cascade,
  relation_type text not null
    check (relation_type in ('same_root', 'contrast', 'paired_theme', 'see_also')),
  note_ko text,
  display_order int not null default 100,
  primary key (entry_id, related_entry_id, relation_type),
  check (entry_id <> related_entry_id)
);
```

## 7. API 설계

### 7.1 사전 검색

```http
GET /api/bible/hebrew-dictionary?q=reshith&theme=genesis-primeval&limit=50&offset=0
```

파라미터:

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `q` | optional | 히브리어, 음역, 한글 뜻, 영어 뜻, Strong 번호 |
| `theme` | optional | 테마 ID |
| `bookId` | optional | 출현 구절이 있는 권으로 필터 |
| `limit` | `50` | 최대 100 |
| `offset` | `0` | 페이지네이션 |

응답:

```json
{
  "query": "reshith",
  "theme": "genesis-primeval",
  "total": 1,
  "entries": [
    {
      "id": "uuid",
      "normalizedKey": "reshith",
      "strongNumber": "H7225",
      "lemmaHe": "רֵאשִׁית",
      "transliteration": "reshith",
      "pronunciationKo": "레쉬트",
      "glossEn": "beginning, first",
      "glossKo": "시작, 처음",
      "definitionKo": "시작이나 첫머리를 가리키는 말",
      "themes": ["genesis-primeval"],
      "sampleVerses": [
        {
          "verseKey": "GEN.1.1",
          "reference": "창세기 1:1",
          "phraseEn": "In the beginning",
          "phraseKo": "처음에"
        }
      ]
    }
  ]
}
```

### 7.2 사전 상세

```http
GET /api/bible/hebrew-dictionary/{entryId}
```

응답:

```json
{
  "id": "uuid",
  "strongNumber": "H7225",
  "lemmaHe": "רֵאשִׁית",
  "transliteration": "reshith",
  "pronunciationKo": "레쉬트",
  "glossEn": "beginning, first",
  "glossKo": "시작, 처음",
  "definitionKo": "시작이나 첫머리를 가리키는 말",
  "interpretationNoteKo": "창세기 1:1에서는 창조 사건의 출발점을 가리킨다.",
  "morphologySummary": "명사",
  "themes": [
    {
      "id": "genesis-primeval",
      "titleKo": "창세기 1-11장"
    }
  ],
  "occurrences": [
    {
      "verseKey": "GEN.1.1",
      "bookId": "gen",
      "chapter": 1,
      "verse": 1,
      "surfaceHe": "בְּרֵאשִׁית",
      "phraseEn": "In the beginning",
      "phraseKo": "처음에"
    }
  ],
  "relatedEntries": [],
  "source": {
    "name": "Open Scriptures Hebrew Bible / Strong's Hebrew",
    "license": "Public Domain or CC BY 4.0, depending on field",
    "url": "https://hb.openscriptures.org/"
  }
}
```

### 7.3 현재 장 사전 단어 조회

```http
GET /api/bible/hebrew-occurrences?verseKeys=GEN.1.1,GEN.1.2
```

응답:

```json
{
  "verses": [
    {
      "verseKey": "GEN.1.1",
      "occurrences": [
        {
          "occurrenceId": "uuid",
          "entryId": "uuid",
          "lemmaHe": "רֵאשִׁית",
          "surfaceHe": "בְּרֵאשִׁית",
          "transliteration": "reshith",
          "pronunciationKo": "레쉬트",
          "glossKo": "시작, 처음",
          "glossEn": "beginning, first",
          "displayPriority": 10
        }
      ]
    }
  ]
}
```

동작:

- `verseKeys`는 최대 200개까지 허용한다.
- published entry만 반환한다.
- 같은 절에 occurrence가 많으면 `display_priority` 기준으로 기본 5개만 리더에 표시하고, `더보기`로 확장한다.
- API 실패는 성경 본문 렌더링을 막지 않는다.

## 8. 프론트엔드 구현

### 8.1 타입

`packages/shared/src/bible-api-types.ts`에 사전 응답 타입을 추가한다.

```ts
export type HebrewLexiconEntrySummary = {
  id: string;
  normalizedKey: string;
  strongNumber?: string | null;
  lemmaHe: string;
  transliteration?: string | null;
  pronunciationKo?: string | null;
  glossEn: string;
  glossKo: string;
  definitionKo: string;
  themes: string[];
};

export type HebrewOccurrenceSummary = {
  occurrenceId: string;
  entryId: string;
  lemmaHe: string;
  surfaceHe?: string | null;
  transliteration?: string | null;
  pronunciationKo?: string | null;
  glossKo: string;
  glossEn: string;
  displayPriority: number;
};
```

### 8.2 리더 상태

리더에서 장을 열 때 현재 장의 `verseKeys`로 occurrence를 조회한다.

```ts
const [hebrewOccurrencesByVerseKey, setHebrewOccurrencesByVerseKey] =
  useState<Map<string, HebrewOccurrenceSummary[]>>(new Map());
const [activeHebrewEntryId, setActiveHebrewEntryId] = useState<string | null>(null);
const [hebrewDictionaryStatus, setHebrewDictionaryStatus] =
  useState<"idle" | "loading" | "ready" | "error">("idle");
```

렌더링 정책:

- 절 본문 자체는 그대로 둔다.
- 절 하단 메타 영역에 원어 칩을 표시한다.
- 원어 칩 클릭 시 절 선택 이벤트와 충돌하지 않도록 이벤트 전파를 막는다.
- 원어 칩은 키보드 포커스 가능해야 한다.

### 8.3 사전 화면

`ViewKey`에 `dictionary`를 추가하고 데스크톱 nav와 모바일 nav에 노출한다. 모바일 공간이 부족하면 사전은 `검색` 화면 내부 탭이 아니라 독립 메뉴로 둔다.

사전 화면 상태:

- 검색어
- 선택 테마
- 로딩/오류/빈 상태
- 결과 목록
- 선택 항목 상세 패널

### 8.4 노트 추가

`HebrewLexiconPanel`에서 `내 노트에 추가`를 누르면 현재 구절의 note modal을 열고 기존 note draft 하단에 사전 요약을 append한다. 기존 노트는 덮어쓰지 않는다.

## 9. 데이터 소스와 라이선스 정책

초기 구현은 데이터 출처를 필드 단위로 추적한다. 공개 앱에 사전 콘텐츠를 배포하기 전, 사용한 원문과 가공 데이터의 라이선스를 release gate로 검증한다.

| 후보 | 용도 | 라이선스 메모 | 정책 |
| --- | --- | --- | --- |
| Open Scriptures Hebrew Bible | 히브리어 lemma/morphology, WLC 기반 연결 | WLC 본문은 Public Domain, lemma/morphology는 CC BY 4.0로 안내됨 | attribution 필수 |
| CrossWire Strong's Hebrew | Strong 번호와 기본 gloss 참고 | Strong's Hebrew Dictionary는 Public Domain으로 안내됨 | 직접 복사 범위는 검수 |
| OSHB Hebrew Lexicon | Strong/BDB index, 렉시콘 구조 참고 | 파일은 CC BY 4.0, BDB/Strong 원문은 Public Domain으로 안내됨 | attribution 필수 |
| unfoldingWord UHB/UHAL | 보조 후보 | CC BY-SA 4.0 계열 자료가 섞일 수 있음 | 1차 MVP에서는 직접 혼합하지 않음 |

문서화할 attribution 예시:

```text
Hebrew lemma and morphology data may include data from the Open Scriptures Hebrew Bible Project, licensed under CC BY 4.0. Strong's Hebrew Dictionary content is public domain where used. Field-level source metadata is retained in the database.
```

주의:

- 외부 자료의 설명 문장을 그대로 가져오지 않는다.
- `definition_ko`와 `interpretation_note_ko`는 앱 자체 문장으로 작성한다.
- `source_url`, `source_license`, `attribution_text`를 entry 단위로 남긴다.
- CC BY-SA 자료는 공유동일조건 영향이 있으므로 별도 검토 전 seed에 섞지 않는다.

## 10. 콘텐츠 작성 기준

### 10.1 항목 길이

- `gloss_ko`: 40자 이하 권장
- `gloss_en`: 60자 이하 권장
- `definition_ko`: 160자 이하 권장
- `interpretation_note_ko`: 400자 이하 권장
- 예시 구절: 초기 화면 3개, 상세 최대 20개

### 10.2 문체

- 사용자가 본문을 이해하도록 돕는 설명으로 쓴다.
- 원어 하나에 하나의 한국어 뜻만 고정하지 않는다.
- 문맥에 따라 뜻이 달라질 수 있음을 표시한다.
- 교리 적용보다 본문 읽기와 용어 이해를 우선한다.
- 확실하지 않은 어원 설명은 공개하지 않는다.

### 10.3 금지

- "히브리어 원어의 진짜 뜻은 한국어/영어 번역과 완전히 다르다" 같은 과장
- 본문 문맥 없이 단어 뜻만으로 교리를 단정하는 설명
- 외부 사전 원문 번역문을 그대로 옮긴 설명
- 검수 전 항목을 `published`로 노출
- 계시록 헬라어 단어를 히브리어 단어처럼 표시

## 11. seed 포맷

초기 seed는 JSONL로 둔다.

`data/lexicon/hebrew/entries.jsonl`:

```json
{"normalizedKey":"reshith","strongNumber":"H7225","lemmaHe":"רֵאשִׁית","lemmaHeNormalized":"ראשית","transliteration":"reshith","pronunciationKo":"레쉬트","glossEn":"beginning, first","glossKo":"시작, 처음","definitionKo":"시작이나 첫머리를 가리키는 말이다.","interpretationNoteKo":"창세기 1:1에서는 창조 사건의 출발점을 가리킨다.","morphologySummary":"명사","status":"published","sourceName":"Strong's Hebrew / OSHB","sourceLicense":"Public Domain / CC BY 4.0"}
```

`data/lexicon/hebrew/occurrences.jsonl`:

```json
{"normalizedKey":"reshith","verseKey":"GEN.1.1","appBookId":"gen","bookOrder":1,"chapter":1,"verse":1,"surfaceHe":"בְּרֵאשִׁית","transliteration":"bereshith","kjvMatchText":"In the beginning","koMatchText":"처음에","occurrenceIndex":1,"displayPriority":10}
```

`data/lexicon/hebrew/theme-entries.jsonl`:

```json
{"themeId":"genesis-primeval","normalizedKey":"reshith","reasonKo":"창세기 창조 기사 시작을 여는 핵심어","displayOrder":10}
```

## 12. 1차 seed 후보

1차 seed는 80-120개를 목표로 하되, 구현 검증용 첫 batch는 20개로 시작한다.

### 창세기 1장 우선 후보

| normalized_key | Strong | 히브리어 | 한글 뜻 | 테마 |
| --- | --- | --- | --- | --- |
| `reshith` | `H7225` | `רֵאשִׁית` | 시작, 처음 | 창세기 1-11장 |
| `bara` | `H1254` | `בָּרָא` | 창조하다 | 창세기 1-11장 |
| `elohim` | `H430` | `אֱלֹהִים` | 하나님 | 창세기 1-11장 |
| `shamayim` | `H8064` | `שָׁמַיִם` | 하늘 | 성경속 세상의 구조 |
| `erets` | `H776` | `אֶרֶץ` | 땅 | 성경속 세상의 구조 |
| `tohu` | `H8414` | `תֹּהוּ` | 형태 없음, 공허 | 창세기 1-11장 |
| `bohu` | `H922` | `בֹּהוּ` | 비어 있음 | 창세기 1-11장 |
| `tehom` | `H8415` | `תְּהוֹם` | 깊음, 심연 | 성경속 세상의 구조 |
| `ruach` | `H7307` | `רוּחַ` | 영, 바람, 숨 | 창세기 1-11장 |
| `or` | `H216` | `אוֹר` | 빛 | 성경속 세상의 구조 |
| `choshek` | `H2822` | `חֹשֶׁךְ` | 어둠 | 성경속 세상의 구조 |
| `raqia` | `H7549` | `רָקִיעַ` | 궁창, 펼쳐진 공간 | 성경속 세상의 구조 |
| `mayim` | `H4325` | `מַיִם` | 물 | 성경속 세상의 구조 |
| `yam` | `H3220` | `יָם` | 바다 | 성경속 세상의 구조 |
| `tov` | `H2896` | `טוֹב` | 좋음, 선함 | 창세기 1-11장 |
| `adam` | `H120` | `אָדָם` | 사람, 인간 | 창세기 1-11장 |
| `nephesh` | `H5315` | `נֶפֶשׁ` | 생명, 혼, 살아 있는 존재 | 창세기 1-11장 |
| `chayah` | `H2421` | `חָיָה` | 살다, 생명 | 창세기 1-11장 |
| `zera` | `H2233` | `זֶרַע` | 씨, 후손 | 창세기 1-11장 |
| `berith` | `H1285` | `בְּרִית` | 언약 | 창세기 12-50장 |

## 13. 관리와 검수 흐름

초기 구현은 seed 파일과 migration으로 시작한다. 어드민 편집 UI는 후속으로 둔다.

단계:

1. `data/lexicon/hebrew/*.jsonl` 작성
2. validation script로 필수 필드, Strong 번호 형식, 중복 key, verse_key 존재 여부 확인
3. source/license 필드 누락 여부 확인
4. Supabase seed 또는 import script로 삽입
5. `status = 'published'` 항목만 공개 API에 노출
6. 후속 어드민에서 draft/review/publish workflow 추가

검수 체크:

- [ ] `normalized_key`가 중복되지 않는다.
- [ ] `strong_number`가 있으면 `H` + 숫자 형식이다.
- [ ] `verse_key`가 실제 `bible_verses_en`에 존재한다.
- [ ] `app_book_id`, `chapter`, `verse`가 verse_key와 일치한다.
- [ ] `definition_ko`와 `interpretation_note_ko`가 외부 자료 복사문이 아니다.
- [ ] 히브리어 원형, 음역, 한글 발음이 검수되었다.
- [ ] source/license/attribution 필드가 비어 있지 않다.
- [ ] published 항목은 검수자만 설정한다.

## 14. 권한과 보안

공개 사용자:

- published 사전 항목 read 가능
- published occurrence read 가능
- 사전 내용을 개인 노트에 복사 가능
- 공개 사전 생성/수정/삭제 불가

관리자 또는 콘텐츠 편집자:

- draft/reviewing 항목 조회 가능
- 항목 생성/수정 가능
- published 전환 가능

RLS 기준:

```sql
alter table public.hebrew_lexicon_entries enable row level security;
alter table public.hebrew_word_occurrences enable row level security;
alter table public.hebrew_dictionary_themes enable row level security;
alter table public.hebrew_theme_entries enable row level security;
alter table public.hebrew_related_entries enable row level security;

create policy "published hebrew lexicon entries are public readable"
on public.hebrew_lexicon_entries
for select
using (status = 'published');
```

`hebrew_word_occurrences`는 연결된 entry가 published일 때만 공개한다. PostgREST 정책이 복잡해지면 공개 조회는 `security definer`가 아닌 stable RPC 또는 server route에서 published join으로 제한한다.

## 15. 인덱스와 성능

권장 인덱스:

```sql
create index hebrew_lexicon_entries_status_idx
on public.hebrew_lexicon_entries(status);

create index hebrew_lexicon_entries_strong_idx
on public.hebrew_lexicon_entries(strong_number)
where status = 'published';

create index hebrew_lexicon_entries_lemma_idx
on public.hebrew_lexicon_entries(lemma_he_normalized)
where status = 'published';

create index hebrew_word_occurrences_verse_idx
on public.hebrew_word_occurrences(verse_key, display_priority);

create index hebrew_word_occurrences_entry_location_idx
on public.hebrew_word_occurrences(lexicon_entry_id, book_order, chapter, verse);

create index hebrew_theme_entries_theme_order_idx
on public.hebrew_theme_entries(theme_id, display_order);
```

검색 성능 목표:

| 항목 | 목표 |
| --- | ---: |
| 현재 장 occurrence 조회 | p95 300ms 이하 |
| 사전 검색 | p95 500ms 이하 |
| 사전 상세 | p95 500ms 이하 |
| 장당 기본 표시 occurrence | 최대 150개 |
| 절당 기본 표시 occurrence | 최대 5개 |

초기 검색은 Postgres `ilike`와 trigram 인덱스로 충분하다. 외부 검색 엔진은 사전 항목이 수만 개 이상으로 커지거나 자동완성/오타 보정이 핵심 요구가 될 때 검토한다.

## 16. 구현 페이즈

### Phase A: 문서와 데이터 계약

- [ ] 이 문서를 기준으로 API 타입을 `packages/shared/src/bible-api-types.ts`에 추가한다.
- [ ] `data/lexicon/hebrew/` seed 포맷을 만든다.
- [ ] 창세기 1장 기준 20개 seed를 작성한다.
- [ ] validation script 계약을 작성한다.

완료 기준:

- [ ] seed 20개가 필수 필드를 모두 가진다.
- [ ] 출처/라이선스 필드가 누락되지 않는다.
- [ ] `verse_key`와 location 필드가 일치한다.

### Phase B: 로컬/fixture 기반 사전 화면

- [ ] 로컬 JSONL seed를 읽는 dictionary fixture repository를 만든다.
- [ ] 사전 검색 화면을 만든다.
- [ ] 테마 탭과 결과 카드 UI를 만든다.
- [ ] 상세 패널을 만든다.
- [ ] `내 노트에 추가` 액션을 기존 note modal과 연결한다.

완료 기준:

- [ ] 창세기 1장 seed 단어를 검색할 수 있다.
- [ ] 테마별 목록이 표시된다.
- [ ] 상세 패널에서 예시 구절과 출처가 보인다.

### Phase C: 리더 통합

- [ ] 현재 장 `verseKeys`로 occurrence를 조회한다.
- [ ] 절 하단에 히브리어 단어 칩을 표시한다.
- [ ] 칩 클릭 시 상세 패널을 연다.
- [ ] 사전이 없는 장에서는 기존 리더 UI가 유지된다.
- [ ] TTS, 복사, 강조, 인용 흐름과 충돌하지 않는지 확인한다.

완료 기준:

- [ ] 창세기 1장 리더에서 히브리어 단어 칩이 보인다.
- [ ] 클릭/탭으로 사전 상세가 열린다.
- [ ] 구절 복사와 TTS에는 사전 텍스트가 섞이지 않는다.

### Phase D: Supabase DB와 API

- [ ] migration으로 히브리어 사전 테이블을 만든다.
- [ ] public read RLS 또는 published join API를 구현한다.
- [ ] `GET /api/bible/hebrew-dictionary`를 만든다.
- [ ] `GET /api/bible/hebrew-dictionary/[entryId]`를 만든다.
- [ ] `GET /api/bible/hebrew-occurrences`를 만든다.
- [ ] seed import script를 작성한다.

완료 기준:

- [ ] API가 published 항목만 반환한다.
- [ ] source/license metadata가 응답에 포함된다.
- [ ] 리더와 사전 화면이 DB API로 동작한다.

### Phase E: 콘텐츠 확장과 운영 검수

- [ ] 창세기 1-11장 핵심어 80개까지 확장한다.
- [ ] 이사야 핵심어 40개를 추가한다.
- [ ] 성경속 세상의 구조 테마를 40개 이상으로 확장한다.
- [ ] 검수 리포트를 작성한다.
- [ ] release readiness에 라이선스 확인 결과를 포함한다.

완료 기준:

- [ ] 1차 테마가 학습 가능한 밀도로 채워진다.
- [ ] 출처/라이선스 누락 항목이 없다.
- [ ] 공개 사용자가 draft 항목을 볼 수 없다.

## 17. 테스트 계획

명령:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm audit --audit-level=moderate`

데이터 검증:

- [ ] JSONL이 줄 단위 유효 JSON이다.
- [ ] `normalizedKey`가 entries, occurrences, theme-entries 사이에서 모두 resolve된다.
- [ ] Strong 번호 형식이 유효하다.
- [ ] `verseKey`가 성경 DB에 존재한다.
- [ ] `bookOrder`, `chapter`, `verse`가 DB의 location과 일치한다.
- [ ] published 항목은 source/license/attribution을 가진다.

브라우저 수동 검증:

- [ ] 사전 화면에서 히브리어/한글/영어/Strong 번호 검색이 된다.
- [ ] 테마 탭 전환 시 목록이 바뀐다.
- [ ] 상세 패널에서 예시 구절을 열 수 있다.
- [ ] 리더에서 히브리어 단어 칩이 보인다.
- [ ] 칩 클릭/키보드 조작으로 상세 패널이 열린다.
- [ ] `내 노트에 추가`가 기존 노트를 덮어쓰지 않는다.
- [ ] 모바일에서 패널이 하단 네비게이션, TTS, 선택 액션시트와 겹치지 않는다.

## 18. 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| 히브리어 단어 뜻을 과도하게 단정함 | gloss와 문맥 해석을 분리하고, 한 단어가 여러 뜻을 가질 수 있음을 표시한다. |
| KJV 영어와 히브리어 단어 대응이 1:1이 아님 | 1차 리더 UI는 본문 내부 offset 대신 절 하단 원어 칩으로 시작한다. |
| 라이선스 조건이 섞임 | entry 단위 source/license/attribution 필드를 필수화한다. |
| 계시록을 히브리어 사전처럼 오해함 | 계시록은 후속 "구약 배경어" 또는 별도 헬라어 사전으로 분리한다. |
| 모든 단어를 넣으려다 품질이 낮아짐 | 창세기 1장 20개, 1차 80-120개로 제한하고 검수 밀도를 높인다. |
| 히브리어 표시 폰트 문제 | 히브리어 문자열 영역에 적절한 fallback font stack과 `dir="rtl"` 사용을 검토한다. |
| 모바일 UI 과밀 | 리더에는 최대 5개 칩만 기본 표시하고 사전 상세는 바텀시트로 분리한다. |

## 19. 최종 수용 기준

- [ ] 히브리어 사전 데이터가 성경 본문/번역 필드와 분리되어 있다.
- [ ] published 항목만 공개 사용자에게 노출된다.
- [ ] 각 항목은 히브리어 원형, 음역, 한글 발음, 한영 뜻, 정의, 예시 구절을 가진다.
- [ ] `verse_key` 기준으로 리더와 사전 상세가 연결된다.
- [ ] 성경속 세상의 구조, 창세기, 이사야 테마가 탐색 가능하다.
- [ ] 계시록은 1차 히브리어 사전 범위 밖으로 명확히 표시된다.
- [ ] 사전 표시가 구절 선택, 강조, 인용, TTS, 복사 기능을 깨지 않는다.
- [ ] source/license/attribution이 release gate에서 검증된다.
