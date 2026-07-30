import type {
  CommunityFeedMode,
  CommunitySearchType,
  CreateCommunityPostV2Input,
  SubmitCommunityReportV2Input,
  UpdateCommunityPostV2Input,
  UpdateCommunityProfileV2Input,
} from "@kjv/shared/community";
import { normalizeCommunityNotificationFilter } from "@kjv/shared/community";

import {
  applyCommunityModerationAction,
  CommunityV2Error,
  communityV2ErrorResponse,
  communityV2Json,
  communityV2Options,
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  getCommunityComments,
  getCommunityFeedPage,
  getCommunityHashtagPosts,
  getCommunityModerationQueue,
  getCommunityNotifications,
  getCommunityPost,
  getCommunityProfileByHandle,
  getCommunityProfilePosts,
  getCommunityVersePosts,
  getCommunityV2Auth,
  getOwnCommunityProfile,
  markCommunityNotificationsRead,
  registerCommunityPushToken,
  removeCommunityPostMedia,
  searchCommunity,
  setCommunityLike,
  setCommunityRelation,
  setCommunityRepost,
  submitCommunityReport,
  updateCommunityComment,
  updateCommunityPost,
  updateOwnCommunityProfile,
  uploadCommunityPostMedia,
} from "@/lib/community-v2-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ segments: string[] }> };

async function readJson(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CommunityV2Error("요청 본문을 확인하세요.", 400);
  return body as Record<string, unknown>;
}

function requestUrl(request: Request) {
  return new URL(request.url);
}

function parseActive(value: unknown) {
  if (typeof value !== "boolean") throw new CommunityV2Error("활성 상태를 확인하세요.", 400);
  return value;
}

export function OPTIONS() {
  return communityV2Options();
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const url = requestUrl(request);
    const auth = await getCommunityV2Auth(request, segments[0] === "notifications" || segments[0] === "profile" || segments[0] === "moderation");
    if (segments[0] === "feed" && segments.length === 1) {
      const mode = (url.searchParams.get("mode") ?? "for_you") as CommunityFeedMode;
      return communityV2Json(await getCommunityFeedPage(auth.service, mode, auth.user?.id ?? null, url.searchParams.get("cursor")));
    }
    if (segments[0] === "posts" && segments[1] && segments.length === 2) {
      return communityV2Json({ post: await getCommunityPost(auth.service, segments[1], auth.user?.id ?? null) });
    }
    if (segments[0] === "posts" && segments[1] && segments[2] === "comments" && segments.length === 3) {
      return communityV2Json(await getCommunityComments(
        auth.service,
        segments[1],
        auth.user?.id ?? null,
        url.searchParams.get("cursor"),
        Number(url.searchParams.get("limit")) || 30,
      ));
    }
    if (segments[0] === "profiles" && segments[1] && segments.length === 2) {
      return communityV2Json({ profile: await getCommunityProfileByHandle(auth.service, segments[1], auth.user?.id ?? null) });
    }
    if (segments[0] === "profiles" && segments[1] && segments[2] === "posts" && segments.length === 3) {
      return communityV2Json(await getCommunityProfilePosts(auth.service, segments[1], auth.user?.id ?? null, url.searchParams.get("cursor")));
    }
    if (segments[0] === "profile" && segments.length === 1 && auth.user) {
      return communityV2Json({ profile: await getOwnCommunityProfile(auth.service, auth.user) });
    }
    if (segments[0] === "search" && segments.length === 1) {
      return communityV2Json(await searchCommunity(
        auth.service,
        url.searchParams.get("q") ?? "",
        (url.searchParams.get("type") ?? "all") as CommunitySearchType,
        auth.user?.id ?? null,
      ));
    }
    if (segments[0] === "hashtags" && segments[1] && segments.length === 2) {
      return communityV2Json(await getCommunityHashtagPosts(auth.service, segments[1], auth.user?.id ?? null));
    }
    if (segments[0] === "verses" && segments[1] && segments.length === 2) {
      return communityV2Json(await getCommunityVersePosts(auth.service, segments[1], auth.user?.id ?? null));
    }
    if (segments[0] === "notifications" && segments.length === 1 && auth.user) {
      return communityV2Json(await getCommunityNotifications(
        auth.service,
        auth.user.id,
        normalizeCommunityNotificationFilter(url.searchParams.get("filter")),
        url.searchParams.get("cursor"),
        Number(url.searchParams.get("limit")) || 30,
      ));
    }
    if (segments[0] === "moderation" && segments[1] === "reports" && segments.length === 2) {
      return communityV2Json({ reports: await getCommunityModerationQueue(auth.service, auth.roles, url.searchParams.get("status")) });
    }
    return communityV2Json({ error: "API 경로를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return communityV2ErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const auth = await getCommunityV2Auth(request, true);
    const user = auth.user!;
    const idempotencyKey = request.headers.get("idempotency-key");
    if (segments[0] === "posts" && segments.length === 1) {
      const post = await createCommunityPost(auth.service, user, await readJson(request) as CreateCommunityPostV2Input, idempotencyKey);
      return communityV2Json({ post }, { status: 201 });
    }
    if (segments[0] === "posts" && segments[1] && segments[2] === "comments" && segments.length === 3) {
      const body = await readJson(request);
      const comment = await createCommunityComment(auth.service, user, segments[1], body.body, body.parentCommentId, idempotencyKey);
      return communityV2Json({ comment }, { status: 201 });
    }
    if (segments[0] === "posts" && segments[1] && segments[2] === "media" && segments.length === 3) {
      const formData = await request.formData();
      const image = formData.get("image");
      if (!(image instanceof File)) return communityV2Json({ error: "이미지 파일을 선택하세요." }, { status: 400 });
      return communityV2Json({ post: await uploadCommunityPostMedia(auth.service, user, segments[1], image, formData.get("altText")) });
    }
    if (segments[0] === "push-tokens" && segments.length === 1) {
      const body = await readJson(request);
      await registerCommunityPushToken(auth.service, user.id, body.token, body.platform);
      return communityV2Json({ registered: true });
    }
    if (segments[0] === "reports" && segments.length === 1) {
      await submitCommunityReport(auth.service, user, await readJson(request) as SubmitCommunityReportV2Input, idempotencyKey);
      return communityV2Json({ reported: true }, { status: 201 });
    }
    return communityV2Json({ error: "API 경로를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return communityV2ErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const auth = await getCommunityV2Auth(request, true);
    const user = auth.user!;
    const body = await readJson(request);
    if (segments[0] === "posts" && segments[1] && segments.length === 2) {
      return communityV2Json({ post: await updateCommunityPost(auth.service, user, segments[1], body as UpdateCommunityPostV2Input) });
    }
    if (segments[0] === "comments" && segments[1] && segments.length === 2) {
      return communityV2Json({ comment: await updateCommunityComment(auth.service, user, segments[1], body.body) });
    }
    if (segments[0] === "profile" && segments.length === 1) {
      return communityV2Json({ profile: await updateOwnCommunityProfile(auth.service, user, body as UpdateCommunityProfileV2Input) });
    }
    if (segments[0] === "notifications" && segments[1] === "read" && segments.length === 2) {
      return communityV2Json({ updated: await markCommunityNotificationsRead(auth.service, user.id, body.ids) });
    }
    if (segments[0] === "moderation" && segments[1] === "reports" && segments[2] && segments.length === 3) {
      return communityV2Json(await applyCommunityModerationAction(auth.service, user, auth.roles, segments[2], body));
    }
    return communityV2Json({ error: "API 경로를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return communityV2ErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const auth = await getCommunityV2Auth(request, true);
    const body = await readJson(request);
    const active = parseActive(body.active);
    if (segments[0] === "posts" && segments[1] && segments[2] === "like" && segments.length === 3) {
      return communityV2Json(await setCommunityLike(auth.service, auth.user!, "post", segments[1], active));
    }
    if (segments[0] === "posts" && segments[1] && segments[2] === "repost" && segments.length === 3) {
      return communityV2Json(await setCommunityRepost(auth.service, auth.user!, segments[1], active));
    }
    if (segments[0] === "comments" && segments[1] && segments[2] === "like" && segments.length === 3) {
      return communityV2Json(await setCommunityLike(auth.service, auth.user!, "comment", segments[1], active));
    }
    if (segments[0] === "profiles" && segments[1] && ["follow", "mute", "block"].includes(segments[2]) && segments.length === 3) {
      return communityV2Json(await setCommunityRelation(auth.service, auth.user!, segments[1], segments[2] as "follow" | "mute" | "block", active));
    }
    return communityV2Json({ error: "API 경로를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return communityV2ErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { segments = [] } = await context.params;
    const auth = await getCommunityV2Auth(request, true);
    if (segments[0] === "posts" && segments[1] && segments.length === 2) {
      await deleteCommunityPost(auth.service, auth.user!, segments[1]);
      return communityV2Json({ deleted: true });
    }
    if (segments[0] === "comments" && segments[1] && segments.length === 2) {
      await deleteCommunityComment(auth.service, auth.user!, segments[1]);
      return communityV2Json({ deleted: true });
    }
    if (segments[0] === "posts" && segments[1] && segments[2] === "media" && segments.length === 3) {
      await removeCommunityPostMedia(auth.service, auth.user!, segments[1]);
      return communityV2Json({ deleted: true });
    }
    return communityV2Json({ error: "API 경로를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return communityV2ErrorResponse(error);
  }
}
