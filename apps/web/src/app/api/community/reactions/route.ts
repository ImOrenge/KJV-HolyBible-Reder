import { communityJson, communityOptions, requireCommunityUser } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

export async function PUT(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const input = await request.json().catch(() => null) as {
    targetType?: "thread" | "comment"; targetId?: string; reactionType?: "helpful" | "encourage"; active?: boolean;
  } | null;
  if (!input?.targetId || !["thread", "comment"].includes(input.targetType ?? "") || !["helpful", "encourage"].includes(input.reactionType ?? "")) {
    return communityJson({ error: "반응 대상을 확인하세요." }, { status: 400 });
  }
  const targetColumn = input.targetType === "thread" ? "thread_id" : "comment_id";
  const targetTable = input.targetType === "thread" ? "discussion_threads" : "discussion_comments";
  const { data: target } = await auth.service.from(targetTable).select("id,status").eq("id", input.targetId).maybeSingle();
  const visible = input.targetType === "thread" ? ["open", "locked"].includes(target?.status) : target?.status === "visible";
  if (!target || !visible) return communityJson({ error: "반응 대상을 찾을 수 없습니다." }, { status: 404 });
  const baseQuery = auth.service.from("discussion_reactions").delete().eq("user_id", auth.user.id)
    .eq("target_type", input.targetType).eq("reaction_type", input.reactionType!).eq(targetColumn, input.targetId);
  if (!input.active) {
    const { error } = await baseQuery;
    return error ? communityJson({ error: error.message }, { status: 500 }) : communityJson({ active: false });
  }
  const { data: existing } = await auth.service.from("discussion_reactions").select("id").eq("user_id", auth.user.id)
    .eq("target_type", input.targetType).eq("reaction_type", input.reactionType!).eq(targetColumn, input.targetId).maybeSingle();
  if (!existing) {
    const { error } = await auth.service.from("discussion_reactions").insert({
      user_id: auth.user.id, target_type: input.targetType, reaction_type: input.reactionType,
      thread_id: input.targetType === "thread" ? input.targetId : null,
      comment_id: input.targetType === "comment" ? input.targetId : null,
    });
    if (error) return communityJson({ error: error.message }, { status: 500 });
  }
  return communityJson({ active: true });
}
