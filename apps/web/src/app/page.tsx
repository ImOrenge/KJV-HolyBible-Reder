import { LandingAdsenseLoader } from "@/components/landing-adsense-loader";
import { LandingPage } from "@/components/landing-page";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function renderLandingPage(isAuthenticated: boolean) {
  return (
    <>
      <LandingPage isAuthenticated={isAuthenticated} />
      <LandingAdsenseLoader />
    </>
  );
}

export default async function Home() {
  if (!hasSupabasePublicConfig({ includeServerFallback: true })) {
    return renderLandingPage(false);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return renderLandingPage(Boolean(user));
}
