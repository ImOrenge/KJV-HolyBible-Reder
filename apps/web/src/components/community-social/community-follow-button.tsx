"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type CommunityFollowButtonProps = {
  blocked?: boolean;
  className?: string;
  handle: string;
  initialFollowing?: boolean;
  returnHref?: string;
  signedIn: boolean;
};

export function CommunityFollowButton({ blocked = false, className = "", handle, initialFollowing = false, returnHref, signedIn }: CommunityFollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (blocked) setFollowing(false);
  }, [blocked]);

  function toggleFollow() {
    if (!signedIn) {
      window.location.assign(`/auth/login?next=${encodeURIComponent(returnHref ?? `/community/u/${handle}`)}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const active = !following;
      const response = await fetch(`/api/community/v2/profiles/${encodeURIComponent(handle)}/follow`, {
        body: JSON.stringify({ active }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error ?? "팔로우 상태를 반영하지 못했습니다.");
      else setFollowing(active);
    });
  }

  return (
    <span className={`community-follow-control ${className}`.trim()}>
      <button
        aria-pressed={following}
        className={`community-button community-follow-button ${following ? "" : "primary"}`}
        disabled={isPending || blocked}
        onClick={toggleFollow}
        type="button"
      >
        {following ? <UserMinus aria-hidden="true" size={16} /> : <UserPlus aria-hidden="true" size={16} />}
        {isPending ? "처리 중…" : following ? "팔로잉" : "팔로우"}
      </button>
      {error ? <span aria-live="polite" className="community-follow-error">{error}</span> : null}
    </span>
  );
}
