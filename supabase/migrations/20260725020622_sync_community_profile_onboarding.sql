create or replace function app_private.sync_onboarding_community_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_public_profiles (
    user_id,
    display_name,
    honorific,
    avatar_path,
    ranking_opt_in,
    show_level,
    public_enabled
  )
  values (
    new.user_id,
    new.nickname,
    new.honorific,
    new.avatar_path,
    false,
    false,
    false
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    honorific = excluded.honorific,
    avatar_path = excluded.avatar_path;

  return new;
end;
$$;

drop trigger if exists sync_onboarding_community_profile on public.user_profiles;
create trigger sync_onboarding_community_profile
after insert or update of nickname, honorific, avatar_path on public.user_profiles
for each row execute function app_private.sync_onboarding_community_profile();

update public.user_public_profiles profile
set
  display_name = onboarding.nickname,
  honorific = onboarding.honorific,
  avatar_path = onboarding.avatar_path
from public.user_profiles onboarding
where onboarding.user_id = profile.user_id
  and (
    profile.display_name is distinct from onboarding.nickname
    or profile.honorific is distinct from onboarding.honorific
    or profile.avatar_path is distinct from onboarding.avatar_path
  );

revoke execute on function app_private.sync_onboarding_community_profile() from public, anon, authenticated;
