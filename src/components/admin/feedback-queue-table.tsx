"use client";

import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  issueTypeLabels,
  priorityLabels,
  statusLabels,
  translationFeedbackIssueTypes,
  translationFeedbackPriorities,
  translationFeedbackStatuses,
  type TranslationFeedbackIssueType,
  type TranslationFeedbackPriority,
  type TranslationFeedbackRow,
  type TranslationFeedbackStatus,
} from "@/lib/translation-feedback/feedback-types";

type QueueState = "idle" | "loading" | "ready" | "error";

export function FeedbackQueueTable() {
  const [feedback, setFeedback] = useState<TranslationFeedbackRow[]>([]);
  const [status, setStatus] = useState<TranslationFeedbackStatus | "all">("all");
  const [issueType, setIssueType] = useState<TranslationFeedbackIssueType | "all">("all");
  const [priority, setPriority] = useState<TranslationFeedbackPriority | "all">("all");
  const [verseKey, setVerseKey] = useState("");
  const [bookOrder, setBookOrder] = useState("");
  const [chapter, setChapter] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") {
      params.set("status", status);
    }
    if (issueType !== "all") {
      params.set("issueType", issueType);
    }
    if (priority !== "all") {
      params.set("priority", priority);
    }
    if (verseKey.trim()) {
      params.set("verseKey", verseKey.trim());
    }
    if (bookOrder.trim()) {
      params.set("bookOrder", bookOrder.trim());
    }
    if (chapter.trim()) {
      params.set("chapter", chapter.trim());
    }
    if (assignedTo.trim()) {
      params.set("assignedTo", assignedTo.trim());
    }
    if (onlyMine) {
      params.set("mine", "true");
    }
    if (onlyDuplicates) {
      params.set("duplicates", "true");
    }
    return params.toString();
  }, [assignedTo, bookOrder, chapter, issueType, onlyDuplicates, onlyMine, priority, status, verseKey]);

  async function loadFeedback() {
    setQueueState("loading");
    setErrorMessage("");
    const response = await fetch(`/api/admin/translation-feedback${queryString ? `?${queryString}` : ""}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; feedback?: TranslationFeedbackRow[] } | null;

    if (!response.ok) {
      setQueueState("error");
      setErrorMessage(payload?.error ?? "피드백 큐를 불러오지 못했습니다.");
      return;
    }

    setFeedback(payload?.feedback ?? []);
    setQueueState("ready");
  }

  useEffect(() => {
    void loadFeedback();
    // Query string fully captures filter state for reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>번역 피드백 큐</h1>
        </div>
        <button className="secondary-button" type="button" onClick={loadFeedback}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </div>

      <div className="admin-filter-row">
        <label>
          상태
          <select value={status} onChange={(event) => setStatus(event.target.value as TranslationFeedbackStatus | "all")}>
            <option value="all">전체</option>
            {translationFeedbackStatuses.map((item) => (
              <option value={item} key={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          유형
          <select value={issueType} onChange={(event) => setIssueType(event.target.value as TranslationFeedbackIssueType | "all")}>
            <option value="all">전체</option>
            {translationFeedbackIssueTypes.map((item) => (
              <option value={item} key={item}>
                {issueTypeLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          우선순위
          <select value={priority} onChange={(event) => setPriority(event.target.value as TranslationFeedbackPriority | "all")}>
            <option value="all">전체</option>
            {translationFeedbackPriorities.map((item) => (
              <option value={item} key={item}>
                {priorityLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          구절
          <input value={verseKey} onChange={(event) => setVerseKey(event.target.value)} placeholder="GEN.1" />
        </label>
        <label>
          권
          <input inputMode="numeric" value={bookOrder} onChange={(event) => setBookOrder(event.target.value)} placeholder="1" />
        </label>
        <label>
          장
          <input inputMode="numeric" value={chapter} onChange={(event) => setChapter(event.target.value)} placeholder="1" />
        </label>
        <label>
          담당자
          <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="UUID 또는 unassigned" />
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
          내 담당
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={onlyDuplicates} onChange={(event) => setOnlyDuplicates(event.target.checked)} />
          중복 후보
        </label>
      </div>

      {queueState === "error" ? <p className="form-status error">{errorMessage}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>구절</th>
              <th>유형</th>
              <th>상태</th>
              <th>우선순위</th>
              <th>중복</th>
              <th>담당자</th>
              <th>선택 표현</th>
              <th>제출일</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/admin/translation-feedback/${row.id}`}>{row.verse_key}</Link>
                </td>
                <td>{issueTypeLabels[row.issue_type]}</td>
                <td>
                  <span className="chip chip-ink">{statusLabels[row.status]}</span>
                </td>
                <td>{priorityLabels[row.priority]}</td>
                <td>{row.duplicate_count ?? 0}</td>
                <td>{row.assigned_to ? row.assigned_to.slice(0, 8) : "-"}</td>
                <td>{row.selected_text ?? "-"}</td>
                <td>{new Intl.DateTimeFormat("ko-KR").format(new Date(row.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {queueState === "loading" ? <p className="empty-text">피드백 큐를 불러오는 중입니다.</p> : null}
      {queueState === "ready" && !feedback.length ? <p className="empty-text">조건에 맞는 피드백이 없습니다.</p> : null}
    </section>
  );
}
