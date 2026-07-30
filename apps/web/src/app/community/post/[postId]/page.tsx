import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityComments } from "@/components/community-social/community-comments";
import { CommunityPostCard } from "@/components/community-social/community-post-card";
import { getCommunityComments, getCommunityPost, getCommunityV2Auth } from "@/lib/community-v2-server";

type CommunityPostPageProps = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: CommunityPostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const auth = await getCommunityV2Auth();
  const post = await getCommunityPost(auth.service, postId, null).catch(() => null);
  if (!post) return { title: "QT 나눔을 찾을 수 없음", robots: { index: false } };
  const description = post.body.slice(0, 150);
  return {
    alternates: { canonical: `/community/post/${post.id}` },
    description,
    openGraph: { description, images: post.media ? [{ alt: post.media.altText, url: post.media.url }] : undefined, title: post.title ?? `${post.author?.displayName ?? "QT"}의 묵상`, type: "article", url: `/community/post/${post.id}` },
    title: post.title ?? `${post.author?.displayName ?? "QT"}의 묵상`,
  };
}

export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const { postId } = await params;
  const auth = await getCommunityV2Auth();
  const post = await getCommunityPost(auth.service, postId, auth.user?.id ?? null).catch(() => null);
  if (!post) notFound();
  const comments = await getCommunityComments(auth.service, post.id, auth.user?.id ?? null, null, 50);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: post.author ? { "@type": "Person", name: post.author.displayName, url: `/community/u/${post.author.handle}` } : undefined,
    dateModified: post.editedAt ?? post.publishedAt,
    datePublished: post.publishedAt,
    headline: post.title ?? post.verses[0]?.reference ?? "QT 나눔",
    text: post.body,
  };
  return (
    <main className="community-page-grid">
      <div className="community-main-column">
        <CommunityPostCard post={post} signedIn={Boolean(auth.user)} />
        <CommunityComments initialComments={comments.items} postId={post.id} signedIn={Boolean(auth.user)} />
      </div>
      <aside className="community-sidebar">
        <section className="community-card"><h2>연결된 말씀</h2>{post.verses.map((verse) => <p key={verse.verseKey}><Link href={`/community/verse/${verse.verseKey}`}>{verse.reference}</Link></p>)}</section>
        <section className="community-card"><Link href="/community">← QT 피드로 돌아가기</Link></section>
      </aside>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </main>
  );
}
