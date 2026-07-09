import { NextResponse } from "next/server";

import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";
import {
  translationFeedbackIssueTypes,
  type TranslationFeedbackIssueType,
  type TranslationFeedbackRow,
} from "@/lib/translation-feedback/feedback-types";

export const dynamic = "force-dynamic";

type ReportFeedbackRow = Pick<
  TranslationFeedbackRow,
  "book_order" | "chapter" | "created_at" | "id" | "issue_type" | "selected_text" | "submitted_by" | "verse_key"
>;

type CountRow = {
  count: number;
  key: string;
  label: string;
};

function incrementCount(map: Map<string, CountRow>, key: string, label: string) {
  const current = map.get(key);
  map.set(key, { count: (current?.count ?? 0) + 1, key, label });
}

function topCounts(map: Map<string, CountRow>, limit: number) {
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user ||
    !(await hasAnyEffectiveRole(supabase, user, ["feedback_reviewer", "translator", "lead_reviewer", "admin"]))
  ) {
    return NextResponse.json({ error: "관리 권한이 없습니다." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("translation_feedback")
    .select("id,book_order,chapter,verse_key,issue_type,selected_text,submitted_by,created_at")
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<ReportFeedbackRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const byReference = new Map<string, CountRow>();
  const byIssueType = new Map<string, CountRow>();
  const dictionarySenseTerms = new Map<string, CountRow>();
  const recentSubmitters = new Map<string, CountRow>();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const row of rows) {
    incrementCount(byReference, `${row.book_order}.${row.chapter}`, `${row.book_order}권 ${row.chapter}장`);
    incrementCount(byIssueType, row.issue_type, row.issue_type);

    if (row.issue_type === "dictionary_sense_mismatch" && row.selected_text) {
      const term = row.selected_text.trim().toLowerCase();
      if (term) {
        incrementCount(dictionarySenseTerms, term, row.selected_text.trim());
      }
    }

    if (new Date(row.created_at).getTime() >= oneHourAgo) {
      incrementCount(recentSubmitters, row.submitted_by, row.submitted_by);
    }
  }

  for (const issueType of translationFeedbackIssueTypes) {
    if (!byIssueType.has(issueType)) {
      byIssueType.set(issueType, { count: 0, key: issueType, label: issueType });
    }
  }

  return NextResponse.json({
    abuseCandidates: topCounts(recentSubmitters, 20).filter((row) => row.count >= 5),
    byIssueType: topCounts(byIssueType, translationFeedbackIssueTypes.length) as Array<
      CountRow & { key: TranslationFeedbackIssueType }
    >,
    byReference: topCounts(byReference, 30),
    dictionarySenseTerms: topCounts(dictionarySenseTerms, 30),
    sampledRows: rows.length,
  });
}
