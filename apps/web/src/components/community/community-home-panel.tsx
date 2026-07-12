"use client";

import {
  createCommunityComment,
  createCommunityThread,
  getCommunityRankings,
  getCommunitySummary,
  getCommunityThread,
  setCommunityReaction,
  submitCommunityReport,
  updateCommunityProfile,
  type CommunityRankingPeriod,
  type CommunitySummary,
  type CommunityThreadDetail,
  type CommunityThreadType,
} from "@kjv/shared/community";
import { Bell, Flag, Heart, MessageCircle, Send, Trophy, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { AppUser } from "@/lib/auth/app-user";

type Props = {
  currentReference: { reference: string; verseKey: string } | null;
  onLogin: () => void;
  onOpenReader: () => void;
  user: AppUser;
};

const threadTypeLabels: Record<CommunityThreadType, string> = {
  application: "적용",
  cross_reference: "관련 구절",
  observation: "관찰",
  qt_share: "QT 나눔",
  question: "질문",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
export function CommunityHomePanel({ currentReference, onLogin, onOpenReader, user }: Props) {
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [detail, setDetail] = useState<CommunityThreadDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [threadType, setThreadType] = useState<CommunityThreadType>("qt_share");
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rankingPeriod, setRankingPeriod] = useState<CommunityRankingPeriod>("weekly");

  const refresh = useCallback(async () => {
    if (!user.isAuthenticated) return;
    setStatus("loading");
    try {
      const next = await getCommunitySummary({});
      setSummary(next);
      setDisplayName(next.profile.displayName);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "커뮤니티를 불러오지 못했습니다.");
      setStatus("error");
    }
  }, [user.isAuthenticated]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function openThread(threadId: string) {
    setMessage("");
    try { setDetail(await getCommunityThread(threadId, {})); }
    catch (error) { setMessage(error instanceof Error ? error.message : "토론을 열지 못했습니다."); }
  }

  async function publishThread() {
    if (!currentReference) { onOpenReader(); return; }
    setMessage("");
    try {
      const result = await createCommunityThread({ verseKey: currentReference.verseKey, title, body, threadType }, {});
      setTitle(""); setBody(""); setDetail({ thread: result.thread, comments: [] });
      await refresh();
      setMessage("QT 나눔을 게시했습니다. 포인트가 반영되었습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "QT 나눔을 게시하지 못했습니다."); }
  }

  async function publishComment() {
    if (!detail || !comment.trim()) return;
    try {
      await createCommunityComment(detail.thread.id, comment, {});
      setComment("");
      setDetail(await getCommunityThread(detail.thread.id, {}));
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "댓글을 저장하지 못했습니다."); }
  }

  async function toggleHelpful(targetType: "thread" | "comment", targetId: string, active: boolean) {
    try {
      await setCommunityReaction({ targetType, targetId, reactionType: "helpful", active }, {});
      if (detail) setDetail(await getCommunityThread(detail.thread.id, {}));
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "반응을 저장하지 못했습니다."); }
  }

  async function saveProfile(input: { rankingOptIn?: boolean }) {
    if (!summary) return;
    try {
      const result = await updateCommunityProfile({ displayName, rankingOptIn: input.rankingOptIn ?? summary.profile.rankingOptIn }, {});
      setSummary({ ...summary, profile: result.profile });
      setMessage("커뮤니티 프로필을 저장했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "프로필을 저장하지 못했습니다."); }
  }

  async function changeRankingPeriod(period: CommunityRankingPeriod) {
    setRankingPeriod(period);
    try {
      const result = await getCommunityRankings(period, {});
      if (summary) setSummary({ ...summary, weeklyRanking: result.rankings.slice(0, 10), currentUserRank: result.currentUserRank });
    } catch (error) { setMessage(error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다."); }
  }

  async function reportThread(threadId: string) {
    if (!window.confirm("이 QT 나눔을 운영자에게 신고하시겠습니까?")) return;
    try { await submitCommunityReport({ targetType: "thread", targetId: threadId, reason: "other" }, {}); setMessage("신고가 접수되었습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "신고를 접수하지 못했습니다."); }
  }

  if (!user.isAuthenticated) {
    return (
      <section className="panel home-section home-section-community community-home-panel">
        <div className="panel-heading"><span>QT 커뮤니티</span><Users size={18} /></div>
        <div className="community-guest-state">
          <strong>구절을 중심으로 QT와 질문을 나눕니다.</strong>
          <p>커뮤니티 글과 랭킹은 로그인한 회원에게만 공개됩니다.</p>
          <button className="primary-button" type="button" onClick={onLogin}>로그인하고 참여하기</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel home-section home-section-community community-home-panel">
      <div className="panel-heading"><span>QT 커뮤니티</span><Users size={18} /></div>
      {status === "loading" && !summary ? <p className="empty-text">커뮤니티 불러오는 중...</p> : null}
      {summary ? (
        <>
          <div className="community-summary-strip" aria-label="내 커뮤니티 요약">
            <div><UserRound size={16} /><span>레벨</span><strong>{summary.profile.levelName}</strong></div>
            <div><Trophy size={16} /><span>포인트</span><strong>{summary.profile.points}P</strong></div>
            <div><Users size={16} /><span>내 순위</span><strong>{summary.currentUserRank ? `${summary.currentUserRank}위` : "미참여"}</strong></div>
            <div><Bell size={16} /><span>알림</span><strong>{summary.unreadCount}</strong></div>
          </div>

          <div className="community-profile-row">
            <label>표시명<input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} /></label>
            <button className="secondary-button" type="button" onClick={() => void saveProfile({})}>저장</button>
            <label className="community-toggle"><input checked={summary.profile.rankingOptIn} type="checkbox" onChange={(event) => void saveProfile({ rankingOptIn: event.target.checked })} />랭킹 참여</label>
          </div>

          <div className="community-workspace">
            <form className="community-composer" onSubmit={(event) => { event.preventDefault(); void publishThread(); }}>
              <div className="community-section-heading"><strong>현재 본문으로 QT 나눔</strong><span>{currentReference?.reference ?? "본문 선택 필요"}</span></div>
              <div className="community-composer-grid">
                <select aria-label="나눔 유형" value={threadType} onChange={(event) => setThreadType(event.target.value as CommunityThreadType)}>
                  {Object.entries(threadTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input aria-label="QT 제목" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="본문에서 발견한 핵심" />
              </div>
              <textarea aria-label="QT 내용" value={body} maxLength={4000} onChange={(event) => setBody(event.target.value)} placeholder="관찰, 묵상, 적용 또는 질문을 나눠주세요." rows={5} />
              <div className="community-composer-actions">
                {!currentReference ? <button className="secondary-button" type="button" onClick={onOpenReader}>본문 선택</button> : null}
                <button className="primary-button" disabled={!currentReference || title.trim().length < 4 || body.trim().length < 10} type="submit"><Send size={16} />게시</button>
              </div>
            </form>

            <div className="community-feed" aria-label="최신 QT 나눔">
              <div className="community-section-heading"><strong>최신 구절 나눔</strong><span>{summary.recentThreads.length}개</span></div>
              {summary.recentThreads.map((thread) => (
                <button className={detail?.thread.id === thread.id ? "community-thread-row active" : "community-thread-row"} key={thread.id} type="button" onClick={() => void openThread(thread.id)}>
                  <span className="community-thread-meta">{thread.reference} · {threadTypeLabels[thread.threadType]}</span>
                  <strong>{thread.title}</strong>
                  <small>{thread.authorDisplayName}{thread.authorLevelName ? ` · ${thread.authorLevelName}` : ""} · 댓글 {thread.commentCount} · 도움 {thread.helpfulCount}</small>
                </button>
              ))}
              {!summary.recentThreads.length ? <p className="empty-text">첫 QT 나눔을 작성해보세요.</p> : null}
            </div>
          </div>

          {detail ? (
            <div className="community-thread-detail">
              <div className="community-detail-heading"><div><span>{detail.thread.reference}</span><h3>{detail.thread.title}</h3></div><button className="icon-button" type="button" aria-label="신고" onClick={() => void reportThread(detail.thread.id)}><Flag size={15} /></button></div>
              <blockquote>{detail.thread.koText ?? detail.thread.kjvText}</blockquote>
              <p>{detail.thread.body}</p>
              <button className={detail.thread.viewerHelpful ? "small-button active" : "small-button"} type="button" onClick={() => void toggleHelpful("thread", detail.thread.id, !detail.thread.viewerHelpful)}><Heart size={14} />도움 {detail.thread.helpfulCount}</button>
              <div className="community-comment-list">
                {detail.comments.map((item) => <div className="community-comment" key={item.id}><div><strong>{item.authorDisplayName}</strong><small>{formatDate(item.createdAt)}</small></div><p>{item.body}</p><button className={item.viewerHelpful ? "small-button active" : "small-button"} type="button" onClick={() => void toggleHelpful("comment", item.id, !item.viewerHelpful)}><Heart size={13} />{item.helpfulCount}</button></div>)}
              </div>
              {detail.thread.status === "open" ? <form className="community-comment-form" onSubmit={(event) => { event.preventDefault(); void publishComment(); }}><input value={comment} maxLength={3000} onChange={(event) => setComment(event.target.value)} placeholder="구절에 대한 의견을 남겨주세요." /><button className="secondary-button" disabled={!comment.trim()} type="submit"><MessageCircle size={15} />댓글</button></form> : null}
            </div>
          ) : null}

          <div className="community-ranking">
            <div className="community-section-heading"><strong>참여 랭킹</strong><span>앱 내 통독·커뮤니티 활동 기준</span></div>
            <div className="community-ranking-tabs" role="group" aria-label="랭킹 기간">
              {(["weekly", "monthly", "all_time"] as const).map((period) => <button aria-pressed={rankingPeriod === period} className={rankingPeriod === period ? "active" : ""} key={period} type="button" onClick={() => void changeRankingPeriod(period)}>{period === "weekly" ? "주간" : period === "monthly" ? "월간" : "전체"}</button>)}
            </div>
            <ol>{summary.weeklyRanking.map((entry) => <li className={entry.isCurrentUser ? "current" : ""} key={entry.userId}><span>{entry.rank}</span><strong>{entry.displayName}</strong><small>{entry.levelName}</small><b>{entry.points}P</b></li>)}</ol>
            {!summary.profile.rankingOptIn ? <p className="empty-text">랭킹 참여를 켜면 내 순위가 표시됩니다.</p> : null}
          </div>
        </>
      ) : null}
      {message ? <p className={status === "error" ? "form-error" : "form-success"} aria-live="polite">{message}</p> : null}
    </section>
  );
}
