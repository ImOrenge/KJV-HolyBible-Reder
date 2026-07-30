import type { Metadata } from "next";

import { CommunityPostCard } from "@/components/community-social/community-post-card";
import { getCommunityV2Auth, getCommunityVersePosts } from "@/lib/community-v2-server";

type VerseCommunityPageProps = { params: Promise<{ verseKey: string }> };

export async function generateMetadata({ params }: VerseCommunityPageProps): Promise<Metadata> {
  const { verseKey } = await params;
  const auth = await getCommunityV2Auth();
  const result = await getCommunityVersePosts(auth.service, verseKey, null).catch(() => null);
  return result ? { alternates: { canonical: `/community/verse/${result.verseKey}` }, description: `${result.reference} 말씀과 연결된 공개 QT 나눔`, title: `${result.reference} QT 나눔` } : { robots: { index: false }, title: "성경 구절 QT" };
}

export default async function VerseCommunityPage({ params }: VerseCommunityPageProps) {
  const { verseKey } = await params;
  const auth = await getCommunityV2Auth();
  const result = await getCommunityVersePosts(auth.service, verseKey, auth.user?.id ?? null);
  return <main className="community-page-grid"><div className="community-main-column"><section className="community-card community-section"><h1>{result.reference}</h1><p className="community-muted">이 말씀과 연결된 공개 QT {result.total}개</p></section>{result.items.length ? result.items.map((post) => <CommunityPostCard key={post.id} post={post} signedIn={Boolean(auth.user)} />) : <div className="community-card community-empty">이 말씀과 연결된 공개 QT가 없습니다.</div>}</div></main>;
}
