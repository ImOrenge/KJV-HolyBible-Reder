import type { User } from "@supabase/supabase-js";

export type AppUser = {
  displayName: string;
  email: string;
  id: string;
  isAuthenticated: boolean;
};

export const guestAppUser: AppUser = {
  displayName: "비로그인 리더",
  email: "",
  id: "guest-reader",
  isAuthenticated: false,
};

export function toAppUser(user: User): AppUser {
  const email = user.email ?? "";
  const nameFromMetadata =
    typeof user.user_metadata.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return {
    displayName: nameFromMetadata || email || "Reader",
    email,
    id: user.id,
    isAuthenticated: true,
  };
}
