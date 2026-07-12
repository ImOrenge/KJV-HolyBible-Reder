import { communityJson, communityOptions, requireCommunityUser } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }
const reasons = new Set(["spam", "harassment", "hate_or_abuse", "off_topic", "private_information", "other"]);

export async function POST(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const input = await request.json().catch(() => null) as { targetType?: "thread" | "comment"; targetId?: string; reason?: string; details?: string } | null;
  if (!input?.targetId || !["thread", "comment"].includes(input.targetType ?? "") || !reasons.has(input.reason ?? "")) {
    return communityJson({ error: "신고 내용을 확인하세요." }, { status: 400 });
  }
  const targetTable = input.targetType === "thread" ? "discussion_threads" : "discussion_comments";
  const { data: target } = await auth.service.from(targetTable).select("id,author_id").eq("id", input.targetId).maybeSingle();
  if (!target) return communityJson({ error: "신고 대상을 찾을 수 없습니다." }, { status: 404 });
  if (target.author_id === auth.user.id) return communityJson({ error: "본인의 콘텐츠는 신고할 수 없습니다." }, { status: 400 });
  const { error } = await auth.service.from("discussion_reports").insert({
    reporter_id: auth.user.id, target_type: input.targetType, reason: input.reason,
    details: input.details?.trim().slice(0, 1000) || null,
    thread_id: input.targetType === "thread" ? input.targetId : null,
    comment_id: input.targetType === "comment" ? input.targetId : null,
  });
  if (error?.code === "23505") return communityJson({ reported: true });
  return error ? communityJson({ error: error.message }, { status: 500 }) : communityJson({ reported: true });
}
