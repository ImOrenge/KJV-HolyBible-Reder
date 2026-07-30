"use client";

import type { CommunityProfileDetailV2 } from "@kjv/shared/community";
import { X } from "lucide-react";
import { useRef, useState } from "react";

import { CommunityProfileEditor } from "./community-profile-editor";

type CommunityProfileEditDialogProps = {
  className?: string;
  initialProfile: CommunityProfileDetailV2;
  label?: string;
};

export function CommunityProfileEditDialog({ className = "", initialProfile, label = "프로필 편집" }: CommunityProfileEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [profile, setProfile] = useState(initialProfile);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button className={`community-button ${className}`.trim()} onClick={openDialog} type="button">{label}</button>
      <dialog
        aria-labelledby="community-profile-edit-title"
        className="community-dialog community-profile-edit-dialog"
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
        onClick={(event) => { if (event.target === dialogRef.current) closeDialog(); }}
        ref={dialogRef}
      >
        <div className="community-profile-edit-dialog-header">
          <button aria-label="프로필 편집 닫기" className="community-icon-button" onClick={closeDialog} type="button"><X aria-hidden="true" size={21} /></button>
          <h2 id="community-profile-edit-title">프로필 편집</h2>
          <span aria-hidden="true" />
        </div>
        <CommunityProfileEditor initialProfile={profile} mode="dialog" onSaved={(nextProfile) => { setProfile(nextProfile); closeDialog(); }} />
      </dialog>
    </>
  );
}
