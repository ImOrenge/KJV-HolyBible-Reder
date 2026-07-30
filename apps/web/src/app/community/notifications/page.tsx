import { normalizeCommunityNotificationFilter } from "@kjv/shared/community";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommunityActivityFilter } from "@/components/community-social/community-activity-filter";
import { CommunityNotificationList } from "@/components/community-social/community-notification-list";
import { CommunityPageHeader } from "@/components/community-social/community-page-header";
import { getCommunityNotifications, getCommunityV2Auth } from "@/lib/community-v2-server";

export const metadata: Metadata = { robots: { follow: false, index: false }, title: "커뮤니티 활동" };

type CommunityNotificationsPageProps = { searchParams?: Promise<{ filter?: string }> };

export default async function CommunityNotificationsPage({ searchParams }: CommunityNotificationsPageProps) {
  const params = await searchParams;
  const filter = normalizeCommunityNotificationFilter(params?.filter);
  const auth = await getCommunityV2Auth(undefined, true).catch(() => null);
  if (!auth?.user) redirect("/auth/login?next=/community/notifications");
  const notifications = await getCommunityNotifications(auth.service, auth.user.id, filter);
  return (
    <main className="community-page-grid community-page-single">
      <div className="community-main-column community-activity-column">
        <CommunityPageHeader actions={<CommunityActivityFilter filter={filter} />} subtitle={`읽지 않은 활동 ${notifications.unreadCount}개`} title="활동" />
        <CommunityNotificationList filter={filter} initialPage={notifications} />
      </div>
    </main>
  );
}
