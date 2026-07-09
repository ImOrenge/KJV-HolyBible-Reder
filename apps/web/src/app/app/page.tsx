import { KjvMvpApp } from "@/components/kjv-mvp-app";
import { guestAppUser, toAppUser } from "@/lib/auth/app-user";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AppPage() {
  if (!hasSupabasePublicConfig({ includeServerFallback: true })) {
    return <KjvMvpApp user={guestAppUser} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <KjvMvpApp user={user ? toAppUser(user) : guestAppUser} />;
}
