import type { CommunityPublicProfileSummary } from "./domain";

export const COMMUNITY_NOTIFICATION_TYPES = [
  "follow",
  "comment",
  "reply",
  "mention",
  "like_post",
  "like_comment",
  "repost",
  "quote",
  "moderation",
] as const;
export type CommunityNotificationType = (typeof COMMUNITY_NOTIFICATION_TYPES)[number];

export const COMMUNITY_NOTIFICATION_FILTERS = [
  "all",
  "follows",
  "replies",
  "mentions",
  "quotes",
  "reposts",
  "likes",
] as const;
export type CommunityNotificationFilter = (typeof COMMUNITY_NOTIFICATION_FILTERS)[number];

export const COMMUNITY_NOTIFICATION_FILTER_TYPES: Record<Exclude<CommunityNotificationFilter, "all">, CommunityNotificationType[]> = {
  follows: ["follow"],
  likes: ["like_post", "like_comment"],
  mentions: ["mention"],
  quotes: ["quote"],
  replies: ["comment", "reply"],
  reposts: ["repost"],
};

export function normalizeCommunityNotificationFilter(value: unknown): CommunityNotificationFilter {
  return typeof value === "string" && COMMUNITY_NOTIFICATION_FILTERS.includes(value as CommunityNotificationFilter)
    ? value as CommunityNotificationFilter
    : "all";
}

export type CommunityNotification = {
  actor: CommunityPublicProfileSummary | null;
  actorCount: number;
  commentId: string | null;
  createdAt: string;
  data: Record<string, unknown>;
  eventType: CommunityNotificationType;
  id: string;
  postId: string | null;
  readAt: string | null;
};

export type CommunityNotificationPage = {
  items: CommunityNotification[];
  nextCursor: string | null;
  unreadCount: number;
};
