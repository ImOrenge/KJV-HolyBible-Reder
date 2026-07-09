"use client";

import { Flag, X } from "lucide-react";
import { useState } from "react";

import {
  issueTypeLabels,
  translationFeedbackIssueTypes,
  type TranslationFeedbackIssueType,
} from "@/lib/translation-feedback/feedback-types";
import type { TranslationLanguage, Verse } from "@/lib/types";

type TranslationFeedbackFormProps = {
  language: TranslationLanguage;
  onClose: () => void;
  onSubmitted: () => void;
  reference: string;
  selectedText?: string;
  verse: Verse;
};

type FeedbackSubmitState = "idle" | "submitting" | "success" | "error";

function getVerseDisplayText(verse: Verse, language: TranslationLanguage) {
  if (language === "ko" && verse.textKo) {
    return verse.textKo;
  }

  return verse.textEn ?? verse.text;
}

export function TranslationFeedbackForm({
  language,
  onClose,
  onSubmitted,
  reference,
  selectedText = "",
  verse,
}: TranslationFeedbackFormProps) {
  const [issueType, setIssueType] = useState<TranslationFeedbackIssueType>("wrong_meaning");
  const [selectedPhrase, setSelectedPhrase] = useState(selectedText);
  const [suggestedText, setSuggestedText] = useState("");
  const [userComment, setUserComment] = useState("");
  const [status, setStatus] = useState<FeedbackSubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const hasKoreanText = Boolean(verse.textKo);

  async function submitFeedback() {
    if (!hasKoreanText || !verse.verseKey) {
      setStatus("error");
      setErrorMessage("승인된 한국어 번역이 있는 구절만 의견을 보낼 수 있습니다.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const response = await fetch("/api/translation-feedback", {
      body: JSON.stringify({
        issueType,
        selectedText: selectedPhrase,
        suggestedText,
        userComment,
        verseKey: verse.verseKey,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(payload?.error ?? "번역 의견을 저장하지 못했습니다.");
      return;
    }

    setStatus("success");
    onSubmitted();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="feedback-modal" role="dialog" aria-labelledby="feedback-modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">번역 의견</div>
            <h2 id="feedback-modal-title">{reference}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="modal-verse">
          <p>{getVerseDisplayText(verse, language)}</p>
          {!hasKoreanText ? <small>이 구절에는 아직 승인된 한국어 번역이 없습니다.</small> : null}
        </div>

        <div className="feedback-form-grid">
          <label className="full-field">
            어떤 문제가 있나요?
            <select value={issueType} onChange={(event) => setIssueType(event.target.value as TranslationFeedbackIssueType)}>
              {translationFeedbackIssueTypes.map((type) => (
                <option value={type} key={type}>
                  {issueTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="full-field">
            문제가 되는 표현
            <input
              value={selectedPhrase}
              onChange={(event) => setSelectedPhrase(event.target.value)}
              placeholder="예: 특정 단어 또는 짧은 표현"
            />
          </label>

          <label className="full-field">
            더 적절한 번역 제안
            <textarea
              value={suggestedText}
              onChange={(event) => setSuggestedText(event.target.value)}
              placeholder="가능하면 더 나은 표현을 적어주세요."
              rows={3}
            />
          </label>

          <label className="full-field">
            설명
            <textarea
              value={userComment}
              onChange={(event) => setUserComment(event.target.value)}
              placeholder="왜 그렇게 생각하는지 선택적으로 남겨주세요."
              rows={3}
            />
          </label>
        </div>

        {status === "error" ? <p className="form-status error">{errorMessage}</p> : null}
        {status === "success" ? <p className="form-status success">번역 의견이 접수되었습니다.</p> : null}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary-button modal-primary" disabled={!hasKoreanText || status === "submitting"} type="button" onClick={submitFeedback}>
            <Flag size={16} />
            {status === "submitting" ? "보내는 중" : "의견 보내기"}
          </button>
        </div>
      </section>
    </div>
  );
}
