"use client";

import type { CommunityPost } from "@kjv/shared/community";
import { Flag, Heart, MessageCircle, MoreHorizontal, Pencil, Quote, Repeat2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";

type CommunityPostCardProps = {
  activityActorName?: string;
  activityLabel?: string;
  post: CommunityPost;
  signedIn: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function requestAction(path: string, active: boolean) {
  const response = await fetch(path, {
    body: JSON.stringify({ active }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const payload = await response.json().catch(() => null) as { count?: number; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "요청을 처리하지 못했습니다.");
  return payload;
}

export function CommunityPostCard({ activityActorName, activityLabel, post, signedIn }: CommunityPostCardProps) {
  const [content, setContent] = useState(post);
  const [liked, setLiked] = useState(post.viewer?.liked ?? false);
  const [reposted, setReposted] = useState(post.viewer?.reposted ?? false);
  const [likeCount, setLikeCount] = useState(post.counts.likes);
  const [repostCount, setRepostCount] = useState(post.counts.reposts);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const author = post.author;

  function requireLogin() {
    if (signedIn) return true;
    window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    return false;
  }

  function toggleLike() {
    if (!requireLogin()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    setError(null);
    startTransition(async () => {
      try {
        const payload = await requestAction(`/api/community/v2/posts/${post.id}/like`, next);
        if (typeof payload?.count === "number") setLikeCount(payload.count);
      } catch (actionError) {
        setLiked(!next);
        setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
        setError(actionError instanceof Error ? actionError.message : "좋아요를 반영하지 못했습니다.");
      }
    });
  }

  function toggleRepost() {
    if (!requireLogin()) return;
    const next = !reposted;
    setReposted(next);
    setRepostCount((count) => Math.max(0, count + (next ? 1 : -1)));
    setError(null);
    startTransition(async () => {
      try {
        const payload = await requestAction(`/api/community/v2/posts/${post.id}/repost`, next);
        if (typeof payload?.count === "number") setRepostCount(payload.count);
      } catch (actionError) {
        setReposted(!next);
        setRepostCount((count) => Math.max(0, count + (next ? -1 : 1)));
        setError(actionError instanceof Error ? actionError.message : "리포스트를 반영하지 못했습니다.");
      }
    });
  }

  function reportPost() {
    if (!requireLogin()) return;
    if (!window.confirm("이 QT 나눔을 운영자에게 신고할까요?")) return;
    startTransition(async () => {
      const response = await fetch("/api/community/v2/reports", {
        body: JSON.stringify({ reason: "other", targetId: post.id, targetType: "post" }),
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        method: "POST",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(response.ok ? "신고가 접수되었습니다." : payload?.error ?? "신고를 접수하지 못했습니다.");
    });
  }

  function editPost() {
    const nextBody = window.prompt("QT 나눔 수정", content.body)?.trim();
    if (!nextBody || nextBody === content.body) return;
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/posts/${post.id}`, {
        body: JSON.stringify({ body: nextBody }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { error?: string; post?: CommunityPost } | null;
      if (!response.ok || !payload?.post) setError(payload?.error ?? "QT 나눔을 수정하지 못했습니다.");
      else setContent(payload.post);
    });
  }

  function removePost() {
    if (!window.confirm("이 QT 나눔을 삭제할까요?")) return;
    startTransition(async () => {
      const response = await fetch(`/api/community/v2/posts/${post.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error ?? "QT 나눔을 삭제하지 못했습니다.");
      else window.location.assign("/community");
    });
  }

  return (
    <article className="community-card community-post">
      {activityLabel ? <p className="community-meta"><Repeat2 aria-hidden="true" size={14} /> {activityActorName}님이 {activityLabel}</p> : null}
      <header className="community-post-header">
        {author ? (
          <div className="community-profile-line">
            <CommunityAvatar avatarUrl={author.avatarUrl} displayName={author.displayName} />
            <div className="community-profile-copy">
              <Link href={`/community/u/${author.handle}`}>{author.displayName}{author.honorific ? ` ${author.honorific}` : ""}</Link>
              <span className="community-meta">@{author.handle} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>{post.editedAt ? " · 수정됨" : ""}</span>
            </div>
          </div>
        ) : <span className="community-muted">탈퇴한 사용자</span>}
        <details>
          <summary aria-label="게시물 메뉴" className="community-icon-button"><MoreHorizontal aria-hidden="true" size={20} /></summary>
          {author?.isCurrentUser ? <button className="community-button" disabled={isPending} onClick={editPost} type="button"><Pencil aria-hidden="true" size={16} /> 수정</button> : null}
          {author?.isCurrentUser ? <button className="community-button danger" disabled={isPending} onClick={removePost} type="button"><Trash2 aria-hidden="true" size={16} /> 삭제</button> : null}
          {!author?.isCurrentUser ? <button className="community-button danger" disabled={isPending} onClick={reportPost} type="button"><Flag aria-hidden="true" size={16} /> 신고</button> : null}
        </details>
      </header>

      {content.title ? <h2 className="community-post-title"><Link href={`/community/post/${post.id}`}>{content.title}</Link></h2> : null}
      <p className="community-post-body">{content.body}</p>
      <div className="community-verse-list">
        {post.verses.map((verse) => <Link className="community-verse-chip" href={`/community/verse/${encodeURIComponent(verse.verseKey)}`} key={verse.verseKey}>{verse.reference}</Link>)}
      </div>
      {post.verses[0] ? (
        <blockquote className="community-verse-preview">
          <strong>{post.verses[0].reference}</strong><br />{post.verses[0].kjvText}
          {post.verses[0].koText ? <><br />{post.verses[0].koText}</> : null}
        </blockquote>
      ) : null}
      {post.hashtags.length ? <div className="community-tag-list">{post.hashtags.map((tag) => <Link className="community-tag" href={`/community/hashtag/${encodeURIComponent(tag)}`} key={tag}>#{tag}</Link>)}</div> : null}
      {post.media ? <Image alt={post.media.altText || "QT 나눔 이미지"} className="community-media" height={post.media.height} sizes="(max-width: 820px) 100vw, 640px" src={post.media.url} width={post.media.width} /> : null}
      {post.quotedPost ? (
        <Link className="community-quote" href={`/community/post/${post.quotedPost.id}`}>
          {post.quotedPost.deleted ? <span className="community-muted">원문을 볼 수 없습니다.</span> : <><strong>{post.quotedPost.author?.displayName ?? "QT 작성자"}</strong><span>{post.quotedPost.title ?? post.quotedPost.body}</span></>}
        </Link>
      ) : null}
      {error ? <p aria-live="polite" className={`community-status ${error.includes("접수") ? "" : "error"}`}>{error}</p> : null}
      <footer className="community-action-row">
        <Link aria-label={`댓글 ${post.counts.comments}개`} className="community-action" href={`/community/post/${post.id}`}><MessageCircle aria-hidden="true" size={19} /><span>{post.counts.comments}</span></Link>
        <button aria-label={liked ? "좋아요 취소" : "좋아요"} aria-pressed={liked} className={`community-action ${liked ? "active" : ""}`} disabled={isPending} onClick={toggleLike} type="button"><Heart aria-hidden="true" fill={liked ? "currentColor" : "none"} size={19} /><span>{likeCount}</span></button>
        <button aria-label={reposted ? "리포스트 취소" : "리포스트"} aria-pressed={reposted} className={`community-action ${reposted ? "active" : ""}`} disabled={isPending} onClick={toggleRepost} type="button"><Repeat2 aria-hidden="true" size={19} /><span>{repostCount}</span></button>
        <Link aria-label="인용해 나누기" className="community-action" href={`/community?quote=${post.id}`}><Quote aria-hidden="true" size={19} /><span>{post.counts.quotes}</span></Link>
      </footer>
    </article>
  );
}
