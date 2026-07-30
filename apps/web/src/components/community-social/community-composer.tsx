"use client";

import type { CommunityPost, CommunityProfileDetailV2 } from "@kjv/shared/community";
import { BookOpenText, Hash, ImagePlus, MessageCircle, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";
import { CommunityVersePicker } from "./community-verse-picker";

type CommunityComposerProps = {
  initialOpen?: boolean;
  initialQuotedPostId?: string | null;
  onCreated?: (post: CommunityPost) => void;
  profile: CommunityProfileDetailV2 | null;
  signedIn: boolean;
};

type ComposerDraft = {
  body: string;
  commentPolicy: "everyone" | "none";
  hashtags: string;
  title: string;
  verseKeys: string;
};

const DRAFT_KEY = "community:composer:draft:v1";
const EMPTY_DRAFT: ComposerDraft = { body: "", commentPolicy: "everyone", hashtags: "", title: "", verseKeys: "" };

function parseVerseKeys(value: string) {
  return [...new Set(value.split(/[\s,]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))].slice(0, 10);
}

function parseHashtags(value: string) {
  return [...new Set(value.split(/[\s,#]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 5);
}

function clearComposerQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("compose");
  url.searchParams.delete("quote");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function CommunityComposer({ initialOpen = false, initialQuotedPostId, onCreated, profile, signedIn }: CommunityComposerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ComposerDraft>(EMPTY_DRAFT);
  const [draftReady, setDraftReady] = useState(false);
  const [showVerseInput, setShowVerseInput] = useState(true);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const verseKeys = parseVerseKeys(draft.verseKeys);
  const hashtags = parseHashtags(draft.hashtags);
  const canSubmit = draft.body.trim().length >= 10 && verseKeys.length > 0 && !isPending;

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ComposerDraft>;
        setDraft({
          body: typeof parsed.body === "string" ? parsed.body : "",
          commentPolicy: parsed.commentPolicy === "none" ? "none" : "everyone",
          hashtags: typeof parsed.hashtags === "string" ? parsed.hashtags : "",
          title: typeof parsed.title === "string" ? parsed.title : "",
          verseKeys: typeof parsed.verseKeys === "string" ? parsed.verseKeys : "",
        });
      }
    } catch {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (Object.values(draft).some((value) => value && value !== "everyone")) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  }, [draft, draftReady]);

  useEffect(() => {
    if ((initialOpen || initialQuotedPostId) && signedIn && profile?.publicEnabled && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [initialOpen, initialQuotedPostId, profile?.publicEnabled, signedIn]);

  function updateDraft<Key extends keyof ComposerDraft>(key: Key, value: ComposerDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function openComposer() {
    if (!signedIn) {
      const returnPath = window.location.pathname === "/community" ? "/community?compose=1" : window.location.pathname;
      window.location.assign(`/auth/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (!profile?.publicEnabled) {
      window.location.assign("/community/settings");
      return;
    }
    dialogRef.current?.showModal();
  }

  function closeComposer() {
    if (isPending) return;
    dialogRef.current?.close();
    clearComposerQuery();
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT);
    setImage(null);
    setAltText("");
    setError(null);
    window.sessionStorage.removeItem(DRAFT_KEY);
  }

  function discardDraft() {
    if (!isPending) resetDraft();
  }

  function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/community/v2/posts", {
          body: JSON.stringify({
            body: draft.body,
            commentPolicy: draft.commentPolicy,
            hashtags,
            quotedPostId: initialQuotedPostId || undefined,
            title: draft.title || undefined,
            verseKeys,
          }),
          headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
          method: "POST",
        });
        const payload = await response.json().catch(() => null) as { error?: string; post?: CommunityPost } | null;
        if (!response.ok || !payload?.post) throw new Error(payload?.error ?? "QT 나눔을 저장하지 못했습니다.");
        let post = payload.post;
        if (image) {
          const formData = new FormData();
          formData.append("image", image);
          if (altText) formData.append("altText", altText);
          const mediaResponse = await fetch(`/api/community/v2/posts/${post.id}/media`, { body: formData, method: "POST" });
          const mediaPayload = await mediaResponse.json().catch(() => null) as { error?: string; post?: CommunityPost } | null;
          if (!mediaResponse.ok || !mediaPayload?.post) throw new Error(mediaPayload?.error ?? "이미지를 저장하지 못했습니다.");
          post = mediaPayload.post;
        }
        onCreated?.(post);
        resetDraft();
        dialogRef.current?.close();
        clearComposerQuery();
        if (!onCreated) window.location.reload();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "QT 나눔을 저장하지 못했습니다.");
      }
    });
  }

  return (
    <>
      <section className="community-card community-composer-trigger" aria-label="QT 나눔 작성">
        {profile ? <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} /> : <span className="community-avatar"><PenLine aria-hidden="true" size={18} /></span>}
        <button className="community-composer-open" onClick={openComposer} type="button">
          <span>오늘 묵상한 말씀을 나눠 보세요.</span><strong>게시</strong>
        </button>
      </section>
      {signedIn && !profile?.publicEnabled ? (
        <aside className="community-card community-card-pad">
          <strong>공개 프로필 설정이 필요합니다.</strong>
          <p className="community-muted">온보딩의 닉네임·아바타·호칭을 연결하고, 커뮤니티 핸들과 공개 여부를 확인해 주세요.</p>
          <Link className="community-button primary" href="/community/settings">프로필 설정</Link>
        </aside>
      ) : null}
      <dialog
        aria-describedby="community-composer-help"
        aria-labelledby="community-composer-title"
        className="community-dialog community-composer-dialog"
        onCancel={(event) => { if (isPending) event.preventDefault(); else clearComposerQuery(); }}
        onClick={(event) => { if (event.target === dialogRef.current) closeComposer(); }}
        ref={dialogRef}
      >
        <form className="community-composer-form" onSubmit={submitPost}>
          <header className="community-composer-header">
            <button className="community-composer-text-button" disabled={isPending} onClick={closeComposer} type="button">취소</button>
            <strong id="community-composer-title">{initialQuotedPostId ? "인용 QT" : "새 QT"}</strong>
            <button aria-label="작성 내용 지우기" className="community-icon-button" disabled={isPending} onClick={discardDraft} type="button"><Trash2 aria-hidden="true" size={19} /></button>
          </header>
          <div className="community-composer-content">
            <div className="community-composer-author">
              {profile ? <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={42} /> : null}
              <span><strong>{profile?.displayName ?? "QT 작성자"}</strong><span className="community-meta">@{profile?.handle ?? "profile"}</span></span>
            </div>
            <div className="community-composer-editor">
              <label className="community-sr-only" htmlFor="community-composer-title-input">제목</label>
              <input id="community-composer-title-input" maxLength={120} onChange={(event) => updateDraft("title", event.target.value)} placeholder="제목 추가 (선택)" value={draft.title} />
              <label className="community-sr-only" htmlFor="community-composer-body">QT 나눔</label>
              <textarea autoFocus id="community-composer-body" maxLength={4000} minLength={10} onChange={(event) => updateDraft("body", event.target.value)} placeholder="말씀에서 발견한 것과 오늘의 적용을 나눠 주세요." required value={draft.body} />
            </div>
            <CommunityVersePicker inputVisible={showVerseInput} onChange={(keys) => updateDraft("verseKeys", keys.join(","))} verseKeys={verseKeys} />
            {showHashtagInput ? (
              <label className="community-composer-inline-field"><span>해시태그</span><input onChange={(event) => updateDraft("hashtags", event.target.value)} placeholder="#은혜 #기도 (최대 5개)" value={draft.hashtags} /></label>
            ) : null}
            {image ? (
              <div className="community-composer-attachment">
                <span><strong>{image.name}</strong><button aria-label="이미지 제거" className="community-icon-button" onClick={() => { setImage(null); setAltText(""); }} type="button">×</button></span>
                <label><span>이미지 설명</span><input maxLength={300} onChange={(event) => setAltText(event.target.value)} placeholder="이미지 내용을 설명해 주세요." value={altText} /></label>
              </div>
            ) : null}
            {initialQuotedPostId ? <div className="community-composer-quote-context">인용할 QT가 연결되었습니다.</div> : null}
            <input accept="image/jpeg,image/png,image/webp" className="community-sr-only" onChange={(event) => setImage(event.target.files?.[0] ?? null)} ref={fileInputRef} type="file" />
            <div aria-label="작성 도구" className="community-composer-toolbar">
              <button aria-label="이미지 추가" className="community-icon-button" onClick={() => fileInputRef.current?.click()} type="button"><ImagePlus aria-hidden="true" size={20} /></button>
              <button aria-label="구절 입력 전환" aria-pressed={showVerseInput} className="community-icon-button" onClick={() => setShowVerseInput((value) => !value)} type="button"><BookOpenText aria-hidden="true" size={20} /></button>
              <button aria-label="해시태그 입력 전환" aria-pressed={showHashtagInput} className="community-icon-button" onClick={() => setShowHashtagInput((value) => !value)} type="button"><Hash aria-hidden="true" size={20} /></button>
              <button aria-label="댓글 허용 전환" aria-pressed={draft.commentPolicy === "everyone"} className="community-icon-button" onClick={() => updateDraft("commentPolicy", draft.commentPolicy === "everyone" ? "none" : "everyone")} type="button"><MessageCircle aria-hidden="true" size={20} /></button>
              <span className="community-meta">{draft.commentPolicy === "everyone" ? "댓글 허용" : "댓글 닫힘"}</span>
            </div>
          </div>
          {error ? <p aria-live="polite" className="community-status error">{error}</p> : null}
          <footer className="community-composer-footer">
            <p className="community-meta" id="community-composer-help">구절 1개와 10자 이상의 QT가 필요합니다. 이 창에 입력한 내용만 공개됩니다.</p>
            <button className="community-button primary" disabled={!canSubmit} type="submit">{isPending ? "게시 중…" : "게시"}</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
