import type { SupabaseClient, User } from "@supabase/supabase-js";

import { adminAccessRoles, getUserRoles, isAppRole, type AppRole } from "./rbac";

export async function getEffectiveUserRoles(supabase: SupabaseClient, user: User | null | undefined): Promise<AppRole[]> {
  const roles = new Set<AppRole>(getUserRoles(user));

  if (!user) {
    return [];
  }

  const { data, error } = await supabase.rpc("current_user_app_roles");
  if (!error && Array.isArray(data)) {
    for (const role of data) {
      if (isAppRole(role)) {
        roles.add(role);
      }
    }
  }

  return [...roles];
}

export async function hasAnyEffectiveRole(
  supabase: SupabaseClient,
  user: User | null | undefined,
  allowedRoles: readonly AppRole[],
) {
  const roles = await getEffectiveUserRoles(supabase, user);
  return allowedRoles.some((role) => roles.includes(role));
}

export async function canAccessAdmin(supabase: SupabaseClient, user: User | null | undefined) {
  return hasAnyEffectiveRole(supabase, user, adminAccessRoles);
}
