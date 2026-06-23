# KJV 리더노트

CrossWire KJV 기반 성경 통독·공부 노트 v0 MVP 구현체다.

## 현재 범위

- Mock OAuth: `demo-user` localStorage session
- 성경 데이터: 66권 메타데이터 + 일부 fixture 본문
- 개인 데이터: localStorage 기반 읽기 위치, 읽음 완료, 강조, 인용 목록/구절, 태그, 설정
- 리더: 권/장 선택, 절 선택, 이전/다음 장, 읽음 완료
- 대시보드: 이어 읽기, 통독률, 최근 읽기, 최근 강조, 최근 인용
- 공부 기능: 구절 강조, 메모, 인용 목록 생성/선택, 인용 저장, 태그, 개별/목록 복사
- TTS: Web Speech API 기반 컨트롤과 미지원 브라우저 상태 처리
- 검색: fixture 본문 검색

실제 OAuth, 운영 DB, 성경전서 전체 seed, 라이선스 확정은 후속 전환 단계로 남겨두었다.

## 실행

```bash
npm install
npm run dev
```

개발 서버 기본 주소:

```text
http://localhost:3000
```

## 검증

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

MVP 계획 문서는 [`docs/mvp-phases/README.md`](docs/mvp-phases/README.md)를 기준으로 한다.
