"use client";

import type { CommunityFeedMode, CommunityFeedPage, CommunityPost, CommunityProfileDetailV2 } from "@kjv/shared/community";
import { useState, useTransition } from "react";

import { CommunityComposer } from "./community-composer";
import { CommunityPostCard } from "./community-post-card";

type CommunityFeedViewProps = {
  initialFeed: CommunityFeedPage;
  initialComposerOpen?: boolean;
  initialQuotedPostId?: string | null;
  profile: CommunityProfileDetailV2 | null;
  signedIn: boolean;
};

const tabs: Array<{ key: CommunityFeedMode; label: string }> = [
  { key: "for_you", label: "추천" },
  { key: "following", label: "팔로잉" },
  { key: "latest", label: "최신" },
];

async function fetchFeed(mode: CommunityFeedMode, cursor?: string | null) {
  const query = new URLSearchParams({ mode });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`/api/community/v2/feed?${query}`);
  const payload = await response.json().catch(() => null) as (CommunityFeedPage & { error?: string }) | null;
  if (!response.ok || !payload) throw new Error(payload?.error ?? "피드를 불러오지 못했습니다.");
  return payload;
}

export function CommunityFeedView({ initialComposerOpen, initialFeed, initialQuotedPostId, profile, signedIn }: CommunityFeedViewProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeMode(mode: CommunityFeedMode) {
    if (mode === feed.mode) return;
    if (mode === "following" && !signedIn) {
      window.location.assign("/auth/login?next=/community");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        setFeed(await fetchFeed(mode));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "피드를 불러오지 못했습니다.");
      }
    });
  }

  function loadMore() {
    if (!feed.nextCursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const next = await fetchFeed(feed.mode, feed.nextCursor);
        setFeed((current) => ({ ...next, items: [...current.items, ...next.items] }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "다음 피드를 불러오지 못했습니다.");
      }
    });
  }

  function prependPost(post: CommunityPost) {
    setFeed((current) => ({
      ...current,
      items: [{ activity: "post", actor: post.author!, post, reasonCode: null, repostedAt: null }, ...current.items],
    }));
  }

  return (
    <div className="community-main-column">
      <CommunityComposer initialOpen={initialComposerOpen} initialQuotedPostId={initialQuotedPostId} onCreated={prependPost} profile={profile} signedIn={signedIn} />
      <div aria-label="피드 선택" className="community-tabs" role="tablist">
        {tabs.map((tab) => <button aria-selected={feed.mode === tab.key} className="community-tab" disabled={isPending} key={tab.key} onClick={() => changeMode(tab.key)} role="tab" type="button">{tab.label}</button>)}
      </div>
      {error ? <p aria-live="polite" className="community-status error">{error}</p> : null}
      {feed.items.length ? feed.items.map((item) => (
        <CommunityPostCard
          activityActorName={item.activity === "repost" ? item.actor.displayName : undefined}
          activityLabel={item.activity === "repost" ? "리포스트했습니다" : undefined}
          key={`${item.activity}-${item.actor.userId}-${item.post.id}-${item.repostedAt ?? item.post.publishedAt}`}
          post={item.post}
          signedIn={signedIn}
        />
      )) : <div className="community-card community-empty">아직 표시할 QT 나눔이 없습니다.</div>}
      {feed.nextCursor ? <button className="community-button" disabled={isPending} onClick={loadMore} type="button">{isPending ? "불러오는 중…" : "더 보기"}</button> : null}
    </div>
  );
}
