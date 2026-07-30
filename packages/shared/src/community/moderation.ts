export const COMMUNITY_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_or_abuse",
  "off_topic",
  "copyright",
  "private_information",
  "impersonation",
  "self_harm_risk",
  "other",
] as const;
export type CommunityReportReasonV2 = (typeof COMMUNITY_REPORT_REASONS)[number];

export type CommunityReportTarget =
  | { targetType: "post"; targetId: string }
  | { targetType: "comment"; targetId: string }
  | { targetType: "profile"; targetId: string };

export type SubmitCommunityReportV2Input = CommunityReportTarget & {
  details?: string;
  reason: CommunityReportReasonV2;
};

export type CommunityModerationAction =
  | "dismiss_report"
  | "hide"
  | "limit"
  | "lock_comments"
  | "remove"
  | "restore"
  | "restrict_user"
  | "suspend_user";
