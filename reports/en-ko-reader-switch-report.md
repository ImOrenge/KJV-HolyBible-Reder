# EN/KR Reader Switch Report

실행일: 2026-06-21

## 결과

PASS

## 변경 내용

- Genesis 1장 한국어 초본 31절을 `approved`, `is_public=true`로 전환
- `Verse` 타입에 `translationName`, `defaultTranslation` 흐름 추가
- 장 조회 API가 승인된 한국어 번역을 `textKo`로 병합
- 단일 구절 API와 검색 API도 승인된 한국어 번역을 병합
- 리더 UI에 `EN/KR` 전환 버튼 추가
- 복사, 목록 표시, 인용 모달, TTS가 현재 선택 언어를 사용

## DB/API 확인

- Supabase anon REST Genesis 1 Korean rows: 31
- Supabase anon REST `JHN.3.16` Korean rows: 0
- Local API `/api/bible/books/gen/chapters/1`: 31 verses, 31 `textKo` rows
- Local API `/api/bible/books/jhn/chapters/3`: 36 verses, 0 `textKo` rows
- Local API `/api/bible/verses/GEN.1.1`: `textKo` present, status `approved`

## 검증

- `node scripts/validate-ko-translation.mjs`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 동작 기준

- `EN`: KJV 영어 원문 표시
- `KR`: 승인된 한국어 본문이 있으면 한국어 표시
- `KR` 선택 중 한국어 승인본이 없으면 영어 fallback과 승인본 없음 상태 표시

## 용어 업데이트

- `sign`, `signs`: `표적` 대신 `징조`로 번역
- `GEN.1.14`: `징조들과 계절들과 날들과 해들`
