import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { parseFeedbackSubmissionPayload } from "@/lib/translation-feedback/feedback-validation";
import type { PublicFeedbackSummary, TranslationFeedbackRow } from "@/lib/translation-feedback/feedback-types";

export const dynamic = "force-dynamic";

type BibleVerseEnFeedbackRow = {
  id: string;
  book_order: number;
  chapter: number;
  verse: number;
  verse_key: string;
  text_en: string;
};

type BibleVerseKoFeedbackRow = {
  id: string;
  text_ko: string;
  translation_name: string;
  translation_status: string;
  is_public: boolean;
};

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = parseFeedbackSubmissionPayload(await request.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { issueType, selectedText, suggestedText, userComment, verseKey } = parsed.data;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentFeedbackCount, error: rateLimitError } = await supabase
    .from("translation_feedback")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", user.id)
    .gte("created_at", oneHourAgo);

  if (rateLimitError) {
    return NextResponse.json({ error: rateLimitError.message }, { status: 500 });
  }

  if ((recentFeedbackCount ?? 0) >= 20) {
    return NextResponse.json({ error: "번역 의견 제출이 잠시 제한되었습니다. 나중에 다시 시도하세요." }, { status: 429 });
  }

  const { data: enVerse, error: enError } = await supabase
    .from("bible_verses_en")
    .select("id,book_order,chapter,verse,verse_key,text_en")
    .eq("verse_key", verseKey)
    .maybeSingle<BibleVerseEnFeedbackRow>();

  if (enError) {
    return NextResponse.json({ error: enError.message }, { status: 500 });
  }

  if (!enVerse) {
    return NextResponse.json({ error: "구절을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: koVerse, error: koError } = await supabase
    .from("bible_verses_ko")
    .select("id,text_ko,translation_name,translation_status,is_public")
    .eq("verse_key", verseKey)
    .eq("translation_name", "KJV Korean Study Translation")
    .eq("translation_status", "approved")
    .eq("is_public", true)
    .maybeSingle<BibleVerseKoFeedbackRow>();

  if (koError) {
    return NextResponse.json({ error: koError.message }, { status: 500 });
  }

  if (!koVerse) {
    return NextResponse.json({ error: "승인된 한국어 번역이 있는 구절만 의견을 보낼 수 있습니다." }, { status: 400 });
  }

  const { data: feedback, error: insertError } = await supabase
    .from("translation_feedback")
    .insert({
      book_order: enVerse.book_order,
      chapter: enVerse.chapter,
      en_verse_id: enVerse.id,
      issue_type: issueType,
      kjv_text_snapshot: enVerse.text_en,
      ko_text_snapshot: koVerse.text_ko,
      ko_verse_id: koVerse.id,
      selected_text: selectedText,
      submitted_by: user.id,
      suggested_text: suggestedText,
      translation_name: koVerse.translation_name,
      translation_status_snapshot: koVerse.translation_status,
      user_comment: userComment,
      verse: enVerse.verse,
      verse_key: enVerse.verse_key,
    })
    .select("*")
    .single<TranslationFeedbackRow>();

  if (insertError || !feedback) {
    return NextResponse.json({ error: insertError?.message ?? "피드백 저장에 실패했습니다." }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("translation_feedback_events").insert({
    actor_id: user.id,
    event_type: "submitted",
    feedback_id: feedback.id,
    to_status: feedback.status,
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: toPublicFeedbackSummary(feedback) }, { status: 201 });
}
