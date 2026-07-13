import { KjvMvpApp } from "@/components/kjv-mvp-app";
import { StudyAppShell } from "@/components/study-app-shell";
import { guestAppUser, toAppUser } from "@/lib/auth/app-user";
import { getUserProfile } from "@/lib/onboarding-server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { buildLegacyStudyAppUrl, parseStudyUiWebView } from "@kjv/shared/study-ui";
import { studyUiFeatureFlags } from "@/lib/study-ui-feature-flags";

export const dynamic = "force-dynamic";

type AppPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const initialView = parseStudyUiWebView(params?.view);
  const renderApp = (appUser: Parameters<typeof KjvMvpApp>[0]["user"]) => studyUiFeatureFlags.uiShellV2
    ? <StudyAppShell initialView={initialView} user={appUser} />
    : <KjvMvpApp initialView={initialView} user={appUser} />;

  if (!hasSupabasePublicConfig({ includeServerFallback: true })) {
    return renderApp(guestAppUser);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return renderApp(guestAppUser);

  const profile = await getUserProfile(supabase, user.id);
  if (!profile) redirect(`/onboarding?next=${encodeURIComponent(buildLegacyStudyAppUrl(initialView))}`);

  return renderApp(toAppUser(user, profile));
}
