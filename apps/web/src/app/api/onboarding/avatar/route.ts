import {
  getAvatarPublicUrl,
  onboardingJson,
  onboardingOptions,
  PROFILE_AVATAR_BUCKET,
  requireOnboardingUser,
} from "@/lib/onboarding-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return onboardingOptions(); }

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 2 * 1024 * 1024;

function hasExpectedSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  const auth = await requireOnboardingUser(request);
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  const avatar = formData?.get("avatar");
  if (!(avatar instanceof File) || !avatar.size || avatar.size > maxAvatarBytes || !allowedTypes.has(avatar.type)) {
    return onboardingJson({ error: "2MB 이하의 JPG, PNG, WebP 이미지를 선택하세요." }, { status: 400 });
  }

  const body = new Uint8Array(await avatar.arrayBuffer());
  if (!hasExpectedSignature(body, avatar.type)) {
    return onboardingJson({ error: "이미지 파일 형식을 확인하세요." }, { status: 400 });
  }

  const avatarPath = `${auth.user.id}/avatar`;
  const { error } = await auth.client.storage.from(PROFILE_AVATAR_BUCKET).upload(avatarPath, body, {
    cacheControl: "3600",
    contentType: avatar.type,
    upsert: true,
  });
  if (error) return onboardingJson({ error: "프로필 사진을 저장하지 못했습니다." }, { status: 500 });

  return onboardingJson({
    avatarPath,
    avatarUrl: getAvatarPublicUrl(auth.client, avatarPath, String(Date.now())),
  });
}
