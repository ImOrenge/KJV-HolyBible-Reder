"use client";

import type { CommunityCommentV2 } from "@kjv/shared/community";
import { Heart, MessageCircleReply, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";

type CommunityCommentsProps = {
  initialComments: CommunityCommentV2[];
  postId: string;
  signedIn: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CommunityComments({ initialComments, postId, signedIn }: CommunityCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityCommentV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requireLogin() {
    if (signedIn) return true;
    window.location.assign(`/auth/login?next=/community/post/${postId}`);
    return false;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireLogin()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/posts/${postId}/comments`, {
        body: JSON.stringify({ body, parentCommentId: replyTo?.id }),
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as { comment?: CommunityCommentV2; error?: string } | null;
      if (!response.ok || !payload?.comment) {
        setError(payload?.error ?? "댓글을 저장하지 못했습니다.");
        return;
      }
      setComments((current) => [...current, payload.comment!]);
      setBody("");
      setReplyTo(null);
    });
  }

  function toggleLike(comment: CommunityCommentV2) {
    if (!requireLogin()) return;
    const active = !comment.viewerLiked;
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, likeCount: Math.max(0, item.likeCount + (active ? 1 : -1)), viewerLiked: active } : item));
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/comments/${comment.id}/like`, {
        body: JSON.stringify({ active }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json().catch(() => null) as { count?: number; error?: string } | null;
      if (!response.ok) {
        setComments((current) => current.map((item) => item.id === comment.id ? { ...item, likeCount: Math.max(0, item.likeCount + (active ? -1 : 1)), viewerLiked: !active } : item));
        setError(payload?.error ?? "댓글 좋아요를 반영하지 못했습니다.");
      } else if (typeof payload?.count === "number") {
        setComments((current) => current.map((item) => item.id === comment.id ? { ...item, likeCount: payload.count!, viewerLiked: active } : item));
      }
    });
  }

  function editComment(comment: CommunityCommentV2) {
    const nextBody = window.prompt("댓글 수정", comment.body)?.trim();
    if (!nextBody || nextBody === comment.body) return;
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/comments/${comment.id}`, {
        body: JSON.stringify({ body: nextBody }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { comment?: CommunityCommentV2; error?: string } | null;
      if (!response.ok || !payload?.comment) setError(payload?.error ?? "댓글을 수정하지 못했습니다.");
      else setComments((current) => current.map((item) => item.id === comment.id ? payload.comment! : item));
    });
  }

  function deleteComment(comment: CommunityCommentV2) {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/comments/${comment.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error ?? "댓글을 삭제하지 못했습니다.");
      else setComments((current) => current.filter((item) => item.id !== comment.id && item.parentCommentId !== comment.id));
    });
  }

  const roots = comments.filter((comment) => !comment.parentCommentId);
  const ordered = roots.flatMap((root) => [root, ...comments.filter((comment) => comment.parentCommentId === root.id)]);

  return (
    <section className="community-card" aria-labelledby="community-comments-title">
      <div className="community-card-pad"><h2 id="community-comments-title">댓글 {comments.length}</h2></div>
      <form className="community-comment-form" onSubmit={submit}>
        <input aria-label={replyTo ? `${replyTo.author?.displayName}님에게 답글` : "댓글"} maxLength={3000} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? `${replyTo.author?.displayName}님에게 답글…` : "묵상에 대한 생각을 나눠 주세요."} required value={body} />
        {replyTo ? <button className="community-button" onClick={() => setReplyTo(null)} type="button">답글 취소</button> : null}
        <button aria-label="댓글 게시" className="community-icon-button" disabled={isPending} type="submit"><Send aria-hidden="true" size={19} /></button>
      </form>
      {error ? <p aria-live="polite" className="community-status error">{error}</p> : null}
      {ordered.length ? ordered.map((comment) => (
        <article className={`community-comment ${comment.parentCommentId ? "reply" : ""}`} key={comment.id}>
          <div className="community-profile-line">
            <CommunityAvatar avatarUrl={comment.author?.avatarUrl ?? null} displayName={comment.author?.displayName ?? "사용자"} size={38} />
            <div className="community-profile-copy">
              {comment.author ? <Link href={`/community/u/${comment.author.handle}`}>{comment.author.displayName}</Link> : <strong>탈퇴한 사용자</strong>}
              <span className="community-meta"><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>{comment.editedAt ? " · 수정됨" : ""}</span>
            </div>
          </div>
          <p className="community-post-body">{comment.body}</p>
          <div className="community-inline">
            <button aria-label={comment.viewerLiked ? "댓글 좋아요 취소" : "댓글 좋아요"} aria-pressed={comment.viewerLiked} className={`community-action ${comment.viewerLiked ? "active" : ""}`} disabled={isPending} onClick={() => toggleLike(comment)} type="button"><Heart aria-hidden="true" fill={comment.viewerLiked ? "currentColor" : "none"} size={16} /> {comment.likeCount}</button>
            {!comment.parentCommentId ? <button className="community-action" onClick={() => { setReplyTo(comment); setBody(`@${comment.author?.handle ?? ""} `); }} type="button"><MessageCircleReply aria-hidden="true" size={16} /> 답글</button> : null}
            {comment.author?.isCurrentUser ? <button aria-label="댓글 수정" className="community-icon-button" onClick={() => editComment(comment)} type="button"><Pencil aria-hidden="true" size={15} /></button> : null}
            {comment.author?.isCurrentUser ? <button aria-label="댓글 삭제" className="community-icon-button" onClick={() => deleteComment(comment)} type="button"><Trash2 aria-hidden="true" size={15} /></button> : null}
          </div>
        </article>
      )) : <div className="community-empty">첫 댓글을 남겨 보세요.</div>}
    </section>
  );
}
