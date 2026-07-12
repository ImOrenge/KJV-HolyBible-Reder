import { communityJson, communityOptions, requireCommunityUser } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

export async function POST(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const input = await request.json().catch(() => null) as { bookId?: string; chapter?: number; method?: string } | null;
  if (!input?.bookId || !Number.isInteger(input.chapter) || (input.chapter ?? 0) < 1 || !["scroll", "chapter_tts", "today_plan_tts"].includes(input.method ?? "")) {
    return communityJson({ error: "통독 완료 정보를 확인하세요." }, { status: 400 });
  }
  const { data: book, error: bookError } = await auth.service.from("bible_books").select("id,chapter_count").eq("app_book_id", input.bookId).maybeSingle();
  if (bookError) return communityJson({ error: bookError.message }, { status: 500 });
  if (!book || input.chapter! > book.chapter_count) return communityJson({ error: "성경 장 정보를 찾을 수 없습니다." }, { status: 404 });
  const { data: before } = await auth.service.from("community_point_balances").select("total_points").eq("user_id", auth.user.id).maybeSingle();
  const { error } = await auth.service.from("reading_completion_evidence").insert({
    user_id: auth.user.id, book_id: book.id, chapter: input.chapter, completion_method: input.method,
  });
  if (error && error.code !== "23505") return communityJson({ error: error.message }, { status: 500 });
  const { data: after } = await auth.service.from("community_point_balances").select("total_points").eq("user_id", auth.user.id).maybeSingle();
  const beforePoints = before?.total_points ?? 0;
  const afterPoints = after?.total_points ?? beforePoints;
  return communityJson({ awarded: afterPoints > beforePoints, points: afterPoints });
}
