import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { PublicFeedbackSummary, TranslationFeedbackRow } from "@/lib/translation-feedback/feedback-types";

export const dynamic = "force-dynamic";

function toPublicFeedbackSummary(row: TranslationFeedbackRow): PublicFeedbackSummary {
  return {
    id: row.id,
    issueType: row.issue_type,
    selectedText: row.selected_text,
    status: row.status,
    suggestedText: row.suggested_text,
    updatedAt: row.updated_at,
    verseKey: row.verse_key,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("translation_feedback")
    .select("*")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<TranslationFeedbackRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: (data ?? []).map(toPublicFeedbackSummary) });
}
