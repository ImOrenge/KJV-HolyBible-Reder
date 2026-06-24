"use client";

import Link from "next/link";
import { CheckCircle2, RefreshCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppRole } from "@/lib/auth/rbac";
import {
  issueTypeLabels,
  priorityLabels,
  statusLabels,
  translationFeedbackPriorities,
  translationFeedbackStatuses,
  type TranslationFeedbackEventRow,
  type TranslationFeedbackPriority,
  type TranslationFeedbackRow,
  type TranslationFeedbackStatus,
} from "@/lib/translation-feedback/feedback-types";

type FeedbackDetailPanelProps = {
  feedbackId: string;
  roles: AppRole[];
};

type CurrentKo = {
  id: string;
  text_ko: string;
  translation_name: string;
  translation_status: string;
  is_public: boolean;
} | null;

type ReviewRow = {
  id: string;
  user_id: string | null;
  previous_text: string | null;
  revised_text: string;
  review_status: string;
  comment: string | null;
  created_at: string;
};

type DetailPayload = {
  currentKo: CurrentKo;
  events: TranslationFeedbackEventRow[];
  feedback: TranslationFeedbackRow;
  relatedFeedback: TranslationFeedbackRow[];
  reviews: ReviewRow[];
};

type PanelState = "idle" | "loading" | "ready" | "error";

function hasRole(roles: AppRole[], role: AppRole) {
  return roles.includes(role);
}

export function FeedbackDetailPanel({ feedbackId, roles }: FeedbackDetailPanelProps) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [status, setStatus] = useState<TranslationFeedbackStatus>("new");
  const [priority, setPriority] = useState<TranslationFeedbackPriority>("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [revisionComment, setRevisionComment] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [message, setMessage] = useState("");

  const feedback = payload?.feedback ?? null;
  const latestReview = payload?.reviews[0] ?? null;
  const hasChangedRevision = revisedText.trim() && revisedText.trim() !== payload?.currentKo?.text_ko;
  const canApplyRevision = hasRole(roles, "translator") || hasRole(roles, "lead_reviewer");
  const canApprovePublication = hasRole(roles, "lead_reviewer");
  const hasPendingRevision = latestReview?.review_status === "revised";

  const eventRows = useMemo(() => payload?.events ?? [], [payload]);

  async function loadDetail() {
    setPanelState("loading");
    setMessage("");
    const response = await fetch(`/api/admin/translation-feedback/${feedbackId}`, { cache: "no-store" });
    const nextPayload = (await response.json().catch(() => null)) as (DetailPayload & { error?: string }) | null;

    if (!response.ok || !nextPayload?.feedback) {
      setPanelState("error");
      setMessage(nextPayload?.error ?? "피드백 상세를 불러오지 못했습니다.");
      return;
    }

    setPayload(nextPayload);
    setStatus(nextPayload.feedback.status);
    setPriority(nextPayload.feedback.priority);
    setAssignedTo(nextPayload.feedback.assigned_to ?? "");
    setDuplicateOf(nextPayload.feedback.duplicate_of ?? "");
    setReviewerNote(nextPayload.feedback.reviewer_note ?? "");
    setRevisedText(nextPayload.currentKo?.text_ko ?? nextPayload.feedback.ko_text_snapshot);
    setPanelState("ready");
  }

  async function updateQueue() {
    const response = await fetch(`/api/admin/translation-feedback/${feedbackId}`, {
      body: JSON.stringify({
        priority,
        assignedTo,
        duplicateOf,
        reviewerNote,
        status,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const nextPayload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(nextPayload?.error ?? "피드백 상태를 저장하지 못했습니다.");
      return;
    }
    setMessage("피드백 상태를 저장했습니다.");
    await loadDetail();
  }

  async function applyRevision() {
    const response = await fetch(`/api/admin/translation-feedback/${feedbackId}/apply-revision`, {
      body: JSON.stringify({
        comment: revisionComment,
        revisedText,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const nextPayload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(nextPayload?.error ?? "번역 수정 반영에 실패했습니다.");
      return;
    }
    setMessage("수정 번역문을 반영했습니다. 최종 승인 전까지 공개되지 않습니다.");
    await loadDetail();
  }

  async function approvePublication() {
    const response = await fetch(`/api/admin/translation-feedback/${feedbackId}/approve-publication`, {
      body: JSON.stringify({
        comment: approvalComment,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const nextPayload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(nextPayload?.error ?? "최종 승인에 실패했습니다.");
      return;
    }
    setMessage("한국어 번역을 공개 승인했습니다.");
    await loadDetail();
  }

  useEffect(() => {
    void loadDetail();
    // feedbackId identifies the route payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  if (panelState === "error") {
    return (
      <section className="admin-panel">
        <p className="form-status error">{message}</p>
        <Link className="secondary-button" href="/admin/translation-feedback">
          목록으로
        </Link>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <div className="eyebrow">Feedback</div>
          <h1>{feedback?.verse_key ?? "피드백 상세"}</h1>
        </div>
        <div className="row-actions">
          <Link className="secondary-button" href="/admin/translation-feedback">
            목록
          </Link>
          <button className="secondary-button" type="button" onClick={loadDetail}>
            <RefreshCcw size={16} />
            새로고침
          </button>
        </div>
      </div>

      {message ? <p className={message.includes("실패") ? "form-status error" : "form-status success"}>{message}</p> : null}
      {panelState === "loading" && !payload ? <p className="empty-text">피드백 상세를 불러오는 중입니다.</p> : null}

      {feedback ? (
        <div className="admin-detail-grid">
          <section className="admin-subpanel">
            <h2>제출 내용</h2>
            <dl className="admin-dl">
              <div>
                <dt>유형</dt>
                <dd>{issueTypeLabels[feedback.issue_type]}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{statusLabels[feedback.status]}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{feedback.assigned_to ?? "-"}</dd>
              </div>
              <div>
                <dt>중복 대상</dt>
                <dd>{feedback.duplicate_of ?? "-"}</dd>
              </div>
              <div>
                <dt>선택 표현</dt>
                <dd>{feedback.selected_text ?? "-"}</dd>
              </div>
              <div>
                <dt>제안 번역</dt>
                <dd>{feedback.suggested_text ?? "-"}</dd>
              </div>
              <div>
                <dt>설명</dt>
                <dd>{feedback.user_comment ?? "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-subpanel">
            <h2>스냅샷</h2>
            <div className="translation-compare">
              <div>
                <strong>KJV</strong>
                <p>{feedback.kjv_text_snapshot}</p>
              </div>
              <div>
                <strong>제출 당시 한국어</strong>
                <p>{feedback.ko_text_snapshot}</p>
              </div>
              <div>
                <strong>현재 한국어</strong>
                <p>{payload?.currentKo?.text_ko ?? "현재 번역 row를 찾을 수 없습니다."}</p>
              </div>
            </div>
          </section>

          <section className="admin-subpanel">
            <h2>큐 처리</h2>
            <div className="feedback-form-grid">
              <label>
                상태
                <select value={status} onChange={(event) => setStatus(event.target.value as TranslationFeedbackStatus)}>
                  {translationFeedbackStatuses.map((item) => (
                    <option value={item} key={item}>
                      {statusLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                우선순위
                <select value={priority} onChange={(event) => setPriority(event.target.value as TranslationFeedbackPriority)}>
                  {translationFeedbackPriorities.map((item) => (
                    <option value={item} key={item}>
                      {priorityLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-field">
                담당자 UUID
                <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="비워두면 미배정" />
              </label>
              <label className="full-field">
                중복 대상 feedback UUID
                <input value={duplicateOf} onChange={(event) => setDuplicateOf(event.target.value)} placeholder="병합할 기존 feedback id" />
              </label>
              <label className="full-field">
                내부 메모
                <textarea value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} rows={4} />
              </label>
            </div>
            <button className="secondary-button" type="button" onClick={updateQueue}>
              <Save size={16} />
              상태 저장
            </button>
          </section>

          {canApplyRevision ? (
            <section className="admin-subpanel">
              <h2>번역 수정 반영</h2>
              <div className="translation-compare">
                <div>
                  <strong>수정 전</strong>
                  <p>{payload?.currentKo?.text_ko ?? feedback.ko_text_snapshot}</p>
                </div>
                <div>
                  <strong>수정 후</strong>
                  <p>{revisedText || "-"}</p>
                </div>
              </div>
              <textarea value={revisedText} onChange={(event) => setRevisedText(event.target.value)} rows={7} />
              <textarea
                value={revisionComment}
                onChange={(event) => setRevisionComment(event.target.value)}
                placeholder="수정 사유"
                rows={3}
              />
              <button className="primary-button modal-primary" disabled={!hasChangedRevision} type="button" onClick={applyRevision}>
                <Save size={16} />
                수정 반영
              </button>
            </section>
          ) : null}

          <section className="admin-subpanel">
            <h2>같은 구절 피드백</h2>
            <div className="event-list">
              {(payload?.relatedFeedback ?? []).map((item) => (
                <Link className="event-row" href={`/admin/translation-feedback/${item.id}`} key={item.id}>
                  <strong>
                    {statusLabels[item.status]} · {issueTypeLabels[item.issue_type]}
                  </strong>
                  <span>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</span>
                  <p>{item.selected_text ?? item.suggested_text ?? item.user_comment ?? "선택 표현 없음"}</p>
                </Link>
              ))}
              {!payload?.relatedFeedback.length ? <p className="empty-text">같은 구절의 다른 피드백이 없습니다.</p> : null}
            </div>
          </section>

          {canApprovePublication ? (
            <section className="admin-subpanel">
              <h2>최종 승인</h2>
              <p className="empty-text">
                최신 수정 이력: {latestReview ? `${latestReview.review_status} · ${new Intl.DateTimeFormat("ko-KR").format(new Date(latestReview.created_at))}` : "없음"}
              </p>
              <textarea
                value={approvalComment}
                onChange={(event) => setApprovalComment(event.target.value)}
                placeholder="승인 메모"
                rows={3}
              />
              <button className="primary-button modal-primary" disabled={!hasPendingRevision} type="button" onClick={approvePublication}>
                <CheckCircle2 size={16} />
                {hasPendingRevision ? "공개 승인" : "승인 대기 수정 없음"}
              </button>
            </section>
          ) : null}

          <section className="admin-subpanel">
            <h2>이벤트</h2>
            <div className="event-list">
              {eventRows.map((event) => (
                <div className="event-row" key={event.id}>
                  <strong>{event.event_type}</strong>
                  <span>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</span>
                  {event.note ? <p>{event.note}</p> : null}
                </div>
              ))}
              {!eventRows.length ? <p className="empty-text">아직 이벤트가 없습니다.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
