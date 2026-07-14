export type CommunityThreadType = "qt_share" | "question" | "observation" | "application" | "cross_reference";
export type CommunityRankingPeriod = "weekly" | "monthly" | "all_time";
export type CommunityReactionType = "helpful" | "encourage";

export type CommunityProfile = {
  userId: string;
  displayName: string;
  rankingOptIn: boolean;
  showLevel: boolean;
  levelCode: string;
  levelName: string;
  level: number;
  points: number;
};

export type CommunityThread = {
  id: string;
  authorId: string | null;
  authorDisplayName: string;
  authorLevelName: string | null;
  verseKey: string;
  reference: string;
  title: string;
  body: string;
  threadType: CommunityThreadType;
  kjvText: string;
  koText: string | null;
  status: "open" | "locked";
  commentCount: number;
  helpfulCount: number;
  viewerHelpful: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityComment = {
  id: string;
  threadId: string;
  authorId: string | null;
  authorDisplayName: string;
  authorLevelName: string | null;
  parentCommentId: string | null;
  body: string;
  helpfulCount: number;
  viewerHelpful: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityRankingEntry = {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
  levelName: string;
  isCurrentUser: boolean;
};

export type CommunitySummary = {
  profile: CommunityProfile;
  recentThreads: CommunityThread[];
  participatingThreads: CommunityThread[];
  weeklyRanking: CommunityRankingEntry[];
  currentUserRank: number | null;
  unreadCount: number;
};

export type CommunityThreadDetail = {
  thread: CommunityThread;
  comments: CommunityComment[];
};

export type CreateCommunityThreadInput = {
  verseKey: string;
  title: string;
  body: string;
  threadType: CommunityThreadType;
};

export type CommunityClientOptions = {
  baseUrl?: string;
  accessToken?: string;
  fetcher?: typeof fetch;
};

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function requestJson<T>(path: string, options: CommunityClientOptions, init?: RequestInit): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  const response = await fetcher(resolveApiUrl(path, options.baseUrl), {
    ...init,
    credentials: options.baseUrl ? "omit" : "same-origin",
    headers,
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? "커뮤니티 요청을 처리하지 못했습니다.");
  if (!payload) throw new Error("커뮤니티 응답이 비어 있습니다.");
  return payload;
}

export function getCommunitySummary(options: CommunityClientOptions) {
  return requestJson<CommunitySummary>("/api/community/summary", options);
}

export function getCommunityThread(threadId: string, options: CommunityClientOptions) {
  return requestJson<CommunityThreadDetail>(`/api/community/threads/${encodeURIComponent(threadId)}`, options);
}

export function getCommunityRankings(period: CommunityRankingPeriod, options: CommunityClientOptions) {
  return requestJson<{ period: CommunityRankingPeriod; rankings: CommunityRankingEntry[]; currentUserRank: number | null }>(
    `/api/community/rankings?period=${encodeURIComponent(period)}`,
    options,
  );
}

export function createCommunityThread(input: CreateCommunityThreadInput, options: CommunityClientOptions) {
  return requestJson<{ thread: CommunityThread }>("/api/community/threads", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function createCommunityComment(threadId: string, body: string, options: CommunityClientOptions, parentCommentId?: string) {
  return requestJson<{ comment: CommunityComment }>(
    `/api/community/threads/${encodeURIComponent(threadId)}/comments`,
    options,
    { body: JSON.stringify({ body, parentCommentId }), method: "POST" },
  );
}

export function setCommunityReaction(
  input: { targetType: "thread" | "comment"; targetId: string; reactionType: CommunityReactionType; active: boolean },
  options: CommunityClientOptions,
) {
  return requestJson<{ active: boolean }>("/api/community/reactions", options, {
    body: JSON.stringify(input),
    method: "PUT",
  });
}

export function updateCommunityProfile(
  input: { displayName?: string; rankingOptIn?: boolean; showLevel?: boolean },
  options: CommunityClientOptions,
) {
  return requestJson<{ profile: CommunityProfile }>("/api/community/profile", options, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function submitCommunityReport(
  input: { targetType: "thread" | "comment"; targetId: string; reason: string; details?: string },
  options: CommunityClientOptions,
) {
  return requestJson<{ reported: true }>("/api/community/reports", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function recordCommunityReadingCompletion(
  input: { bookId: string; chapter: number; method: "scroll" | "chapter_tts" | "today_plan_tts" },
  options: CommunityClientOptions,
) {
  return requestJson<{ awarded: boolean; points: number }>("/api/community/reading-completions", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}
