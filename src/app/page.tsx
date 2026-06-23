import { LandingPage } from "@/components/landing-page";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!hasSupabasePublicConfig({ includeServerFallback: true })) {
    return <LandingPage isAuthenticated={false} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage isAuthenticated={Boolean(user)} />;
}
