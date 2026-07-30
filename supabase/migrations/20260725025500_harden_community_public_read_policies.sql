grant select (public_enabled) on public.user_public_profiles to anon, authenticated;

drop policy if exists "Anyone can read published community posts"
on public.community_posts;

create policy "Anonymous users can read published community posts"
on public.community_posts for select to anon
using (
  status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_posts.author_id
      and profile.public_enabled is true
      and profile.status = 'active'
  )
);

create policy "Members can read published unblocked community posts"
on public.community_posts for select to authenticated
using (
  status = 'published'
  and visibility = 'public'
  and exists (
    select 1 from public.user_public_profiles profile
    where profile.user_id = community_posts.author_id
      and profile.public_enabled is true
      and profile.status = 'active'
  )
  and not exists (
    select 1
    from public.community_blocks block
    where (block.blocker_id = (select auth.uid()) and block.blocked_id = community_posts.author_id)
       or (block.blocker_id = community_posts.author_id and block.blocked_id = (select auth.uid()))
  )
);

drop policy if exists "Members can read active public profiles"
on public.user_public_profiles;

create policy "Members can read enabled community profiles"
on public.user_public_profiles for select to authenticated
using (
  (public_enabled is true and status = 'active')
  or user_id = (select auth.uid())
  or (select app_private.has_any_role(array['discussion_moderator', 'community_manager', 'admin']))
);
