import type { User } from "@supabase/supabase-js";

export type AppUser = {
  displayName: string;
  email: string;
  id: string;
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
  };
}
