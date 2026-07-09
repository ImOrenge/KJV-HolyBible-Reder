import { NextResponse } from "next/server";

import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";
import { feedbackTextLimits, normalizeLongTextInput } from "@/lib/translation-feedback/feedback-validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    feedbackId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !(await hasAnyEffectiveRole(supabase, user, ["translator", "lead_reviewer"]))) {
    return NextResponse.json({ error: "번역 수정 권한이 없습니다." }, { status: 403 });
  }

  const { feedbackId } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const revisedText = normalizeLongTextInput(payload?.revisedText, feedbackTextLimits.revisionText);
  const comment = normalizeLongTextInput(payload?.comment, feedbackTextLimits.reviewerNote);

  if (!revisedText) {
    return NextResponse.json({ error: "수정 번역문을 입력하세요." }, { status: 400 });
  }

  const { data: reviewId, error: revisionError } = await supabase.rpc("apply_translation_feedback_revision", {
    p_comment: comment,
    p_feedback_id: feedbackId,
    p_revised_text: revisedText,
  });

  if (revisionError) {
    return NextResponse.json({ error: revisionError.message }, { status: 500 });
  }

  return NextResponse.json({ reviewId });
}
