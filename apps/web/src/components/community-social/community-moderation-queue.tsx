"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

type ReportRow = {
  comment_id: string | null;
  created_at: string;
  details: string | null;
  id: string;
  post_id: string | null;
  profile_id: string | null;
  reason: string;
  status: string;
  target_type: "comment" | "post" | "profile";
};

type CommunityModerationQueueProps = { initialReports: ReportRow[] };

export function CommunityModerationQueue({ initialReports }: CommunityModerationQueueProps) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(reportId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/moderation/reports/${reportId}`, {
        body: JSON.stringify({ action: formData.get("action"), durationHours: formData.get("durationHours"), note: formData.get("note"), reasonCode: formData.get("reasonCode") }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error ?? "운영 조치를 적용하지 못했습니다.");
      else setReports((current) => current.filter((report) => report.id !== reportId));
    });
  }

  return (
    <section className="community-card">
      <div className="community-card-pad"><h1><ShieldCheck aria-hidden="true" size={22} /> 커뮤니티 신고 검토</h1><p className="community-muted">자동 삭제 없이 운영자가 신고 맥락을 확인하고 조치합니다.</p></div>
      {error ? <p aria-live="polite" className="community-status error">{error}</p> : null}
      {reports.length ? reports.map((report) => (
        <article className="community-comment" key={report.id}>
          <strong>{report.target_type} · {report.reason}</strong>
          <span className="community-meta">{new Date(report.created_at).toLocaleString("ko-KR")} · {report.id}</span>
          <p>{report.details || "상세 설명 없음"}</p>
          <p className="community-muted">대상: {report.post_id ?? report.comment_id ?? report.profile_id}</p>
          <form action={(formData) => apply(report.id, formData)} className="community-form">
            <label className="community-field"><span>조치</span><select defaultValue="dismiss_report" name="action"><option value="dismiss_report">신고 기각</option><option value="limit">노출 제한</option><option value="hide">숨김</option><option value="lock_comments">댓글 잠금</option><option value="remove">삭제</option><option value="restore">복원</option><option value="restrict_user">사용자 제한</option><option value="suspend_user">사용자 정지</option></select></label>
            <label className="community-field"><span>사유 코드</span><input defaultValue="moderator_review" name="reasonCode" required /></label>
            <label className="community-field"><span>운영 메모</span><textarea maxLength={1000} name="note" /></label>
            <label className="community-field"><span>제한 시간</span><input defaultValue="24" max={8760} min={1} name="durationHours" type="number" /></label>
            <button className="community-button primary" disabled={isPending} type="submit">조치 적용</button>
          </form>
        </article>
      )) : <div className="community-empty">검토할 열린 신고가 없습니다.</div>}
    </section>
  );
}
