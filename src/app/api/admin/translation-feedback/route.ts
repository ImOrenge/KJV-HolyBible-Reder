import { NextResponse, type NextRequest } from "next/server";

import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";
import {
  isFeedbackPriority,
  isFeedbackStatus,
  isIssueType,
} from "@/lib/translation-feedback/feedback-validation";
import type { TranslationFeedbackRow } from "@/lib/translation-feedback/feedback-types";

export const dynamic = "force-dynamic";

type DuplicateCandidateRow = Pick<TranslationFeedbackRow, "duplicate_of" | "id" | "issue_type" | "selected_text" | "verse_key">;

function toDuplicateKey(row: Pick<TranslationFeedbackRow, "issue_type" | "selected_text" | "verse_key">) {
  return [row.verse_key, row.issue_type, row.selected_text?.trim().toLowerCase() ?? ""].join("\u0000");
}

async function addDuplicateCounts(supabase: Awaited<ReturnType<typeof createClient>>, rows: TranslationFeedbackRow[]) {
  if (!rows.length) {
    return [];
  }

  const verseKeys = [...new Set(rows.map((row) => row.verse_key))];
  const { data, error } = await supabase
    .from("translation_feedback")
    .select("id,verse_key,issue_type,selected_text,duplicate_of")
    .in("verse_key", verseKeys)
    .limit(1000)
    .returns<DuplicateCandidateRow[]>();

  if (error) {
    throw error;
  }

  const groupCounts = new Map<string, number>();
  const childCounts = new Map<string, number>();
  for (const candidate of data ?? []) {
    const key = toDuplicateKey(candidate);
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
    if (candidate.duplicate_of) {
      childCounts.set(candidate.duplicate_of, (childCounts.get(candidate.duplicate_of) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    ...row,
    duplicate_count: Math.max((groupCounts.get(toDuplicateKey(row)) ?? 1) - 1, childCounts.get(row.id) ?? 0),
  }));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !(await hasAnyEffectiveRole(supabase, user, ["feedback_reviewer", "translator", "lead_reviewer", "admin"]))
  ) {
    return NextResponse.json({ error: "관리 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const issueType = searchParams.get("issueType");
  const priority = searchParams.get("priority");
  const verseKey = searchParams.get("verseKey")?.trim();
  const assignedTo = searchParams.get("assignedTo")?.trim();
  const bookOrder = Number.parseInt(searchParams.get("bookOrder") ?? "", 10);
  const chapter = Number.parseInt(searchParams.get("chapter") ?? "", 10);
  const onlyMine = searchParams.get("mine") === "true";
  const onlyDuplicates = searchParams.get("duplicates") === "true";

  let query = supabase
    .from("translation_feedback")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  if (isFeedbackStatus(status)) {
    query = query.eq("status", status);
  }

  if (isIssueType(issueType)) {
    query = query.eq("issue_type", issueType);
  }

  if (isFeedbackPriority(priority)) {
    query = query.eq("priority", priority);
  }

  if (verseKey) {
    query = query.ilike("verse_key", `%${verseKey}%`);
  }

  if (Number.isInteger(bookOrder) && bookOrder >= 1 && bookOrder <= 66) {
    query = query.eq("book_order", bookOrder);
  }

  if (Number.isInteger(chapter) && chapter > 0) {
    query = query.eq("chapter", chapter);
  }

  if (onlyMine && user) {
    query = query.eq("assigned_to", user.id);
  } else if (assignedTo === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }

  const { data, error } = await query.returns<TranslationFeedbackRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const feedback = await addDuplicateCounts(supabase, data ?? []);
    return NextResponse.json({ feedback: onlyDuplicates ? feedback.filter((row) => (row.duplicate_count ?? 0) > 0) : feedback });
  } catch (duplicateError) {
    return NextResponse.json({ error: duplicateError instanceof Error ? duplicateError.message : "중복 후보 계산에 실패했습니다." }, { status: 500 });
  }
}
