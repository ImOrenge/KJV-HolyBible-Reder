"use client";

import type { CommunityProfileDetailV2 } from "@kjv/shared/community";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";

type CommunityProfileEditorProps = { initialProfile: CommunityProfileDetailV2 };

export function CommunityProfileEditor({ initialProfile }: CommunityProfileEditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [handle, setHandle] = useState(initialProfile.handle);
  const [bio, setBio] = useState(initialProfile.bio);
  const [publicEnabled, setPublicEnabled] = useState(initialProfile.publicEnabled);
  const [showHonorific, setShowHonorific] = useState(Boolean(initialProfile.honorific));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/community/v2/profile", {
        body: JSON.stringify({ bio, handle, publicEnabled, showHonorific }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { error?: string; profile?: CommunityProfileDetailV2 } | null;
      if (!response.ok || !payload?.profile) {
        setMessage(payload?.error ?? "프로필을 저장하지 못했습니다.");
        return;
      }
      setProfile(payload.profile);
      setMessage("프로필을 저장했습니다.");
    });
  }

  return (
    <section className="community-card community-profile-hero">
      <div className="community-profile-line">
        <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={76} />
        <div>
          <h1>{profile.displayName}</h1>
          <p className="community-muted">닉네임·아바타·호칭은 계정 프로필 정보를 사용합니다.</p>
          <Link className="community-text-link" href="/onboarding?edit=1&next=%2Fcommunity%2Fsettings">계정 프로필 수정</Link>
        </div>
      </div>
      <form className="community-form" onSubmit={save}>
        <label className="community-field"><span>커뮤니티 핸들</span><input autoCapitalize="none" maxLength={24} minLength={3} onChange={(event) => setHandle(event.target.value)} pattern="[A-Za-z0-9_]{3,24}" placeholder="faith_reader" required value={handle} /></label>
        <label className="community-field"><span>소개</span><textarea maxLength={160} onChange={(event) => setBio(event.target.value)} placeholder="나를 소개하는 짧은 문장" value={bio} /></label>
        <label className="community-inline"><input checked={publicEnabled} onChange={(event) => setPublicEnabled(event.target.checked)} type="checkbox" /><span>공개 프로필과 QT 나눔 활성화</span></label>
        <label className="community-inline"><input checked={showHonorific} onChange={(event) => setShowHonorific(event.target.checked)} type="checkbox" /><span>온보딩 호칭을 커뮤니티에 표시</span></label>
        <p className="community-muted">공개를 끄면 기존 QT 나눔도 공개 피드와 검색에서 즉시 숨겨집니다. 개인 노트와 읽기 기록에는 영향이 없습니다.</p>
        {message ? <p aria-live="polite" className={`community-status ${message.includes("했습니다") ? "" : "error"}`}>{message}</p> : null}
        <div className="community-form-actions"><button className="community-button primary" disabled={isPending} type="submit">{isPending ? "저장 중…" : "저장"}</button></div>
      </form>
    </section>
  );
}
