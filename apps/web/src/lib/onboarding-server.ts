import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserHonorific, UserOnboardingProfile } from "@kjv/shared/onboarding";
import { NextResponse } from "next/server";

import { createBearerClient, createClient } from "@/lib/supabase/server";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const onboardingCorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  Vary: "Origin",
};

export type UserProfileRow = {
  avatar_path: string | null;
  full_name: string;
  honorific: UserHonorific;
  nickname: string;
  onboarding_completed_at: string;
  updated_at: string;
  user_id: string;
};

export class OnboardingWriteError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "OnboardingWriteError";
  }
}

export function onboardingJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...onboardingCorsHeaders, ...init?.headers },
  });
}

export function onboardingOptions() {
  return new Response(null, { headers: onboardingCorsHeaders, status: 204 });
}

function getBearerAccessToken(request: Request) {
  const [scheme, token] = (request.headers.get("authorization") ?? "").split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireOnboardingUser(request: Request) {
  const accessToken = getBearerAccessToken(request);
  const client = accessToken ? createBearerClient(accessToken) : await createClient();
  const result = accessToken ? await client.auth.getUser(accessToken) : await client.auth.getUser();

  if (result.error || !result.data.user) {
    return { error: onboardingJson({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  return { client, user: result.data.user };
}

export function getAvatarPublicUrl(client: SupabaseClient, avatarPath: string | null, version?: string) {
  if (!avatarPath) return null;
  const { data } = client.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(avatarPath);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}

export async function deleteUserAvatar(client: SupabaseClient, userId: string) {
  const { error } = await client.storage.from(PROFILE_AVATAR_BUCKET).remove([`${userId}/avatar`]);
  if (error) throw new OnboardingWriteError("프로필 사진을 삭제하지 못했습니다.", error.name);
}

export function mapUserProfile(client: SupabaseClient, row: UserProfileRow): UserOnboardingProfile {
  return {
    avatarPath: row.avatar_path,
    avatarUrl: getAvatarPublicUrl(client, row.avatar_path, row.updated_at),
    fullName: row.full_name,
    honorific: row.honorific,
    nickname: row.nickname,
    onboardingCompletedAt: row.onboarding_completed_at,
    userId: row.user_id,
  };
}

export async function getUserProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_profiles")
    .select("user_id,nickname,full_name,honorific,avatar_path,onboarding_completed_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle<UserProfileRow>();

  if (error) throw new Error(error.message);
  return data ? mapUserProfile(client, data) : null;
}

export async function saveUserProfile(
  client: SupabaseClient,
  user: User,
  input: { avatarPath: string | null; fullName: string; honorific: UserHonorific; nickname: string },
) {
  const expectedAvatarPath = `${user.id}/avatar`;
  if (input.avatarPath && input.avatarPath !== expectedAvatarPath) {
    throw new Error("프로필 사진 경로를 확인하세요.");
  }

  const { error } = await client.rpc("complete_user_onboarding", {
    p_avatar_path: input.avatarPath,
    p_full_name: input.fullName,
    p_honorific: input.honorific,
    p_nickname: input.nickname,
  });
  if (error) throw new OnboardingWriteError(error.message, error.code);

  const profile = await getUserProfile(client, user.id);
  if (!profile) throw new OnboardingWriteError("저장된 프로필을 불러오지 못했습니다.");
  return profile;
}
