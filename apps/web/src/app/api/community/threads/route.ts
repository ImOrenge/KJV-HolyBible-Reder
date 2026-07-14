import type { CommunityThreadType } from "@kjv/shared/community";

import { communityJson, communityOptions, ensureCommunityProfile, hydrateThreads, requireCommunityUser, type ThreadRow } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

const threadTypes = new Set<CommunityThreadType>(["qt_share", "question", "observation", "application", "cross_reference"]);

export async function GET(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const verseKey = url.searchParams.get("verseKey")?.trim().toUpperCase();
  let query = auth.service.from("discussion_threads").select("id,author_id,verse_key,title,body,thread_type,kjv_text_snapshot,ko_text_snapshot,status,comment_count,helpful_count,created_at,updated_at")
    .in("status", ["open", "locked"]).order("last_activity_at", { ascending: false }).limit(30);
  if (verseKey) query = query.eq("verse_key", verseKey);
  const { data, error } = await query;
  if (error) return communityJson({ error: error.message }, { status: 500 });
  return communityJson({ threads: await hydrateThreads(auth.service, (data ?? []) as ThreadRow[], auth.user.id) });
}
export async function POST(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const input = await request.json().catch(() => null) as { verseKey?: string; title?: string; body?: string; threadType?: CommunityThreadType } | null;
  const verseKey = input?.verseKey?.trim().toUpperCase() ?? "";
  const title = input?.title?.trim() ?? "";
  const body = input?.body?.trim() ?? "";
  const threadType = input?.threadType ?? "qt_share";
  if (!/^[A-Z0-9]+\.\d+\.\d+$/.test(verseKey)) return communityJson({ error: "연결할 성경 구절을 확인하세요." }, { status: 400 });
  if (title.length < 4 || title.length > 120) return communityJson({ error: "제목은 4~120자로 작성하세요." }, { status: 400 });
  if (body.length < 10 || body.length > 4000) return communityJson({ error: "QT 나눔은 10~4000자로 작성하세요." }, { status: 400 });
  if (!threadTypes.has(threadType)) return communityJson({ error: "지원하지 않는 나눔 유형입니다." }, { status: 400 });
  try {
    await ensureCommunityProfile(auth.service, auth.user);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await auth.service.from("discussion_threads").select("id", { count: "exact", head: true }).eq("author_id", auth.user.id).gte("created_at", tenMinutesAgo);
    if ((count ?? 0) >= 3) return communityJson({ error: "QT 나눔 작성이 잠시 제한되었습니다." }, { status: 429 });
    const { data: enVerse, error: verseError } = await auth.service.from("bible_verses_en")
      .select("verse_key,text_en").eq("verse_key", verseKey).maybeSingle<{ verse_key: string; text_en: string }>();
    if (verseError) throw new Error(verseError.message);
    if (!enVerse) return communityJson({ error: "성경 구절을 찾을 수 없습니다." }, { status: 404 });
    const { data: koRows, error: koError } = await auth.service.from("bible_verses_ko")
      .select("text_ko").eq("verse_key", verseKey).eq("translation_status", "approved").eq("is_public", true).order("updated_at", { ascending: false }).limit(1);
    if (koError) throw new Error(koError.message);
    const { data: row, error: insertError } = await auth.service.from("discussion_threads").insert({
      author_id: auth.user.id, body, kjv_text_snapshot: enVerse.text_en,
      ko_text_snapshot: koRows?.[0]?.text_ko ?? null, thread_type: threadType, title, verse_key: verseKey,
    }).select("id,author_id,verse_key,title,body,thread_type,kjv_text_snapshot,ko_text_snapshot,status,comment_count,helpful_count,created_at,updated_at").single();
    if (insertError || !row) throw new Error(insertError?.message ?? "QT 나눔을 저장하지 못했습니다.");
    const [thread] = await hydrateThreads(auth.service, [row as ThreadRow], auth.user.id);
    return communityJson({ thread }, { status: 201 });
  } catch (error) {
    return communityJson({ error: error instanceof Error ? error.message : "QT 나눔을 저장하지 못했습니다." }, { status: 500 });
  }
}
