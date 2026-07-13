export const USER_HONORIFICS = [
  "성도님",
  "형제님",
  "자매님",
  "집사님",
  "권사님",
  "장로님",
  "목사님",
] as const;

export type UserHonorific = (typeof USER_HONORIFICS)[number];

export type UserOnboardingProfile = {
  avatarPath: string | null;
  avatarUrl: string | null;
  fullName: string;
  honorific: UserHonorific;
  nickname: string;
  onboardingCompletedAt: string;
  userId: string;
};

export type UserOnboardingStatus = {
  completed: boolean;
  profile: UserOnboardingProfile | null;
};

export type CompleteUserOnboardingInput = {
  avatarPath?: string | null;
  fullName: string;
  honorific: UserHonorific;
  nickname: string;
};

export type OnboardingClientOptions = {
  accessToken?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export type OnboardingValidationResult =
  | { input: Required<CompleteUserOnboardingInput>; valid: true }
  | { message: string; valid: false };

export function validateOnboardingInput(input: Partial<CompleteUserOnboardingInput>): OnboardingValidationResult {
  const nickname = input.nickname?.trim() ?? "";
  const fullName = input.fullName?.trim() ?? "";
  const honorific = input.honorific;
  const avatarPath = input.avatarPath?.trim() || null;

  if (nickname.length < 2 || nickname.length > 24) {
    return { message: "닉네임은 2~24자로 입력하세요.", valid: false };
  }
  if (fullName.length < 2 || fullName.length > 50) {
    return { message: "이름은 2~50자로 입력하세요.", valid: false };
  }
  if (!honorific || !USER_HONORIFICS.includes(honorific)) {
    return { message: "호칭을 선택하세요.", valid: false };
  }

  return {
    input: { avatarPath, fullName, honorific, nickname },
    valid: true,
  };
}

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function requestJson<T>(path: string, options: OnboardingClientOptions, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await (options.fetcher ?? fetch)(resolveApiUrl(path, options.baseUrl), {
    ...init,
    credentials: options.baseUrl ? "omit" : "same-origin",
    headers,
  });
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? "온보딩 요청을 처리하지 못했습니다.");
  if (!payload) throw new Error("온보딩 응답이 비어 있습니다.");
  return payload;
}

export function getUserOnboarding(options: OnboardingClientOptions = {}) {
  return requestJson<UserOnboardingStatus>("/api/onboarding", options);
}

export function completeUserOnboarding(input: CompleteUserOnboardingInput, options: OnboardingClientOptions = {}) {
  return requestJson<UserOnboardingStatus>("/api/onboarding", options, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function uploadUserAvatar(formData: FormData, options: OnboardingClientOptions = {}) {
  return requestJson<{ avatarPath: string; avatarUrl: string }>("/api/onboarding/avatar", options, {
    body: formData,
    method: "POST",
  });
}
