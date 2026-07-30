import type { CommunityPost, CommunityPublicProfileSummary } from "./domain";

export const COMMUNITY_SEARCH_TYPES = ["all", "posts", "users", "verses", "tags"] as const;
export type CommunitySearchType = (typeof COMMUNITY_SEARCH_TYPES)[number];

export type CommunityVerseSearchResult = {
  postCount: number;
  reference: string;
  verseKey: string;
};

export type CommunityTagSearchResult = {
  postCount: number;
  tag: string;
};

export type CommunitySearchResults = {
  nextCursor: string | null;
  posts: CommunityPost[];
  profiles: CommunityPublicProfileSummary[];
  query: string;
  tags: CommunityTagSearchResult[];
  type: CommunitySearchType;
  verses: CommunityVerseSearchResult[];
};
