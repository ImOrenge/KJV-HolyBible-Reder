create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 2 and 24),
  full_name text not null check (char_length(trim(full_name)) between 2 and 50),
  honorific text not null check (
    honorific in ('성도님', '형제님', '자매님', '집사님', '권사님', '장로님', '목사님')
  ),
  avatar_path text,
  onboarding_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_avatar_path_check check (
    avatar_path is null or avatar_path like user_id::text || '/%'
  )
);

create unique index user_profiles_nickname_unique_idx
on public.user_profiles (lower(trim(nickname)));

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
on public.user_profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create own profile"
on public.user_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update own profile"
on public.user_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete own profile"
on public.user_profiles for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.user_profiles from anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to authenticated;
grant all on table public.user_profiles to service_role;

alter table public.user_public_profiles
  add column honorific text check (
    honorific is null
    or honorific in ('성도님', '형제님', '자매님', '집사님', '권사님', '장로님', '목사님')
  ),
  add column avatar_path text,
  add constraint user_public_profiles_avatar_path_check check (
    avatar_path is null or avatar_path like user_id::text || '/%'
  );

grant insert (honorific, avatar_path) on public.user_public_profiles to authenticated;
grant update (honorific, avatar_path) on public.user_public_profiles to authenticated;

create or replace function public.complete_user_onboarding(
  p_nickname text,
  p_full_name text,
  p_honorific text,
  p_avatar_path text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.user_profiles (
    user_id,
    nickname,
    full_name,
    honorific,
    avatar_path,
    onboarding_completed_at
  )
  values (
    v_user_id,
    trim(p_nickname),
    trim(p_full_name),
    p_honorific,
    p_avatar_path,
    now()
  )
  on conflict (user_id) do update set
    nickname = excluded.nickname,
    full_name = excluded.full_name,
    honorific = excluded.honorific,
    avatar_path = excluded.avatar_path,
    onboarding_completed_at = excluded.onboarding_completed_at;

  insert into public.user_public_profiles (
    user_id,
    display_name,
    honorific,
    avatar_path,
    ranking_opt_in,
    show_level
  )
  values (
    v_user_id,
    trim(p_nickname),
    p_honorific,
    p_avatar_path,
    false,
    true
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    honorific = excluded.honorific,
    avatar_path = excluded.avatar_path;
end;
$$;

revoke execute on function public.complete_user_onboarding(text, text, text, text) from public, anon;
grant execute on function public.complete_user_onboarding(text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own avatar objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can upload own avatar objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update own avatar objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete own avatar objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
