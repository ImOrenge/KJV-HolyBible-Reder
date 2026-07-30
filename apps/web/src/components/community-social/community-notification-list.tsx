"use client";

import type { CommunityNotificationFilter, CommunityNotificationPage } from "@kjv/shared/community";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "./community-avatar";

type CommunityNotificationListProps = { filter: CommunityNotificationFilter; initialPage: CommunityNotificationPage };

const messages: Record<string, string> = {
  comment: "회원님의 QT 나눔에 댓글을 남겼습니다.",
  follow: "회원님을 팔로우하기 시작했습니다.",
  like_comment: "회원님의 댓글을 좋아합니다.",
  like_post: "회원님의 QT 나눔을 좋아합니다.",
  mention: "QT 나눔에서 회원님을 언급했습니다.",
  moderation: "커뮤니티 운영 알림이 도착했습니다.",
  quote: "회원님의 QT 나눔을 인용했습니다.",
  reply: "회원님의 댓글에 답글을 남겼습니다.",
  repost: "회원님의 QT 나눔을 리포스트했습니다.",
};

const emptyMessages: Record<CommunityNotificationFilter, string> = {
  all: "아직 활동 알림이 없습니다.",
  follows: "새로운 팔로우가 없습니다.",
  likes: "새로운 좋아요가 없습니다.",
  mentions: "새로운 언급이 없습니다.",
  quotes: "새로운 인용 QT가 없습니다.",
  replies: "새로운 답글이 없습니다.",
  reposts: "새로운 리포스트가 없습니다.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CommunityNotificationList({ filter, initialPage }: CommunityNotificationListProps) {
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function markVisibleRead() {
    const ids = page.items.filter((item) => !item.readAt).map((item) => item.id);
    if (!ids.length) return;
    startTransition(async () => {
      const response = await fetch("/api/community/v2/notifications/read", {
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setError(payload?.error ?? "활동을 읽음 처리하지 못했습니다.");
      else setPage((current) => ({ ...current, items: current.items.map((item) => ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item), unreadCount: Math.max(0, current.unreadCount - ids.length) }));
    });
  }

  function loadMore() {
    if (!page.nextCursor) return;
    startTransition(async () => {
      const query = new URLSearchParams({ cursor: page.nextCursor!, filter, limit: "30" });
      const response = await fetch(`/api/community/v2/notifications?${query}`);
      const payload = await response.json().catch(() => null) as (CommunityNotificationPage & { error?: string }) | null;
      if (!response.ok || !payload) setError(payload?.error ?? "활동을 더 불러오지 못했습니다.");
      else setPage((current) => ({ ...payload, items: [...current.items, ...payload.items] }));
    });
  }

  return (
    <section className="community-activity-list" aria-label="활동 목록">
      <div className="community-activity-tools">
        <span className="community-meta">선택한 목록의 읽지 않은 활동을 정리할 수 있습니다.</span>
        <button className="community-button" disabled={isPending || !page.items.some((item) => !item.readAt)} onClick={markVisibleRead} type="button"><CheckCheck aria-hidden="true" size={17} /> 모두 읽음</button>
      </div>
      {error ? <p aria-live="polite" className="community-status error">{error}</p> : null}
      {page.items.length ? page.items.map((item) => (
        <Link className={`community-notification ${item.readAt ? "" : "unread"}`} href={item.postId ? `/community/post/${item.postId}` : item.actor ? `/community/u/${item.actor.handle}` : "/community"} key={item.id}>
          {item.actor ? <CommunityAvatar avatarUrl={item.actor.avatarUrl} displayName={item.actor.displayName} size={42} /> : <span className="community-avatar"><Bell aria-hidden="true" size={18} /></span>}
          <span className="community-notification-copy"><span><strong>{item.actor?.displayName ?? "QT 커뮤니티"}</strong> {messages[item.eventType] ?? "활동 알림이 도착했습니다."}</span><time className="community-meta" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></span>
          {!item.readAt ? <span aria-label="읽지 않음" className="community-notification-dot" /> : null}
        </Link>
      )) : <div className="community-empty">{emptyMessages[filter]}</div>}
      {page.nextCursor ? <div className="community-activity-more"><button className="community-button" disabled={isPending} onClick={loadMore} type="button">{isPending ? "불러오는 중…" : "더 보기"}</button></div> : null}
    </section>
  );
}
