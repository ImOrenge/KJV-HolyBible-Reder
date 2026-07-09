"use client";

import { BarChart3, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { issueTypeLabels, type TranslationFeedbackIssueType } from "@/lib/translation-feedback/feedback-types";

type CountRow = {
  count: number;
  key: string;
  label: string;
};

type IssueCountRow = CountRow & {
  key: TranslationFeedbackIssueType;
};

type ReportPayload = {
  abuseCandidates: CountRow[];
  byIssueType: IssueCountRow[];
  byReference: CountRow[];
  dictionarySenseTerms: CountRow[];
  sampledRows: number;
};

type ReportState = "idle" | "loading" | "ready" | "error";

function CountTable({ emptyText, rows, title }: { emptyText: string; rows: CountRow[]; title: string }) {
  return (
    <section className="admin-subpanel">
      <h2>{title}</h2>
      <div className="admin-table-wrap compact">
        <table className="admin-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>건수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="empty-text">{emptyText}</p> : null}
    </section>
  );
}

export function FeedbackReportsPanel() {
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [state, setState] = useState<ReportState>("idle");
  const [message, setMessage] = useState("");

  async function loadReports() {
    setState("loading");
    setMessage("");

    const response = await fetch("/api/admin/translation-feedback/reports", { cache: "no-store" });
    const nextPayload = (await response.json().catch(() => null)) as (ReportPayload & { error?: string }) | null;

    if (!response.ok || !nextPayload) {
      setState("error");
      setMessage(nextPayload?.error ?? "피드백 리포트를 불러오지 못했습니다.");
      return;
    }

    setPayload(nextPayload);
    setState("ready");
  }

  useEffect(() => {
    void loadReports();
  }, []);

  const issueRows =
    payload?.byIssueType.map((row) => ({
      ...row,
      label: issueTypeLabels[row.key],
    })) ?? [];

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <div className="eyebrow">Operations</div>
          <h1>번역 피드백 리포트</h1>
        </div>
        <button className="secondary-button" type="button" onClick={loadReports}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </div>

      {message ? <p className={state === "error" ? "form-status error" : "form-status success"}>{message}</p> : null}
      {state === "loading" && !payload ? <p className="empty-text">리포트를 불러오는 중입니다.</p> : null}

      {payload ? (
        <>
          <div className="admin-metric-strip">
            <div>
              <BarChart3 size={18} />
              <strong>{payload.sampledRows}</strong>
              <span>최근 샘플</span>
            </div>
            <div>
              <strong>{payload.abuseCandidates.length}</strong>
              <span>반복 제출 후보</span>
            </div>
            <div>
              <strong>{payload.dictionarySenseTerms.length}</strong>
              <span>사전 의미 혼용 표현</span>
            </div>
          </div>
          <div className="admin-detail-grid">
            <CountTable emptyText="아직 집계할 피드백이 없습니다." rows={payload.byReference} title="권/장별 집중도" />
            <CountTable emptyText="아직 유형별 피드백이 없습니다." rows={issueRows} title="문제 유형 추세" />
            <CountTable emptyText="사전 의미 혼용으로 접수된 표현이 없습니다." rows={payload.dictionarySenseTerms} title="사전 의미 혼용 표현" />
            <CountTable emptyText="최근 1시간 반복 제출 후보가 없습니다." rows={payload.abuseCandidates} title="반복 제출 후보" />
          </div>
        </>
      ) : null}
    </section>
  );
}
