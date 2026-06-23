# 유저 데이터 보안관리 정책

## Summary

이 정책은 KJV Educator MVP의 개인 사용자 데이터가 Supabase 이메일 로그인, localStorage 전환 기간, 이후 Supabase DB repository 전환 단계에서 어떻게 보호되어야 하는지 정의한다.

핵심 원칙은 다음과 같다.

- 사용자의 개인 공부 데이터는 로그인 사용자 본인만 읽고 수정할 수 있어야 한다.
- 브라우저에 노출되는 키는 publishable/anon 성격의 낮은 권한 키만 허용한다.
- 개인 데이터 DB 테이블은 RLS와 최소 권한 grant를 함께 적용한다.
- localStorage는 전환기 캐시/임시 저장소로만 취급하고, 공개 출시 데이터 보안 경계로 삼지 않는다.
- 권한 판단은 user-editable metadata가 아니라 Supabase Auth의 검증된 사용자 ID와 RLS 정책에 둔다.

## Source References

- Supabase Securing your data: https://supabase.com/docs/guides/database/secure-data
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

확인일: 2026-06-23

## Scope

정책 적용 대상:

- Supabase Auth 사용자 계정과 세션
- 읽기 위치
- 완료한 장
- 강조 구절과 강조 메모
- 인용 목록과 인용 구절
- 태그
- 개인 노트
- 통독 플랜
- 읽기/TTS 설정
- localStorage에 남아 있는 v0 개인 데이터
- Supabase user data table과 migration
- Auth/DB 관련 환경 변수와 API keys

정책 제외 대상:

- 공개 성경 본문 데이터
- 공개 번역 용어 데이터
- 공개 릴리스 전 내부 개발 fixture
- 익명 분석 이벤트. 단, 개인 식별자와 결합되면 이 정책 적용 대상이다.

## Data Classification

| 등급 | 데이터 | 저장 위치 | 보안 요구 |
| --- | --- | --- | --- |
| Public | 공개 가능한 성경 권 메타데이터, 공개 KJV 본문 | Supabase public tables | read-only grant, 무결성 관리 |
| User Private | 읽기 위치, 완료 장, 강조, 인용, 태그, 노트, 플랜, 설정 | localStorage 전환기, 이후 Supabase user tables | 계정별 분리, RLS, 최소 권한 grant |
| Auth Sensitive | 이메일, auth user id, 세션 cookie, refresh token | Supabase Auth/cookie | SSR cookie session, XSS/CSRF 방어, 로그 마스킹 |
| Secret | secret key, service role key, DB password | 서버 환경 변수/비밀 저장소 | 브라우저 노출 금지, 로그 금지, 회전 절차 |

## Ownership Model

모든 개인 데이터는 다음 소유권 모델을 따른다.

```txt
auth.users.id == user_data.user_id
```

정책:

- 개인 데이터 row는 반드시 `user_id uuid not null references auth.users(id)`를 가진다.
- client가 직접 `user_id`를 임의 지정하더라도 RLS `WITH CHECK`가 `auth.uid()`와 일치 여부를 검증해야 한다.
- update 시 기존 row와 결과 row 모두 같은 사용자 소유여야 한다.
- 다대다 membership 테이블은 직접 `user_id`가 없더라도 부모 row의 `user_id`를 통해 소유권을 검증한다.
- `raw_user_meta_data` 또는 사용자가 수정 가능한 profile 필드는 권한 판단에 사용하지 않는다.

## Access Control Policy

### Supabase Data API

- 공개 테이블은 필요한 경우 `anon`/`authenticated`에 `select`만 grant한다.
- 개인 데이터 테이블은 `authenticated`에 필요한 CRUD만 grant한다.
- 개인 데이터 테이블은 `anon`에 grant하지 않는다.
- grants와 RLS는 같은 migration에서 함께 변경한다.
- 기존 프로젝트의 public schema 자동 grant 상태를 주기적으로 점검한다.

### Row Level Security

개인 데이터 테이블의 기본 정책 패턴:

```sql
alter table public.user_table enable row level security;

create policy "Users can read own rows"
on public.user_table
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own rows"
on public.user_table
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own rows"
on public.user_table
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own rows"
on public.user_table
for delete
to authenticated
using ((select auth.uid()) = user_id);
```

정책:

- `TO authenticated`를 명시한다.
- `auth.uid()`는 `(select auth.uid())` 형태로 감싸는 것을 기본으로 한다.
- `UPDATE` 가능한 테이블은 `SELECT` 정책도 있어야 한다.
- `INSERT`/`UPDATE`는 반드시 `WITH CHECK`를 둔다.
- membership 테이블은 부모 개인 데이터 row를 `exists`로 검증한다.
- RLS가 비활성화된 개인 데이터 테이블은 배포 차단 사유다.

### Views And Functions

- 개인 데이터가 포함된 view는 기본적으로 노출하지 않는다.
- Postgres 15 이상에서 view를 노출해야 하면 `security_invoker = true`를 검토한다.
- `security definer` 함수는 exposed schema에 두지 않는다.
- 함수는 RLS가 적용되지 않으므로 `grant execute`를 명시적으로 제한한다.

## Key Management

허용:

- 브라우저: `NEXT_PUBLIC_SUPABASE_URL`
- 브라우저: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- 전환기 브라우저: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

금지:

- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_` 접두사가 붙은 모든 secret/service role/DB password
- service role 또는 secret key를 클라이언트 번들, URL, 쿼리스트링, 로그에 포함

운영 정책:

- secret key는 서버 전용 환경 변수로만 둔다.
- secret key가 필요 없는 구조면 발급하지 않는다.
- secret key가 유출되었다고 의심되면 즉시 새 key를 발급하고, 서버를 교체한 뒤 기존 key를 삭제한다.
- 로그에는 API key 전체를 남기지 않는다. 필요 시 해시 또는 앞 6자 이하만 저장한다.

## LocalStorage Transition Policy

localStorage는 보안 저장소가 아니다. Supabase Auth 전환기에는 다음 제한을 둔다.

- localStorage 데이터는 `auth.uid()`별 key로 분리한다.
- `demo-user` 데이터는 자동 병합하지 않고 사용자 동의 후 가져온다.
- 로그아웃 시 현재 세션 토큰은 삭제하지만, 사용자 공부 데이터는 정책 결정 전까지 유지할 수 있다.
- 공개 출시 전에는 “이 기기 전용 데이터”와 “계정 동기화 데이터”를 UI에서 명확히 구분한다.
- DB repository 전환 후에는 localStorage를 캐시로만 사용하고, 권한 판단은 서버/RLS에 둔다.
- 공유 PC 사용자를 위해 “이 기기의 로컬 데이터 삭제” 액션을 제공한다.

## Data Retention And Deletion

정책:

- 사용자가 계정을 삭제하면 `auth.users` cascade로 개인 데이터가 삭제되어야 한다.
- 삭제 전 내보내기 기능은 이번 범위에서 제외되어 있으므로 별도 PRD 없이는 구현하지 않는다.
- localStorage 전환기에는 계정 삭제와 별도로 기기 로컬 데이터 삭제 안내를 제공해야 한다.
- 운영 DB 삭제는 soft delete가 필요한 데이터와 hard delete 가능한 데이터를 테이블별로 분류한 후 적용한다.

초기 MVP 기준:

- 읽기 위치, 완료 장, 강조, 인용, 태그, 노트, 설정은 계정 삭제 시 삭제한다.
- 공개 성경 본문과 번역 메타데이터는 계정 삭제와 무관하다.

## Logging And Observability

로그 금지:

- access token
- refresh token
- cookie 전체 값
- secret/service role key
- 비밀번호
- 이메일 확인 링크 전체 URL
- 개인 노트 본문 전체

허용 로그:

- 사용자 id hash
- 이벤트 타입
- 요청 결과 상태
- 에러 코드
- 테이블명
- operation 종류

정책:

- 에러 메시지는 사용자에게 계정 존재 여부나 내부 policy 구조를 노출하지 않는다.
- RLS 실패는 “권한이 없거나 세션이 만료되었습니다” 수준으로 표시한다.
- 운영 로그에는 개인 노트/메모/인용 본문을 원문 그대로 남기지 않는다.

## Incident Response

API key 유출 의심:

1. 유출 key 종류를 식별한다.
2. secret/service role이면 즉시 새 key를 발급한다.
3. 서버 환경 변수를 교체하고 배포한다.
4. 기존 key를 삭제한다.
5. 최근 DB 접근 로그와 Supabase Audit/Security Advisor를 확인한다.
6. 영향 받은 사용자 데이터 범위를 기록한다.

RLS 누락 의심:

1. 해당 테이블의 Data API grant와 RLS 상태를 확인한다.
2. 즉시 RLS를 활성화하거나 grant를 revoke한다.
3. 누락된 정책을 migration으로 작성한다.
4. 계정 A/B 교차 접근 테스트를 실행한다.
5. 노출 가능성이 있는 row 범위를 기록한다.

계정 세션 탈취 의심:

1. 사용자에게 로그아웃/비밀번호 재설정을 안내한다.
2. 민감 작업에는 재인증 또는 향후 MFA를 검토한다.
3. 세션 로그와 최근 데이터 변경 이벤트를 점검한다.

## Required Security Gates

Auth 구현 완료 전:

- [ ] `service_role`/secret key가 `NEXT_PUBLIC_` 변수에 없다.
- [ ] 로그인 실패 메시지가 계정 존재 여부를 노출하지 않는다.
- [ ] 새로고침 후 세션 유지가 cookie 기반으로 동작한다.
- [ ] `?mockAuth=1`은 production에서 우회 수단이 아니다.

개인 데이터 DB 전환 전:

- [ ] 모든 개인 데이터 테이블에 `user_id`가 있다.
- [ ] 모든 개인 데이터 테이블에 RLS가 활성화되어 있다.
- [ ] 모든 개인 데이터 테이블의 정책에 `TO authenticated`가 명시되어 있다.
- [ ] INSERT/UPDATE 정책에 `WITH CHECK`가 있다.
- [ ] Data API grant가 최소 권한으로 migration에 포함되어 있다.
- [ ] membership 테이블의 RLS가 부모 row 소유권을 검증한다.
- [ ] `user_id` 컬럼에 인덱스가 있다.

릴리스 전:

- [ ] Supabase Security Advisor 결과를 확인하고 남은 항목을 문서화한다.
- [ ] 계정 A/B 교차 접근 테스트를 통과한다.
- [ ] 로그에 token/key/password/note body가 남지 않는지 확인한다.
- [ ] 계정 삭제 또는 로컬 데이터 삭제 흐름을 수동 검증한다.
- [ ] 운영 Supabase Auth Redirect URL과 Site URL이 정확하다.

## Test Plan

RLS smoke test:

- [ ] 계정 A로 reading position을 insert한다.
- [ ] 계정 B로 같은 row를 select할 수 없는지 확인한다.
- [ ] 계정 B가 계정 A의 row를 update/delete할 수 없는지 확인한다.
- [ ] 계정 A가 `user_id`를 계정 B id로 insert하려 하면 실패하는지 확인한다.
- [ ] membership row가 다른 사용자 parent row에 연결될 수 없는지 확인한다.

환경 변수 점검:

- [ ] `.env`, 배포 환경 변수, CI secret에 `NEXT_PUBLIC_*SECRET*`가 없다.
- [ ] `NEXT_PUBLIC_*SERVICE_ROLE*`가 없다.
- [ ] client bundle search에서 `service_role`, `sb_secret_`, DB password 패턴이 나오지 않는다.

localStorage 점검:

- [ ] 사용자별 storage key가 분리되어 있다.
- [ ] 로그아웃 후 다른 사용자 로그인 시 이전 사용자 데이터가 보이지 않는다.
- [ ] 기기 로컬 데이터 삭제 후 해당 사용자 localStorage가 제거된다.

## Done Definition

- [ ] 이 정책이 Supabase 이메일 로그인 아키텍처의 필수 참조로 연결되어 있다.
- [ ] Auth 구현 이슈와 DB repository 전환 이슈가 이 정책의 security gates를 포함한다.
- [ ] 개인 데이터 DB migration은 RLS/grant/index를 함께 포함한다.
- [ ] 릴리스 전 보안 검증 결과가 문서화되어 있다.
