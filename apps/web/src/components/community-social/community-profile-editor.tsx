"use client";

import type { CommunityProfileDetailV2 } from "@kjv/shared/community";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";

type CommunityProfileEditorProps = {
  initialProfile: CommunityProfileDetailV2;
  mode?: "dialog" | "page";
  onSaved?: (profile: CommunityProfileDetailV2) => void;
};

export function CommunityProfileEditor({ initialProfile, mode = "page", onSaved }: CommunityProfileEditorProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [handle, setHandle] = useState(initialProfile.handle);
  const [bio, setBio] = useState(initialProfile.bio);
  const [publicEnabled, setPublicEnabled] = useState(initialProfile.publicEnabled);
  const [showHonorific, setShowHonorific] = useState(initialProfile.showHonorific ?? Boolean(initialProfile.honorific));
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
      setHandle(payload.profile.handle);
      setBio(payload.profile.bio);
      setPublicEnabled(payload.profile.publicEnabled);
      setShowHonorific(payload.profile.showHonorific ?? Boolean(payload.profile.honorific));
      setMessage("프로필을 저장했습니다.");
      onSaved?.(payload.profile);
      router.refresh();
    });
  }

  return (
    <section className="community-profile-editor" data-mode={mode}>
      {mode === "page" ? <header className="community-profile-editor-page-header"><h1>프로필 편집</h1><p>QT 커뮤니티에서 보이는 정보를 관리합니다.</p></header> : null}
      <form className="community-profile-editor-form" onSubmit={save}>
        <div className="community-profile-editor-row community-profile-editor-identity">
          <div className="community-profile-editor-copy">
            <span className="community-profile-editor-label">이름</span>
            <strong>{profile.displayName}{showHonorific && profile.availableHonorific ? ` ${profile.availableHonorific}` : ""}</strong>
            <small>이름과 사진은 온보딩 계정 프로필을 사용합니다.</small>
            <Link className="community-text-link" href="/onboarding?edit=1&next=%2Fcommunity%2Fsettings">계정 프로필 수정</Link>
          </div>
          <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={64} />
        </div>

        <label className="community-profile-editor-row" htmlFor="community-profile-handle">
          <span className="community-profile-editor-label">사용자 이름</span>
          <span className="community-profile-editor-control"><span aria-hidden="true">@</span><input autoCapitalize="none" id="community-profile-handle" maxLength={24} minLength={3} onChange={(event) => setHandle(event.target.value)} pattern="[A-Za-z0-9_]{3,24}" placeholder="faith_reader" required value={handle} /></span>
          <small>영문, 숫자, 밑줄을 사용해 3~24자로 작성합니다.</small>
        </label>

        <label className="community-profile-editor-row" htmlFor="community-profile-bio">
          <span className="community-profile-editor-label">소개</span>
          <textarea id="community-profile-bio" maxLength={160} onChange={(event) => setBio(event.target.value)} placeholder="+ 소개 작성" rows={3} value={bio} />
          <small>{bio.length}/160</small>
        </label>

        <label className="community-profile-editor-row community-profile-editor-switch-row">
          <span className="community-profile-editor-copy"><span className="community-profile-editor-label">온보딩 호칭 표시</span><small>{profile.availableHonorific ? `${profile.availableHonorific} 호칭을 프로필 이름 옆에 표시합니다.` : "설정된 호칭이 없습니다."}</small></span>
          <input aria-label="온보딩 호칭 표시" checked={showHonorific} disabled={!profile.availableHonorific} onChange={(event) => setShowHonorific(event.target.checked)} role="switch" type="checkbox" />
        </label>

        <label className="community-profile-editor-row community-profile-editor-switch-row">
          <span className="community-profile-editor-copy"><span className="community-profile-editor-label">프로필 공개 범위</span><small>{publicEnabled ? "전체 공개 · 피드와 검색에 표시됩니다." : "비공개 · 기존 QT도 피드와 검색에서 숨겨집니다."}</small></span>
          <input aria-label="프로필 전체 공개" checked={publicEnabled} onChange={(event) => setPublicEnabled(event.target.checked)} role="switch" type="checkbox" />
        </label>

        <p className="community-profile-editor-note">개인 노트, 하이라이트, 읽기 기록은 커뮤니티 프로필에 공개되지 않습니다.</p>
        {message ? <p aria-live="polite" className={`community-status ${message.includes("했습니다") ? "" : "error"}`}>{message}</p> : null}
        <div className="community-profile-editor-footer"><button className="community-button primary" disabled={isPending} type="submit">{isPending ? "저장 중…" : "완료"}</button></div>
      </form>
    </section>
  );
}
