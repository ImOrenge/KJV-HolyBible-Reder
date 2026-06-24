import type { User } from "@supabase/supabase-js";

export const appRoles = ["feedback_reviewer", "translator", "lead_reviewer", "admin"] as const;
export type AppRole = (typeof appRoles)[number];

const appRoleSet = new Set<string>(appRoles);
export const adminAccessRoles: AppRole[] = ["feedback_reviewer", "translator", "lead_reviewer", "admin"];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && appRoleSet.has(value);
}

export function getUserRoles(user: User | null | undefined): AppRole[] {
  if (!user) {
    return [];
  }

  const metadata = user.app_metadata as Record<string, unknown>;
  const roles = metadata.roles;
  const role = metadata.role;
  const next = new Set<AppRole>();

  if (Array.isArray(roles)) {
    for (const candidate of roles) {
      if (isAppRole(candidate)) {
        next.add(candidate);
      }
    }
  }

  if (isAppRole(role)) {
    next.add(role);
  }

  return [...next];
}

export function hasAnyRole(user: User | null | undefined, allowedRoles: readonly AppRole[]) {
  const userRoles = getUserRoles(user);
  return allowedRoles.some((role) => userRoles.includes(role));
}

export function canAccessAdmin(user: User | null | undefined) {
  return hasAnyRole(user, adminAccessRoles);
}
