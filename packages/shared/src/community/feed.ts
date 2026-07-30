import type { CommunityPost, CommunityPublicProfileSummary } from "./domain";

export const COMMUNITY_FEED_MODES = ["for_you", "following", "latest"] as const;
export type CommunityFeedMode = (typeof COMMUNITY_FEED_MODES)[number];

export const COMMUNITY_FEED_REASONS = [
  "following_author",
  "related_verse",
  "related_hashtag",
  "popular_recent",
  "new_in_community",
] as const;
export type CommunityFeedReason = (typeof COMMUNITY_FEED_REASONS)[number];

export type CommunityFeedItem = {
  activity: "post" | "repost";
  actor: CommunityPublicProfileSummary;
  post: CommunityPost;
  reasonCode: CommunityFeedReason | null;
  repostedAt: string | null;
};

export type CommunityFeedPage = {
  algorithmVersion: "qt-feed-v1";
  items: CommunityFeedItem[];
  mode: CommunityFeedMode;
  nextCursor: string | null;
};

export const communityFeedReasonLabels: Record<CommunityFeedReason, string> = {
  following_author: "팔로우 중인 작성자",
  related_verse: "관심을 표현한 구절과 관련",
  related_hashtag: "관심을 표현한 주제와 관련",
  popular_recent: "최근 많이 나눈 QT",
  new_in_community: "새로운 QT 작성자",
};
