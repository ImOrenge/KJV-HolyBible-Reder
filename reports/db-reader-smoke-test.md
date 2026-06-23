# Phase 06 DB Reader Smoke Test

실행일: 2026-06-21

## 결과

PASS

## 적용 내용

- Supabase Data API 접근용 GRANT 마이그레이션 적용
- `/api/bible/books`
- `/api/bible/books/[bookId]/chapters/[chapter]`
- `/api/bible/verses/[verseKey]`
- `/api/bible/search`
- 리더/검색 UI를 fixture 직접 조회에서 로컬 API 조회로 전환
- legacy fixture id를 `verse_key`로 변환하는 클라이언트 호환 처리 추가

## Supabase REST 확인

- `bible_books`: 66권
- `bible_verses_en` Genesis 1: 31절
- `JHN.3.16`: 조회 성공, text length 141

## Migration 확인

- `20260621022719_grant_bible_read_access.sql`: 원격 DB 적용 완료
- `supabase migration repair`: `001~007`, `20260621022719`를 remote applied로 정리
- `supabase db push --dry-run`: `Remote database is up to date.`

## 로컬 API 확인

- `/api/bible/books`: 66권
- `/api/bible/books/gen/chapters/1`: 31절, first `GEN.1.1`
- `/api/bible/books/psa/chapters/23`: 6절, source `CrossWire KJV 3.1`
- `/api/bible/books/jhn/chapters/3`: 36절, source `CrossWire KJV 3.1`
- `/api/bible/books/rev/chapters/22`: 21절, last `REV.22.21`
- `/api/bible/verses/JHN.3.16`: 조회 성공, text length 141
- `/api/bible/verses/REV.22.21`: 조회 성공, text length 57
- `/api/bible/search?q=love`: 50건, first `GEN.22.2`

## 코드 검증

- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 남은 범위

- 개인 통독/강조/인용 데이터는 아직 Supabase user tables가 아니라 localStorage mock repository에 저장된다.
- 한국어 번역 본문은 아직 표시하지 않는다.
- 브라우저 자동화 검증은 도구 연결 오류로 수행하지 못했다. API와 build 검증은 통과했다.
