begin;
set local role postgres;

create temporary table smoke_onboarding_users on commit drop as
select id, row_number() over (order by created_at, id) as position
from auth.users
order by created_at, id
limit 2;

do $$
declare
  avatar_policy_count integer;
  avatar_bucket_valid boolean;
begin
  if (select count(*) from smoke_onboarding_users) < 2 then
    raise exception 'Two existing auth users are required for the onboarding RLS smoke test.';
  end if;

  select count(*) into avatar_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in (
      'Users can read own avatar objects',
      'Users can upload own avatar objects',
      'Users can update own avatar objects',
      'Users can delete own avatar objects'
    );
  if avatar_policy_count <> 4 then
    raise exception 'Avatar storage RLS policies are incomplete: %', avatar_policy_count;
  end if;

  select public is true
    and file_size_limit = 2097152
    and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
  into avatar_bucket_valid
  from storage.buckets
  where id = 'profile-avatars';
  if avatar_bucket_valid is not true then
    raise exception 'Avatar bucket configuration is invalid.';
  end if;
end;
$$;

grant select on smoke_onboarding_users to authenticated;
set local role authenticated;

do $$
declare
  user_a uuid := (select id from smoke_onboarding_users where position = 1);
  user_b uuid := (select id from smoke_onboarding_users where position = 2);
  nickname text := 'smoke-' || substring(md5(random()::text), 1, 12);
  visible_count integer;
  affected_count integer;
begin
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform public.complete_user_onboarding(nickname, '온보딩 테스트 사용자', '성도님', null);

  select count(*) into visible_count
  from public.user_profiles
  where user_id = user_a and full_name = '온보딩 테스트 사용자';
  if visible_count <> 1 then
    raise exception 'Account A could not read its private onboarding profile.';
  end if;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  select count(*) into visible_count from public.user_profiles where user_id = user_a;
  if visible_count <> 0 then
    raise exception 'Account B could read account A private profile.';
  end if;

  update public.user_profiles set full_name = '변조된 이름' where user_id = user_a;
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then
    raise exception 'Account B updated account A private profile.';
  end if;

  select count(*) into visible_count
  from public.user_public_profiles
  where user_id = user_a and display_name = nickname and honorific = '성도님';
  if visible_count <> 1 then
    raise exception 'Account B could not read account A public profile.';
  end if;

  begin
    perform public.complete_user_onboarding(upper(nickname), '중복 테스트 사용자', '형제님', null);
    raise exception 'Duplicate nickname was unexpectedly accepted.';
  exception
    when unique_violation then null;
  end;

  raise notice 'remote onboarding smoke passed: private-profile-isolation=true, public-profile-safe=true, nickname-unique=true, avatar-policies=true';
end;
$$;

rollback;
