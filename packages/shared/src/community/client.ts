import type {
  CommunityCommentV2,
  CommunityCursorPage,
  CommunityMediaUpload,
  CommunityPost,
  CreateCommunityPostV2Input,
  UpdateCommunityPostV2Input,
} from "./domain";
import type { CommunityFeedMode, CommunityFeedPage } from "./feed";
import type { SubmitCommunityReportV2Input } from "./moderation";
import type { CommunityNotificationFilter, CommunityNotificationPage } from "./notifications";
import type { CommunityProfileDetailV2, UpdateCommunityProfileV2Input } from "./profile";
import type { CommunitySearchResults, CommunitySearchType } from "./search";

export type CommunityV2ClientOptions = {
  accessToken?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function requestJson<T>(path: string, options: CommunityV2ClientOptions, init?: RequestInit): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  const response = await fetcher(resolveApiUrl(path, options.baseUrl), {
    ...init,
    credentials: options.baseUrl ? "omit" : "same-origin",
    headers,
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? "QT 커뮤니티 요청을 처리하지 못했습니다.");
  if (!payload) throw new Error("QT 커뮤니티 응답이 비어 있습니다.");
  return payload;
}

function cursorQuery(cursor?: string) {
  return cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
}

export function getCommunityFeedV2(mode: CommunityFeedMode, options: CommunityV2ClientOptions, cursor?: string) {
  return requestJson<CommunityFeedPage>(`/api/community/v2/feed?mode=${mode}${cursorQuery(cursor)}`, options);
}

export function getCommunityPostV2(postId: string, options: CommunityV2ClientOptions) {
  return requestJson<{ post: CommunityPost }>(`/api/community/v2/posts/${encodeURIComponent(postId)}`, options);
}

export function getCommunityCommentsV2(postId: string, options: CommunityV2ClientOptions, cursor?: string) {
  return requestJson<CommunityCursorPage<CommunityCommentV2>>(
    `/api/community/v2/posts/${encodeURIComponent(postId)}/comments?limit=30${cursorQuery(cursor)}`,
    options,
  );
}

export function createCommunityPostV2(input: CreateCommunityPostV2Input, options: CommunityV2ClientOptions) {
  return requestJson<{ post: CommunityPost }>("/api/community/v2/posts", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updateCommunityPostV2(postId: string, input: UpdateCommunityPostV2Input, options: CommunityV2ClientOptions) {
  return requestJson<{ post: CommunityPost }>(`/api/community/v2/posts/${encodeURIComponent(postId)}`, options, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function deleteCommunityPostV2(postId: string, options: CommunityV2ClientOptions) {
  return requestJson<{ deleted: true }>(`/api/community/v2/posts/${encodeURIComponent(postId)}`, options, { method: "DELETE" });
}

export function uploadCommunityPostMediaV2(postId: string, input: CommunityMediaUpload, options: CommunityV2ClientOptions) {
  const body = new FormData();
  body.append("image", input.file, input.fileName ?? "community-image");
  if (input.altText) body.append("altText", input.altText);
  return requestJson<{ post: CommunityPost }>(`/api/community/v2/posts/${encodeURIComponent(postId)}/media`, options, {
    body,
    method: "POST",
  });
}

export function createCommunityCommentV2(
  postId: string,
  body: string,
  options: CommunityV2ClientOptions,
  parentCommentId?: string,
) {
  return requestJson<{ comment: CommunityCommentV2 }>(
    `/api/community/v2/posts/${encodeURIComponent(postId)}/comments`,
    options,
    { body: JSON.stringify({ body, parentCommentId }), method: "POST" },
  );
}

export function updateCommunityCommentV2(commentId: string, body: string, options: CommunityV2ClientOptions) {
  return requestJson<{ comment: CommunityCommentV2 }>(`/api/community/v2/comments/${encodeURIComponent(commentId)}`, options, {
    body: JSON.stringify({ body }),
    method: "PATCH",
  });
}

export function deleteCommunityCommentV2(commentId: string, options: CommunityV2ClientOptions) {
  return requestJson<{ deleted: true }>(`/api/community/v2/comments/${encodeURIComponent(commentId)}`, options, { method: "DELETE" });
}

export function setCommunityPostLikeV2(postId: string, active: boolean, options: CommunityV2ClientOptions) {
  return requestJson<{ active: boolean; count: number }>(`/api/community/v2/posts/${encodeURIComponent(postId)}/like`, options, {
    body: JSON.stringify({ active }),
    method: "PUT",
  });
}

export function setCommunityCommentLikeV2(commentId: string, active: boolean, options: CommunityV2ClientOptions) {
  return requestJson<{ active: boolean; count: number }>(`/api/community/v2/comments/${encodeURIComponent(commentId)}/like`, options, {
    body: JSON.stringify({ active }),
    method: "PUT",
  });
}

export function setCommunityRepostV2(postId: string, active: boolean, options: CommunityV2ClientOptions) {
  return requestJson<{ active: boolean; count: number }>(`/api/community/v2/posts/${encodeURIComponent(postId)}/repost`, options, {
    body: JSON.stringify({ active }),
    method: "PUT",
  });
}

export function getCommunityProfileV2(handle: string, options: CommunityV2ClientOptions) {
  return requestJson<{ profile: CommunityProfileDetailV2 }>(`/api/community/v2/profiles/${encodeURIComponent(handle)}`, options);
}

export function getOwnCommunityProfileV2(options: CommunityV2ClientOptions) {
  return requestJson<{ profile: CommunityProfileDetailV2 }>("/api/community/v2/profile", options);
}

export function getCommunityProfilePostsV2(handle: string, options: CommunityV2ClientOptions, cursor?: string) {
  return requestJson<CommunityCursorPage<CommunityPost>>(
    `/api/community/v2/profiles/${encodeURIComponent(handle)}/posts?limit=20${cursorQuery(cursor)}`,
    options,
  );
}

export function updateCommunityProfileV2(input: UpdateCommunityProfileV2Input, options: CommunityV2ClientOptions) {
  return requestJson<{ profile: CommunityProfileDetailV2 }>("/api/community/v2/profile", options, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

function setProfileRelation(handle: string, relation: "block" | "follow" | "mute", active: boolean, options: CommunityV2ClientOptions) {
  return requestJson<{ active: boolean }>(`/api/community/v2/profiles/${encodeURIComponent(handle)}/${relation}`, options, {
    body: JSON.stringify({ active }),
    method: "PUT",
  });
}

export const setCommunityFollowV2 = (handle: string, active: boolean, options: CommunityV2ClientOptions) =>
  setProfileRelation(handle, "follow", active, options);
export const setCommunityMuteV2 = (handle: string, active: boolean, options: CommunityV2ClientOptions) =>
  setProfileRelation(handle, "mute", active, options);
export const setCommunityBlockV2 = (handle: string, active: boolean, options: CommunityV2ClientOptions) =>
  setProfileRelation(handle, "block", active, options);

export function searchCommunityV2(query: string, type: CommunitySearchType, options: CommunityV2ClientOptions, cursor?: string) {
  return requestJson<CommunitySearchResults>(
    `/api/community/v2/search?q=${encodeURIComponent(query)}&type=${type}${cursorQuery(cursor)}`,
    options,
  );
}

export function getCommunityNotificationsV2(options: CommunityV2ClientOptions, cursor?: string, filter: CommunityNotificationFilter = "all") {
  return requestJson<CommunityNotificationPage>(`/api/community/v2/notifications?limit=30&filter=${filter}${cursorQuery(cursor)}`, options);
}

export function markCommunityNotificationsReadV2(ids: string[], options: CommunityV2ClientOptions) {
  return requestJson<{ updated: number }>("/api/community/v2/notifications/read", options, {
    body: JSON.stringify({ ids }),
    method: "PATCH",
  });
}

export function registerCommunityPushTokenV2(token: string, platform: "android" | "ios" | "web", options: CommunityV2ClientOptions) {
  return requestJson<{ registered: true }>("/api/community/v2/push-tokens", options, {
    body: JSON.stringify({ platform, token }),
    method: "POST",
  });
}

export function submitCommunityReportV2(input: SubmitCommunityReportV2Input, options: CommunityV2ClientOptions) {
  return requestJson<{ reported: true }>("/api/community/v2/reports", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}
