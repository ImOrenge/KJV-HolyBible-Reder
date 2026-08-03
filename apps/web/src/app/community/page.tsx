import { CommunityFeedView } from "@/components/community-social/community-feed-view";
import { CoupangPartnersAd } from "@/components/coupang-partners-ad";
import { getCommunityFeedPage, getCommunityV2Auth, getOwnCommunityProfile } from "@/lib/community-v2-server";

type CommunityPageProps = {
  searchParams?: Promise<{ compose?: string; quote?: string }>;
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams;
  const auth = await getCommunityV2Auth();
  const [feed, profile] = await Promise.all([
    getCommunityFeedPage(auth.service, "for_you", auth.user?.id ?? null),
    auth.user ? getOwnCommunityProfile(auth.service, auth.user).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <main className="community-page-grid community-page-with-ad">
      <CommunityFeedView initialComposerOpen={params?.compose === "1"} initialFeed={feed} initialQuotedPostId={params?.quote ?? null} profile={profile} signedIn={Boolean(auth.user)} />
      <aside className="community-ad-rail" aria-label="추천 상품">
        <CoupangPartnersAd placement="community" />
      </aside>
    </main>
  );
}
