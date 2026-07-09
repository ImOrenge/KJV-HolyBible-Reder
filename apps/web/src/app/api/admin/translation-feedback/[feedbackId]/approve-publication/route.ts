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

  if (userError || !user || !(await hasAnyEffectiveRole(supabase, user, ["lead_reviewer"]))) {
    return NextResponse.json({ error: "최종 승인 권한이 없습니다." }, { status: 403 });
  }

  const { feedbackId } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const comment = normalizeLongTextInput(payload?.comment, feedbackTextLimits.reviewerNote);

  const { data: reviewId, error: approvalError } = await supabase.rpc("approve_translation_feedback_publication", {
    p_comment: comment,
    p_feedback_id: feedbackId,
  });

  if (approvalError) {
    return NextResponse.json({ error: approvalError.message }, { status: 500 });
  }

  return NextResponse.json({ reviewId });
}
