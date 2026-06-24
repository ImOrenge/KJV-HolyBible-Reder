drop policy if exists "Service role can manage app user roles" on app_private.user_roles;
create policy "Service role can manage app user roles"
on app_private.user_roles
for all
to service_role
using (true)
with check (true);

create or replace function app_private.set_user_role(
  p_target_user_id uuid,
  p_role text,
  p_enabled boolean
)
returns text[]
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
  v_roles text[];
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not app_private.has_role('admin') then
    raise exception 'Admin role required.' using errcode = '42501';
  end if;

  if p_target_user_id is null or p_enabled is null then
    raise exception 'Target user and enabled flag are required.' using errcode = '22023';
  end if;

  if p_role not in ('feedback_reviewer', 'translator', 'lead_reviewer', 'admin') then
    raise exception 'Invalid app role.' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = p_target_user_id) then
    raise exception 'Target user not found.' using errcode = 'P0002';
  end if;

  if p_enabled then
    insert into app_private.user_roles (
      user_id,
      role,
      assigned_by,
      assigned_at,
      expires_at
    )
    values (
      p_target_user_id,
      p_role,
      v_actor,
      now(),
      null
    )
    on conflict (user_id, role) do update
      set assigned_by = excluded.assigned_by,
          assigned_at = excluded.assigned_at,
          expires_at = null;

    v_action := 'grant';
  else
    delete from app_private.user_roles
    where user_id = p_target_user_id
      and role = p_role;

    v_action := 'revoke';
  end if;

  insert into public.admin_role_events (
    actor_id,
    target_user_id,
    role,
    action
  )
  values (
    v_actor,
    p_target_user_id,
    p_role,
    v_action
  );

  select coalesce(array_agg(role order by role), '{}'::text[])
    into v_roles
    from app_private.user_roles
    where user_id = p_target_user_id
      and (expires_at is null or expires_at > now());

  return v_roles;
end;
$$;

create or replace function public.set_user_app_role(
  p_target_user_id uuid,
  p_role text,
  p_enabled boolean
)
returns text[]
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.set_user_role(p_target_user_id, p_role, p_enabled);
$$;

revoke execute on function app_private.set_user_role(uuid, text, boolean) from public, anon;
grant execute on function app_private.set_user_role(uuid, text, boolean) to authenticated, service_role;
revoke execute on function public.set_user_app_role(uuid, text, boolean) from public, anon;
grant execute on function public.set_user_app_role(uuid, text, boolean) to authenticated, service_role;
