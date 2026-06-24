import {
  translationFeedbackIssueTypes,
  translationFeedbackPriorities,
  translationFeedbackStatuses,
  type TranslationFeedbackIssueType,
  type TranslationFeedbackPriority,
  type TranslationFeedbackStatus,
} from "./feedback-types";

export const feedbackTextLimits = {
  selectedText: 240,
  suggestedText: 1200,
  userComment: 1200,
  reviewerNote: 2000,
  revisionText: 4000,
};

type FeedbackTextMode = "singleLine" | "multiLine";

function normalizeForMode(value: string, mode: FeedbackTextMode) {
  return mode === "singleLine" ? value.replace(/\s+/g, " ").trim() : value.trim();
}

function isTextInputOverLimit(value: unknown, maxLength: number, mode: FeedbackTextMode) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeForMode(value, mode);
  return Boolean(normalized) && normalized.length > maxLength;
}

function containsHtmlTag(value: unknown) {
  return typeof value === "string" && /<\/?[a-z][\s\S]*>/i.test(value);
}

export function normalizeTextInput(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function normalizeLongTextInput(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function isIssueType(value: unknown): value is TranslationFeedbackIssueType {
  return typeof value === "string" && translationFeedbackIssueTypes.includes(value as TranslationFeedbackIssueType);
}

export function isFeedbackStatus(value: unknown): value is TranslationFeedbackStatus {
  return typeof value === "string" && translationFeedbackStatuses.includes(value as TranslationFeedbackStatus);
}

export function isFeedbackPriority(value: unknown): value is TranslationFeedbackPriority {
  return typeof value === "string" && translationFeedbackPriorities.includes(value as TranslationFeedbackPriority);
}

export function parseFeedbackSubmissionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { error: "Invalid feedback payload." } as const;
  }

  const value = payload as Record<string, unknown>;
  const verseKey = normalizeTextInput(value.verseKey, 80);
  const issueType = value.issueType;

  if (!verseKey) {
    return { error: "구절 정보가 없습니다." } as const;
  }

  if (!isIssueType(issueType)) {
    return { error: "피드백 유형을 선택하세요." } as const;
  }

  if (containsHtmlTag(value.selectedText) || containsHtmlTag(value.suggestedText) || containsHtmlTag(value.userComment)) {
    return { error: "HTML 형식은 입력할 수 없습니다. 일반 텍스트로 작성하세요." } as const;
  }

  if (isTextInputOverLimit(value.selectedText, feedbackTextLimits.selectedText, "singleLine")) {
    return { error: `문제가 되는 표현은 ${feedbackTextLimits.selectedText}자 이하로 입력하세요.` } as const;
  }

  if (isTextInputOverLimit(value.suggestedText, feedbackTextLimits.suggestedText, "multiLine")) {
    return { error: `제안 번역은 ${feedbackTextLimits.suggestedText}자 이하로 입력하세요.` } as const;
  }

  if (isTextInputOverLimit(value.userComment, feedbackTextLimits.userComment, "multiLine")) {
    return { error: `설명은 ${feedbackTextLimits.userComment}자 이하로 입력하세요.` } as const;
  }

  const selectedText = normalizeTextInput(value.selectedText, feedbackTextLimits.selectedText);
  const suggestedText = normalizeLongTextInput(value.suggestedText, feedbackTextLimits.suggestedText);
  const userComment = normalizeLongTextInput(value.userComment, feedbackTextLimits.userComment);

  if (!selectedText && !suggestedText && !userComment) {
    return { error: "문제가 되는 표현이나 제안 내용을 입력하세요." } as const;
  }

  return {
    data: {
      issueType,
      selectedText,
      suggestedText,
      userComment,
      verseKey,
    },
  } as const;
}
