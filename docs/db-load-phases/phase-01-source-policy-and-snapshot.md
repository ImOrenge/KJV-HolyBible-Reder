# Phase 01: CrossWire KJV 소스 정책과 원본 스냅샷

## 목표

CrossWire `KJV` SWORD 모듈을 공식 원천 데이터로 확정하고, 이후 변환과 DB import가 항상 같은 원본에서 재현되도록 스냅샷과 라이선스 기록을 남긴다.

## 입력

- CrossWire KJV module info page
- CrossWire Bible Texts and Translations download page
- SWORD Install Manager 또는 raw ZIP 다운로드
- 모듈 metadata 파일

## 산출물

- `data/crosswire/kjv/raw/` 원본 모듈 스냅샷
- `data/crosswire/kjv/source-metadata.json`
- `docs/db-load-phases/kjv-source-notice.md`
- `reports/kjv-source-snapshot.md`

## 작업 체크리스트

- [ ] CrossWire 공식 페이지에서 `KJV` 모듈 정보를 확인한다.
- [ ] 모듈명, book name, module type, language, version, minimum SWORD version을 기록한다.
- [ ] distribution license와 CrossWire KJV 고지 문구를 확인한다.
- [ ] 앱 공개 배포 전 출처 표기 방식과 사용 가능 범위를 문서화한다.
- [ ] raw ZIP 또는 SWORD Install Manager로 받은 원본 파일을 `data/crosswire/kjv/raw/`에 저장한다.
- [ ] 원본 ZIP 또는 module 파일의 checksum을 계산해 기록한다.
- [ ] 다운로드 날짜와 다운로드 URL을 기록한다.
- [ ] 원본 모듈 파일은 직접 수정하지 않는다는 정책을 문서화한다.
- [ ] 변환 스크립트는 원본 파일 경로를 인자로 받아 실행되도록 설계한다.
- [ ] 원본 데이터 재다운로드 시 checksum과 version 차이를 비교하는 절차를 둔다.

## 정책 결정

### 기준 데이터

DB의 `bible_verses_en`은 CrossWire `KJV` 모듈에서 추출한 plain text를 기준으로 한다. Strong number, morphology, red-letter, title, note, cross-reference 같은 markup은 MVP 본문 필드에는 넣지 않는다.

### 원본 보존

원본 모듈은 감사와 재현을 위한 파일이다. 본문 오탈자나 markup 이슈가 발견되어도 원본 파일을 수정하지 않고 다음 중 하나로 처리한다.

- CrossWire 모듈 업데이트 확인
- 별도 issue 기록
- normalization script의 markup 제거 로직 수정
- 필요한 경우 `source_patch_notes` 같은 별도 테이블 또는 리포트로 추적

### 라이선스 게이트

CrossWire KJV 모듈은 공개 배포 전 다음 기준으로 다시 확인한다.

- [ ] 앱 내 또는 문서 내 CrossWire 출처 표기 위치가 있다.
- [ ] module metadata의 license 문구를 보존한다.
- [ ] GPL distribution license가 앱 배포 방식에 주는 영향을 검토한다.
- [ ] KJV의 지역별 사용 이슈, 특히 영국 Crown 권리 관련 리스크를 공개 서비스 대상 지역 기준으로 검토한다.
- [ ] 검토 결과를 `reports/kjv-source-snapshot.md`에 남긴다.

## 완료 기준

- CrossWire `KJV` 모듈 원본 파일이 저장되어 있다.
- 원본 checksum, module version, 다운로드 URL, 다운로드 날짜가 기록되어 있다.
- 원본 사용 정책과 라이선스 확인 TODO가 문서화되어 있다.
- 다음 페이즈에서 같은 원본을 사용해 자동 변환을 시작할 수 있다.

## 참고 자료

- CrossWire KJV module info: <https://crosswire.org/sword/modules/ModInfo.jsp?modName=KJV>
- CrossWire KJV background: <https://wiki.crosswire.org/CrossWire_KJV>
