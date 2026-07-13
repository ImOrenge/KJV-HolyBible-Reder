import { KjvMvpApp } from "@/components/kjv-mvp-app";
import { guestAppUser, toAppUser } from "@/lib/auth/app-user";
import { getUserProfile } from "@/lib/onboarding-server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  if (!hasSupabasePublicConfig({ includeServerFallback: true })) {
    return <KjvMvpApp user={guestAppUser} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <KjvMvpApp user={guestAppUser} />;

  const profile = await getUserProfile(supabase, user.id);
  if (!profile) redirect("/onboarding?next=/app");

  return <KjvMvpApp user={toAppUser(user, profile)} />;
}
