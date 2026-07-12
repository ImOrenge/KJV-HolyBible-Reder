# 성경 사전 페이즈별 태스크 체크리스트

## 1. 목표

구약 중심의 히브리어 성경단어 사전을 독립 페이지와 별도 검색 엔진으로 구현한다. 사전 항목은 히브리어 원형, 음역, 발음기호, 한글 발음, 한영 뜻, 예시 구절, 테마, 출처 정보를 가진다.

기준 아키텍처: [hebrew-bible-dictionary-architecture.md](./hebrew-bible-dictionary-architecture.md)

## 2. Phase A: 사전 데이터 계약과 seed 포맷

### 태스크

- [ ] `HebrewLexiconEntry` API 타입을 정의한다.
- [ ] `HebrewWordOccurrence` API 타입을 정의한다.
- [ ] `HebrewDictionaryTheme` API 타입을 정의한다.
- [ ] `HebrewDictionarySearchResult` API 타입을 정의한다.
- [ ] `data/lexicon/hebrew/entries.jsonl` 포맷을 만든다.
- [ ] `data/lexicon/hebrew/occurrences.jsonl` 포맷을 만든다.
- [ ] `data/lexicon/hebrew/theme-entries.jsonl` 포맷을 만든다.
- [ ] `normalizedKey` 규칙을 확정한다.
- [ ] `strongNumber` 형식을 `H` + 숫자로 검증한다.
- [ ] `transliteration`을 ASCII 중심 검색 키로 확정한다.
- [ ] `pronunciationSymbol` 표기 체계를 seed batch 단위로 확정한다.
- [ ] `pronunciationKo` 작성 기준을 확정한다.
- [ ] `glossEn`, `glossKo` 길이 기준을 확정한다.
- [ ] `definitionEn`, `definitionKo` 길이 기준을 확정한다.
- [ ] source/license/attribution 필수 필드 정책을 확정한다.
- [ ] 창세기 1장 기준 20개 seed 후보를 작성한다.

### 완료 기준

- [ ] seed 20개가 히브리어 원형을 가진다.
- [ ] seed 20개가 음역, 발음기호, 한글 발음을 가진다.
- [ ] seed 20개가 한영 gloss와 한영 definition을 가진다.
- [ ] seed 20개가 예시 구절을 가진다.
- [ ] seed 20개가 source/license 정보를 가진다.

## 3. Phase B: seed validation과 로컬 fixture 저장소

### 태스크

- [ ] JSONL 줄 단위 파서를 만든다.
- [ ] `entries.jsonl` 필수 필드 검증을 만든다.
- [ ] `occurrences.jsonl` 필수 필드 검증을 만든다.
- [ ] `theme-entries.jsonl` 필수 필드 검증을 만든다.
- [ ] `normalizedKey` 중복 검증을 만든다.
- [ ] Strong 번호 형식 검증을 만든다.
- [ ] occurrence의 `verseKey` 존재 검증을 만든다.
- [ ] occurrence의 `bookId`, `chapter`, `verse` 일치 검증을 만든다.
- [ ] theme entry가 실제 entry를 참조하는지 검증한다.
- [ ] 발음기호 표기 체계가 batch 안에서 섞이지 않는지 검증한다.
- [ ] source/license 누락 검증을 만든다.
- [ ] 로컬 fixture repository를 구현한다.
- [ ] 로컬 fixture에서 검색어 필터를 구현한다.
- [ ] 로컬 fixture에서 알파벳 필터를 구현한다.
- [ ] 로컬 fixture에서 테마 필터를 구현한다.
- [ ] 로컬 fixture에서 권별 필터를 구현한다.

### 완료 기준

- [ ] 잘못된 JSONL은 validation에서 실패한다.
- [ ] 존재하지 않는 `verseKey`는 validation에서 실패한다.
- [ ] source/license 누락 항목은 published seed로 통과하지 않는다.
- [ ] 로컬 fixture만으로 사전 화면을 개발할 수 있다.

## 4. Phase C: 사전 페이지와 별도 검색 엔진 UI

### 태스크

- [ ] 사전 독립 페이지 또는 독립 탭을 추가한다.
- [ ] 본문 검색과 다른 `단어 검색` 입력 UI를 만든다.
- [ ] 검색어 없이 탐색 가능한 기본 목록을 구현한다.
- [ ] A-Z 알파벳 필터를 구현한다.
- [ ] 테마 필터를 구현한다.
- [ ] 권별 필터를 구현한다.
- [ ] 알파벳, 테마, 권 필터를 AND 조건으로 결합한다.
- [ ] 알파벳순 정렬을 구현한다.
- [ ] 성경 출현순 정렬을 구현한다.
- [ ] 테마 추천순 정렬을 구현한다.
- [ ] 사전 결과 카드를 구현한다.
- [ ] 사전 상세 패널을 구현한다.
- [ ] 모바일 상세 bottom sheet를 구현한다.
- [ ] 빈 결과 상태를 구현한다.
- [ ] 검색어와 필터 상태를 유지한다.

### 완료 기준

- [ ] 사용자는 본문 검색과 별개로 사전 검색을 사용할 수 있다.
- [ ] 히브리어, 음역, 발음기호, 한글 발음, 한영 뜻, Strong 번호로 검색할 수 있다.
- [ ] 알파벳별 필터가 음역 첫 글자 기준으로 동작한다.
- [ ] 테마별 필터가 `성경속 세상의 구조`, `창세기`, `이사야` 범위를 보여준다.
- [ ] 권별 필터가 대표 구절이 아니라 occurrence 전체 기준으로 동작한다.

## 5. Phase D: 리더 통합과 출현 단어 표시

### 태스크

- [ ] 현재 장의 `verseKey` 목록으로 occurrence를 조회한다.
- [ ] 절 하단에 `원어 n개` 접힌 상태를 표시한다.
- [ ] 절 하단에 히브리어 단어 칩을 표시한다.
- [ ] 칩 기본 표시를 `히브리어 · 음역 · 한국어 gloss`로 제한한다.
- [ ] 칩 hover/title 또는 상세에서 발음기호와 영어 gloss를 보여준다.
- [ ] 칩 클릭 시 `HebrewLexiconPanel`을 연다.
- [ ] 상세 패널에서 예시 구절을 보여준다.
- [ ] 상세 패널에서 `내 노트에 추가`를 제공한다.
- [ ] verified `kjvMatchText`가 있을 때만 선택 단어 하이라이트를 검토한다.
- [ ] verified `koMatchText`가 있을 때만 한국어 대응어 하이라이트를 검토한다.
- [ ] 자동 전체 본문 하이라이트를 기본값으로 켜지 않는다.
- [ ] TTS, 복사, 인용, 강조와 충돌 여부를 확인한다.

### 완료 기준

- [ ] 창세기 1장 리더에서 히브리어 단어 칩이 보인다.
- [ ] 단어 칩 클릭으로 사전 상세가 열린다.
- [ ] 리더 본문 선택과 TTS가 사전 표시 때문에 깨지지 않는다.
- [ ] 검수되지 않은 영어/한국어 대응어는 본문 내부에 강조하지 않는다.
- [ ] 사전 내용을 개인 노트에 추가할 수 있다.

## 6. Phase E: Supabase DB, RPC, API 전환

### 태스크

- [ ] `hebrew_lexicon_entries` migration을 작성한다.
- [ ] `hebrew_word_occurrences` migration을 작성한다.
- [ ] `hebrew_dictionary_themes` migration을 작성한다.
- [ ] `hebrew_theme_entries` migration을 작성한다.
- [ ] `hebrew_related_entries` migration을 작성한다.
- [ ] `hebrew_dictionary_search_index` migration을 작성한다.
- [ ] `pg_trgm` extension migration을 작성한다.
- [ ] published 항목만 공개 조회하는 정책을 구현한다.
- [ ] occurrence가 published entry에 연결될 때만 공개되게 제한한다.
- [ ] seed import script를 작성한다.
- [ ] search index 재생성 script를 작성한다.
- [ ] `search_hebrew_dictionary` RPC를 구현한다.
- [ ] `GET /api/bible/hebrew-dictionary`를 구현한다.
- [ ] `GET /api/bible/hebrew-dictionary/[entryId]`를 구현한다.
- [ ] `GET /api/bible/hebrew-occurrences`를 구현한다.
- [ ] API 응답에 facets를 포함한다.
- [ ] API 응답에 source/license metadata를 포함한다.

### 완료 기준

- [ ] API는 `published` 항목만 반환한다.
- [ ] `q`, `alphabet`, `theme`, `bookId`, `sort`가 함께 동작한다.
- [ ] 사전 검색은 `/api/bible/search`와 분리되어 있다.
- [ ] source/license/attribution이 응답과 release gate에서 확인된다.
- [ ] 리더와 사전 페이지가 Supabase API로 동작한다.

## 7. Phase F: 콘텐츠 확장과 운영 검수

### 태스크

- [ ] 창세기 1장 20개 seed를 검수한다.
- [ ] 창세기 1-11장 핵심어를 80개까지 확장한다.
- [ ] 창세기 12-50장 핵심어를 추가한다.
- [ ] 이사야 핵심어를 40개 이상 추가한다.
- [ ] 성경속 세상의 구조 테마를 40개 이상 구성한다.
- [ ] 관련 단어 연결을 추가한다.
- [ ] 각 항목의 한영 정의를 앱 자체 문장으로 검수한다.
- [ ] 출처/라이선스 리포트를 작성한다.
- [ ] 계시록은 1차 히브리어 사전 범위 밖으로 표시한다.
- [ ] 후속 `계시록의 구약 배경어` 테마 후보를 별도 backlog로 둔다.

### 완료 기준

- [ ] 1차 테마가 학습 가능한 밀도로 채워진다.
- [ ] 외부 사전 원문을 그대로 복사한 설명이 없다.
- [ ] 발음기호 체계가 seed batch 안에서 일관된다.
- [ ] 계시록이 히브리어 원어 사전처럼 오해되지 않는다.

## 8. Phase G: 검증과 출시 준비

### 자동 검증

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] JSONL validation script를 실행한다.
- [ ] API route test를 추가한다.
- [ ] search RPC 필터 조합 테스트를 추가한다.

### 수동 검증

- [ ] 사전 페이지에서 검색어 없이 테마만으로 탐색한다.
- [ ] 히브리어 원형으로 검색한다.
- [ ] 음역으로 검색한다.
- [ ] 발음기호로 검색한다.
- [ ] 한글 뜻으로 검색한다.
- [ ] 영어 뜻으로 검색한다.
- [ ] Strong 번호로 검색한다.
- [ ] 알파벳, 테마, 권 필터를 함께 적용한다.
- [ ] 사전 상세에서 예시 구절을 연다.
- [ ] 리더에서 원어 칩을 열고 노트에 추가한다.
- [ ] 모바일에서 사전 상세 panel이 화면을 가리지 않는지 확인한다.

### 최종 수용 기준

- [ ] 사전 데이터가 성경 본문/번역 필드와 분리되어 있다.
- [ ] 사전 페이지는 별도 검색 엔진을 사용한다.
- [ ] 알파벳별, 테마별, 권별 필터가 함께 동작한다.
- [ ] 각 항목은 히브리어 원형, 음역, 발음기호, 한글 발음, 한영 뜻, 예시 구절을 가진다.
- [ ] 리더에서는 출현 단어를 과밀하지 않게 간략 표시한다.
- [ ] 공개 출시 전에 source/license/attribution이 검증된다.
