"use client";

import type { CommunityProfileDetailV2 } from "@kjv/shared/community";
import { Ban, Flag, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { useState, useTransition } from "react";

import { CommunityFollowButton } from "./community-follow-button";

type CommunityProfileActionsProps = {
  profile: CommunityProfileDetailV2;
  signedIn: boolean;
};

export function CommunityProfileActions({ profile, signedIn }: CommunityProfileActionsProps) {
  const [muted, setMuted] = useState(profile.viewerMuted ?? false);
  const [blocked, setBlocked] = useState(profile.viewerBlocked ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requireLogin() {
    if (signedIn) return true;
    window.location.assign(`/auth/login?next=/community/u/${profile.handle}`);
    return false;
  }

  function setRelation(relation: "block" | "follow" | "mute", active: boolean) {
    if (!requireLogin()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/profiles/${profile.handle}/${relation}`, {
        body: JSON.stringify({ active }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "관계 설정을 반영하지 못했습니다.");
        return;
      }
      if (relation === "mute") setMuted(active);
      if (relation === "block") {
        setBlocked(active);
      }
    });
  }

  function reportProfile() {
    if (!requireLogin() || !window.confirm("이 프로필을 운영자에게 신고할까요?")) return;
    startTransition(async () => {
      const response = await fetch("/api/community/v2/reports", {
        body: JSON.stringify({ reason: "other", targetId: profile.userId, targetType: "profile" }),
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(response.ok ? "신고가 접수되었습니다." : payload?.error ?? "신고를 접수하지 못했습니다.");
    });
  }

  if (profile.isCurrentUser) return null;
  return (
    <div className="community-profile-actions">
      <CommunityFollowButton blocked={blocked} className="community-profile-primary-action" handle={profile.handle} initialFollowing={profile.viewerFollowing} returnHref={`/community/u/${profile.handle}`} signedIn={signedIn} />
      <details className="community-profile-overflow">
        <summary aria-label="프로필 더보기" className="community-icon-button"><MoreHorizontal aria-hidden="true" size={20} /></summary>
        <div className="community-profile-overflow-menu">
          <button className="community-button" disabled={isPending || blocked} onClick={() => setRelation("mute", !muted)} type="button">
            {muted ? <Volume2 aria-hidden="true" size={17} /> : <VolumeX aria-hidden="true" size={17} />}{muted ? "뮤트 해제" : "뮤트"}
          </button>
          <button className="community-button danger" disabled={isPending} onClick={() => setRelation("block", !blocked)} type="button"><Ban aria-hidden="true" size={17} />{blocked ? "차단 해제" : "차단"}</button>
          <button className="community-button danger" disabled={isPending} onClick={reportProfile} type="button"><Flag aria-hidden="true" size={17} /> 신고</button>
        </div>
      </details>
      {error ? <p aria-live="polite" className={`community-status ${error.includes("접수") ? "" : "error"}`}>{error}</p> : null}
    </div>
  );
}
