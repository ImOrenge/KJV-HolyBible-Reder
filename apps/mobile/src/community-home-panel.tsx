import {
  createCommunityComment,
  createCommunityThread,
  getCommunityRankings,
  getCommunitySummary,
  getCommunityThread,
  setCommunityReaction,
  updateCommunityProfile,
  type CommunityRankingPeriod,
  type CommunitySummary,
  type CommunityThread,
  type CommunityThreadDetail,
  type CommunityThreadType,
} from "@kjv/shared";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Theme = {
  accent: string;
  accentText: string;
  border: string;
  danger: string;
  muted: string;
  surface: string;
  surfaceStrong: string;
  text: string;
};

type Props = {
  accessToken?: string;
  apiBaseUrl: string;
  currentReference: { reference: string; verseKey: string } | null;
  onLogin: () => void;
  onOpenReader: () => void;
  theme: Theme;
};

type CommunityTab = "feed" | "participating" | "ranking" | "settings";

const typeLabels: Record<CommunityThreadType, string> = {
  application: "적용",
  cross_reference: "관련 구절",
  observation: "관찰",
  qt_share: "QT 나눔",
  question: "질문",
};

const tabs: Array<{ key: CommunityTab; label: string }> = [
  { key: "feed", label: "피드" },
  { key: "participating", label: "내 참여" },
  { key: "ranking", label: "랭킹" },
  { key: "settings", label: "설정" },
];

export function CommunityHomePanel({ accessToken, apiBaseUrl, currentReference, onLogin, onOpenReader, theme }: Props) {
  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [detail, setDetail] = useState<CommunityThreadDetail | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [threadType, setThreadType] = useState<CommunityThreadType>("qt_share");
  const [rankingPeriod, setRankingPeriod] = useState<CommunityRankingPeriod>("weekly");
  const options = { accessToken, baseUrl: apiBaseUrl };

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const next = await getCommunitySummary({ accessToken, baseUrl: apiBaseUrl });
      setSummary(next);
      setDisplayName(next.profile.displayName);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "커뮤니티를 불러오지 못했습니다.");
    }
  }, [accessToken, apiBaseUrl]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!accessToken) {
    return (
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>QT 커뮤니티</Text>
        <Text style={[styles.muted, { color: theme.muted }]}>로그인하고 구절 중심 QT 나눔과 참여 랭킹을 이용하세요.</Text>
        <Pressable onPress={onLogin} style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontWeight: "800" }}>로그인하고 참여하기</Text>
        </Pressable>
      </View>
    );
  }

  async function openThread(id: string) {
    try {
      setDetail(await getCommunityThread(id, options));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "토론을 열지 못했습니다.");
    }
  }

  async function publish() {
    if (!currentReference) {
      onOpenReader();
      return;
    }
    try {
      const result = await createCommunityThread({ verseKey: currentReference.verseKey, title, body, threadType }, options);
      setTitle("");
      setBody("");
      setDetail({ thread: result.thread, comments: [] });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QT 나눔을 게시하지 못했습니다.");
    }
  }

  async function publishComment() {
    if (!detail || !comment.trim()) return;
    try {
      await createCommunityComment(detail.thread.id, comment, options);
      setComment("");
      setDetail(await getCommunityThread(detail.thread.id, options));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글을 저장하지 못했습니다.");
    }
  }

  async function toggleHelpful(targetType: "thread" | "comment", targetId: string, active: boolean) {
    try {
      await setCommunityReaction({ targetType, targetId, reactionType: "helpful", active }, options);
      if (detail) setDetail(await getCommunityThread(detail.thread.id, options));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "반응을 저장하지 못했습니다.");
    }
  }

  async function saveProfile(input: { rankingOptIn?: boolean; showLevel?: boolean }) {
    if (!summary) return;
    try {
      const result = await updateCommunityProfile({
        displayName,
        rankingOptIn: input.rankingOptIn ?? summary.profile.rankingOptIn,
        showLevel: input.showLevel ?? summary.profile.showLevel,
      }, options);
      setSummary({ ...summary, profile: result.profile });
      setMessage("커뮤니티 설정을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "커뮤니티 설정을 저장하지 못했습니다.");
    }
  }

  async function changePeriod(period: CommunityRankingPeriod) {
    setRankingPeriod(period);
    try {
      const result = await getCommunityRankings(period, options);
      if (summary) setSummary({ ...summary, weeklyRanking: result.rankings.slice(0, 10), currentUserRank: result.currentUserRank });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다.");
    }
  }

  function renderThreads(threads: CommunityThread[], emptyMessage: string) {
    return (
      <View style={styles.section}>
        {threads.map((thread) => (
          <Pressable
            key={thread.id}
            onPress={() => void openThread(thread.id)}
            style={[styles.threadRow, { backgroundColor: detail?.thread.id === thread.id ? theme.surfaceStrong : "transparent", borderColor: theme.border }]}
          >
            <Text style={[styles.muted, { color: theme.muted }]}>{thread.reference} · {typeLabels[thread.threadType]}</Text>
            <Text style={[styles.threadTitle, { color: theme.text }]}>{thread.title}</Text>
            <Text style={[styles.muted, { color: theme.muted }]}>{thread.authorDisplayName} · 댓글 {thread.commentCount} · 도움 {thread.helpfulCount}</Text>
          </Pressable>
        ))}
        {!threads.length ? <Text style={[styles.muted, { color: theme.muted }]}>{emptyMessage}</Text> : null}
      </View>
    );
  }

  const detailPanel = detail ? (
    <View style={[styles.detail, { borderColor: theme.border }]}>
      <Text style={[styles.muted, { color: theme.muted }]}>{detail.thread.reference}</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>{detail.thread.title}</Text>
      <Text style={[styles.body, { color: theme.text }]}>{detail.thread.body}</Text>
      <Pressable onPress={() => void toggleHelpful("thread", detail.thread.id, !detail.thread.viewerHelpful)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
        <Text style={{ color: theme.text }}>도움 {detail.thread.helpfulCount}</Text>
      </Pressable>
      {detail.comments.map((item) => (
        <View key={item.id} style={[styles.comment, { borderColor: theme.border }]}>
          <Text style={[styles.threadTitle, { color: theme.text }]}>{item.authorDisplayName}</Text>
          <Text style={[styles.body, { color: theme.text }]}>{item.body}</Text>
          <Pressable onPress={() => void toggleHelpful("comment", item.id, !item.viewerHelpful)}><Text style={{ color: theme.accent }}>도움 {item.helpfulCount}</Text></Pressable>
        </View>
      ))}
      <View style={styles.commentForm}>
        <TextInput onChangeText={setComment} placeholder="구절에 대한 의견" placeholderTextColor={theme.muted} style={[styles.input, styles.commentInput, { borderColor: theme.border, color: theme.text }]} value={comment} />
        <Pressable disabled={!comment.trim()} onPress={() => void publishComment()} style={[styles.secondaryButton, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>댓글</Text></Pressable>
      </View>
    </View>
  ) : null;

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>QT 커뮤니티</Text>
      {summary ? (
        <>
          <View style={[styles.metrics, { borderColor: theme.border }]}>
            <Metric label="레벨" value={summary.profile.levelName} theme={theme} />
            <Metric label="포인트" value={`${summary.profile.points}P`} theme={theme} />
            <Metric label="내 순위" value={summary.currentUserRank ? `${summary.currentUserRank}위` : "미참여"} theme={theme} />
          </View>

          <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: theme.border }]}>
            {tabs.map((tab) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.key }}
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key ? { backgroundColor: theme.surfaceStrong } : null]}
              >
                <Text style={{ color: activeTab === tab.key ? theme.text : theme.muted, fontSize: 12, fontWeight: "800" }}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "feed" ? (
            <>
              <View style={styles.section}>
                <Text style={[styles.subtitle, { color: theme.text }]}>현재 본문으로 QT 나눔</Text>
                <Text style={[styles.muted, { color: theme.muted }]}>{currentReference?.reference ?? "본문 선택 필요"}</Text>
                <View style={styles.typeRow}>{(Object.keys(typeLabels) as CommunityThreadType[]).map((value) => <Pressable key={value} onPress={() => setThreadType(value)} style={[styles.typeButton, { backgroundColor: threadType === value ? theme.surfaceStrong : "transparent", borderColor: theme.border }]}><Text style={{ color: theme.text, fontSize: 12 }}>{typeLabels[value]}</Text></Pressable>)}</View>
                <TextInput maxLength={120} onChangeText={setTitle} placeholder="QT 제목" placeholderTextColor={theme.muted} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={title} />
                <TextInput maxLength={4000} multiline onChangeText={setBody} placeholder="관찰, 묵상, 적용 또는 질문을 나눠주세요." placeholderTextColor={theme.muted} style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text }]} textAlignVertical="top" value={body} />
                {!currentReference ? <Pressable onPress={onOpenReader} style={[styles.secondaryButton, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>본문 선택</Text></Pressable> : null}
                <Pressable disabled={!currentReference || title.trim().length < 4 || body.trim().length < 10} onPress={() => void publish()} style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: !currentReference || title.trim().length < 4 || body.trim().length < 10 ? 0.45 : 1 }]}><Text style={{ color: theme.accentText, fontWeight: "800" }}>게시</Text></Pressable>
              </View>
              <Text style={[styles.subtitle, { color: theme.text }]}>최신 구절 나눔</Text>
              {renderThreads(summary.recentThreads, "첫 QT 나눔을 작성해보세요.")}
              {detailPanel}
            </>
          ) : null}

          {activeTab === "participating" ? (
            <>
              <Text style={[styles.subtitle, { color: theme.text }]}>내가 참여한 글</Text>
              {renderThreads(summary.participatingThreads, "아직 작성하거나 댓글을 남긴 글이 없습니다.")}
              {detailPanel}
            </>
          ) : null}

          {activeTab === "ranking" ? (
            <View style={styles.section}>
              <Text style={[styles.subtitle, { color: theme.text }]}>참여 랭킹</Text>
              <View style={styles.typeRow}>{(["weekly", "monthly", "all_time"] as const).map((period) => <Pressable key={period} onPress={() => void changePeriod(period)} style={[styles.typeButton, { backgroundColor: rankingPeriod === period ? theme.surfaceStrong : "transparent", borderColor: theme.border }]}><Text style={{ color: theme.text }}>{period === "weekly" ? "주간" : period === "monthly" ? "월간" : "전체"}</Text></Pressable>)}</View>
              {summary.weeklyRanking.map((entry) => <View key={entry.userId} style={[styles.rankRow, { borderColor: theme.border, backgroundColor: entry.isCurrentUser ? theme.surfaceStrong : "transparent" }]}><Text style={{ color: theme.muted, width: 26 }}>{entry.rank}</Text><Text style={{ color: theme.text, flex: 1, fontWeight: "700" }}>{entry.displayName}</Text><Text style={{ color: theme.accent, fontWeight: "800" }}>{entry.points}P</Text></View>)}
            </View>
          ) : null}

          {activeTab === "settings" ? (
            <View style={styles.section}>
              <Text style={[styles.subtitle, { color: theme.text }]}>커뮤니티 프로필</Text>
              <TextInput maxLength={40} onChangeText={setDisplayName} placeholder="표시명" placeholderTextColor={theme.muted} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={displayName} />
              <Pressable onPress={() => void saveProfile({})} style={[styles.secondaryButton, { borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: "700" }}>표시명 저장</Text></Pressable>
              <Pressable onPress={() => void saveProfile({ rankingOptIn: !summary.profile.rankingOptIn })} style={[styles.settingRow, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>랭킹 참여</Text><Text style={{ color: theme.accent, fontWeight: "800" }}>{summary.profile.rankingOptIn ? "사용" : "미사용"}</Text></Pressable>
              <Pressable onPress={() => void saveProfile({ showLevel: !summary.profile.showLevel })} style={[styles.settingRow, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>작성 글에 레벨 공개</Text><Text style={{ color: theme.accent, fontWeight: "800" }}>{summary.profile.showLevel ? "공개" : "비공개"}</Text></Pressable>
              <Text style={[styles.privacyNote, { borderColor: theme.border, color: theme.muted }]}>개인 노트는 직접 게시하지 않는 한 커뮤니티에 공개되지 않습니다.</Text>
            </View>
          ) : null}
        </>
      ) : <Text style={[styles.muted, { color: theme.muted }]}>커뮤니티 불러오는 중...</Text>}
      {message ? <Text style={{ color: theme.danger }}>{message}</Text> : null}
    </View>
  );
}

function Metric({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return <View style={styles.metric}><Text style={[styles.muted, { color: theme.muted }]}>{label}</Text><Text style={{ color: theme.text, fontWeight: "800" }}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22 },
  comment: { borderTopWidth: 1, gap: 6, paddingVertical: 12 },
  commentForm: { alignItems: "center", flexDirection: "row", gap: 8 },
  commentInput: { flex: 1 },
  detail: { borderTopWidth: 1, gap: 10, paddingTop: 16 },
  input: { borderRadius: 6, borderWidth: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  metric: { flex: 1, gap: 4, minWidth: 84, padding: 10 },
  metrics: { borderBottomWidth: 1, borderTopWidth: 1, flexDirection: "row" },
  muted: { fontSize: 12, lineHeight: 18 },
  panel: { borderRadius: 8, borderWidth: 1, gap: 16, padding: 14 },
  primaryButton: { alignItems: "center", borderRadius: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  privacyNote: { borderBottomWidth: 1, borderTopWidth: 1, fontSize: 12, lineHeight: 19, paddingVertical: 12 },
  rankRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", minHeight: 42, paddingHorizontal: 6 },
  secondaryButton: { alignItems: "center", borderRadius: 6, borderWidth: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: 12 },
  section: { gap: 10 },
  settingRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  subtitle: { fontSize: 16, fontWeight: "800" },
  tab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 44, minWidth: 0, paddingHorizontal: 4 },
  tabs: { borderBottomWidth: 1, flexDirection: "row" },
  textarea: { minHeight: 120 },
  threadRow: { borderBottomWidth: 1, gap: 4, paddingHorizontal: 6, paddingVertical: 11 },
  threadTitle: { fontSize: 14, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "800" },
  typeButton: { alignItems: "center", borderRadius: 6, borderWidth: 1, justifyContent: "center", minHeight: 38, paddingHorizontal: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
