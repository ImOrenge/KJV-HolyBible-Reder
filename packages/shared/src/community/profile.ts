import type { CommunityPublicProfileSummary } from "./domain";

export type CommunityProfileDetailV2 = CommunityPublicProfileSummary & {
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  publicEnabled: boolean;
};

export type UpdateCommunityProfileV2Input = {
  bio?: string;
  handle?: string;
  publicEnabled?: boolean;
  showHonorific?: boolean;
};

export type CommunityActivitySummary = {
  publishedPosts: number;
  receivedLikes: number;
};
