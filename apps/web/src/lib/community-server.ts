import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  CommunityComment,
  CommunityProfile,
  CommunityRankingEntry,
  CommunityRankingPeriod,
  CommunityThread,
} from "@kjv/shared/community";
import { getBook } from "@kjv/shared";
import { NextResponse } from "next/server";

import { createBearerClient, createClient } from "@/lib/supabase/server";

export const communityCorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  Vary: "Origin",
};

export function communityJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { ...communityCorsHeaders, ...init?.headers } });
}

export function communityOptions() {
  return new Response(null, { headers: communityCorsHeaders, status: 204 });
}

function getBearerAccessToken(request: Request) {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireCommunityUser(request: Request) {
  const accessToken = getBearerAccessToken(request);
  const authClient = accessToken ? createBearerClient(accessToken) : await createClient();
  const result = accessToken ? await authClient.auth.getUser(accessToken) : await authClient.auth.getUser();
  if (result.error || !result.data.user) return { error: communityJson({ error: "로그인이 필요합니다." }, { status: 401 }) };
  return { service: authClient, user: result.data.user };
}

type LevelRow = { code: string; level: number; name: string; minimum_points: number };
export type ProfileRow = { user_id: string; display_name: string; ranking_opt_in: boolean; show_level: boolean; status: string };
export type ThreadRow = {
  id: string; author_id: string | null; verse_key: string; title: string; body: string;
  thread_type: CommunityThread["threadType"]; kjv_text_snapshot: string; ko_text_snapshot: string | null;
  status: "open" | "locked"; comment_count: number; helpful_count: number; created_at: string; updated_at: string;
};
export type CommentRow = {
  id: string; thread_id: string; author_id: string | null; parent_comment_id: string | null; body: string;
  helpful_count: number; created_at: string; updated_at: string;
};

export type CommunityLevelDefinition = { code: string; level: number; name: string; minimumPoints: number };

function cleanDisplayName(user: User) {
  const metadataName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  const safeName = metadataName && !metadataName.includes("@") ? metadataName : `리더-${user.id.slice(0, 6)}`;
  return safeName.slice(0, 40);
}

type CommunityDbClient = SupabaseClient;

export async function ensureCommunityProfile(service: CommunityDbClient, user: User) {
  const { data: existing, error } = await service.from("user_public_profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>();
  if (error) throw new Error(error.message);
  if (existing) return existing;
  const { data, error: insertError } = await service.from("user_public_profiles").insert({
    display_name: cleanDisplayName(user), ranking_opt_in: false, show_level: true, user_id: user.id,
  }).select("*").single<ProfileRow>();
  if (insertError || !data) throw new Error(insertError?.message ?? "커뮤니티 프로필을 만들지 못했습니다.");
  return data;
}

export async function getLevels(service: CommunityDbClient): Promise<CommunityLevelDefinition[]> {
  const { data, error } = await service.from("community_level_definitions").select("code,level,name,minimum_points").order("minimum_points");
  if (error) throw new Error(error.message);
  return ((data ?? []) as LevelRow[]).map((row) => ({ code: row.code, level: row.level, name: row.name, minimumPoints: row.minimum_points }));
}

export function resolveLevel(points: number, levels: CommunityLevelDefinition[]) {
  return levels.filter((level) => points >= level.minimumPoints).at(-1) ?? { code: "starting", level: 1, name: "시작", minimumPoints: 0 };
}

export async function getCommunityProfile(service: CommunityDbClient, profile: ProfileRow): Promise<CommunityProfile> {
  const [{ data: balance, error: balanceError }, levels] = await Promise.all([
    service.from("community_point_balances").select("total_points").eq("user_id", profile.user_id).maybeSingle<{ total_points: number }>(),
    getLevels(service),
  ]);
  if (balanceError) throw new Error(balanceError.message);
  const points = balance?.total_points ?? 0;
  const level = resolveLevel(points, levels);
  return {
    userId: profile.user_id, displayName: profile.display_name, rankingOptIn: profile.ranking_opt_in,
    showLevel: profile.show_level, levelCode: level.code, levelName: level.name, level: level.level, points,
  };
}

function formatVerseReference(verseKey: string) {
  const [bookCode = "", chapter = "", verse = ""] = verseKey.split(".");
  const book = getBook(bookCode.toLowerCase());
  return `${book?.nameKo ?? bookCode} ${chapter}:${verse}`;
}

export async function hydrateThreads(
  service: CommunityDbClient, rows: ThreadRow[], viewerId: string,
): Promise<CommunityThread[]> {
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.flatMap((row) => row.author_id ? [row.author_id] : []))];
  const threadIds = rows.map((row) => row.id);
  const [{ data: profiles, error: profileError }, { data: balances, error: balanceError }, { data: reactions, error: reactionError }, levels] = await Promise.all([
    authorIds.length ? service.from("user_public_profiles").select("user_id,display_name,show_level").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    authorIds.length ? service.from("community_point_balances").select("user_id,total_points").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    service.from("discussion_reactions").select("thread_id").eq("user_id", viewerId).eq("target_type", "thread").eq("reaction_type", "helpful").in("thread_id", threadIds),
    getLevels(service),
  ]);
  const firstError = profileError ?? balanceError ?? reactionError;
  if (firstError) throw new Error(firstError.message);
  const profileMap = new Map((profiles ?? []).map((row) => [row.user_id, row]));
  const balanceMap = new Map((balances ?? []).map((row) => [row.user_id, row.total_points]));
  const helpfulSet = new Set((reactions ?? []).map((row) => row.thread_id));

  return rows.map((row) => {
    const profile = row.author_id ? profileMap.get(row.author_id) : null;
    const level = row.author_id ? resolveLevel(balanceMap.get(row.author_id) ?? 0, levels) : null;
    return {
      id: row.id, authorId: row.author_id, authorDisplayName: profile?.display_name ?? "탈퇴한 사용자",
      authorLevelName: profile?.show_level && level ? level.name : null, verseKey: row.verse_key,
      reference: formatVerseReference(row.verse_key), title: row.title, body: row.body, threadType: row.thread_type,
      kjvText: row.kjv_text_snapshot, koText: row.ko_text_snapshot, status: row.status,
      commentCount: row.comment_count, helpfulCount: row.helpful_count, viewerHelpful: helpfulSet.has(row.id),
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  });
}

export async function hydrateComments(
  service: CommunityDbClient, rows: CommentRow[], viewerId: string,
): Promise<CommunityComment[]> {
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.flatMap((row) => row.author_id ? [row.author_id] : []))];
  const commentIds = rows.map((row) => row.id);
  const [{ data: profiles, error: profileError }, { data: balances, error: balanceError }, { data: reactions, error: reactionError }, levels] = await Promise.all([
    authorIds.length ? service.from("user_public_profiles").select("user_id,display_name,show_level").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    authorIds.length ? service.from("community_point_balances").select("user_id,total_points").in("user_id", authorIds) : Promise.resolve({ data: [], error: null }),
    service.from("discussion_reactions").select("comment_id").eq("user_id", viewerId).eq("target_type", "comment").eq("reaction_type", "helpful").in("comment_id", commentIds),
    getLevels(service),
  ]);
  const firstError = profileError ?? balanceError ?? reactionError;
  if (firstError) throw new Error(firstError.message);
  const profileMap = new Map((profiles ?? []).map((row) => [row.user_id, row]));
  const balanceMap = new Map((balances ?? []).map((row) => [row.user_id, row.total_points]));
  const helpfulSet = new Set((reactions ?? []).map((row) => row.comment_id));
  return rows.map((row) => {
    const profile = row.author_id ? profileMap.get(row.author_id) : null;
    const level = row.author_id ? resolveLevel(balanceMap.get(row.author_id) ?? 0, levels) : null;
    return {
      id: row.id, threadId: row.thread_id, authorId: row.author_id, authorDisplayName: profile?.display_name ?? "탈퇴한 사용자",
      authorLevelName: profile?.show_level && level ? level.name : null, parentCommentId: row.parent_comment_id,
      body: row.body, helpfulCount: row.helpful_count, viewerHelpful: helpfulSet.has(row.id),
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  });
}

function getPeriodStart(period: CommunityRankingPeriod) {
  if (period === "all_time") return null;
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (period === "monthly") {
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 60 * 60 * 1000).toISOString();
  }
  const day = kst.getUTCDay() || 7;
  const monday = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - day + 1) - 9 * 60 * 60 * 1000);
  return monday.toISOString();
}

export async function getCommunityRanking(
  service: CommunityDbClient, period: CommunityRankingPeriod, viewerId: string,
) {
  const { data: profiles, error: profilesError } = await service.from("user_public_profiles")
    .select("user_id,display_name,show_level").eq("status", "active").eq("ranking_opt_in", true);
  if (profilesError) throw new Error(profilesError.message);
  const profileRows = profiles ?? [];
  if (!profileRows.length) return { entries: [] as CommunityRankingEntry[], currentUserRank: null };
  let ledgerQuery = service.from("community_point_ledger").select("user_id,amount,created_at").in("user_id", profileRows.map((row) => row.user_id));
  const start = getPeriodStart(period);
  if (start) ledgerQuery = ledgerQuery.gte("created_at", start);
  const profileIds = profileRows.map((row) => row.user_id);
  const [
    { data: ledger, error: ledgerError },
    { data: balances, error: balancesError },
    levels,
  ] = await Promise.all([
    ledgerQuery.limit(20000),
    service.from("community_point_balances").select("user_id,total_points").in("user_id", profileIds),
    getLevels(service),
  ]);
  if (ledgerError) throw new Error(ledgerError.message);
  if (balancesError) throw new Error(balancesError.message);
  const periodPointMap = new Map<string, number>();
  for (const row of ledger ?? []) periodPointMap.set(row.user_id, (periodPointMap.get(row.user_id) ?? 0) + row.amount);
  const lifetimePointMap = new Map((balances ?? []).map((row) => [row.user_id, Math.max(0, row.total_points)]));
  const sorted = profileRows.map((profile) => ({
    profile,
    points: period === "all_time"
      ? lifetimePointMap.get(profile.user_id) ?? 0
      : Math.max(0, periodPointMap.get(profile.user_id) ?? 0),
  }))
    .sort((a, b) => b.points - a.points || a.profile.display_name.localeCompare(b.profile.display_name, "ko"));
  let previousPoints: number | null = null;
  let rank = 0;
  const entries = sorted.map(({ profile, points }) => {
    if (points !== previousPoints) rank += 1;
    previousPoints = points;
    const level = resolveLevel(lifetimePointMap.get(profile.user_id) ?? 0, levels);
    return {
      userId: profile.user_id,
      displayName: profile.display_name,
      points,
      rank,
      levelName: profile.show_level ? level.name : "레벨 비공개",
      isCurrentUser: profile.user_id === viewerId,
    };
  });
  return { entries: entries.slice(0, 100), currentUserRank: entries.find((entry) => entry.userId === viewerId)?.rank ?? null };
}
