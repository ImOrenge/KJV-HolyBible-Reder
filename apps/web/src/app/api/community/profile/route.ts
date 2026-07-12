import { communityJson, communityOptions, ensureCommunityProfile, getCommunityProfile, requireCommunityUser } from "@/lib/community-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return communityOptions(); }

export async function PATCH(request: Request) {
  const auth = await requireCommunityUser(request);
  if ("error" in auth) return auth.error;
  const input = await request.json().catch(() => null) as { displayName?: string; rankingOptIn?: boolean; showLevel?: boolean } | null;
  const current = await ensureCommunityProfile(auth.service, auth.user);
  const displayName = input?.displayName === undefined ? current.display_name : input.displayName.trim();
  if (displayName.length < 2 || displayName.length > 40 || displayName.includes("@")) {
    return communityJson({ error: "표시명은 이메일 형식이 아닌 2~40자로 작성하세요." }, { status: 400 });
  }
  const { data, error } = await auth.service.from("user_public_profiles").update({
    display_name: displayName,
    ranking_opt_in: typeof input?.rankingOptIn === "boolean" ? input.rankingOptIn : current.ranking_opt_in,
    show_level: typeof input?.showLevel === "boolean" ? input.showLevel : current.show_level,
  }).eq("user_id", auth.user.id).select("*").single();
  if (error || !data) return communityJson({ error: error?.message ?? "프로필을 저장하지 못했습니다." }, { status: 500 });
  return communityJson({ profile: await getCommunityProfile(auth.service, data) });
}
