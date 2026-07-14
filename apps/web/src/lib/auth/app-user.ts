import type { User } from "@supabase/supabase-js";
import type { UserHonorific, UserOnboardingProfile } from "@kjv/shared/onboarding";

export type AppUser = {
  avatarUrl: string | null;
  displayName: string;
  email: string;
  honorific: UserHonorific | null;
  id: string;
  isAuthenticated: boolean;
  nickname: string | null;
};

export const guestAppUser: AppUser = {
  avatarUrl: null,
  displayName: "비로그인 리더",
  email: "",
  honorific: null,
  id: "guest-reader",
  isAuthenticated: false,
  nickname: null,
};

export function toAppUser(user: User, profile?: UserOnboardingProfile | null): AppUser {
  const email = user.email ?? "";
  const nameFromMetadata =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return {
    avatarUrl: profile?.avatarUrl ?? null,
    displayName: profile ? `${profile.nickname} ${profile.honorific}` : nameFromMetadata || email || "Reader",
    email,
    honorific: profile?.honorific ?? null,
    id: user.id,
    isAuthenticated: true,
    nickname: profile?.nickname ?? null,
  };
}
