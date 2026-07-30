import type { Metadata } from "next";
import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityAvatar } from "@/components/community-social/community-avatar";
import { CommunityComposer } from "@/components/community-social/community-composer";
import { CommunityPostCard } from "@/components/community-social/community-post-card";
import { CommunityProfileCompletion } from "@/components/community-social/community-profile-completion";
import { CommunityProfileHeader } from "@/components/community-social/community-profile-header";
import {
  getCommunityProfileByHandle,
  getCommunityProfileMediaPosts,
  getCommunityProfilePosts,
  getCommunityProfileReplies,
  getCommunityProfileReposts,
  getCommunityV2Auth,
} from "@/lib/community-v2-server";

type CommunityProfileTab = "media" | "replies" | "reposts" | "threads";
type CommunityProfilePageProps = {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

const profileTabs: Array<{ key: CommunityProfileTab; label: string }> = [
  { key: "threads", label: "QT 나눔" },
  { key: "replies", label: "답글" },
  { key: "media", label: "미디어" },
  { key: "reposts", label: "리포스트" },
];

function getProfileTab(value?: string): CommunityProfileTab {
  return profileTabs.some((tab) => tab.key === value) ? value as CommunityProfileTab : "threads";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function generateMetadata({ params }: CommunityProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const auth = await getCommunityV2Auth();
  const profile = await getCommunityProfileByHandle(auth.service, handle, null).catch(() => null);
  if (!profile) return { robots: { index: false }, title: "프로필을 찾을 수 없음" };
  return {
    alternates: { canonical: `/community/u/${profile.handle}` },
    description: profile.bio || `${profile.displayName}님의 공개 QT 나눔`,
    openGraph: { description: profile.bio || `${profile.displayName}님의 공개 QT 나눔`, title: `${profile.displayName} (@${profile.handle})`, type: "profile", url: `/community/u/${profile.handle}` },
    title: `${profile.displayName} (@${profile.handle})`,
  };
}

export default async function CommunityProfilePage({ params, searchParams }: CommunityProfilePageProps) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const tab = getProfileTab(query?.tab);
  const auth = await getCommunityV2Auth();
  const viewerId = auth.user?.id ?? null;
  const profile = await getCommunityProfileByHandle(auth.service, handle, viewerId).catch(() => null);
  if (!profile) notFound();

  const content = tab === "replies"
    ? await getCommunityProfileReplies(auth.service, profile.handle, viewerId)
    : tab === "media"
      ? await getCommunityProfileMediaPosts(auth.service, profile.handle, viewerId)
      : tab === "reposts"
        ? await getCommunityProfileReposts(auth.service, profile.handle, viewerId)
        : (await getCommunityProfilePosts(auth.service, profile.handle, viewerId)).items;

  const completionItems = profile.isCurrentUser ? [
    !profile.bio ? { href: "/community/settings", key: "bio" as const, label: "소개 추가", detail: "나를 설명하는 짧은 문장을 작성해 보세요." } : null,
    !profile.avatarUrl ? { href: "/onboarding?edit=1&next=%2Fcommunity%2Fsettings", key: "photo" as const, label: "프로필 사진 추가", detail: "온보딩 계정 프로필에 사진을 추가해 보세요." } : null,
    profile.postCount === 0 ? { href: "/community?compose=1", key: "post" as const, label: "첫 QT 나눔", detail: "말씀과 연결된 첫 묵상을 남겨 보세요." } : null,
    profile.followingCount < 10 ? { href: "/community/search", key: "follow" as const, label: "10명 팔로우", detail: "QT를 이어 보고 싶은 사람을 찾아보세요." } : null,
  ].filter((item): item is { detail: string; href: string; key: "bio" | "follow" | "photo" | "post"; label: string } => Boolean(item)) : [];

  const emptyMessage = {
    media: "이미지가 포함된 공개 QT가 없습니다.",
    replies: "공개된 답글이 없습니다.",
    reposts: "공개된 리포스트가 없습니다.",
    threads: "공개된 QT 나눔이 없습니다.",
  }[tab];

  return (
    <main className="community-page-grid community-page-single">
      <div className="community-main-column community-profile-column">
        <CommunityProfileHeader profile={profile} signedIn={Boolean(auth.user)} />

        <nav aria-label={`${profile.displayName} 프로필 콘텐츠`} className="community-profile-tabs">
          {profileTabs.map((item) => (
            <Link
              aria-current={tab === item.key ? "page" : undefined}
              className="community-profile-tab"
              href={item.key === "threads" ? `/community/u/${profile.handle}` : `/community/u/${profile.handle}?tab=${item.key}`}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {profile.isCurrentUser && tab === "threads" ? <CommunityComposer profile={profile} signedIn={Boolean(auth.user)} /> : null}

        {profile.isCurrentUser && tab === "threads" ? <CommunityProfileCompletion items={completionItems} /> : null}

        {tab === "replies" ? (content as Awaited<ReturnType<typeof getCommunityProfileReplies>>).map(({ comment, post }) => (
          <article className="community-profile-reply" key={comment.id}>
            <div className="community-profile-line">
              <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} />
              <div className="community-profile-copy">
                <strong>{profile.displayName}{profile.honorific ? ` ${profile.honorific}` : ""}</strong>
                <span className="community-meta">@{profile.handle} · <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>{comment.editedAt ? " · 수정됨" : ""}</span>
              </div>
            </div>
            <p className="community-post-body">{comment.body}</p>
            <Link className="community-reply-context" href={`/community/post/${post.id}`}>
              <MessageCircle aria-hidden="true" size={17} />
              <span><strong>{post.author?.displayName ?? "QT 작성자"}님의 QT</strong><br />{post.title ?? post.body.slice(0, 120)}</span>
            </Link>
            <span className="community-meta"><Heart aria-hidden="true" size={15} /> 좋아요 {comment.likeCount}</span>
          </article>
        )) : tab === "reposts" ? (content as Awaited<ReturnType<typeof getCommunityProfileReposts>>).map(({ post, repostedAt }) => (
          <CommunityPostCard activityActorName={profile.displayName} activityLabel={`리포스트했습니다 · ${formatDate(repostedAt)}`} key={`${post.id}-${repostedAt}`} post={post} signedIn={Boolean(auth.user)} />
        )) : (content as Awaited<ReturnType<typeof getCommunityProfileMediaPosts>>).map((post) => (
          <CommunityPostCard key={post.id} post={post} signedIn={Boolean(auth.user)} />
        ))}

        {content.length === 0 ? <div className="community-empty">{emptyMessage}</div> : null}
      </div>
    </main>
  );
}
