import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  COMMUNITY_BIO_MAX,
  COMMUNITY_COMMENT_BODY_MAX,
  COMMUNITY_FEED_MODES,
  COMMUNITY_HANDLE_PATTERN,
  COMMUNITY_MAX_HASHTAGS,
  COMMUNITY_MAX_VERSES,
  COMMUNITY_NOTIFICATION_FILTER_TYPES,
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_POST_BODY_MIN,
  COMMUNITY_POST_TITLE_MAX,
  COMMUNITY_REPORT_REASONS,
  normalizeCommunityHandle,
  normalizeCommunityHashtag,
  parseCommunityHashtags,
  type CommunityCommentV2,
  type CommunityCursorPage,
  type CommunityFeedItem,
  type CommunityFeedMode,
  type CommunityFeedPage,
  type CommunityFeedReason,
  type CommunityMedia,
  type CommunityNotification,
  type CommunityNotificationFilter,
  type CommunityNotificationPage,
  type CommunityPost,
  type CommunityProfileDetailV2,
  type CommunityPublicProfileSummary,
  type CommunitySearchResults,
  type CommunitySearchType,
  type CreateCommunityPostV2Input,
  type SubmitCommunityReportV2Input,
  type UpdateCommunityPostV2Input,
  type UpdateCommunityProfileV2Input,
} from "@kjv/shared/community";
import { getBook } from "@kjv/shared";
import { NextResponse } from "next/server";

import { getAvatarPublicUrl } from "@/lib/onboarding-server";
import { createBearerClient, createClient, tryCreateServiceRoleClient } from "@/lib/supabase/server";

export const COMMUNITY_MEDIA_BUCKET = "community-post-media";
export const COMMUNITY_FEED_LIMIT = 20;
export const communityV2CorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  Vary: "Origin",
};

type CommunityDb = SupabaseClient;

type PublicProfileRow = {
  avatar_path: string | null;
  bio: string;
  created_at: string;
  display_name: string;
  follower_count: number;
  following_count: number;
  handle: string | null;
  honorific?: string | null;
  post_count: number;
  public_enabled: boolean;
  show_honorific?: boolean;
  status: string;
  updated_at: string;
  user_id: string;
};

const PUBLIC_PROFILE_SELECT = "user_id,handle,display_name,bio,avatar_path,public_enabled,follower_count,following_count,post_count,status,created_at,updated_at";

type PostRow = {
  author_id: string | null;
  body: string;
  comment_count: number;
  comment_policy: "everyone" | "none";
  created_at: string;
  edited_at: string | null;
  id: string;
  like_count: number;
  post_kind: "original" | "quote";
  primary_verse_key: string;
  published_at: string;
  quote_count: number;
  quoted_post_id: string | null;
  repost_count: number;
  status: string;
  title: string | null;
  visibility: string;
};

type VerseRow = {
  is_primary: boolean;
  kjv_text_snapshot: string;
  ko_text_snapshot: string | null;
  position: number;
  post_id: string;
  verse_key: string;
};

type MediaRow = {
  alt_text: string;
  height: number;
  id: string;
  mime_type: CommunityMedia["mimeType"];
  post_id: string;
  status: string;
  storage_path: string;
  width: number;
};

type CommentRowV2 = {
  author_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  id: string;
  like_count: number;
  parent_comment_id: string | null;
  post_id: string;
  status: string;
};

type CommunityAuth = {
  authClient: CommunityDb | null;
  roles: string[];
  service: CommunityDb;
  user: User | null;
};

type FeedCursor = { at: string; id: string };

export class CommunityV2Error extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "CommunityV2Error";
  }
}

export function communityV2Json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...communityV2CorsHeaders, ...init?.headers },
  });
}

export function communityV2Options() {
  return new Response(null, { headers: communityV2CorsHeaders, status: 204 });
}

export function communityV2ErrorResponse(error: unknown) {
  if (error instanceof CommunityV2Error) {
    return communityV2Json({ error: error.message }, { status: error.status });
  }
  console.error("community-v2", error);
  return communityV2Json(
    { error: error instanceof Error ? error.message : "QT 커뮤니티 요청을 처리하지 못했습니다." },
    { status: 500 },
  );
}

function getBearerAccessToken(request: Request) {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function getCommunityV2Auth(request?: Request, required = false): Promise<CommunityAuth> {
  let authClient: CommunityDb | null = null;
  let user: User | null = null;
  let roles: string[] = [];
  const token = request ? getBearerAccessToken(request) : null;

  try {
    authClient = token ? createBearerClient(token) : await createClient();
    const result = token ? await authClient.auth.getUser(token) : await authClient.auth.getUser();
    if (!result.error && result.data.user) {
      user = result.data.user;
      const roleResult = await authClient.rpc("current_user_app_roles");
      if (!roleResult.error && Array.isArray(roleResult.data)) roles = roleResult.data.filter((value): value is string => typeof value === "string");
    }
  } catch {
    authClient = null;
  }

  if (required && !user) throw new CommunityV2Error("로그인이 필요합니다.", 401);
  const service = tryCreateServiceRoleClient() ?? authClient;
  if (!service) throw new CommunityV2Error("Supabase 연결 설정을 확인해 주세요.", 503);
  return { authClient, roles, service, user };
}

function encodeCursor(value: FeedCursor) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<FeedCursor>;
    if (typeof parsed.at !== "string" || Number.isNaN(Date.parse(parsed.at)) || typeof parsed.id !== "string" || parsed.id.length > 80) {
      throw new Error("invalid cursor");
    }
    return { at: parsed.at, id: parsed.id };
  } catch {
    throw new CommunityV2Error("피드 커서를 확인하세요.", 400);
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableText(value: unknown) {
  if (value === null) return null;
  const text = cleanText(value);
  return text || null;
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, " ");
}

function formatVerseReference(verseKey: string) {
  const [bookCode = "", chapter = "", verse = ""] = verseKey.split(".");
  return `${getBook(bookCode.toLowerCase())?.nameKo ?? bookCode} ${chapter}:${verse}`;
}

async function ensureProfile(service: CommunityDb, user: User) {
  const [{ data: existing, error }, { data: onboarding, error: onboardingError }] = await Promise.all([
    service
      .from("user_public_profiles")
      .select("user_id,handle,display_name,bio,avatar_path,honorific,show_honorific,public_enabled,follower_count,following_count,post_count,status,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle<PublicProfileRow>(),
    service
      .from("user_profiles")
      .select("nickname,honorific,avatar_path,onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle<{ avatar_path: string | null; honorific: string; nickname: string; onboarding_completed_at: string }>(),
  ]);
  if (error) throw new CommunityV2Error(error.message, 500);
  if (onboardingError) throw new CommunityV2Error(onboardingError.message, 500);
  if (!onboarding?.onboarding_completed_at) {
    throw new CommunityV2Error("커뮤니티를 사용하려면 온보딩 프로필을 먼저 완료해 주세요.", 409);
  }
  if (existing) {
    if (
      existing.display_name !== onboarding.nickname
      || existing.honorific !== onboarding.honorific
      || existing.avatar_path !== onboarding.avatar_path
    ) {
      const { data: synced, error: syncError } = await service
        .from("user_public_profiles")
        .update({
          avatar_path: onboarding.avatar_path,
          display_name: onboarding.nickname,
          honorific: onboarding.honorific,
        })
        .eq("user_id", user.id)
        .select("user_id,handle,display_name,bio,avatar_path,honorific,show_honorific,public_enabled,follower_count,following_count,post_count,status,created_at,updated_at")
        .single<PublicProfileRow>();
      if (syncError || !synced) throw new CommunityV2Error(syncError?.message ?? "온보딩 프로필을 동기화하지 못했습니다.", 500);
      return synced;
    }
    return existing;
  }

  const { data, error: insertError } = await service
    .from("user_public_profiles")
    .insert({
      avatar_path: onboarding.avatar_path,
      display_name: onboarding.nickname,
      honorific: onboarding.honorific,
      public_enabled: false,
      ranking_opt_in: false,
      show_level: false,
      user_id: user.id,
    })
    .select("user_id,handle,display_name,bio,avatar_path,honorific,show_honorific,public_enabled,follower_count,following_count,post_count,status,created_at,updated_at")
    .single<PublicProfileRow>();
  if (insertError || !data) throw new CommunityV2Error(insertError?.message ?? "커뮤니티 프로필을 만들지 못했습니다.", 500);
  return data;
}

async function requireActiveProfile(service: CommunityDb, user: User) {
  const profile = await ensureProfile(service, user);
  if (profile.status !== "active") throw new CommunityV2Error("현재 커뮤니티 활동이 제한되어 있습니다.", 403);
  if (!profile.public_enabled || !profile.handle) {
    throw new CommunityV2Error("공개 프로필의 핸들을 먼저 설정해 주세요.", 409);
  }
  const { count, error } = await service
    .from("community_user_restrictions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true)
    .in("restriction_type", ["restricted", "suspended"])
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
  if (error) throw new CommunityV2Error(error.message, 500);
  if ((count ?? 0) > 0) throw new CommunityV2Error("현재 커뮤니티 활동이 일시 제한되어 있습니다.", 403);
  return profile;
}

async function enforceRateLimit(
  service: CommunityDb,
  table: string,
  userColumn: string,
  userId: string,
  createdAfter: string,
  maximum: number,
  message: string,
) {
  const { count, error } = await service
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(userColumn, userId)
    .gte("created_at", createdAfter);
  if (error) throw new CommunityV2Error(error.message, 500);
  if ((count ?? 0) >= maximum) throw new CommunityV2Error(message, 429);
}

async function getBlockedUserIds(service: CommunityDb, viewerId: string | null) {
  if (!viewerId) return new Set<string>();
  const { data, error } = await service
    .from("community_blocks")
    .select("blocker_id,blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);
  if (error) throw new CommunityV2Error(error.message, 500);
  const result = new Set<string>();
  for (const row of data ?? []) result.add(row.blocker_id === viewerId ? row.blocked_id : row.blocker_id);
  return result;
}

async function getMutedUserIds(service: CommunityDb, viewerId: string | null) {
  if (!viewerId) return new Set<string>();
  const { data, error } = await service.from("community_mutes").select("muted_user_id").eq("user_id", viewerId);
  if (error) throw new CommunityV2Error(error.message, 500);
  return new Set((data ?? []).map((row) => row.muted_user_id));
}

async function getProfileRows(service: CommunityDb, userIds: string[], includeViewerId?: string | null) {
  if (!userIds.length) return new Map<string, PublicProfileRow>();
  const { data, error } = await service
    .from("user_public_profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .in("user_id", [...new Set(userIds)]);
  if (error) throw new CommunityV2Error(error.message, 500);
  return new Map(
    ((data ?? []) as PublicProfileRow[])
      .filter((row) => (row.public_enabled && row.status === "active" && row.handle) || row.user_id === includeViewerId)
      .map((row) => [row.user_id, row]),
  );
}

function mapProfileRow(service: CommunityDb, row: PublicProfileRow, viewerId?: string | null): CommunityPublicProfileSummary {
  return {
    avatarUrl: getAvatarPublicUrl(service, row.avatar_path, row.updated_at),
    bio: row.bio,
    displayName: row.display_name,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    handle: row.handle ?? "",
    honorific: row.show_honorific ? row.honorific ?? null : null,
    isCurrentUser: row.user_id === viewerId,
    postCount: row.post_count,
    userId: row.user_id,
  };
}

async function addViewerProfileState(
  service: CommunityDb,
  profiles: Map<string, CommunityPublicProfileSummary>,
  viewerId: string | null,
) {
  if (!viewerId || !profiles.size) return;
  const userIds = [...profiles.keys()].filter((id) => id !== viewerId);
  if (!userIds.length) return;
  const [{ data: follows }, { data: mutes }, { data: blocks }] = await Promise.all([
    service.from("community_follows").select("followed_id").eq("follower_id", viewerId).in("followed_id", userIds),
    service.from("community_mutes").select("muted_user_id").eq("user_id", viewerId).in("muted_user_id", userIds),
    service.from("community_blocks").select("blocked_id").eq("blocker_id", viewerId).in("blocked_id", userIds),
  ]);
  const followed = new Set((follows ?? []).map((row) => row.followed_id));
  const muted = new Set((mutes ?? []).map((row) => row.muted_user_id));
  const blocked = new Set((blocks ?? []).map((row) => row.blocked_id));
  for (const [id, profile] of profiles) {
    profile.viewerFollowing = followed.has(id);
    profile.viewerMuted = muted.has(id);
    profile.viewerBlocked = blocked.has(id);
  }
}

export async function hydrateCommunityPosts(
  service: CommunityDb,
  rawRows: PostRow[],
  viewerId: string | null,
  options?: { includeOwnUnpublished?: boolean },
): Promise<CommunityPost[]> {
  if (!rawRows.length) return [];
  const blockedIds = await getBlockedUserIds(service, viewerId);
  const rows = rawRows.filter((row) => {
    if (!row.author_id || blockedIds.has(row.author_id)) return false;
    if (row.status === "published" && row.visibility === "public") return true;
    return Boolean(options?.includeOwnUnpublished && row.author_id === viewerId);
  });
  if (!rows.length) return [];

  const postIds = rows.map((row) => row.id);
  const quotedIds = [...new Set(rows.flatMap((row) => row.quoted_post_id ? [row.quoted_post_id] : []))];
  const [{ data: verses, error: verseError }, { data: mediaRows, error: mediaError }, { data: tagLinks, error: tagLinkError }, quotedResult] = await Promise.all([
    service.from("community_post_verses").select("post_id,verse_key,position,is_primary,kjv_text_snapshot,ko_text_snapshot").in("post_id", postIds).order("position"),
    service.from("community_post_media").select("id,post_id,storage_path,mime_type,width,height,alt_text,status").in("post_id", postIds).eq("status", "ready"),
    service.from("community_post_hashtags").select("post_id,hashtag_id,position").in("post_id", postIds).order("position"),
    quotedIds.length
      ? service.from("community_posts").select("id,author_id,title,body,post_kind,quoted_post_id,primary_verse_key,visibility,status,comment_policy,like_count,comment_count,repost_count,quote_count,published_at,edited_at,created_at").in("id", quotedIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const firstError = verseError ?? mediaError ?? tagLinkError ?? quotedResult.error;
  if (firstError) throw new CommunityV2Error(firstError.message, 500);

  const quotedRows = (quotedResult.data ?? []) as PostRow[];
  const authorIds = [...new Set([...rows, ...quotedRows].flatMap((row) => row.author_id ? [row.author_id] : []))];
  const profileRows = await getProfileRows(service, authorIds, options?.includeOwnUnpublished ? viewerId : null);
  const publicRows = rows.filter((row) => row.author_id && profileRows.has(row.author_id));
  if (!publicRows.length) return [];
  const publicPostIds = new Set(publicRows.map((row) => row.id));

  const profileMap = new Map<string, CommunityPublicProfileSummary>();
  for (const [id, row] of profileRows) profileMap.set(id, mapProfileRow(service, row, viewerId));
  await addViewerProfileState(service, profileMap, viewerId);

  const hashtagIds = [...new Set((tagLinks ?? []).map((row) => row.hashtag_id))];
  const { data: hashtagRows, error: hashtagError } = hashtagIds.length
    ? await service.from("community_hashtags").select("id,tag").in("id", hashtagIds)
    : { data: [], error: null };
  if (hashtagError) throw new CommunityV2Error(hashtagError.message, 500);
  const hashtagMap = new Map((hashtagRows ?? []).map((row) => [row.id, row.tag]));

  const verseMap = new Map<string, VerseRow[]>();
  for (const row of (verses ?? []) as VerseRow[]) {
    if (!publicPostIds.has(row.post_id)) continue;
    verseMap.set(row.post_id, [...(verseMap.get(row.post_id) ?? []), row]);
  }
  const tagMap = new Map<string, string[]>();
  for (const row of tagLinks ?? []) {
    const tag = hashtagMap.get(row.hashtag_id);
    if (tag && publicPostIds.has(row.post_id)) tagMap.set(row.post_id, [...(tagMap.get(row.post_id) ?? []), tag]);
  }

  const mediaMap = new Map<string, CommunityMedia>();
  const usableMedia = ((mediaRows ?? []) as MediaRow[]).filter((row) => publicPostIds.has(row.post_id));
  if (usableMedia.length) {
    const { data: signed, error: signedError } = await service.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .createSignedUrls(usableMedia.map((row) => row.storage_path), 60 * 60);
    if (signedError) throw new CommunityV2Error("커뮤니티 이미지를 불러오지 못했습니다.", 500);
    usableMedia.forEach((row, index) => {
      const url = signed?.[index]?.signedUrl;
      if (url) mediaMap.set(row.post_id, {
        altText: row.alt_text,
        height: row.height,
        id: row.id,
        mimeType: row.mime_type,
        url,
        width: row.width,
      });
    });
  }

  const liked = new Set<string>();
  const reposted = new Set<string>();
  if (viewerId) {
    const [{ data: likeRows }, { data: repostRows }] = await Promise.all([
      service.from("community_likes").select("post_id").eq("user_id", viewerId).eq("target_type", "post").in("post_id", [...publicPostIds]),
      service.from("community_reposts").select("post_id").eq("user_id", viewerId).in("post_id", [...publicPostIds]),
    ]);
    for (const row of likeRows ?? []) if (row.post_id) liked.add(row.post_id);
    for (const row of repostRows ?? []) reposted.add(row.post_id);
  }

  const quotedMap = new Map(quotedRows.map((row) => [row.id, row]));
  return publicRows.map((row) => {
    const quoted = row.quoted_post_id ? quotedMap.get(row.quoted_post_id) : null;
    const quotedAuthor = quoted?.author_id ? profileMap.get(quoted.author_id) ?? null : null;
    return {
      author: row.author_id ? profileMap.get(row.author_id) ?? null : null,
      body: row.body,
      commentPolicy: row.comment_policy,
      counts: { comments: row.comment_count, likes: row.like_count, quotes: row.quote_count, reposts: row.repost_count },
      editedAt: row.edited_at,
      hashtags: tagMap.get(row.id) ?? [],
      id: row.id,
      media: mediaMap.get(row.id) ?? null,
      postKind: row.post_kind,
      publishedAt: row.published_at,
      quotedPost: row.quoted_post_id ? {
        author: quotedAuthor,
        body: quoted?.status === "published" && quotedAuthor ? quoted.body : null,
        deleted: !quoted || quoted.status !== "published" || !quotedAuthor,
        id: row.quoted_post_id,
        primaryVerseKey: quoted?.status === "published" ? quoted.primary_verse_key : null,
        title: quoted?.status === "published" ? quoted.title : null,
      } : null,
      title: row.title,
      verses: (verseMap.get(row.id) ?? []).map((verse) => ({
        isPrimary: verse.is_primary,
        kjvText: verse.kjv_text_snapshot,
        koText: verse.ko_text_snapshot,
        position: verse.position,
        reference: formatVerseReference(verse.verse_key),
        verseKey: verse.verse_key,
      })),
      viewer: viewerId ? { liked: liked.has(row.id), reposted: reposted.has(row.id) } : null,
    } satisfies CommunityPost;
  });
}

async function loadPostRows(
  service: CommunityDb,
  options: { authorIds?: string[]; cursor?: FeedCursor | null; limit?: number; postIds?: string[] },
) {
  let query = service
    .from("community_posts")
    .select("id,author_id,title,body,post_kind,quoted_post_id,primary_verse_key,visibility,status,comment_policy,like_count,comment_count,repost_count,quote_count,published_at,edited_at,created_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });
  if (options.authorIds) {
    if (!options.authorIds.length) return [] as PostRow[];
    query = query.in("author_id", options.authorIds);
  }
  if (options.postIds) {
    if (!options.postIds.length) return [] as PostRow[];
    query = query.in("id", options.postIds);
  }
  if (options.cursor) {
    query = query.or(`published_at.lt.${options.cursor.at},and(published_at.eq.${options.cursor.at},id.lt.${options.cursor.id})`);
  }
  const { data, error } = await query.limit(options.limit ?? 60);
  if (error) throw new CommunityV2Error(error.message, 500);
  return (data ?? []) as PostRow[];
}

async function getVisibleCommunityPostIds(service: CommunityDb, postIds: string[], viewerId: string | null) {
  const uniquePostIds = [...new Set(postIds)];
  if (!uniquePostIds.length) return new Set<string>();
  const rows = await loadPostRows(service, { postIds: uniquePostIds, limit: uniquePostIds.length });
  const [profiles, blocked] = await Promise.all([
    getProfileRows(service, rows.flatMap((row) => row.author_id ? [row.author_id] : [])),
    getBlockedUserIds(service, viewerId),
  ]);
  return new Set(
    rows
      .filter((row) => row.author_id && profiles.has(row.author_id) && !blocked.has(row.author_id))
      .map((row) => row.id),
  );
}

async function getFollowingIds(service: CommunityDb, viewerId: string | null) {
  if (!viewerId) return [] as string[];
  const { data, error } = await service.from("community_follows").select("followed_id").eq("follower_id", viewerId);
  if (error) throw new CommunityV2Error(error.message, 500);
  return (data ?? []).map((row) => row.followed_id);
}

async function getExplicitInterestSignals(service: CommunityDb, viewerId: string | null) {
  const verseKeys = new Set<string>();
  const hashtagIds = new Set<string>();
  if (!viewerId) return { hashtagIds, verseKeys };
  const { data: likeRows, error } = await service
    .from("community_likes")
    .select("post_id")
    .eq("user_id", viewerId)
    .eq("target_type", "post")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new CommunityV2Error(error.message, 500);
  const postIds = (likeRows ?? []).flatMap((row) => row.post_id ? [row.post_id] : []);
  if (!postIds.length) return { hashtagIds, verseKeys };
  const [{ data: verseRows }, { data: tagRows }] = await Promise.all([
    service.from("community_post_verses").select("verse_key").in("post_id", postIds),
    service.from("community_post_hashtags").select("hashtag_id").in("post_id", postIds),
  ]);
  for (const row of verseRows ?? []) verseKeys.add(row.verse_key);
  for (const row of tagRows ?? []) hashtagIds.add(row.hashtag_id);
  return { hashtagIds, verseKeys };
}

async function scoreRecommendedPosts(service: CommunityDb, rows: PostRow[], viewerId: string | null, followingIds: string[]) {
  const following = new Set(followingIds);
  const { hashtagIds, verseKeys } = await getExplicitInterestSignals(service, viewerId);
  const postIds = rows.map((row) => row.id);
  const [{ data: verseRows }, { data: tagRows }] = postIds.length
    ? await Promise.all([
        service.from("community_post_verses").select("post_id,verse_key").in("post_id", postIds),
        service.from("community_post_hashtags").select("post_id,hashtag_id").in("post_id", postIds),
      ])
    : [{ data: [] }, { data: [] }];
  const relatedVersePosts = new Set((verseRows ?? []).filter((row) => verseKeys.has(row.verse_key)).map((row) => row.post_id));
  const relatedTagPosts = new Set((tagRows ?? []).filter((row) => hashtagIds.has(row.hashtag_id)).map((row) => row.post_id));
  const now = Date.now();

  return rows.map((row) => {
    const ageHours = Math.max(0, (now - Date.parse(row.published_at)) / 3_600_000);
    const freshness = Math.max(0, 8 - ageHours / 12);
    const popularity = Math.log1p(row.like_count * 2 + row.comment_count * 3 + row.repost_count * 4 + row.quote_count * 4);
    let reason: CommunityFeedReason = "popular_recent";
    let score = freshness + popularity;
    if (row.author_id && following.has(row.author_id)) {
      score += 8;
      reason = "following_author";
    } else if (relatedVersePosts.has(row.id)) {
      score += 5;
      reason = "related_verse";
    } else if (relatedTagPosts.has(row.id)) {
      score += 4;
      reason = "related_hashtag";
    } else if (row.like_count + row.comment_count + row.repost_count === 0) {
      score += 1.5;
      reason = "new_in_community";
    }
    return { reason, row, score };
  }).sort((a, b) => b.score - a.score || b.row.published_at.localeCompare(a.row.published_at));
}

async function loadRepostActivities(
  service: CommunityDb,
  actorIds: string[] | null,
  blockedIds: Set<string>,
  mutedIds: Set<string>,
) {
  let query = service.from("community_reposts").select("id,user_id,post_id,created_at").order("created_at", { ascending: false }).limit(30);
  if (actorIds) {
    if (!actorIds.length) return [] as Array<{ created_at: string; post_id: string; user_id: string }>;
    query = query.in("user_id", actorIds);
  }
  const { data, error } = await query;
  if (error) throw new CommunityV2Error(error.message, 500);
  return (data ?? []).filter((row) => !blockedIds.has(row.user_id) && !mutedIds.has(row.user_id));
}

export async function getCommunityFeedPage(
  service: CommunityDb,
  mode: CommunityFeedMode,
  viewerId: string | null,
  cursorValue?: string | null,
): Promise<CommunityFeedPage> {
  if (!COMMUNITY_FEED_MODES.includes(mode)) throw new CommunityV2Error("피드 유형을 확인하세요.", 400);
  if (mode === "following" && !viewerId) throw new CommunityV2Error("팔로잉 피드는 로그인이 필요합니다.", 401);
  const cursor = decodeCursor(cursorValue ?? null);
  const [blockedIds, mutedIds, followingIds] = await Promise.all([
    getBlockedUserIds(service, viewerId),
    getMutedUserIds(service, viewerId),
    getFollowingIds(service, viewerId),
  ]);
  const authorIds = mode === "following" ? followingIds : undefined;
  const rawRows = await loadPostRows(service, { authorIds, cursor, limit: COMMUNITY_FEED_LIMIT + 1 });
  const pageRows = rawRows.slice(0, COMMUNITY_FEED_LIMIT);
  const filteredRows = pageRows.filter((row) => row.author_id && !blockedIds.has(row.author_id) && !mutedIds.has(row.author_id));
  const scored = mode === "for_you"
    ? await scoreRecommendedPosts(service, filteredRows, viewerId, followingIds)
    : filteredRows.map((row) => ({ reason: mode === "following" ? "following_author" as const : null, row, score: 0 }));
  const selected = scored;
  const posts = await hydrateCommunityPosts(service, selected.map((item) => item.row), viewerId);
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const items: CommunityFeedItem[] = selected.flatMap((item) => {
    const post = postMap.get(item.row.id);
    if (!post?.author) return [];
    return [{ activity: "post", actor: post.author, post, reasonCode: item.reason, repostedAt: null }];
  });

  if (!cursor && mode === "following") {
    const repostRows = await loadRepostActivities(
      service,
      mode === "following" ? followingIds : null,
      blockedIds,
      mutedIds,
    );
    const repostPostRows = await loadPostRows(service, { postIds: [...new Set(repostRows.map((row) => row.post_id))], limit: 30 });
    const repostPosts = await hydrateCommunityPosts(service, repostPostRows, viewerId);
    const repostPostMap = new Map(repostPosts.map((post) => [post.id, post]));
    const actorRows = await getProfileRows(service, repostRows.map((row) => row.user_id));
    for (const row of repostRows.slice(0, 8)) {
      const post = repostPostMap.get(row.post_id);
      const actorRow = actorRows.get(row.user_id);
      if (!post || !actorRow) continue;
      items.push({
        activity: "repost",
        actor: mapProfileRow(service, actorRow, viewerId),
        post,
        reasonCode: "following_author",
        repostedAt: row.created_at,
      });
    }
    items.sort((a, b) => (b.repostedAt ?? b.post.publishedAt).localeCompare(a.repostedAt ?? a.post.publishedAt));
  }

  const scanTail = pageRows.at(-1);
  const seenPostIds = new Set<string>();
  const uniqueItems = items.filter((item) => {
    if (seenPostIds.has(item.post.id)) return false;
    seenPostIds.add(item.post.id);
    return true;
  });
  return {
    algorithmVersion: "qt-feed-v1",
    items: uniqueItems,
    mode,
    nextCursor: rawRows.length > COMMUNITY_FEED_LIMIT && scanTail
      ? encodeCursor({ at: scanTail.published_at, id: scanTail.id })
      : null,
  };
}

export async function getCommunityPost(service: CommunityDb, postId: string, viewerId: string | null) {
  const { data, error } = await service
    .from("community_posts")
    .select("id,author_id,title,body,post_kind,quoted_post_id,primary_verse_key,visibility,status,comment_policy,like_count,comment_count,repost_count,quote_count,published_at,edited_at,created_at")
    .eq("id", postId)
    .maybeSingle<PostRow>();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!data) throw new CommunityV2Error("QT 나눔을 찾을 수 없습니다.", 404);
  const [post] = await hydrateCommunityPosts(service, [data], viewerId, { includeOwnUnpublished: true });
  if (!post) throw new CommunityV2Error("QT 나눔을 찾을 수 없습니다.", 404);
  return post;
}

export async function getCommunityProfileByHandle(service: CommunityDb, handleValue: string, viewerId: string | null) {
  const handle = normalizeCommunityHandle(handleValue);
  const { data, error } = await service
    .from("user_public_profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .eq("handle_normalized", handle)
    .maybeSingle<PublicProfileRow>();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!data || ((!data.public_enabled || data.status !== "active") && data.user_id !== viewerId)) {
    throw new CommunityV2Error("프로필을 찾을 수 없습니다.", 404);
  }
  const blocked = await getBlockedUserIds(service, viewerId);
  if (blocked.has(data.user_id)) throw new CommunityV2Error("프로필을 찾을 수 없습니다.", 404);
  const profile = mapProfileRow(service, data, viewerId) as CommunityProfileDetailV2;
  profile.bio = data.bio;
  profile.followerCount = data.follower_count;
  profile.followingCount = data.following_count;
  profile.postCount = data.post_count;
  profile.publicEnabled = data.public_enabled;
  const map = new Map([[data.user_id, profile]]);
  await addViewerProfileState(service, map, viewerId);
  return profile;
}

export async function getOwnCommunityProfile(service: CommunityDb, user: User) {
  const row = await ensureProfile(service, user);
  const mapped = mapProfileRow(service, row, user.id) as CommunityProfileDetailV2;
  mapped.bio = row.bio;
  mapped.followerCount = row.follower_count;
  mapped.followingCount = row.following_count;
  mapped.postCount = row.post_count;
  mapped.publicEnabled = row.public_enabled;
  return mapped;
}

export async function updateOwnCommunityProfile(service: CommunityDb, user: User, input: UpdateCommunityProfileV2Input) {
  const existing = await ensureProfile(service, user);
  const patch: Record<string, unknown> = {};
  if (input.bio !== undefined) {
    const bio = cleanText(input.bio);
    if (bio.length > COMMUNITY_BIO_MAX) throw new CommunityV2Error(`소개는 ${COMMUNITY_BIO_MAX}자 이내로 작성하세요.`, 400);
    patch.bio = bio;
  }
  if (input.handle !== undefined) {
    const handle = normalizeCommunityHandle(input.handle);
    if (!COMMUNITY_HANDLE_PATTERN.test(input.handle.trim())) throw new CommunityV2Error("핸들은 영문, 숫자, 밑줄 3~24자로 작성하세요.", 400);
    patch.handle = handle;
  }
  if (input.showHonorific !== undefined) patch.show_honorific = Boolean(input.showHonorific);
  if (input.publicEnabled !== undefined) {
    const prospectiveHandle = typeof patch.handle === "string" ? patch.handle : existing.handle;
    if (input.publicEnabled && !prospectiveHandle) throw new CommunityV2Error("공개 프로필에는 핸들이 필요합니다.", 400);
    patch.public_enabled = Boolean(input.publicEnabled);
  }
  if (!Object.keys(patch).length) return getOwnCommunityProfile(service, user);
  const { error } = await service.from("user_public_profiles").update(patch).eq("user_id", user.id);
  if (error?.code === "23505") throw new CommunityV2Error("이미 사용 중인 핸들입니다.", 409);
  if (error) throw new CommunityV2Error(error.message, 400);
  return getOwnCommunityProfile(service, user);
}

function validatePostInput(input: CreateCommunityPostV2Input | UpdateCommunityPostV2Input, creating: boolean) {
  const body = input.body === undefined ? undefined : cleanText(input.body);
  if ((creating || body !== undefined) && (!body || body.length < COMMUNITY_POST_BODY_MIN || body.length > COMMUNITY_POST_BODY_MAX)) {
    throw new CommunityV2Error(`QT 나눔은 ${COMMUNITY_POST_BODY_MIN}~${COMMUNITY_POST_BODY_MAX}자로 작성하세요.`, 400);
  }
  const title = input.title === undefined ? undefined : cleanNullableText(input.title);
  if (title && title.length > COMMUNITY_POST_TITLE_MAX) throw new CommunityV2Error(`제목은 ${COMMUNITY_POST_TITLE_MAX}자 이내로 작성하세요.`, 400);
  const verseKeys = input.verseKeys?.map((value) => cleanText(value).toUpperCase()).filter(Boolean);
  if ((creating || verseKeys !== undefined) && (!verseKeys?.length || verseKeys.length > COMMUNITY_MAX_VERSES)) {
    throw new CommunityV2Error(`성경 구절을 1~${COMMUNITY_MAX_VERSES}개 선택하세요.`, 400);
  }
  if (verseKeys?.some((value) => !/^[A-Z0-9]+\.\d+\.\d+$/.test(value))) throw new CommunityV2Error("성경 구절 형식을 확인하세요.", 400);
  const hashtags = [...new Set((input.hashtags ?? (body ? parseCommunityHashtags(body) : [])).map(normalizeCommunityHashtag).filter(Boolean))];
  if (hashtags.length > COMMUNITY_MAX_HASHTAGS || hashtags.some((tag) => tag.length > 40 || !/^[\p{L}\p{N}_]+$/u.test(tag))) {
    throw new CommunityV2Error(`해시태그는 글자·숫자·밑줄로 ${COMMUNITY_MAX_HASHTAGS}개까지 작성하세요.`, 400);
  }
  return { body, hashtags, title, verseKeys };
}

async function loadVerseSnapshots(service: CommunityDb, verseKeys: string[]) {
  const [{ data: enRows, error: enError }, { data: koRows, error: koError }] = await Promise.all([
    service.from("bible_verses_en").select("verse_key,text_en").in("verse_key", verseKeys),
    service.from("bible_verses_ko").select("id,verse_key,text_ko,updated_at").in("verse_key", verseKeys).eq("translation_status", "approved").eq("is_public", true).order("updated_at", { ascending: false }),
  ]);
  if (enError || koError) throw new CommunityV2Error(enError?.message ?? koError?.message ?? "성경 구절을 불러오지 못했습니다.", 500);
  const enMap = new Map((enRows ?? []).map((row) => [row.verse_key, row.text_en]));
  const koMap = new Map<string, { text: string; translationSourceId: string | null }>();
  for (const row of koRows ?? []) {
    if (!koMap.has(row.verse_key)) koMap.set(row.verse_key, { text: row.text_ko, translationSourceId: row.id ?? null });
  }
  if (verseKeys.some((key) => !enMap.has(key))) throw new CommunityV2Error("선택한 성경 구절을 찾을 수 없습니다.", 404);
  return verseKeys.map((verseKey, position) => ({
    is_primary: position === 0,
    kjv_text_snapshot: enMap.get(verseKey),
    ko_text_snapshot: koMap.get(verseKey)?.text ?? null,
    position,
    translation_source_id: koMap.get(verseKey)?.translationSourceId ?? null,
    verse_key: verseKey,
  }));
}

async function syncPostHashtags(service: CommunityDb, postId: string, hashtags: string[]) {
  const { data: oldLinks } = await service.from("community_post_hashtags").select("hashtag_id").eq("post_id", postId);
  const oldIds = (oldLinks ?? []).map((row) => row.hashtag_id);
  const { error: deleteError } = await service.from("community_post_hashtags").delete().eq("post_id", postId);
  if (deleteError) throw new CommunityV2Error(deleteError.message, 500);
  let newIds: string[] = [];
  if (hashtags.length) {
    const { error: upsertError } = await service.from("community_hashtags").upsert(
      hashtags.map((tag) => ({ normalized_tag: tag, tag })),
      { ignoreDuplicates: true, onConflict: "normalized_tag" },
    );
    if (upsertError) throw new CommunityV2Error(upsertError.message, 500);
    const { data: tagRows, error: tagError } = await service.from("community_hashtags").select("id,normalized_tag").in("normalized_tag", hashtags);
    if (tagError) throw new CommunityV2Error(tagError.message, 500);
    const tagIdMap = new Map((tagRows ?? []).map((row) => [row.normalized_tag, row.id]));
    const links = hashtags.flatMap((tag, position) => tagIdMap.get(tag) ? [{ hashtag_id: tagIdMap.get(tag), position, post_id: postId }] : []);
    newIds = links.map((link) => link.hashtag_id as string);
    if (links.length) {
      const { error: linkError } = await service.from("community_post_hashtags").insert(links);
      if (linkError) throw new CommunityV2Error(linkError.message, 500);
    }
  }
  const affectedIds = [...new Set([...oldIds, ...newIds])];
  for (const hashtagId of affectedIds) {
    const { count } = await service.from("community_post_hashtags").select("post_id", { count: "exact", head: true }).eq("hashtag_id", hashtagId);
    await service.from("community_hashtags").update({ post_count: count ?? 0 }).eq("id", hashtagId);
  }
}

async function syncMentions(service: CommunityDb, sourceType: "post" | "comment", sourceId: string, body: string) {
  const handles = [...new Set([...body.matchAll(/(^|\s)@([A-Za-z0-9_]{3,24})/g)].map((match) => match[2].toLowerCase()))].slice(0, 20);
  const table = sourceType === "post" ? "community_post_mentions" : "community_comment_mentions";
  const sourceColumn = sourceType === "post" ? "post_id" : "comment_id";
  await service.from(table).delete().eq(sourceColumn, sourceId);
  if (!handles.length) return;
  const { data, error } = await service
    .from("user_public_profiles")
    .select("user_id")
    .in("handle_normalized", handles)
    .eq("public_enabled", true)
    .eq("status", "active");
  if (error) throw new CommunityV2Error(error.message, 500);
  if (data?.length) {
    const { error: insertError } = await service.from(table).insert(data.map((row) => ({ [sourceColumn]: sourceId, mentioned_user_id: row.user_id })));
    if (insertError) throw new CommunityV2Error(insertError.message, 500);
  }
}

export async function createCommunityPost(
  service: CommunityDb,
  user: User,
  input: CreateCommunityPostV2Input,
  idempotencyKey?: string | null,
) {
  await requireActiveProfile(service, user);
  await enforceRateLimit(service, "community_posts", "author_id", user.id, new Date(Date.now() - 60 * 60 * 1000).toISOString(), 5, "QT 나눔 작성이 잠시 제한되었습니다.");
  const normalized = validatePostInput(input, true);
  const snapshots = await loadVerseSnapshots(service, normalized.verseKeys ?? []);
  const quotedPostId = cleanNullableText(input.quotedPostId);
  if (quotedPostId) await getCommunityPost(service, quotedPostId, user.id);
  const normalizedIdempotency = cleanNullableText(idempotencyKey)?.slice(0, 120) ?? null;
  if (normalizedIdempotency) {
    const { data: existing } = await service.from("community_posts").select("id").eq("author_id", user.id).eq("idempotency_key", normalizedIdempotency).maybeSingle<{ id: string }>();
    if (existing) return getCommunityPost(service, existing.id, user.id);
  }
  const { data: row, error } = await service
    .from("community_posts")
    .insert({
      author_id: user.id,
      body: normalized.body,
      comment_policy: input.commentPolicy === "none" ? "none" : "everyone",
      idempotency_key: normalizedIdempotency,
      post_kind: quotedPostId ? "quote" : "original",
      primary_verse_key: snapshots[0].verse_key,
      quoted_post_id: quotedPostId,
      title: normalized.title,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !row) throw new CommunityV2Error(error?.message ?? "QT 나눔을 저장하지 못했습니다.", 500);
  try {
    const { error: verseError } = await service.from("community_post_verses").insert(snapshots.map((snapshot) => ({ ...snapshot, post_id: row.id })));
    if (verseError) throw verseError;
    await syncPostHashtags(service, row.id, normalized.hashtags);
    await syncMentions(service, "post", row.id, normalized.body ?? "");
  } catch (childError) {
    await service.from("community_posts").delete().eq("id", row.id);
    throw new CommunityV2Error(childError instanceof Error ? childError.message : "QT 나눔을 저장하지 못했습니다.", 500);
  }
  await processCommunityNotificationOutbox(service);
  return getCommunityPost(service, row.id, user.id);
}

async function requireOwnedPost(service: CommunityDb, postId: string, userId: string) {
  const { data, error } = await service.from("community_posts").select("id,author_id,status").eq("id", postId).maybeSingle();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!data) throw new CommunityV2Error("QT 나눔을 찾을 수 없습니다.", 404);
  if (data.author_id !== userId) throw new CommunityV2Error("이 QT 나눔을 수정할 권한이 없습니다.", 403);
  return data;
}

export async function updateCommunityPost(service: CommunityDb, user: User, postId: string, input: UpdateCommunityPostV2Input) {
  await requireActiveProfile(service, user);
  await requireOwnedPost(service, postId, user.id);
  const normalized = validatePostInput(input, false);
  const patch: Record<string, unknown> = {};
  if (normalized.body !== undefined) patch.body = normalized.body;
  if (normalized.title !== undefined) patch.title = normalized.title;
  if (input.commentPolicy !== undefined) patch.comment_policy = input.commentPolicy === "none" ? "none" : "everyone";
  if (normalized.verseKeys) {
    const snapshots = await loadVerseSnapshots(service, normalized.verseKeys);
    patch.primary_verse_key = snapshots[0].verse_key;
    const { error: deleteError } = await service.from("community_post_verses").delete().eq("post_id", postId);
    if (deleteError) throw new CommunityV2Error(deleteError.message, 500);
    const { error: verseError } = await service.from("community_post_verses").insert(snapshots.map((snapshot) => ({ ...snapshot, post_id: postId })));
    if (verseError) throw new CommunityV2Error(verseError.message, 500);
  }
  if (Object.keys(patch).length) {
    const { error } = await service.from("community_posts").update(patch).eq("id", postId).eq("author_id", user.id);
    if (error) throw new CommunityV2Error(error.message, 500);
  }
  if (input.hashtags !== undefined || normalized.body !== undefined) await syncPostHashtags(service, postId, normalized.hashtags);
  if (normalized.body !== undefined) await syncMentions(service, "post", postId, normalized.body);
  await processCommunityNotificationOutbox(service);
  return getCommunityPost(service, postId, user.id);
}

export async function deleteCommunityPost(service: CommunityDb, user: User, postId: string) {
  await requireOwnedPost(service, postId, user.id);
  const { data: media } = await service.from("community_post_media").select("storage_path").eq("post_id", postId).maybeSingle<{ storage_path: string }>();
  await syncPostHashtags(service, postId, []);
  const { error } = await service.from("community_posts").update({ author_id: null, body: "삭제된 QT 나눔입니다.", deleted_at: new Date().toISOString(), status: "deleted", title: null }).eq("id", postId).eq("author_id", user.id);
  if (error) throw new CommunityV2Error(error.message, 500);
  if (media?.storage_path) await service.storage.from(COMMUNITY_MEDIA_BUCKET).remove([media.storage_path]);
}

async function hydrateCommunityComments(service: CommunityDb, rows: CommentRowV2[], viewerId: string | null) {
  if (!rows.length) return [] as CommunityCommentV2[];
  const blocked = await getBlockedUserIds(service, viewerId);
  const visibleRows = rows.filter((row) => row.status === "visible" && row.author_id && !blocked.has(row.author_id));
  const profileRows = await getProfileRows(service, visibleRows.flatMap((row) => row.author_id ? [row.author_id] : []));
  const profileMap = new Map<string, CommunityPublicProfileSummary>();
  for (const [id, row] of profileRows) profileMap.set(id, mapProfileRow(service, row, viewerId));
  await addViewerProfileState(service, profileMap, viewerId);
  const liked = new Set<string>();
  if (viewerId && visibleRows.length) {
    const { data, error } = await service
      .from("community_likes")
      .select("comment_id")
      .eq("user_id", viewerId)
      .eq("target_type", "comment")
      .in("comment_id", visibleRows.map((row) => row.id));
    if (error) throw new CommunityV2Error(error.message, 500);
    for (const row of data ?? []) if (row.comment_id) liked.add(row.comment_id);
  }
  return visibleRows.flatMap((row) => {
    const author = row.author_id ? profileMap.get(row.author_id) ?? null : null;
    if (!author) return [];
    return [{
      author,
      body: row.body,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      id: row.id,
      likeCount: row.like_count,
      parentCommentId: row.parent_comment_id,
      postId: row.post_id,
      viewerLiked: liked.has(row.id),
    } satisfies CommunityCommentV2];
  });
}

export async function getCommunityComments(
  service: CommunityDb,
  postId: string,
  viewerId: string | null,
  cursorValue?: string | null,
  requestedLimit = 30,
): Promise<CommunityCursorPage<CommunityCommentV2>> {
  await getCommunityPost(service, postId, viewerId);
  const cursor = decodeCursor(cursorValue ?? null);
  const limit = Math.max(1, Math.min(requestedLimit, 50));
  let query = service
    .from("community_comments")
    .select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at")
    .eq("post_id", postId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (cursor) query = query.or(`created_at.gt.${cursor.at},and(created_at.eq.${cursor.at},id.gt.${cursor.id})`);
  const { data, error } = await query.limit(limit + 1);
  if (error) throw new CommunityV2Error(error.message, 500);
  const rows = (data ?? []) as CommentRowV2[];
  const visible = rows.slice(0, limit);
  const items = await hydrateCommunityComments(service, visible, viewerId);
  const tail = visible.at(-1);
  return { items, nextCursor: rows.length > limit && tail ? encodeCursor({ at: tail.created_at, id: tail.id }) : null };
}

export async function createCommunityComment(
  service: CommunityDb,
  user: User,
  postId: string,
  bodyValue: unknown,
  parentCommentIdValue?: unknown,
  idempotencyKey?: string | null,
) {
  await requireActiveProfile(service, user);
  await enforceRateLimit(service, "community_comments", "author_id", user.id, new Date(Date.now() - 60 * 60 * 1000).toISOString(), 40, "댓글 작성이 잠시 제한되었습니다.");
  const body = cleanText(bodyValue);
  if (!body || body.length > COMMUNITY_COMMENT_BODY_MAX) throw new CommunityV2Error(`댓글은 1~${COMMUNITY_COMMENT_BODY_MAX}자로 작성하세요.`, 400);
  const post = await getCommunityPost(service, postId, user.id);
  if (post.commentPolicy === "none") throw new CommunityV2Error("댓글이 닫힌 QT 나눔입니다.", 409);
  const parentCommentId = cleanNullableText(parentCommentIdValue);
  if (parentCommentId) {
    const { data: parent } = await service.from("community_comments").select("id,post_id,parent_comment_id,status").eq("id", parentCommentId).maybeSingle();
    if (!parent || parent.post_id !== postId || parent.parent_comment_id || parent.status !== "visible") {
      throw new CommunityV2Error("답글 대상 댓글을 확인하세요.", 400);
    }
  }
  const normalizedKey = cleanNullableText(idempotencyKey)?.slice(0, 120) ?? null;
  if (normalizedKey) {
    const { data: existing } = await service.from("community_comments").select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at").eq("author_id", user.id).eq("idempotency_key", normalizedKey).maybeSingle<CommentRowV2>();
    if (existing) return (await hydrateCommunityComments(service, [existing], user.id))[0];
  }
  const { data, error } = await service
    .from("community_comments")
    .insert({ author_id: user.id, body, idempotency_key: normalizedKey, parent_comment_id: parentCommentId, post_id: postId })
    .select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at")
    .single<CommentRowV2>();
  if (error || !data) throw new CommunityV2Error(error?.message ?? "댓글을 저장하지 못했습니다.", 500);
  await syncMentions(service, "comment", data.id, body);
  await processCommunityNotificationOutbox(service);
  return (await hydrateCommunityComments(service, [data], user.id))[0];
}

async function requireOwnedComment(service: CommunityDb, commentId: string, userId: string) {
  const { data, error } = await service.from("community_comments").select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at").eq("id", commentId).maybeSingle<CommentRowV2>();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!data) throw new CommunityV2Error("댓글을 찾을 수 없습니다.", 404);
  if (data.author_id !== userId) throw new CommunityV2Error("이 댓글을 수정할 권한이 없습니다.", 403);
  return data;
}

export async function updateCommunityComment(service: CommunityDb, user: User, commentId: string, bodyValue: unknown) {
  await requireActiveProfile(service, user);
  await requireOwnedComment(service, commentId, user.id);
  const body = cleanText(bodyValue);
  if (!body || body.length > COMMUNITY_COMMENT_BODY_MAX) throw new CommunityV2Error(`댓글은 1~${COMMUNITY_COMMENT_BODY_MAX}자로 작성하세요.`, 400);
  const { data, error } = await service.from("community_comments").update({ body }).eq("id", commentId).eq("author_id", user.id).select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at").single<CommentRowV2>();
  if (error || !data) throw new CommunityV2Error(error?.message ?? "댓글을 수정하지 못했습니다.", 500);
  await syncMentions(service, "comment", commentId, body);
  await processCommunityNotificationOutbox(service);
  return (await hydrateCommunityComments(service, [data], user.id))[0];
}

export async function deleteCommunityComment(service: CommunityDb, user: User, commentId: string) {
  await requireOwnedComment(service, commentId, user.id);
  const { error } = await service.from("community_comments").update({ author_id: null, body: "삭제된 댓글입니다.", deleted_at: new Date().toISOString(), status: "deleted" }).eq("id", commentId).eq("author_id", user.id);
  if (error) throw new CommunityV2Error(error.message, 500);
}

async function ensureUnblockedTarget(service: CommunityDb, viewerId: string, targetUserId: string | null) {
  if (!targetUserId) throw new CommunityV2Error("대상을 찾을 수 없습니다.", 404);
  const blocked = await getBlockedUserIds(service, viewerId);
  if (blocked.has(targetUserId)) throw new CommunityV2Error("차단 관계에서는 이 작업을 할 수 없습니다.", 403);
}

export async function setCommunityLike(
  service: CommunityDb,
  user: User,
  targetType: "post" | "comment",
  targetId: string,
  active: boolean,
) {
  await requireActiveProfile(service, user);
  await enforceRateLimit(service, "community_likes", "user_id", user.id, new Date(Date.now() - 60 * 1000).toISOString(), 120, "좋아요 요청이 잠시 제한되었습니다.");
  const table = targetType === "post" ? "community_posts" : "community_comments";
  const { data: target, error: targetError } = await service.from(table).select("id,author_id,status").eq("id", targetId).maybeSingle();
  if (targetError) throw new CommunityV2Error(targetError.message, 500);
  if (!target || !["published", "visible"].includes(target.status)) throw new CommunityV2Error("대상을 찾을 수 없습니다.", 404);
  await ensureUnblockedTarget(service, user.id, target.author_id);
  let error = null;
  if (active) {
    const result = await service.from("community_likes").insert({
      comment_id: targetType === "comment" ? targetId : null,
      post_id: targetType === "post" ? targetId : null,
      target_type: targetType,
      user_id: user.id,
    });
    error = result.error?.code === "23505" ? null : result.error;
  } else {
    let query = service.from("community_likes").delete().eq("user_id", user.id).eq("target_type", targetType);
    query = targetType === "post" ? query.eq("post_id", targetId) : query.eq("comment_id", targetId);
    error = (await query).error;
  }
  if (error) throw new CommunityV2Error(error.message, 500);
  const { data: updated } = await service.from(table).select(targetType === "post" ? "like_count" : "like_count").eq("id", targetId).single<{ like_count: number }>();
  await processCommunityNotificationOutbox(service);
  return { active, count: updated?.like_count ?? 0 };
}

export async function setCommunityRepost(service: CommunityDb, user: User, postId: string, active: boolean) {
  await requireActiveProfile(service, user);
  const post = await getCommunityPost(service, postId, user.id);
  await ensureUnblockedTarget(service, user.id, post.author?.userId ?? null);
  const result = active
    ? await service.from("community_reposts").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true, onConflict: "user_id,post_id" })
    : await service.from("community_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
  if (result.error) throw new CommunityV2Error(result.error.message, 500);
  const { data } = await service.from("community_posts").select("repost_count").eq("id", postId).single<{ repost_count: number }>();
  await processCommunityNotificationOutbox(service);
  return { active, count: data?.repost_count ?? 0 };
}

export async function setCommunityRelation(
  service: CommunityDb,
  user: User,
  handle: string,
  relation: "block" | "follow" | "mute",
  active: boolean,
) {
  await requireActiveProfile(service, user);
  const target = await getCommunityProfileByHandle(service, handle, null);
  if (target.userId === user.id) throw new CommunityV2Error("본인에게 적용할 수 없는 설정입니다.", 400);
  const config = {
    block: { table: "community_blocks", owner: "blocker_id", target: "blocked_id" },
    follow: { table: "community_follows", owner: "follower_id", target: "followed_id" },
    mute: { table: "community_mutes", owner: "user_id", target: "muted_user_id" },
  }[relation];
  if (relation === "follow" && active) {
    await ensureUnblockedTarget(service, user.id, target.userId);
    await enforceRateLimit(service, "community_follows", "follower_id", user.id, new Date(Date.now() - 60 * 60 * 1000).toISOString(), 80, "팔로우 요청이 잠시 제한되었습니다.");
  }
  const result = active
    ? await service.from(config.table).upsert(
        { [config.owner]: user.id, [config.target]: target.userId } as never,
        { ignoreDuplicates: true, onConflict: `${config.owner},${config.target}` },
      )
    : await service.from(config.table).delete().eq(config.owner, user.id).eq(config.target, target.userId);
  if (result.error) throw new CommunityV2Error(result.error.message, 500);
  await processCommunityNotificationOutbox(service);
  return { active };
}

export async function getCommunityProfilePosts(
  service: CommunityDb,
  handle: string,
  viewerId: string | null,
  cursorValue?: string | null,
) {
  const profile = await getCommunityProfileByHandle(service, handle, viewerId);
  const cursor = decodeCursor(cursorValue ?? null);
  const rows = await loadPostRows(service, { authorIds: [profile.userId], cursor, limit: COMMUNITY_FEED_LIMIT + 1 });
  const selected = rows.slice(0, COMMUNITY_FEED_LIMIT);
  const items = await hydrateCommunityPosts(service, selected, viewerId);
  const tail = selected.at(-1);
  return {
    items,
    nextCursor: rows.length > COMMUNITY_FEED_LIMIT && tail ? encodeCursor({ at: tail.published_at, id: tail.id }) : null,
  } satisfies CommunityCursorPage<CommunityPost>;
}

export type CommunityProfileReplyItem = {
  comment: CommunityCommentV2;
  post: CommunityPost;
};

export type CommunityProfileRepostItem = {
  post: CommunityPost;
  repostedAt: string;
};

export async function getCommunityProfileReplies(
  service: CommunityDb,
  handle: string,
  viewerId: string | null,
) {
  const profile = await getCommunityProfileByHandle(service, handle, viewerId);
  const { data, error } = await service
    .from("community_comments")
    .select("id,post_id,author_id,parent_comment_id,body,status,like_count,edited_at,created_at")
    .eq("author_id", profile.userId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(COMMUNITY_FEED_LIMIT);
  if (error) throw new CommunityV2Error(error.message, 500);
  const rows = (data ?? []) as CommentRowV2[];
  const [comments, postRows] = await Promise.all([
    hydrateCommunityComments(service, rows, viewerId),
    loadPostRows(service, { postIds: rows.map((row) => row.post_id), limit: rows.length }),
  ]);
  const posts = await hydrateCommunityPosts(service, postRows, viewerId);
  const postMap = new Map(posts.map((post) => [post.id, post]));
  return comments.flatMap((comment) => {
    const post = postMap.get(comment.postId);
    return post ? [{ comment, post }] : [];
  }) satisfies CommunityProfileReplyItem[];
}

export async function getCommunityProfileMediaPosts(
  service: CommunityDb,
  handle: string,
  viewerId: string | null,
) {
  const profile = await getCommunityProfileByHandle(service, handle, viewerId);
  const { data, error } = await service
    .from("community_post_media")
    .select("post_id")
    .eq("status", "ready")
    .limit(200);
  if (error) throw new CommunityV2Error(error.message, 500);
  const rows = await loadPostRows(service, {
    authorIds: [profile.userId],
    limit: COMMUNITY_FEED_LIMIT,
    postIds: (data ?? []).map((row) => row.post_id),
  });
  return hydrateCommunityPosts(service, rows, viewerId);
}

export async function getCommunityProfileReposts(
  service: CommunityDb,
  handle: string,
  viewerId: string | null,
) {
  const profile = await getCommunityProfileByHandle(service, handle, viewerId);
  const { data, error } = await service
    .from("community_reposts")
    .select("post_id,created_at")
    .eq("user_id", profile.userId)
    .order("created_at", { ascending: false })
    .limit(COMMUNITY_FEED_LIMIT);
  if (error) throw new CommunityV2Error(error.message, 500);
  const repostRows = (data ?? []) as Array<{ created_at: string; post_id: string }>;
  const postRows = await loadPostRows(service, { postIds: repostRows.map((row) => row.post_id), limit: repostRows.length });
  const posts = await hydrateCommunityPosts(service, postRows, viewerId);
  const postMap = new Map(posts.map((post) => [post.id, post]));
  return repostRows.flatMap((row) => {
    const post = postMap.get(row.post_id);
    return post ? [{ post, repostedAt: row.created_at }] : [];
  }) satisfies CommunityProfileRepostItem[];
}

export async function getCommunityHashtagPosts(service: CommunityDb, tagValue: string, viewerId: string | null) {
  const tag = normalizeCommunityHashtag(tagValue);
  if (!tag) throw new CommunityV2Error("해시태그를 확인하세요.", 400);
  const { data: hashtag, error } = await service.from("community_hashtags").select("id,tag,post_count").eq("normalized_tag", tag).maybeSingle();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!hashtag) return { items: [] as CommunityPost[], tag, total: 0 };
  const { data: links, error: linkError } = await service.from("community_post_hashtags").select("post_id").eq("hashtag_id", hashtag.id).limit(100);
  if (linkError) throw new CommunityV2Error(linkError.message, 500);
  const rows = await loadPostRows(service, { postIds: (links ?? []).map((row) => row.post_id), limit: 50 });
  const items = await hydrateCommunityPosts(service, rows, viewerId);
  return { items, tag: hashtag.tag, total: items.length };
}

export async function getCommunityVersePosts(service: CommunityDb, verseKeyValue: string, viewerId: string | null) {
  const verseKey = cleanText(verseKeyValue).toUpperCase();
  if (!/^[A-Z0-9]+\.\d+\.\d+$/.test(verseKey)) throw new CommunityV2Error("성경 구절을 확인하세요.", 400);
  const { data: links, error } = await service.from("community_post_verses").select("post_id").eq("verse_key", verseKey).limit(100);
  if (error) throw new CommunityV2Error(error.message, 500);
  const postIds = [...new Set((links ?? []).map((row) => row.post_id))];
  const rows = await loadPostRows(service, { postIds, limit: 50 });
  return { items: await hydrateCommunityPosts(service, rows, viewerId), reference: formatVerseReference(verseKey), total: postIds.length, verseKey };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function searchCommunity(
  service: CommunityDb,
  queryValue: string,
  type: CommunitySearchType,
  viewerId: string | null,
): Promise<CommunitySearchResults> {
  const query = normalizeSearchText(queryValue).slice(0, 100);
  if (query.length < 2) throw new CommunityV2Error("검색어를 2자 이상 입력하세요.", 400);
  const validTypes: CommunitySearchType[] = ["all", "posts", "users", "verses", "tags"];
  if (!validTypes.includes(type)) throw new CommunityV2Error("검색 유형을 확인하세요.", 400);
  const pattern = `%${escapeLike(query)}%`;
  const blocked = await getBlockedUserIds(service, viewerId);
  const result: CommunitySearchResults = { nextCursor: null, posts: [], profiles: [], query: queryValue.trim(), tags: [], type, verses: [] };

  if (type === "all" || type === "posts") {
    const { data, error } = await service
      .from("community_posts")
      .select("id,author_id,title,body,post_kind,quoted_post_id,primary_verse_key,visibility,status,comment_policy,like_count,comment_count,repost_count,quote_count,published_at,edited_at,created_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .ilike("search_text_normalized", pattern)
      .order("published_at", { ascending: false })
      .limit(type === "all" ? 12 : 30);
    if (error) throw new CommunityV2Error(error.message, 500);
    result.posts = await hydrateCommunityPosts(service, (data ?? []) as PostRow[], viewerId);
  }

  if (type === "all" || type === "users") {
    const { data, error } = await service
      .from("user_public_profiles")
      .select(PUBLIC_PROFILE_SELECT)
      .eq("public_enabled", true)
      .eq("status", "active")
      .ilike("search_text_normalized", pattern)
      .order("follower_count", { ascending: false })
      .limit(type === "all" ? 8 : 30);
    if (error) throw new CommunityV2Error(error.message, 500);
    const profiles = new Map<string, CommunityPublicProfileSummary>();
    for (const row of (data ?? []) as PublicProfileRow[]) {
      if (!blocked.has(row.user_id)) profiles.set(row.user_id, mapProfileRow(service, row, viewerId));
    }
    await addViewerProfileState(service, profiles, viewerId);
    result.profiles = [...profiles.values()];
  }

  if (type === "all" || type === "tags") {
    const tagQuery = query.replace(/^#/, "");
    const { data, error } = await service
      .from("community_hashtags")
      .select("id,tag")
      .ilike("normalized_tag", `%${escapeLike(tagQuery)}%`)
      .limit(30);
    if (error) throw new CommunityV2Error(error.message, 500);
    const hashtagIds = (data ?? []).map((row) => row.id);
    const { data: tagLinks, error: tagLinkError } = hashtagIds.length
      ? await service.from("community_post_hashtags").select("hashtag_id,post_id").in("hashtag_id", hashtagIds).limit(3000)
      : { data: [], error: null };
    if (tagLinkError) throw new CommunityV2Error(tagLinkError.message, 500);
    const visiblePostIds = await getVisibleCommunityPostIds(service, (tagLinks ?? []).map((row) => row.post_id), viewerId);
    result.tags = (data ?? [])
      .map((row) => ({
        postCount: new Set((tagLinks ?? []).filter((link) => link.hashtag_id === row.id && visiblePostIds.has(link.post_id)).map((link) => link.post_id)).size,
        tag: row.tag,
      }))
      .filter((row) => row.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, type === "all" ? 8 : 30);
  }

  if (type === "all" || type === "verses") {
    const { data, error } = await service
      .from("community_post_verses")
      .select("verse_key,post_id")
      .limit(3000);
    if (error) throw new CommunityV2Error(error.message, 500);
    const matchingRows = (data ?? []).filter((row) => {
      const searchable = `${normalizeSearchText(row.verse_key)} ${normalizeSearchText(formatVerseReference(row.verse_key))}`;
      return searchable.includes(query);
    });
    const visiblePostIds = await getVisibleCommunityPostIds(service, matchingRows.map((row) => row.post_id), viewerId);
    const counts = new Map<string, Set<string>>();
    for (const row of matchingRows) {
      if (visiblePostIds.has(row.post_id)) counts.set(row.verse_key, new Set([...(counts.get(row.verse_key) ?? []), row.post_id]));
    }
    result.verses = [...counts.entries()]
      .map(([verseKey, postIds]) => ({ postCount: postIds.size, reference: formatVerseReference(verseKey), verseKey }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, type === "all" ? 8 : 30);
  }
  return result;
}

export async function getCommunitySuggestedProfiles(
  service: CommunityDb,
  viewerId: string | null,
  requestedLimit = 12,
): Promise<CommunityPublicProfileSummary[]> {
  const limit = Math.max(1, Math.min(requestedLimit, 30));
  const [blocked, muted] = await Promise.all([
    getBlockedUserIds(service, viewerId),
    getMutedUserIds(service, viewerId),
  ]);
  const { data, error } = await service
    .from("user_public_profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .eq("public_enabled", true)
    .eq("status", "active")
    .not("handle", "is", null)
    .order("follower_count", { ascending: false })
    .order("post_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(Math.min(100, limit * 4));
  if (error) throw new CommunityV2Error(error.message, 500);
  const rows = ((data ?? []) as PublicProfileRow[])
    .filter((row) => row.user_id !== viewerId && !blocked.has(row.user_id) && !muted.has(row.user_id))
    .slice(0, limit);
  const profiles = new Map<string, CommunityPublicProfileSummary>();
  for (const row of rows) profiles.set(row.user_id, mapProfileRow(service, row, viewerId));
  await addViewerProfileState(service, profiles, viewerId);
  return [...profiles.values()];
}

export async function getCommunityNotifications(
  service: CommunityDb,
  userId: string,
  filter: CommunityNotificationFilter = "all",
  cursorValue?: string | null,
  requestedLimit = 30,
): Promise<CommunityNotificationPage> {
  await processCommunityNotificationOutbox(service);
  const cursor = decodeCursor(cursorValue ?? null);
  const limit = Math.max(1, Math.min(requestedLimit, 50));
  let query = service
    .from("community_notifications")
    .select("id,user_id,actor_id,event_type,post_id,comment_id,actor_count,data,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (filter !== "all") query = query.in("event_type", COMMUNITY_NOTIFICATION_FILTER_TYPES[filter]);
  if (cursor) query = query.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    query.limit(limit + 1),
    service.from("community_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  if (error || countError) throw new CommunityV2Error(error?.message ?? countError?.message ?? "알림을 불러오지 못했습니다.", 500);
  const rows = data ?? [];
  const selected = rows.slice(0, limit);
  const profileRows = await getProfileRows(service, selected.flatMap((row) => row.actor_id ? [row.actor_id] : []));
  const items: CommunityNotification[] = selected.map((row) => ({
    actor: row.actor_id && profileRows.has(row.actor_id) ? mapProfileRow(service, profileRows.get(row.actor_id)!, userId) : null,
    actorCount: row.actor_count,
    commentId: row.comment_id,
    createdAt: row.created_at,
    data: (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>,
    eventType: row.event_type,
    id: row.id,
    postId: row.post_id,
    readAt: row.read_at,
  }));
  const tail = selected.at(-1);
  return { items, nextCursor: rows.length > limit && tail ? encodeCursor({ at: tail.created_at, id: tail.id }) : null, unreadCount: count ?? 0 };
}

export async function markCommunityNotificationsRead(service: CommunityDb, userId: string, ids: unknown) {
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string")) throw new CommunityV2Error("알림 목록을 확인하세요.", 400);
  if (!ids.length) return 0;
  const { data, error } = await service
    .from("community_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids)
    .is("read_at", null)
    .select("id");
  if (error) throw new CommunityV2Error(error.message, 500);
  return data?.length ?? 0;
}

export async function registerCommunityPushToken(service: CommunityDb, userId: string, tokenValue: unknown, platformValue: unknown) {
  const token = cleanText(tokenValue);
  const platform = cleanText(platformValue);
  if (!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token) || token.length > 500 || !["android", "ios", "web"].includes(platform)) {
    throw new CommunityV2Error("푸시 토큰 정보를 확인하세요.", 400);
  }
  const { error } = await service.from("community_push_tokens").upsert({ enabled: true, last_seen_at: new Date().toISOString(), platform, token, user_id: userId }, { onConflict: "token" });
  if (error) throw new CommunityV2Error(error.message, 500);
}

const notificationCopy: Record<string, string> = {
  comment: "회원님의 QT 나눔에 댓글이 달렸습니다.",
  follow: "새로운 팔로워가 생겼습니다.",
  like_comment: "회원님의 댓글을 좋아합니다.",
  like_post: "회원님의 QT 나눔을 좋아합니다.",
  mention: "QT 커뮤니티에서 회원님을 언급했습니다.",
  moderation: "커뮤니티 운영 알림이 도착했습니다.",
  quote: "회원님의 QT 나눔을 인용했습니다.",
  reply: "회원님의 댓글에 답글이 달렸습니다.",
  repost: "회원님의 QT 나눔을 리포스트했습니다.",
};

export async function processCommunityNotificationOutbox(service: CommunityDb) {
  try {
    const { data: events, error } = await service
      .from("community_notification_outbox")
      .select("id,event_key,recipient_id,actor_id,event_type,post_id,comment_id,data,attempts,created_at")
      .is("processed_at", null)
      .order("created_at")
      .limit(50);
    if (error || !events?.length) return;
    for (const event of events) {
      try {
        const { data: duplicate } = await service
          .from("community_notifications")
          .select("id")
          .eq("user_id", event.recipient_id)
          .contains("data", { eventKey: event.event_key })
          .maybeSingle();
        if (!duplicate) {
          const data = { ...(event.data && typeof event.data === "object" ? event.data : {}), eventKey: event.event_key };
          const { error: insertError } = await service.from("community_notifications").insert({
            actor_id: event.actor_id,
            comment_id: event.comment_id,
            data,
            event_type: event.event_type,
            post_id: event.post_id,
            user_id: event.recipient_id,
          });
          if (insertError) throw insertError;
           const { data: tokens } = await service.from("community_push_tokens").select("id,token").eq("user_id", event.recipient_id).eq("enabled", true);
           if (tokens?.length) {
             for (let index = 0; index < tokens.length; index += 100) {
               const batch = tokens.slice(index, index + 100);
               const messages = batch.map((row) => ({
                 body: notificationCopy[event.event_type] ?? "QT 커뮤니티 알림이 도착했습니다.",
                 data: { commentId: event.comment_id, postId: event.post_id, type: event.event_type },
                 sound: "default",
                 title: "KJV QT 커뮤니티",
                 to: row.token,
               }));
               const expoAccessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
               const response = await fetch("https://exp.host/--/api/v2/push/send", {
                 body: JSON.stringify(messages),
                 headers: {
                   Accept: "application/json",
                   "Content-Type": "application/json",
                   ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
                 },
                 method: "POST",
               });
               if (!response.ok) throw new Error(`Expo push ${response.status}`);
               const payload = await response.json().catch(() => null) as {
                 data?: Array<{ details?: { error?: string }; message?: string; status?: string }>;
               } | null;
               for (const [ticketIndex, ticket] of (payload?.data ?? []).entries()) {
                 if (ticket.status !== "error") continue;
                 if (ticket.details?.error === "DeviceNotRegistered") {
                   const tokenId = batch[ticketIndex]?.id;
                   if (tokenId) await service.from("community_push_tokens").update({ enabled: false }).eq("id", tokenId);
                   continue;
                 }
                 throw new Error(ticket.message ?? "Expo push ticket error");
               }
             }
           }
        }
        await service.from("community_notification_outbox").update({ processed_at: new Date().toISOString() }).eq("id", event.id).is("processed_at", null);
      } catch (eventError) {
        await service.from("community_notification_outbox").update({
          attempts: event.attempts + 1,
          last_error: eventError instanceof Error ? eventError.message.slice(0, 500) : "unknown",
        }).eq("id", event.id);
      }
    }
  } catch (error) {
    console.error("community-notification-outbox", error);
  }
}

function hasExpectedImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function uploadCommunityPostMedia(service: CommunityDb, user: User, postId: string, image: File, altTextValue: unknown) {
  await requireActiveProfile(service, user);
  await requireOwnedPost(service, postId, user.id);
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!image.size || image.size > 8 * 1024 * 1024 || !allowedTypes.has(image.type)) {
    throw new CommunityV2Error("8MB 이하의 JPG, PNG, WebP 이미지를 선택하세요.", 400);
  }
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasExpectedImageSignature(bytes, image.type)) throw new CommunityV2Error("이미지 파일 형식을 확인하세요.", 400);
  const altText = cleanText(altTextValue);
  if (altText.length > 300) throw new CommunityV2Error("대체 텍스트는 300자 이내로 작성하세요.", 400);
  const sharpModule = await import("sharp");
  const metadata = await sharpModule.default(bytes).metadata();
  if (!metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192) {
    throw new CommunityV2Error("이미지 크기를 확인하세요.", 400);
  }
  const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp";
  const storagePath = `${user.id}/${postId}/${crypto.randomUUID()}.${extension}`;
  const { data: existing } = await service.from("community_post_media").select("storage_path").eq("post_id", postId).maybeSingle<{ storage_path: string }>();
  const { error: uploadError } = await service.storage.from(COMMUNITY_MEDIA_BUCKET).upload(storagePath, bytes, {
    cacheControl: "86400",
    contentType: image.type,
    upsert: false,
  });
  if (uploadError) throw new CommunityV2Error("이미지를 저장하지 못했습니다.", 500);
  const { error } = await service.from("community_post_media").upsert({
    alt_text: altText,
    author_id: user.id,
    byte_size: image.size,
    height: metadata.height,
    mime_type: image.type,
    post_id: postId,
    status: "ready",
    storage_path: storagePath,
    width: metadata.width,
  }, { onConflict: "post_id" });
  if (error) {
    await service.storage.from(COMMUNITY_MEDIA_BUCKET).remove([storagePath]);
    throw new CommunityV2Error(error.message, 500);
  }
  if (existing?.storage_path && existing.storage_path !== storagePath) await service.storage.from(COMMUNITY_MEDIA_BUCKET).remove([existing.storage_path]);
  return getCommunityPost(service, postId, user.id);
}

export async function removeCommunityPostMedia(service: CommunityDb, user: User, postId: string) {
  await requireOwnedPost(service, postId, user.id);
  const { data } = await service.from("community_post_media").select("storage_path").eq("post_id", postId).maybeSingle<{ storage_path: string }>();
  const { error } = await service.from("community_post_media").delete().eq("post_id", postId).eq("author_id", user.id);
  if (error) throw new CommunityV2Error(error.message, 500);
  if (data?.storage_path) await service.storage.from(COMMUNITY_MEDIA_BUCKET).remove([data.storage_path]);
}

export async function submitCommunityReport(
  service: CommunityDb,
  user: User,
  input: SubmitCommunityReportV2Input,
  idempotencyKey?: string | null,
) {
  await requireActiveProfile(service, user);
  await enforceRateLimit(service, "community_reports", "reporter_id", user.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), 15, "신고 요청이 잠시 제한되었습니다.");
  if (!COMMUNITY_REPORT_REASONS.includes(input.reason)) throw new CommunityV2Error("신고 사유를 확인하세요.", 400);
  const details = cleanNullableText(input.details);
  if (details && details.length > 1000) throw new CommunityV2Error("신고 상세 내용은 1000자 이내로 작성하세요.", 400);
  const targetId = cleanText(input.targetId);
  if (!targetId || !["post", "comment", "profile"].includes(input.targetType)) throw new CommunityV2Error("신고 대상을 확인하세요.", 400);
  let targetAuthorId: string | null = null;
  if (input.targetType === "profile") {
    const { data } = await service.from("user_public_profiles").select("user_id,public_enabled,status").eq("user_id", targetId).maybeSingle();
    if (data?.public_enabled && data.status === "active") targetAuthorId = data.user_id;
  } else {
    const table = input.targetType === "post" ? "community_posts" : "community_comments";
    const { data } = await service.from(table).select("author_id,status").eq("id", targetId).maybeSingle();
    if (data && ["published", "visible", "limited"].includes(data.status)) targetAuthorId = data.author_id;
  }
  if (!targetAuthorId) throw new CommunityV2Error("신고 대상을 찾을 수 없습니다.", 404);
  if (targetAuthorId === user.id) throw new CommunityV2Error("본인의 콘텐츠나 프로필은 신고할 수 없습니다.", 400);
  const payload = {
    comment_id: input.targetType === "comment" ? targetId : null,
    details,
    idempotency_key: cleanNullableText(idempotencyKey)?.slice(0, 120) ?? null,
    post_id: input.targetType === "post" ? targetId : null,
    profile_id: input.targetType === "profile" ? targetId : null,
    reason: input.reason,
    reporter_id: user.id,
    target_type: input.targetType,
  };
  const { error } = await service.from("community_reports").insert(payload);
  if (error?.code === "23505") return;
  if (error) throw new CommunityV2Error(error.message, 500);
}

export function isCommunityModerator(roles: string[]) {
  return roles.some((role) => ["discussion_moderator", "community_manager", "admin"].includes(role));
}

export async function getCommunityModerationQueue(service: CommunityDb, roles: string[], statusValue?: string | null) {
  if (!isCommunityModerator(roles)) throw new CommunityV2Error("커뮤니티 운영 권한이 필요합니다.", 403);
  const status = statusValue && ["open", "reviewing", "resolved", "dismissed"].includes(statusValue) ? statusValue : "open";
  const { data, error } = await service
    .from("community_reports")
    .select("id,reporter_id,target_type,post_id,comment_id,profile_id,reason,details,status,moderator_id,moderator_note,resolved_at,created_at,updated_at")
    .eq("status", status)
    .order("created_at")
    .limit(100);
  if (error) throw new CommunityV2Error(error.message, 500);
  return data ?? [];
}

export async function applyCommunityModerationAction(
  service: CommunityDb,
  moderator: User,
  roles: string[],
  reportId: string,
  input: { action?: unknown; durationHours?: unknown; note?: unknown; reasonCode?: unknown },
) {
  if (!isCommunityModerator(roles)) throw new CommunityV2Error("커뮤니티 운영 권한이 필요합니다.", 403);
  const action = cleanText(input.action);
  const allowedActions = ["dismiss_report", "hide", "limit", "lock_comments", "remove", "restore", "restrict_user", "suspend_user"];
  if (!allowedActions.includes(action)) throw new CommunityV2Error("운영 조치를 확인하세요.", 400);
  const reasonCode = cleanText(input.reasonCode) || "moderator_review";
  const note = cleanNullableText(input.note);
  const { data: report, error } = await service.from("community_reports").select("*").eq("id", reportId).maybeSingle();
  if (error) throw new CommunityV2Error(error.message, 500);
  if (!report) throw new CommunityV2Error("신고를 찾을 수 없습니다.", 404);
  let affectedUserId = report.profile_id as string | null;
  if (!affectedUserId && report.post_id) {
    const { data } = await service.from("community_posts").select("author_id").eq("id", report.post_id).maybeSingle();
    affectedUserId = data?.author_id ?? null;
  }
  if (!affectedUserId && report.comment_id) {
    const { data } = await service.from("community_comments").select("author_id").eq("id", report.comment_id).maybeSingle();
    affectedUserId = data?.author_id ?? null;
  }
  if (action === "dismiss_report") {
    await service.from("community_reports").update({ moderator_id: moderator.id, moderator_note: note, resolved_at: new Date().toISOString(), status: "dismissed" }).eq("id", reportId);
  } else if (["hide", "limit", "remove", "restore", "lock_comments"].includes(action)) {
    if (report.target_type === "post" && report.post_id) {
      const patch = action === "restore" ? { status: "published" }
        : action === "lock_comments" ? { comment_policy: "none" }
          : { status: action === "limit" ? "limited" : action === "hide" ? "hidden" : "deleted" };
      await service.from("community_posts").update(patch).eq("id", report.post_id);
    } else if (report.target_type === "comment" && report.comment_id && action !== "lock_comments") {
      await service.from("community_comments").update({ status: action === "restore" ? "visible" : action === "limit" ? "limited" : action === "hide" ? "hidden" : "deleted" }).eq("id", report.comment_id);
    } else {
      throw new CommunityV2Error("이 대상에는 선택한 조치를 적용할 수 없습니다.", 400);
    }
    await service.from("community_reports").update({ moderator_id: moderator.id, moderator_note: note, resolved_at: new Date().toISOString(), status: "resolved" }).eq("id", reportId);
  } else {
    if (!affectedUserId) throw new CommunityV2Error("제한할 사용자를 찾을 수 없습니다.", 404);
    const duration = Math.max(1, Math.min(Number(input.durationHours) || 24, 24 * 365));
    await service.from("community_user_restrictions").insert({
      created_by: moderator.id,
      ends_at: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
      reason_code: reasonCode,
      restriction_type: action === "suspend_user" ? "suspended" : "restricted",
      user_id: affectedUserId,
    });
    await service.from("community_reports").update({ moderator_id: moderator.id, moderator_note: note, resolved_at: new Date().toISOString(), status: "resolved" }).eq("id", reportId);
  }
  const { error: eventError } = await service.from("community_moderation_events").insert({
    action,
    comment_id: report.comment_id,
    metadata: { durationHours: input.durationHours ?? null },
    moderator_id: moderator.id,
    note,
    post_id: report.post_id,
    profile_id: report.profile_id,
    reason_code: reasonCode,
    report_id: report.id,
    target_type: report.target_type,
  });
  if (eventError) throw new CommunityV2Error(eventError.message, 500);
  if (action !== "dismiss_report" && affectedUserId && affectedUserId !== moderator.id) {
    const { error: notificationError } = await service.from("community_notification_outbox").upsert({
      actor_id: moderator.id,
      comment_id: report.comment_id,
      data: { action, note, reasonCode },
      event_key: `moderation:${report.id}:${action}`,
      event_type: "moderation",
      post_id: report.post_id,
      recipient_id: affectedUserId,
    }, { ignoreDuplicates: true, onConflict: "event_key" });
    if (notificationError) throw new CommunityV2Error(notificationError.message, 500);
    await processCommunityNotificationOutbox(service);
  }
  return { applied: true };
}
