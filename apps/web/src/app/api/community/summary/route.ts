import type { CommunitySummary } from "@kjv/shared/community";

import {
  communityJson,
  communityOptions,
  ensureCommunityProfile,
  getCommunityProfile,
  getCommunityRanking,
  hydrateThreads,
  requireCommunityUser,
  type ThreadRow,
} from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

export async function GET(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  try {
    const profileRow = await ensureCommunityProfile(auth.service, auth.user);
    const [{ data: recentRows, error: recentError }, { data: participationRows, error: participationError }, profile, ranking] = await Promise.all([
      auth.service.from("discussion_threads").select("id,author_id,verse_key,title,body,thread_type,kjv_text_snapshot,ko_text_snapshot,status,comment_count,helpful_count,created_at,updated_at")
        .in("status", ["open", "locked"]).order("last_activity_at", { ascending: false }).limit(10),
      auth.service.from("discussion_comments").select("thread_id").eq("author_id", auth.user.id).eq("status", "visible").limit(30),
      getCommunityProfile(auth.service, profileRow),
      getCommunityRanking(auth.service, "weekly", auth.user.id),
    ]);
    if (recentError || participationError) throw new Error(recentError?.message ?? participationError?.message);
    const participatingIds = [...new Set((participationRows ?? []).map((row) => row.thread_id))];
    const { data: participatingRowsRaw, error: participatingThreadError } = participatingIds.length
      ? await auth.service.from("discussion_threads").select("id,author_id,verse_key,title,body,thread_type,kjv_text_snapshot,ko_text_snapshot,status,comment_count,helpful_count,created_at,updated_at")
          .in("id", participatingIds).in("status", ["open", "locked"]).order("last_activity_at", { ascending: false }).limit(5)
      : { data: [], error: null };
    if (participatingThreadError) throw new Error(participatingThreadError.message);
    const [recentThreads, participatingThreads] = await Promise.all([
      hydrateThreads(auth.service, (recentRows ?? []) as ThreadRow[], auth.user.id),
      hydrateThreads(auth.service, (participatingRowsRaw ?? []) as ThreadRow[], auth.user.id),
    ]);
    const payload: CommunitySummary = {
      profile, recentThreads, participatingThreads, weeklyRanking: ranking.entries.slice(0, 3),
      currentUserRank: ranking.currentUserRank, unreadCount: 0,
    };
    return communityJson(payload);
  } catch (error) {
    return communityJson({ error: error instanceof Error ? error.message : "커뮤니티를 불러오지 못했습니다." }, { status: 500 });
  }
}
