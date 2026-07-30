import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommunityProfileEditor } from "@/components/community-social/community-profile-editor";
import { getUserProfile } from "@/lib/onboarding-server";
import { getCommunityV2Auth, getOwnCommunityProfile } from "@/lib/community-v2-server";

export const metadata: Metadata = { robots: { follow: false, index: false }, title: "커뮤니티 프로필 설정" };

export default async function CommunitySettingsPage() {
  const auth = await getCommunityV2Auth(undefined, true).catch(() => null);
  if (!auth?.user) redirect("/auth/login?next=/community/settings");
  const onboardingProfile = await getUserProfile(auth.service, auth.user.id);
  if (!onboardingProfile?.onboardingCompletedAt) redirect("/onboarding?next=%2Fcommunity%2Fsettings");
  const profile = await getOwnCommunityProfile(auth.service, auth.user);
  return <main className="community-page-grid community-page-single community-profile-settings-layout"><div className="community-main-column"><CommunityProfileEditor initialProfile={profile} /></div></main>;
}
