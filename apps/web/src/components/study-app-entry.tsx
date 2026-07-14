import { redirect } from "next/navigation";
import { buildLegacyStudyAppUrl, buildStudyUiCommunityUrl, buildStudyUiDictionaryUrl, buildStudyUiTargetUrl, type StudyUiRouteState } from "@kjv/shared/study-ui";

import { guestAppUser, toAppUser, type AppUser } from "@/lib/auth/app-user";
import { getUserProfile } from "@/lib/onboarding-server";
import { studyUiFeatureFlags } from "@/lib/study-ui-feature-flags";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { KjvMvpApp } from "./kjv-mvp-app";
import { StudyAppShell } from "./study-app-shell";

type StudyAppEntryProps = {
  route: StudyUiRouteState;
};

export async function StudyAppEntry({ route }: StudyAppEntryProps) {
  const renderApp = (appUser: AppUser) => studyUiFeatureFlags.uiShellV2
    ? <StudyAppShell initialRoute={route} readerV2={studyUiFeatureFlags.readerV2} user={appUser} />
    : <KjvMvpApp communityRoute={route.community} dictionaryRoute={route.dictionary} initialView={route.view} readerExperience={studyUiFeatureFlags.readerV2 ? "v2" : "legacy"} readerRoute={route.reader} user={appUser} />;

  if (!hasSupabasePublicConfig({ includeServerFallback: true })) return renderApp(guestAppUser);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return renderApp(guestAppUser);

  const profile = await getUserProfile(supabase, user.id);
  if (!profile) {
    const next = studyUiFeatureFlags.uiShellV2
      ? route.view === "community"
        ? buildStudyUiCommunityUrl(route.community)
        : route.view === "dictionary"
        ? buildStudyUiDictionaryUrl(route.dictionary)
        : buildStudyUiTargetUrl(route.view, route.reader)
      : buildLegacyStudyAppUrl(route.view);
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  }

  return renderApp(toAppUser(user, profile));
}
