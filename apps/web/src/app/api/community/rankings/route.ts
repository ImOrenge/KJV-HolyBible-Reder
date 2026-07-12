import type { CommunityRankingPeriod } from "@kjv/shared/community";

import { communityJson, communityOptions, getCommunityRanking, requireCommunityUser } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

export async function GET(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const value = new URL(request.url).searchParams.get("period") ?? "weekly";
  if (!["weekly", "monthly", "all_time"].includes(value)) return communityJson({ error: "랭킹 기간을 확인하세요." }, { status: 400 });
  try {
    const ranking = await getCommunityRanking(auth.service, value as CommunityRankingPeriod, auth.user.id);
    return communityJson({ period: value, rankings: ranking.entries, currentUserRank: ranking.currentUserRank });
  } catch (error) {
    return communityJson({ error: error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다." }, { status: 500 });
  }
}
