import { validateOnboardingInput } from "@kjv/shared/onboarding";

import {
  getUserProfile,
  OnboardingWriteError,
  onboardingJson,
  onboardingOptions,
  requireOnboardingUser,
  saveUserProfile,
} from "@/lib/onboarding-server";

export const dynamic = "force-dynamic";
export function OPTIONS() { return onboardingOptions(); }

export async function GET(request: Request) {
  const auth = await requireOnboardingUser(request);
  if ("error" in auth) return auth.error;

  try {
    const profile = await getUserProfile(auth.client, auth.user.id);
    return onboardingJson({ completed: Boolean(profile), profile });
  } catch {
    return onboardingJson({ error: "프로필을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOnboardingUser(request);
  if ("error" in auth) return auth.error;

  const input = await request.json().catch(() => null);
  const validation = validateOnboardingInput(input ?? {});
  if (!validation.valid) return onboardingJson({ error: validation.message }, { status: 400 });

  try {
    const profile = await saveUserProfile(auth.client, auth.user, validation.input);
    return onboardingJson({ completed: true, profile });
  } catch (error) {
    if (error instanceof OnboardingWriteError && error.code === "23505") {
      return onboardingJson({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }
    return onboardingJson({ error: "프로필을 저장하지 못했습니다." }, { status: 500 });
  }
}
