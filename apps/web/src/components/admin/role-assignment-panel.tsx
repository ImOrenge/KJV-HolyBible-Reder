"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { appRoles, type AppRole } from "@/lib/auth/rbac";

type RoleEvent = {
  action: "grant" | "revoke";
  actor_id: string | null;
  created_at: string;
  id: string;
  role: string;
  target_user_id: string;
};

export function RoleAssignmentPanel() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole>("feedback_reviewer");
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [events, setEvents] = useState<RoleEvent[]>([]);

  const loadRoleEvents = useCallback(async () => {
    const response = await fetch("/api/admin/users/role-events", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { events?: RoleEvent[] } | null;
    if (response.ok) {
      setEvents(payload?.events ?? []);
    }
  }, []);

  async function saveRole() {
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      setMessage("사용자 ID를 입력하세요.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/users/${encodeURIComponent(trimmedUserId)}/roles`, {
      body: JSON.stringify({ enabled, role }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; roles?: string[] } | null;
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "역할 저장에 실패했습니다.");
      return;
    }

    setMessage(`저장됨: ${(payload?.roles ?? []).join(", ") || "역할 없음"}`);
    await loadRoleEvents();
  }

  useEffect(() => {
    void loadRoleEvents();
  }, [loadRoleEvents]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <div className="eyebrow">RBAC</div>
          <h1>역할 관리</h1>
        </div>
      </div>

      <section className="admin-subpanel">
        <div className="feedback-form-grid">
          <label className="full-field">
            사용자 UUID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="auth.users.id" />
          </label>
          <label>
            역할
            <select value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
              {appRoles.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            작업
            <select value={enabled ? "grant" : "revoke"} onChange={(event) => setEnabled(event.target.value === "grant")}>
              <option value="grant">부여</option>
              <option value="revoke">회수</option>
            </select>
          </label>
        </div>
        {message ? <p className={message.includes("실패") || message.includes("입력") ? "form-status error" : "form-status success"}>{message}</p> : null}
        <button className="primary-button modal-primary" disabled={isSaving} type="button" onClick={saveRole}>
          <Save size={16} />
          {isSaving ? "저장 중" : "역할 저장"}
        </button>
      </section>

      <section className="admin-subpanel">
        <h2>역할 변경 기록</h2>
        <div className="admin-table-wrap compact">
          <table className="admin-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>작업</th>
                <th>역할</th>
                <th>대상</th>
                <th>수행자</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</td>
                  <td>{event.action === "grant" ? "부여" : "회수"}</td>
                  <td>{event.role}</td>
                  <td>{event.target_user_id.slice(0, 8)}</td>
                  <td>{event.actor_id ? event.actor_id.slice(0, 8) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!events.length ? <p className="empty-text">아직 역할 변경 기록이 없습니다.</p> : null}
      </section>
    </section>
  );
}
