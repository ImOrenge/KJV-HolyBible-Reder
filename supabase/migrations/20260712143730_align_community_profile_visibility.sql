drop policy if exists "Members can read active public profiles"
on public.user_public_profiles;

create policy "Members can read active public profiles"
on public.user_public_profiles for select to authenticated
using (
  status = 'active'
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);

drop policy if exists "Members can read ranking point balances"
on public.community_point_balances;

create policy "Members can read visible point balances"
on public.community_point_balances for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_point_balances.user_id
      and profile.status = 'active'
      and profile.show_level is true
  )
);
