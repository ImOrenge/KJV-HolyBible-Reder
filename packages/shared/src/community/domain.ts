export const COMMUNITY_POST_BODY_MAX = 4_000;
export const COMMUNITY_POST_BODY_MIN = 10;
export const COMMUNITY_POST_TITLE_MAX = 120;
export const COMMUNITY_COMMENT_BODY_MAX = 3_000;
export const COMMUNITY_BIO_MAX = 160;
export const COMMUNITY_HANDLE_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
export const COMMUNITY_MAX_HASHTAGS = 5;
export const COMMUNITY_MAX_VERSES = 10;

export type CommunityPublicProfileSummary = {
  avatarUrl: string | null;
  bio?: string;
  displayName: string;
  followerCount?: number;
  followingCount?: number;
  handle: string;
  honorific: string | null;
  isCurrentUser?: boolean;
  postCount?: number;
  userId: string;
  viewerBlocked?: boolean;
  viewerFollowing?: boolean;
  viewerMuted?: boolean;
};

export type CommunityVerseLink = {
  isPrimary: boolean;
  kjvText: string;
  koText: string | null;
  position: number;
  reference: string;
  verseKey: string;
};

export type CommunityMedia = {
  altText: string;
  height: number;
  id: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  url: string;
  width: number;
};

export type CommunityPostCounts = {
  comments: number;
  likes: number;
  quotes: number;
  reposts: number;
};

export type CommunityPostViewerState = {
  liked: boolean;
  reposted: boolean;
};

export type CommunityQuotedPost = {
  author: CommunityPublicProfileSummary | null;
  body: string | null;
  deleted: boolean;
  id: string;
  primaryVerseKey: string | null;
  title: string | null;
};

export type CommunityPost = {
  author: CommunityPublicProfileSummary | null;
  body: string;
  commentPolicy: "everyone" | "none";
  counts: CommunityPostCounts;
  editedAt: string | null;
  hashtags: string[];
  id: string;
  media: CommunityMedia | null;
  postKind: "original" | "quote";
  publishedAt: string;
  quotedPost: CommunityQuotedPost | null;
  title: string | null;
  verses: CommunityVerseLink[];
  viewer: CommunityPostViewerState | null;
};

export type CommunityCommentV2 = {
  author: CommunityPublicProfileSummary | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  id: string;
  likeCount: number;
  parentCommentId: string | null;
  postId: string;
  viewerLiked: boolean;
};

export type CommunityCursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type CreateCommunityPostV2Input = {
  body: string;
  commentPolicy?: "everyone" | "none";
  hashtags?: string[];
  quotedPostId?: string;
  title?: string;
  verseKeys: string[];
};

export type UpdateCommunityPostV2Input = {
  body?: string;
  commentPolicy?: "everyone" | "none";
  hashtags?: string[];
  title?: string | null;
  verseKeys?: string[];
};

export type CommunityMediaUpload = {
  altText?: string;
  file: Blob;
  fileName?: string;
};

export function normalizeCommunityHandle(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCommunityHashtag(value: string) {
  return value.trim().replace(/^#+/, "").normalize("NFKC").toLowerCase();
}

export function parseCommunityHashtags(body: string) {
  const matches = body.match(/(^|\s)#([\p{L}\p{N}_]{1,40})/gu) ?? [];
  return [...new Set(matches.map((match) => normalizeCommunityHashtag(match.trim().slice(1))))]
    .filter(Boolean)
    .slice(0, COMMUNITY_MAX_HASHTAGS);
}
