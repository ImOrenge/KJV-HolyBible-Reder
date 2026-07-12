import { communityJson, communityOptions, hydrateComments, hydrateThreads, requireCommunityUser, type CommentRow, type ThreadRow } from "@/lib/community-server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ threadId: string }> };
export function OPTIONS() { return communityOptions(); }

export async function GET(request: Request, context: Context) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const { threadId } = await context.params;
  const [{ data: threadRow, error: threadError }, { data: commentRows, error: commentError }] = await Promise.all([
    auth.service.from("discussion_threads").select("id,author_id,verse_key,title,body,thread_type,kjv_text_snapshot,ko_text_snapshot,status,comment_count,helpful_count,created_at,updated_at")
      .eq("id", threadId).in("status", ["open", "locked"]).maybeSingle(),
    auth.service.from("discussion_comments").select("id,thread_id,author_id,parent_comment_id,body,helpful_count,created_at,updated_at")
      .eq("thread_id", threadId).eq("status", "visible").order("created_at"),
  ]);
  if (threadError || commentError) return communityJson({ error: threadError?.message ?? commentError?.message }, { status: 500 });
  if (!threadRow) return communityJson({ error: "토론을 찾을 수 없습니다." }, { status: 404 });
  const [[thread], comments] = await Promise.all([
    hydrateThreads(auth.service, [threadRow as ThreadRow], auth.user.id),
    hydrateComments(auth.service, (commentRows ?? []) as CommentRow[], auth.user.id),
  ]);
  return communityJson({ thread, comments });
}
