# 데일리 복음 추천구절 홈 기능 구현 계획

## Summary

홈 `오늘` 탭에 하루 1개의 복음 중심 추천구절을 보여준다. 추천은 외부 AI 생성이나 무작위 검색이 아니라, 앱 내부에서 검수한 복음 구절 풀을 날짜 기준으로 선택하는 방식으로 시작한다.

MVP 목표는 사용자가 앱에 들어왔을 때 이어 읽기와 통독 플랜 외에도 "오늘 붙들 말씀"을 바로 확인하고, 해당 구절을 성경 리더에서 열거나 복사, 인용 저장, TTS 듣기로 이어가게 하는 것이다.

## Product Fit

- 현재 MVP는 개인 성경 공부 도구이며, 홈에는 이어 읽기, 오늘 통독 플랜, 최근 활동이 있다.
- 데일리 추천구절은 홈 `오늘` 탭의 보조 카드로 추가한다.
- 추천구절은 통독 플랜을 대체하지 않고, 복음 핵심 주제를 짧게 환기하는 진입점으로 둔다.
- 복음 중심 추천은 기존 인용 저장, 복사, TTS, 리더 열기 기능을 재사용한다.

## Goals

- 홈에서 매일 1개의 복음 중심 구절을 표시한다.
- 추천구절은 날짜가 바뀌면 자동으로 바뀐다.
- 같은 날짜에는 새로고침해도 같은 구절이 유지된다.
- 사용자는 추천구절을 성경 리더에서 열 수 있다.
- 사용자는 추천구절을 복사할 수 있다.
- 사용자는 추천구절을 기존 인용 목록 모달로 저장할 수 있다.
- 사용자는 추천구절을 TTS로 들을 수 있다.
- 본문은 기존 성경 API/fixture/DB repository에서 가져오고 추천 데이터에는 참조와 메타데이터만 저장한다.

## Non-goals

- 외부 AI 추천 엔진
- 사용자의 감정, 행동, 신앙 상태를 추론하는 개인화 추천
- 교단별 해석 또는 설교문 제공
- 추천구절 본문 중복 저장
- 운영 DB 기반 추천 관리자 화면
- 푸시 알림
- 추천 알고리즘 고도화

## Recommendation Source Policy

### v0 원천

v0에서는 정적 curated pool을 코드에 둔다.

권장 파일:

- `src/lib/gospel-recommendations.ts`

이 파일에는 본문을 넣지 않고 구절 참조와 추천 메타데이터만 둔다.

```ts
type GospelRecommendationTheme =
  | "salvation"
  | "grace"
  | "faith"
  | "christ"
  | "cross"
  | "resurrection"
  | "repentance"
  | "assurance"
  | "mission"
  | "hope";

type GospelRecommendationCandidate = {
  id: string;
  verseId: string;
  bookId: string;
  chapter: number;
  verse: number;
  themes: GospelRecommendationTheme[];
  title: string;
  priority: number;
  enabled: boolean;
};
```

### 복음 중심 선별 기준

추천 풀은 다음 기준에 맞는 구절로 제한한다.

- 예수 그리스도의 인격과 사역
- 십자가, 부활, 구속, 은혜, 믿음, 회개
- 하나님의 사랑과 구원의 초청
- 믿는 자의 확신과 새 생명
- 구약에서는 복음의 약속과 예표로 널리 연결되는 구절

### 초기 후보 예시

본문이 준비된 범위에 맞춰 단계적으로 추가한다. 처음에는 fixture 또는 현재 API에서 정상 조회되는 구절만 활성화한다.

- Genesis 3:15
- Isaiah 53:5
- Isaiah 53:6
- John 1:12
- John 3:16
- John 3:17
- John 5:24
- John 10:11
- John 11:25
- John 14:6
- Acts 4:12
- Romans 3:23
- Romans 5:8
- Romans 6:23
- Romans 10:9
- Romans 10:10
- 1 Corinthians 15:3
- 1 Corinthians 15:4
- 2 Corinthians 5:21
- Ephesians 2:8
- Ephesians 2:9
- Galatians 2:20
- 1 Timothy 1:15
- Titus 3:5
- 1 Peter 2:24
- 1 John 4:9
- 1 John 4:10
- Revelation 3:20

## Recommendation Behavior

### Daily Selection

v0 기본값은 전역 데일리 추천이다.

- 기준 날짜: 브라우저 local date의 `YYYY-MM-DD`
- 선택 방식: `dateKey`를 해시하거나 day index로 변환해 curated pool에서 1개 선택
- 안정성: 같은 날짜와 같은 추천 풀 버전에서는 항상 같은 구절 반환
- 후보 제외: `enabled: false`이거나 성경 API에서 조회 실패한 구절은 건너뛴다
- fallback: 조회 가능한 후보가 없으면 현재 fixture에 있는 `John 3:16` 또는 첫 활성 후보를 사용한다

### Rotation Rules

- 같은 구절이 너무 자주 반복되지 않도록 후보 풀 최소 목표를 30개 이상으로 둔다.
- MVP에서는 완전한 중복 방지 이력을 저장하지 않아도 된다.
- P1에서 `UserDataState.dailyRecommendationHistory`를 추가해 최근 7일 중복을 피할 수 있다.

```ts
type DailyRecommendationHistoryItem = {
  dateKey: string;
  recommendationId: string;
  verseId: string;
  shownAt: string;
};
```

### Personalization Boundary

MVP에서는 개인화 추천을 하지 않는다. 사용자의 읽기 이력, 강조, 인용 목록을 분석해 신앙 상태를 추론하는 기능은 제외한다.

추후 개인화가 필요하면 다음처럼 사용자가 직접 선택한 선호 범위만 사용한다.

- 복음 기초
- 은혜와 확신
- 십자가와 부활
- 새신자 안내
- 전도용 구절

## UI Plan

### 홈 배치

홈 `오늘` 탭에서 `이어 읽기` 카드 다음, `오늘 통독 플랜` 카드 이전에 배치한다.

카드 제목:

- `오늘의 복음 말씀`

카드 구성:

- 구절 참조
- 구절 본문
- 주제 칩 1~2개
- 짧은 추천 이유
- 본문 출처 표시
- 액션 버튼

액션:

- `성경에서 열기`
- `복사`
- `인용 저장`
- `듣기`
- P1: `다른 말씀 보기`

### 모바일 UI

- 홈 `오늘` 세부 탭 안에서 한 화면에 읽히는 compact 카드로 둔다.
- 버튼은 2열 이하로 줄바꿈되게 한다.
- 본문은 3~5줄 이상 길어질 경우 카드 내부에서 자연스럽게 줄바꿈한다.
- 하단 네비게이션, TTS 오버레이와 겹치지 않는다.

### Empty/Error State

- 추천 후보는 있으나 본문 조회 실패: `오늘의 추천 말씀을 불러오지 못했습니다.`
- 전체 후보가 비활성 또는 누락: `추천 말씀 준비 중입니다.`
- 한국어 본문이 없을 때: 현재 앱 규칙처럼 English fallback 또는 `한국어 본문 없음` 표시를 따른다.

## Data And Architecture

### 클라이언트 함수

권장 파일:

- `src/lib/gospel-recommendations.ts`
- `src/lib/daily-recommendation.ts`

권장 함수:

```ts
function getDailyGospelCandidate(dateKey: string, candidates: GospelRecommendationCandidate[]): GospelRecommendationCandidate | null;

async function fetchDailyGospelVerse(dateKey: string): Promise<{
  candidate: GospelRecommendationCandidate;
  verse: Verse;
} | null>;
```

### 본문 조회

추천 데이터는 `verseId`만 가지고, 본문은 기존 경로로 조회한다.

- 클라이언트: `fetchBibleVerse(verseId)`
- 서버/fixture: 기존 Bible repository
- DB 이후: `/api/bible/verses/[verseKey]`

이렇게 두면 한국어 본문, English fallback, CrossWire KJV source 표시는 현재 리더와 같은 규칙을 따른다.

### UserDataState 변경

P0에서는 필수 변경 없음.

P1에서 "다른 말씀 보기", "최근 추천 숨김", "추천 기록"이 필요하면 다음 필드를 추가한다.

```ts
type UserDataState = {
  dailyRecommendationHistory: DailyRecommendationHistoryItem[];
};
```

localStorage 마이그레이션은 P1에서 함께 추가한다.

### DB 전환

운영 DB에서는 다음 구조를 권장한다.

```sql
daily_gospel_recommendation_candidates
- id
- verse_key
- title
- themes
- priority
- enabled
- created_at
- updated_at

daily_gospel_recommendation_overrides
- id
- date_key
- candidate_id
- reason
- created_by
- created_at
```

읽기는 모든 로그인 사용자에게 허용하되, 쓰기는 관리자만 가능하게 한다.

## Implementation Phases

### Phase DGR-01: 추천 풀과 선택 로직

목표: 복음 중심 추천 후보를 코드로 정의하고 날짜 기반 선택 함수를 만든다.

체크리스트:

- [ ] `GospelRecommendationTheme` 타입을 정의한다.
- [ ] `GospelRecommendationCandidate` 타입을 정의한다.
- [ ] `gospelRecommendationCandidates` 정적 배열을 만든다.
- [ ] 후보에는 본문이 아니라 `verseId`, `bookId`, `chapter`, `verse`만 저장한다.
- [ ] `getLocalDateKey()` 또는 기존 날짜 유틸과 맞춘다.
- [ ] 날짜 기반 deterministic selection 함수를 만든다.
- [ ] disabled 후보를 제외한다.
- [ ] 조회 실패 후보 fallback 규칙을 문서화한다.

수용 기준:

- [ ] 같은 날짜에는 같은 candidate가 반환된다.
- [ ] 날짜가 바뀌면 다른 candidate가 선택될 수 있다.
- [ ] 본문 텍스트가 추천 후보 파일에 중복 저장되지 않는다.

### Phase DGR-02: 홈 추천 카드

목표: 홈 `오늘` 탭에서 추천구절을 표시한다.

체크리스트:

- [ ] `DailyGospelVerseCard` 컴포넌트를 만든다.
- [ ] 홈 `today` 섹션에서 이어 읽기 다음에 카드를 배치한다.
- [ ] 구절 본문, 참조, 주제 칩, 출처를 표시한다.
- [ ] 로딩 상태를 표시한다.
- [ ] 조회 실패 상태를 표시한다.
- [ ] 모바일 폭에서 버튼과 본문이 넘치지 않게 스타일을 추가한다.

수용 기준:

- [ ] 홈 진입 시 오늘의 복음 말씀이 보인다.
- [ ] 새로고침해도 같은 날짜에는 같은 구절이 보인다.
- [ ] 모바일 홈 `오늘` 탭에서 카드가 화면 밖으로 넘치지 않는다.

### Phase DGR-03: 기존 액션 연결

목표: 추천구절에서 리더, 복사, 인용 저장, TTS 흐름으로 이어지게 한다.

체크리스트:

- [ ] `성경에서 열기`가 `openChapter(bookId, chapter, verse)`를 호출한다.
- [ ] `복사`가 기존 `copyTextForVerse` 형식을 재사용한다.
- [ ] `인용 저장`이 기존 인용 저장 모달을 연다.
- [ ] `듣기`가 기존 TTS queue 재생을 재사용한다.
- [ ] 추천 카드 액션이 선택 구절 상태와 충돌하지 않게 한다.
- [ ] 복사/TTS 실패 상태를 기존 status UI에 맞춘다.

수용 기준:

- [ ] 추천구절을 리더에서 열 수 있다.
- [ ] 추천구절을 기존 형식으로 복사할 수 있다.
- [ ] 추천구절을 인용 목록에 저장할 수 있다.
- [ ] 추천구절 하나만 TTS로 들을 수 있다.

### Phase DGR-04: 추천 품질과 운영 전환 준비

목표: 후보 풀 품질을 검수하고 DB/관리자 전환 지점을 남긴다.

체크리스트:

- [ ] 후보 구절이 실제 API에서 조회되는지 검증한다.
- [ ] 후보가 복음 중심 기준에 맞는지 검수한다.
- [ ] 너무 긴 본문은 카드 UI에서 과도하게 커지지 않는지 확인한다.
- [ ] 추천 후보에 제목과 주제 칩이 과장된 해석이 되지 않게 정리한다.
- [ ] DB 전환 시 사용할 테이블 구조를 migration 후보로 남긴다.
- [ ] 관리자만 추천 후보를 편집할 수 있는 future RBAC 범위를 분리한다.

수용 기준:

- [ ] 활성 후보는 모두 정상 조회된다.
- [ ] 추천 제목과 주제는 본문 의미를 과장하지 않는다.
- [ ] DB 전환 시 UI 변경 없이 source만 바꿀 수 있다.

## Test Plan

자동 검증:

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm audit --audit-level=moderate`

단위/함수 검증:

- [ ] 같은 `dateKey`는 같은 candidate를 반환한다.
- [ ] disabled 후보는 선택되지 않는다.
- [ ] 후보 배열이 비었을 때 null 또는 fallback이 안전하게 처리된다.
- [ ] 잘못된 `verseId` 조회 실패가 홈 전체 렌더링을 깨지 않는다.

브라우저 수동 검증:

- [ ] `/app` 홈 `오늘` 탭에 추천 카드가 보인다.
- [ ] 추천구절 `성경에서 열기`가 해당 장/절로 이동한다.
- [ ] 추천구절 복사가 기존 구절 복사 형식과 같다.
- [ ] 추천구절 인용 저장 모달이 열린다.
- [ ] 추천구절 TTS가 구절 번호 없이 본문만 읽는다.
- [ ] 새로고침 후 같은 날짜에는 같은 구절이 표시된다.
- [ ] 모바일 폭에서 카드, 버튼, 본문이 화면 밖으로 넘치지 않는다.

## Risks

- 성경전서 전체 DB가 준비되지 않은 상태에서는 추천 후보 중 조회 불가 구절이 생길 수 있다.
- 추천 제목이나 주제 칩이 해석처럼 보이면 신학적 부담이 커질 수 있다.
- 홈 `오늘` 탭 정보가 과밀해질 수 있다.
- 매일 추천이 통독 플랜보다 더 중요해 보이면 MVP의 읽기 연속성이 약해질 수 있다.

## Decisions

- P0 추천 원천은 앱 내부 curated pool로 둔다.
- 추천 후보에는 본문을 저장하지 않는다.
- P0에서는 개인화 추천을 하지 않는다.
- 홈 배치는 `이어 읽기`와 `오늘 통독 플랜` 사이로 둔다.
- 본문이 없는 후보는 표시하지 않고 조회 가능한 후보로 fallback한다.

## Done Definition

- [ ] 추천 풀과 날짜 기반 선택 로직이 구현되어 있다.
- [ ] 홈 `오늘` 탭에 추천구절 카드가 표시된다.
- [ ] 추천구절의 열기, 복사, 인용 저장, TTS 액션이 동작한다.
- [ ] 기존 이어 읽기, 통독 플랜, 인용 저장, TTS 흐름이 회귀하지 않는다.
- [ ] 모바일 홈에서 UI가 넘치지 않는다.
- [ ] 자동 검증과 브라우저 수동 검증 결과가 구현 완료 요약에 기록되어 있다.
