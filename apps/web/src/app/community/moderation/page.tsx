import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CommunityModerationQueue } from "@/components/community-social/community-moderation-queue";
import { getCommunityModerationQueue, getCommunityV2Auth, isCommunityModerator } from "@/lib/community-v2-server";

export const metadata: Metadata = { robots: { follow: false, index: false }, title: "커뮤니티 신고 검토" };

export default async function CommunityModerationPage() {
  const auth = await getCommunityV2Auth(undefined, true).catch(() => null);
  if (!auth?.user) redirect("/auth/login?next=/community/moderation");
  if (!isCommunityModerator(auth.roles)) notFound();
  const reports = await getCommunityModerationQueue(auth.service, auth.roles);
  return <main className="community-page-grid"><div className="community-main-column"><CommunityModerationQueue initialReports={reports as never[]} /></div></main>;
}
