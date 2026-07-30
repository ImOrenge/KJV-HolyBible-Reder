-- Community V2 profile edits run with the authenticated user's JWT and are
-- constrained to the caller's own row by the existing profile RLS policies.
-- Grant only the new V2 fields required by the profile API.
grant insert (public_enabled)
on public.user_public_profiles
to authenticated;

grant update (handle, bio, public_enabled, show_honorific)
on public.user_public_profiles
to authenticated;
