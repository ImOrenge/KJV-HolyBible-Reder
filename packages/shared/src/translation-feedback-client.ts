import type { PublicFeedbackSummary, TranslationFeedbackIssueType } from "./translation-feedback/feedback-types";

export type TranslationFeedbackSubmission = {
  issueType: TranslationFeedbackIssueType;
  selectedText?: string | null;
  suggestedText?: string | null;
  userComment?: string | null;
  verseKey: string;
};

export type TranslationFeedbackSubmissionResponse = {
  feedback: PublicFeedbackSummary;
};

function resolveApiUrl(path: string, baseUrl?: string) {
  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export async function submitTranslationFeedback(
  submission: TranslationFeedbackSubmission,
  options: {
    accessToken?: string | null;
    baseUrl?: string;
    fetcher?: typeof fetch;
  } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetcher(resolveApiUrl("/api/translation-feedback", options.baseUrl), {
    body: JSON.stringify(submission),
    headers,
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as (TranslationFeedbackSubmissionResponse & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "번역 의견을 저장하지 못했습니다.");
  }

  if (!payload?.feedback) {
    throw new Error("번역 의견 응답이 올바르지 않습니다.");
  }

  return payload as TranslationFeedbackSubmissionResponse;
}
