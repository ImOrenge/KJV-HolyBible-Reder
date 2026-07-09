export const translationFeedbackIssueTypes = [
  "wrong_meaning",
  "dictionary_sense_mismatch",
  "awkward_expression",
  "theological_term",
  "typo_or_grammar",
  "other",
] as const;

export const translationFeedbackStatuses = [
  "new",
  "triaged",
  "reviewing",
  "needs_source_check",
  "accepted",
  "rejected",
  "merged",
  "implemented",
] as const;

export const translationFeedbackPriorities = ["low", "normal", "high", "blocker"] as const;

export const translationFeedbackEventTypes = [
  "submitted",
  "triaged",
  "assigned",
  "status_changed",
  "commented",
  "merged",
  "accepted",
  "rejected",
  "revision_linked",
  "implemented",
  "approved",
] as const;

export type TranslationFeedbackIssueType = (typeof translationFeedbackIssueTypes)[number];
export type TranslationFeedbackStatus = (typeof translationFeedbackStatuses)[number];
export type TranslationFeedbackPriority = (typeof translationFeedbackPriorities)[number];
export type TranslationFeedbackEventType = (typeof translationFeedbackEventTypes)[number];

export type TranslationFeedbackRow = {
  id: string;
  submitted_by: string;
  verse_key: string;
  en_verse_id: string | null;
  ko_verse_id: string | null;
  book_order: number;
  chapter: number;
  verse: number;
  kjv_text_snapshot: string;
  ko_text_snapshot: string;
  translation_name: string;
  translation_status_snapshot: string;
  selected_text: string | null;
  term_id: string | null;
  issue_type: TranslationFeedbackIssueType;
  suggested_text: string | null;
  user_comment: string | null;
  status: TranslationFeedbackStatus;
  priority: TranslationFeedbackPriority;
  assigned_to: string | null;
  duplicate_of: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
  duplicate_count?: number;
};

export type TranslationFeedbackEventRow = {
  id: string;
  feedback_id: string;
  actor_id: string | null;
  event_type: TranslationFeedbackEventType;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PublicFeedbackSummary = {
  id: string;
  verseKey: string;
  issueType: TranslationFeedbackIssueType;
  selectedText: string | null;
  suggestedText: string | null;
  status: TranslationFeedbackStatus;
  createdAt: string;
  updatedAt: string;
};

export const issueTypeLabels: Record<TranslationFeedbackIssueType, string> = {
  wrong_meaning: "문맥상 의미가 다름",
  dictionary_sense_mismatch: "사전 의미 선택이 다름",
  awkward_expression: "표현이 어색함",
  theological_term: "신학 용어 문제",
  typo_or_grammar: "오타/문법 문제",
  other: "기타",
};

export const statusLabels: Record<TranslationFeedbackStatus, string> = {
  new: "접수됨",
  triaged: "분류됨",
  reviewing: "검토 중",
  needs_source_check: "원문 확인 필요",
  accepted: "반영 예정",
  rejected: "반려됨",
  merged: "병합됨",
  implemented: "반영됨",
};

export const priorityLabels: Record<TranslationFeedbackPriority, string> = {
  low: "낮음",
  normal: "보통",
  high: "높음",
  blocker: "긴급",
};
