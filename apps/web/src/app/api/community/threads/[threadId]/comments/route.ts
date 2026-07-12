import { communityJson, communityOptions, ensureCommunityProfile, hydrateComments, requireCommunityUser, type CommentRow } from "@/lib/community-server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ threadId: string }> };
export function OPTIONS() { return communityOptions(); }

export async function POST(request: Request, context: Context) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const { threadId } = await context.params;
  const input = await request.json().catch(() => null) as { body?: string; parentCommentId?: string } | null;
  const body = input?.body?.trim() ?? "";
  if (!body || body.length > 3000) return communityJson({ error: "댓글은 1~3000자로 작성하세요." }, { status: 400 });
  try {
    await ensureCommunityProfile(auth.service, auth.user);
    const { data: thread } = await auth.service.from("discussion_threads").select("id,status").eq("id", threadId).maybeSingle();
    if (!thread || thread.status !== "open") return communityJson({ error: "댓글을 작성할 수 없는 토론입니다." }, { status: 409 });
    let parentCommentId: string | null = null;
    if (input?.parentCommentId) {
      const { data: parent } = await auth.service.from("discussion_comments").select("id,thread_id,parent_comment_id,status")
        .eq("id", input.parentCommentId).maybeSingle();
      if (!parent || parent.thread_id !== threadId || parent.parent_comment_id || parent.status !== "visible") {
        return communityJson({ error: "답글 대상 댓글을 확인하세요." }, { status: 400 });
      }
      parentCommentId = parent.id;
    }
    const { data: row, error } = await auth.service.from("discussion_comments").insert({
      author_id: auth.user.id, body, parent_comment_id: parentCommentId, thread_id: threadId,
    }).select("id,thread_id,author_id,parent_comment_id,body,helpful_count,created_at,updated_at").single();
    if (error || !row) throw new Error(error?.message ?? "댓글을 저장하지 못했습니다.");
    const [comment] = await hydrateComments(auth.service, [row as CommentRow], auth.user.id);
    return communityJson({ comment }, { status: 201 });
  } catch (error) {
    return communityJson({ error: error instanceof Error ? error.message : "댓글을 저장하지 못했습니다." }, { status: 500 });
  }
}
