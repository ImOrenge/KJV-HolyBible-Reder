import { NextResponse } from "next/server";

import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";
import {
  feedbackTextLimits,
  isFeedbackPriority,
  isFeedbackStatus,
  normalizeLongTextInput,
  normalizeTextInput,
} from "@/lib/translation-feedback/feedback-validation";
import type { TranslationFeedbackEventRow, TranslationFeedbackRow } from "@/lib/translation-feedback/feedback-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    feedbackId: string;
  }>;
};

type CurrentVerseRow = {
  id: string;
  text_ko: string;
  translation_name: string;
  translation_status: string;
  is_public: boolean;
};

type ReviewRow = {
  id: string;
  user_id: string | null;
  previous_text: string | null;
  revised_text: string;
  review_status: string;
  comment: string | null;
  created_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOptionalUuid(value: unknown, label: string) {
  const normalized = normalizeTextInput(value, 80);
  if (!normalized) {
    return { value: null } as const;
  }

  if (!uuidPattern.test(normalized)) {
    return { error: `${label} UUID가 올바르지 않습니다.` } as const;
  }

  return { value: normalized } as const;
}

async function requireQueueAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    !(await hasAnyEffectiveRole(supabase, user, ["feedback_reviewer", "translator", "lead_reviewer", "admin"]))
  ) {
    return { error: NextResponse.json({ error: "관리 권한이 없습니다." }, { status: 403 }) } as const;
  }

  return { supabase, user } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireQueueAccess();
  if ("error" in auth) {
    return auth.error;
  }

  const { feedbackId } = await context.params;
  const { data: feedback, error: feedbackError } = await auth.supabase
    .from("translation_feedback")
    .select("*")
    .eq("id", feedbackId)
    .maybeSingle<TranslationFeedbackRow>();

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 500 });
  }

  if (!feedback) {
    return NextResponse.json({ error: "피드백을 찾을 수 없습니다." }, { status: 404 });
  }

  const [
    { data: events, error: eventsError },
    { data: currentKo, error: koError },
    { data: reviews, error: reviewsError },
    { data: relatedFeedback, error: relatedFeedbackError },
  ] =
    await Promise.all([
      auth.supabase
        .from("translation_feedback_events")
        .select("*")
        .eq("feedback_id", feedback.id)
        .order("created_at", { ascending: true })
        .returns<TranslationFeedbackEventRow[]>(),
      auth.supabase
        .from("bible_verses_ko")
        .select("id,text_ko,translation_name,translation_status,is_public")
        .eq("id", feedback.ko_verse_id ?? "")
        .maybeSingle<CurrentVerseRow>(),
      auth.supabase
        .from("translation_reviews")
        .select("id,user_id,previous_text,revised_text,review_status,comment,created_at")
        .eq("ko_verse_id", feedback.ko_verse_id ?? "")
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<ReviewRow[]>(),
      auth.supabase
        .from("translation_feedback")
        .select("*")
        .eq("verse_key", feedback.verse_key)
        .neq("id", feedback.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<TranslationFeedbackRow[]>(),
    ]);

  const firstError = eventsError ?? koError ?? reviewsError ?? relatedFeedbackError;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    currentKo,
    events: events ?? [],
    feedback,
    relatedFeedback: relatedFeedback ?? [],
    reviews: reviews ?? [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireQueueAccess();
  if ("error" in auth) {
    return auth.error;
  }

  const { feedbackId } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid feedback update payload." }, { status: 400 });
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("translation_feedback")
    .select("*")
    .eq("id", feedbackId)
    .maybeSingle<TranslationFeedbackRow>();

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  if (!current) {
    return NextResponse.json({ error: "피드백을 찾을 수 없습니다." }, { status: 404 });
  }

  const nextStatus = isFeedbackStatus(payload.status) ? payload.status : current.status;
  const nextPriority = isFeedbackPriority(payload.priority) ? payload.priority : current.priority;
  const reviewerNote = normalizeLongTextInput(payload.reviewerNote, feedbackTextLimits.reviewerNote);
  const assignedTo = parseOptionalUuid(payload.assignedTo, "담당자");
  const duplicateOf = parseOptionalUuid(payload.duplicateOf, "중복 대상");

  if ("error" in assignedTo) {
    return NextResponse.json({ error: assignedTo.error }, { status: 400 });
  }

  if ("error" in duplicateOf) {
    return NextResponse.json({ error: duplicateOf.error }, { status: 400 });
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("translation_feedback")
    .update({
      assigned_to: assignedTo.value,
      duplicate_of: duplicateOf.value,
      priority: nextPriority,
      reviewed_at: nextStatus === current.status ? current.reviewed_at : new Date().toISOString(),
      reviewed_by: auth.user.id,
      reviewer_note: reviewerNote,
      status: nextStatus,
    })
    .eq("id", feedbackId)
    .select("*")
    .single<TranslationFeedbackRow>();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "피드백 업데이트에 실패했습니다." }, { status: 500 });
  }

  const eventType = duplicateOf.value && duplicateOf.value !== current.duplicate_of ? "merged" : nextStatus === current.status ? "commented" : "status_changed";
  const { error: eventError } = await auth.supabase.from("translation_feedback_events").insert({
    actor_id: auth.user.id,
    event_type: eventType,
    feedback_id: feedbackId,
    from_status: current.status,
    metadata: {
      assignedTo: assignedTo.value,
      duplicateOf: duplicateOf.value,
      priority: nextPriority,
    },
    note: reviewerNote,
    to_status: updated.status,
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: updated });
}
