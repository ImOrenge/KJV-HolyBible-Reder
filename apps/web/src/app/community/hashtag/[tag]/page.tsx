import type { Metadata } from "next";

import { CommunityPostCard } from "@/components/community-social/community-post-card";
import { getCommunityHashtagPosts, getCommunityV2Auth } from "@/lib/community-v2-server";

type HashtagPageProps = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: HashtagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return { alternates: { canonical: `/community/hashtag/${encodeURIComponent(tag)}` }, description: `#${tag} 주제의 공개 QT 나눔`, title: `#${tag} QT 나눔` };
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params;
  const auth = await getCommunityV2Auth();
  const result = await getCommunityHashtagPosts(auth.service, tag, auth.user?.id ?? null);
  return <main className="community-page-grid"><div className="community-main-column"><section className="community-card community-section"><h1>#{result.tag}</h1><p className="community-muted">공개 QT {result.total}개</p></section>{result.items.length ? result.items.map((post) => <CommunityPostCard key={post.id} post={post} signedIn={Boolean(auth.user)} />) : <div className="community-card community-empty">이 해시태그의 공개 QT가 없습니다.</div>}</div></main>;
}
