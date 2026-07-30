import {
  createCommunityCommentV2,
  createCommunityPostV2,
  deleteCommunityCommentV2,
  deleteCommunityPostV2,
  getCommunityCommentsV2,
  getCommunityFeedV2,
  getCommunityNotificationsV2,
  getCommunityPostV2,
  getOwnCommunityProfileV2,
  markCommunityNotificationsReadV2,
  registerCommunityPushTokenV2,
  searchCommunityV2,
  setCommunityBlockV2,
  setCommunityCommentLikeV2,
  setCommunityFollowV2,
  setCommunityMuteV2,
  setCommunityPostLikeV2,
  setCommunityRepostV2,
  submitCommunityReportV2,
  updateCommunityCommentV2,
  updateCommunityPostV2,
  updateCommunityProfileV2,
  uploadCommunityPostMediaV2,
  type CommunityCommentV2,
  type CommunityFeedMode,
  type CommunityFeedPage,
  type CommunityNotificationPage,
  type CommunityPost,
  type CommunityProfileDetailV2,
  type CommunityPublicProfileSummary,
  type CommunitySearchResults,
} from "@kjv/shared";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  type ImageStyle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  onBack: () => void;
  onLogin: () => void;
  onOpenReader: () => void;
  theme: Theme;
};

type CommunityScreen = "feed" | "notifications" | "search" | "settings";

const feedModes: Array<{ key: CommunityFeedMode; label: string }> = [
  { key: "for_you", label: "추천" },
  { key: "following", label: "팔로잉" },
  { key: "latest", label: "최신" },
];

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(value));
}

function avatarLabel(profile: CommunityPublicProfileSummary | null) {
  return profile?.displayName.trim().slice(0, 1) || "QT";
}

async function getPostImageBlob(asset: ImagePicker.ImagePickerAsset, mimeType: string) {
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    return response.blob();
  }
  return {
    name: asset.fileName ?? "qt-image.jpg",
    type: mimeType,
    uri: asset.uri,
  } as unknown as Blob;
}

export function CommunityHomePanel({ accessToken, apiBaseUrl, currentReference, onBack, onLogin, onOpenReader, theme }: Props) {
  const safeAreaInsets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const options = useMemo(() => ({ accessToken, baseUrl: apiBaseUrl }), [accessToken, apiBaseUrl]);
  const [screen, setScreen] = useState<CommunityScreen>("feed");
  const [feedMode, setFeedMode] = useState<CommunityFeedMode>("for_you");
  const [feed, setFeed] = useState<CommunityFeedPage | null>(null);
  const [profile, setProfile] = useState<CommunityProfileDetailV2 | null>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityCommentV2[]>([]);
  const [notifications, setNotifications] = useState<CommunityNotificationPage | null>(null);
  const [searchResults, setSearchResults] = useState<CommunitySearchResults | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerBody, setComposerBody] = useState("");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerVerses, setComposerVerses] = useState(currentReference?.verseKey ?? "");
  const [composerTags, setComposerTags] = useState("");
  const [composerImage, setComposerImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [quotedPostId, setQuotedPostId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [profileHandle, setProfileHandle] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileShowHonorific, setProfileShowHonorific] = useState(false);

  const refreshFeed = useCallback(async (mode: CommunityFeedMode = feedMode) => {
    if (mode === "following" && !accessToken) {
      onLogin();
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      setFeed(await getCommunityFeedV2(mode, options));
      setFeedMode(mode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QT 피드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, feedMode, onLogin, options]);

  const refreshProfile = useCallback(async () => {
    if (!accessToken) {
      setProfile(null);
      return;
    }
    try {
      const result = await getOwnCommunityProfileV2(options);
      setProfile(result.profile);
      setProfileHandle(result.profile.handle);
      setProfileBio(result.profile.bio);
      setProfileShowHonorific(Boolean(result.profile.honorific));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "커뮤니티 프로필을 불러오지 못했습니다.");
    }
  }, [accessToken, options]);

  useEffect(() => { void refreshFeed("for_you"); }, [accessToken, apiBaseUrl]);
  useEffect(() => { void refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    if (!accessToken || Platform.OS === "web") return;
    let cancelled = false;
    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("community", { importance: Notifications.AndroidImportance.DEFAULT, name: "QT 커뮤니티" });
        }
        const hasPermission = (value: unknown) => {
          const candidate = value as { granted?: boolean; status?: string };
          return candidate.granted === true || candidate.status === "granted";
        };
        const existing = await Notifications.getPermissionsAsync();
        const permission = hasPermission(existing) ? existing : await Notifications.requestPermissionsAsync();
        if (!hasPermission(permission) || cancelled) return;
        const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        if (!cancelled) await registerCommunityPushTokenV2(token, Platform.OS === "ios" ? "ios" : "android", options);
      } catch {
        // Push permission or development-client availability must not block the community.
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, options]);

  useEffect(() => {
    if (!accessToken || Platform.OS === "web") return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    void import("expo-notifications").then(async (Notifications) => {
      async function openNotificationPost(data: Record<string, unknown> | undefined) {
        const postId = typeof data?.postId === "string" ? data.postId : null;
        if (!postId || cancelled) return;
        try {
          const [postResult, commentResult] = await Promise.all([
            getCommunityPostV2(postId, options),
            getCommunityCommentsV2(postId, options),
          ]);
          if (!cancelled) {
            setSelectedPost(postResult.post);
            setComments(commentResult.items);
          }
        } catch {
          if (!cancelled) setMessage("알림의 QT 나눔을 열 수 없습니다.");
        }
      }
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      await openNotificationPost(lastResponse?.notification.request.content.data);
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        void openNotificationPost(response.notification.request.content.data);
      });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [accessToken, options]);

  function requireLogin() {
    if (accessToken) return true;
    onLogin();
    return false;
  }

  async function loadMoreFeed() {
    if (!feed?.nextCursor) return;
    setLoading(true);
    try {
      const next = await getCommunityFeedV2(feedMode, options, feed.nextCursor);
      setFeed({ ...next, items: [...feed.items, ...next.items] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "다음 피드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function openComposer(quoteId?: string) {
    if (!requireLogin()) return;
    if (!profile?.publicEnabled) {
      setScreen("settings");
      setMessage("핸들과 공개 프로필을 먼저 설정해 주세요.");
      return;
    }
    setEditingPostId(null);
    setQuotedPostId(quoteId ?? null);
    setComposerBody("");
    setComposerTitle("");
    setComposerTags("");
    setComposerImage(null);
    setComposerVerses(currentReference?.verseKey ?? "");
    setComposerOpen(true);
  }

  function openEditComposer(post: CommunityPost) {
    if (!requireLogin()) return;
    setEditingPostId(post.id);
    setQuotedPostId(null);
    setComposerBody(post.body);
    setComposerTitle(post.title ?? "");
    setComposerTags(post.hashtags.map((tag) => `#${tag}`).join(" "));
    setComposerImage(null);
    setComposerVerses(post.verses.map((verse) => verse.verseKey).join(", "));
    setComposerOpen(true);
  }

  async function selectImage() {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("이미지를 선택하려면 사진 접근 권한이 필요합니다.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, selectionLimit: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 8 * 1024 * 1024 || !allowedImageTypes.has(asset.mimeType ?? "image/jpeg")) {
      setMessage("8MB 이하의 JPG, PNG, WebP 이미지를 선택하세요.");
      return;
    }
    setComposerImage(asset);
  }

  async function publishPost() {
    if (!requireLogin()) return;
    setLoading(true);
    setMessage("");
    try {
      const hashtags = composerTags.split(/[\s,#]+/).filter(Boolean);
      const verseKeys = composerVerses.split(/[\s,]+/).map((value) => value.toUpperCase()).filter(Boolean);
      let post = editingPostId
        ? (await updateCommunityPostV2(editingPostId, {
            body: composerBody,
            hashtags,
            title: composerTitle || null,
            verseKeys,
          }, options)).post
        : (await createCommunityPostV2({
            body: composerBody,
            hashtags,
            quotedPostId: quotedPostId ?? undefined,
            title: composerTitle || undefined,
            verseKeys,
          }, options)).post;
      if (composerImage) {
        const mimeType = composerImage.mimeType ?? "image/jpeg";
        const image = await getPostImageBlob(composerImage, mimeType);
        post = (await uploadCommunityPostMediaV2(post.id, { file: image, fileName: composerImage.fileName ?? undefined }, options)).post;
      }
      setFeed((current) => current ? {
        ...current,
        items: editingPostId
          ? current.items.map((item) => item.post.id === post.id ? { ...item, post } : item)
          : [{ activity: "post", actor: post.author!, post, reasonCode: null, repostedAt: null }, ...current.items],
      } : current);
      setSelectedPost((current) => current?.id === post.id ? post : current);
      setComposerOpen(false);
      setComposerBody("");
      setComposerTitle("");
      setComposerTags("");
      setComposerImage(null);
      setEditingPostId(null);
      setQuotedPostId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QT 나눔을 게시하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePostLike(post: CommunityPost) {
    if (!requireLogin()) return;
    const active = !(post.viewer?.liked ?? false);
    try {
      const result = await setCommunityPostLikeV2(post.id, active, options);
      updatePost(post.id, (item) => ({ ...item, counts: { ...item.counts, likes: result.count }, viewer: { liked: active, reposted: item.viewer?.reposted ?? false } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "좋아요를 반영하지 못했습니다.");
    }
  }

  async function toggleRepost(post: CommunityPost) {
    if (!requireLogin()) return;
    const active = !(post.viewer?.reposted ?? false);
    try {
      const result = await setCommunityRepostV2(post.id, active, options);
      updatePost(post.id, (item) => ({ ...item, counts: { ...item.counts, reposts: result.count }, viewer: { liked: item.viewer?.liked ?? false, reposted: active } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "리포스트를 반영하지 못했습니다.");
    }
  }

  function deletePost(post: CommunityPost) {
    if (!requireLogin()) return;
    Alert.alert("QT 나눔 삭제", "이 QT 나눔을 삭제할까요?", [
      { style: "cancel", text: "취소" },
      {
        style: "destructive",
        text: "삭제",
        onPress: () => {
          void deleteCommunityPostV2(post.id, options).then(() => {
            setFeed((current) => current ? { ...current, items: current.items.filter((item) => item.post.id !== post.id) } : current);
            setSelectedPost((current) => current?.id === post.id ? null : current);
            setMessage("QT 나눔을 삭제했습니다.");
          }).catch((error) => setMessage(error instanceof Error ? error.message : "QT 나눔을 삭제하지 못했습니다."));
        },
      },
    ]);
  }

  function updatePost(postId: string, updater: (post: CommunityPost) => CommunityPost) {
    setFeed((current) => current ? { ...current, items: current.items.map((item) => item.post.id === postId ? { ...item, post: updater(item.post) } : item) } : current);
    setSelectedPost((current) => current?.id === postId ? updater(current) : current);
  }

  async function openPost(postId: string) {
    setLoading(true);
    setMessage("");
    try {
      const [postResult, commentResult] = await Promise.all([getCommunityPostV2(postId, options), getCommunityCommentsV2(postId, options)]);
      setSelectedPost(postResult.post);
      setComments(commentResult.items);
      setCommentBody("");
      setEditingCommentId(null);
      setReplyParentId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QT 나눔을 열지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function publishComment() {
    if (!selectedPost || !requireLogin()) return;
    setLoading(true);
    try {
      if (editingCommentId) {
        const result = await updateCommunityCommentV2(editingCommentId, commentBody, options);
        setComments((current) => current.map((comment) => comment.id === editingCommentId ? result.comment : comment));
      } else {
        const result = await createCommunityCommentV2(selectedPost.id, commentBody, options, replyParentId ?? undefined);
        setComments((current) => [...current, result.comment]);
        updatePost(selectedPost.id, (post) => ({ ...post, counts: { ...post.counts, comments: post.counts.comments + 1 } }));
      }
      setCommentBody("");
      setEditingCommentId(null);
      setReplyParentId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글을 게시하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCommentLike(comment: CommunityCommentV2) {
    if (!requireLogin()) return;
    try {
      const active = !comment.viewerLiked;
      const result = await setCommunityCommentLikeV2(comment.id, active, options);
      setComments((current) => current.map((item) => item.id === comment.id
        ? { ...item, likeCount: result.count, viewerLiked: active }
        : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글 좋아요를 반영하지 못했습니다.");
    }
  }

  function deleteComment(comment: CommunityCommentV2) {
    if (!selectedPost || !requireLogin()) return;
    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { style: "cancel", text: "취소" },
      {
        style: "destructive",
        text: "삭제",
        onPress: () => {
          void deleteCommunityCommentV2(comment.id, options).then(async () => {
            const [postResult, commentResult] = await Promise.all([
              getCommunityPostV2(selectedPost.id, options),
              getCommunityCommentsV2(selectedPost.id, options),
            ]);
            updatePost(selectedPost.id, () => postResult.post);
            setComments(commentResult.items);
            setMessage("댓글을 삭제했습니다.");
          }).catch((error) => setMessage(error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다."));
        },
      },
    ]);
  }

  async function runSearch() {
    if (searchQuery.trim().length < 2) {
      setMessage("검색어를 두 글자 이상 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      setSearchResults(await searchCommunityV2(searchQuery, "all", options));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검색하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function setProfileRelation(target: CommunityPublicProfileSummary, relation: "block" | "follow" | "mute") {
    if (!requireLogin()) return;
    const current = relation === "follow" ? target.viewerFollowing : relation === "mute" ? target.viewerMuted : target.viewerBlocked;
    try {
      if (relation === "follow") await setCommunityFollowV2(target.handle, !current, options);
      if (relation === "mute") await setCommunityMuteV2(target.handle, !current, options);
      if (relation === "block") await setCommunityBlockV2(target.handle, !current, options);
      setSearchResults((result) => result ? { ...result, profiles: result.profiles.map((item) => item.userId === target.userId ? { ...item, viewerBlocked: relation === "block" ? !current : item.viewerBlocked, viewerFollowing: relation === "follow" ? !current : relation === "block" && !current ? false : item.viewerFollowing, viewerMuted: relation === "mute" ? !current : item.viewerMuted } : item) } : result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관계 설정을 반영하지 못했습니다.");
    }
  }

  async function openNotifications() {
    if (!requireLogin()) return;
    setScreen("notifications");
    setLoading(true);
    try {
      const next = await getCommunityNotificationsV2(options);
      setNotifications(next);
      const unreadIds = next.items.filter((item) => !item.readAt).map((item) => item.id);
      if (unreadIds.length) await markCommunityNotificationsReadV2(unreadIds, options);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!requireLogin()) return;
    setLoading(true);
    try {
      const result = await updateCommunityProfileV2({
        bio: profileBio,
        handle: profileHandle,
        publicEnabled: true,
        showHonorific: profileShowHonorific,
      }, options);
      setProfile(result.profile);
      setMessage("커뮤니티 프로필을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function reportPost(postId: string) {
    if (!requireLogin()) return;
    Alert.alert("QT 나눔 신고", "운영자에게 이 나눔을 신고할까요?", [
      { style: "cancel", text: "취소" },
      { style: "destructive", text: "신고", onPress: () => { void submitCommunityReportV2({ reason: "other", targetId: postId, targetType: "post" }, options).then(() => setMessage("신고가 접수되었습니다.")).catch((error) => setMessage(error instanceof Error ? error.message : "신고하지 못했습니다.")); } },
    ]);
  }

  function renderPost(post: CommunityPost, activityLabel?: string) {
    return (
      <View key={`${activityLabel ?? "post"}-${post.id}`} style={styles.postCard}>
        {activityLabel ? <Text style={styles.meta}>{activityLabel}</Text> : null}
        <View style={styles.byline}>
          {post.author?.avatarUrl ? <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar as ImageStyle} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{avatarLabel(post.author)}</Text></View>}
          <View style={styles.flex}><Text style={styles.author}>{post.author?.displayName ?? "탈퇴한 사용자"}</Text><Text style={styles.meta}>@{post.author?.handle ?? "unknown"} · {formatDate(post.publishedAt)}{post.editedAt ? " · 수정됨" : ""}</Text></View>
          {post.author?.isCurrentUser ? (
            <View style={styles.ownerActions}>
              <Pressable accessibilityLabel="QT 나눔 수정" onPress={() => openEditComposer(post)}><Text style={styles.actionText}>수정</Text></Pressable>
              <Pressable accessibilityLabel="QT 나눔 삭제" onPress={() => deletePost(post)}><Text style={styles.dangerText}>삭제</Text></Pressable>
            </View>
          ) : <Pressable accessibilityLabel="QT 나눔 신고" onPress={() => reportPost(post.id)}><Text style={styles.dangerText}>신고</Text></Pressable>}
        </View>
        {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
        <Text style={styles.body}>{post.body}</Text>
        <View style={styles.chipRow}>{post.verses.map((verse) => <Text key={verse.verseKey} style={styles.verseChip}>{verse.reference}</Text>)}</View>
        {post.verses[0] ? <Text style={styles.verseQuote}>{post.verses[0].koText ?? post.verses[0].kjvText}</Text> : null}
        <View style={styles.chipRow}>{post.hashtags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>
        {post.media ? <Image accessibilityLabel={post.media.altText || "QT 나눔 이미지"} resizeMode="cover" source={{ uri: post.media.url }} style={[styles.postImage as ImageStyle, { aspectRatio: post.media.width / post.media.height }]} /> : null}
        {post.quotedPost ? <Pressable onPress={() => void openPost(post.quotedPost!.id)} style={styles.quoteCard}><Text style={styles.author}>{post.quotedPost.author?.displayName ?? "QT 나눔"}</Text><Text numberOfLines={3} style={styles.meta}>{post.quotedPost.deleted ? "원문을 볼 수 없습니다." : post.quotedPost.title ?? post.quotedPost.body}</Text></Pressable> : null}
        <View style={styles.actionRow}>
          <Pressable onPress={() => void openPost(post.id)} style={styles.action}><Text style={styles.actionText}>댓글 {post.counts.comments}</Text></Pressable>
          <Pressable onPress={() => void togglePostLike(post)} style={[styles.action, post.viewer?.liked ? styles.actionActive : null]}><Text style={styles.actionText}>{post.viewer?.liked ? "♥" : "♡"} {post.counts.likes}</Text></Pressable>
          <Pressable onPress={() => void toggleRepost(post)} style={[styles.action, post.viewer?.reposted ? styles.actionActive : null]}><Text style={styles.actionText}>↻ {post.counts.reposts}</Text></Pressable>
          <Pressable onPress={() => openComposer(post.id)} style={styles.action}><Text style={styles.actionText}>인용 {post.counts.quotes}</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="이전 화면" accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backGlyph}>‹</Text></Pressable>
        <View style={styles.flex}><Text style={styles.title}>QT 커뮤니티</Text><Text style={styles.meta}>공개 말씀 나눔</Text></View>
        <Pressable accessibilityLabel="검색" onPress={() => setScreen("search")} style={styles.headerButton}><Text style={styles.headerGlyph}>⌕</Text></Pressable>
        <Pressable accessibilityLabel="알림" onPress={() => void openNotifications()} style={styles.headerButton}><Text style={styles.headerGlyph}>♧</Text></Pressable>
        <Pressable accessibilityLabel="프로필 설정" onPress={() => accessToken ? setScreen("settings") : onLogin()} style={styles.headerButton}><Text style={styles.headerGlyph}>◎</Text></Pressable>
      </View>

      {message ? <Text accessibilityLiveRegion="polite" style={message.includes("했습니다") || message.includes("접수") ? styles.success : styles.error}>{message}</Text> : null}

      {screen === "feed" ? (
        <View style={styles.section}>
          <View accessibilityRole="tablist" style={styles.tabs}>{feedModes.map((mode) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: feedMode === mode.key }} key={mode.key} onPress={() => void refreshFeed(mode.key)} style={[styles.tab, feedMode === mode.key ? styles.tabActive : null]}><Text style={feedMode === mode.key ? styles.tabTextActive : styles.meta}>{mode.label}</Text></Pressable>)}</View>
          <Pressable onPress={() => openComposer()} style={styles.composeTrigger}><Text style={styles.meta}>{accessToken ? "오늘 묵상한 말씀을 나눠 보세요." : "로그인하면 QT를 나눌 수 있습니다."}</Text><Text style={styles.composeGlyph}>＋</Text></Pressable>
          {feed?.items.map((item) => renderPost(item.post, item.activity === "repost" ? `${item.actor.displayName}님이 리포스트했습니다` : undefined))}
          {!feed?.items.length && !loading ? <Text style={styles.empty}>아직 표시할 QT 나눔이 없습니다.</Text> : null}
          {feed?.nextCursor ? <Pressable disabled={loading} onPress={() => void loadMoreFeed()} style={styles.secondaryButton}><Text style={styles.buttonText}>더 보기</Text></Pressable> : null}
        </View>
      ) : null}

      {screen === "search" ? (
        <View style={styles.section}>
          <View style={styles.searchRow}><TextInput accessibilityLabel="커뮤니티 검색" onChangeText={setSearchQuery} onSubmitEditing={() => void runSearch()} placeholder="QT, 사람, 구절, 해시태그" placeholderTextColor={theme.muted} style={styles.input} value={searchQuery} /><Pressable onPress={() => void runSearch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>검색</Text></Pressable></View>
          {searchResults?.profiles.map((item) => <View key={item.userId} style={styles.profileResult}><View style={styles.flex}><Text style={styles.author}>{item.displayName}</Text><Text style={styles.meta}>@{item.handle} · 팔로워 {item.followerCount ?? 0}</Text></View><Pressable disabled={item.viewerBlocked} onPress={() => void setProfileRelation(item, "follow")} style={styles.smallButton}><Text style={styles.buttonText}>{item.viewerFollowing ? "팔로잉" : "팔로우"}</Text></Pressable><Pressable onPress={() => void setProfileRelation(item, "mute")} style={styles.smallButton}><Text style={styles.buttonText}>{item.viewerMuted ? "뮤트 해제" : "뮤트"}</Text></Pressable><Pressable onPress={() => void setProfileRelation(item, "block")} style={styles.smallButton}><Text style={styles.dangerText}>{item.viewerBlocked ? "해제" : "차단"}</Text></Pressable></View>)}
          {searchResults?.tags.length ? <View style={styles.chipRow}>{searchResults.tags.map((item) => <Text key={item.tag} style={styles.tag}>#{item.tag} {item.postCount}</Text>)}</View> : null}
          {searchResults?.verses.length ? <View style={styles.chipRow}>{searchResults.verses.map((item) => <Text key={item.verseKey} style={styles.verseChip}>{item.reference} {item.postCount}</Text>)}</View> : null}
          {searchResults?.posts.map((post) => renderPost(post))}
        </View>
      ) : null}

      {screen === "notifications" ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>알림</Text>
          {notifications?.items.map((item) => <Pressable key={item.id} onPress={() => item.postId ? void openPost(item.postId) : undefined} style={styles.notification}><Text style={styles.author}>{item.actor?.displayName ?? "QT 커뮤니티"}</Text><Text style={styles.body}>{item.eventType === "follow" ? "회원님을 팔로우하기 시작했습니다." : "회원님의 QT 활동에 반응했습니다."}</Text><Text style={styles.meta}>{formatDate(item.createdAt)}</Text></Pressable>)}
          {!notifications?.items.length ? <Text style={styles.empty}>아직 알림이 없습니다.</Text> : null}
        </View>
      ) : null}

      {screen === "settings" ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>커뮤니티 프로필</Text>
          <Text style={styles.body}>{profile?.displayName ?? "온보딩 프로필"}</Text>
          <Text style={styles.meta}>닉네임·아바타·호칭은 온보딩 정보와 자동으로 일치합니다.</Text>
          <TextInput accessibilityLabel="커뮤니티 핸들" autoCapitalize="none" maxLength={24} onChangeText={setProfileHandle} placeholder="faith_reader" placeholderTextColor={theme.muted} style={styles.input} value={profileHandle} />
          <TextInput accessibilityLabel="커뮤니티 소개" maxLength={160} multiline onChangeText={setProfileBio} placeholder="짧은 소개" placeholderTextColor={theme.muted} style={[styles.input, styles.textarea]} value={profileBio} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: profileShowHonorific }} onPress={() => setProfileShowHonorific((value) => !value)} style={styles.secondaryButton}><Text style={styles.buttonText}>{profileShowHonorific ? "호칭 공개 중" : "호칭 숨김"}</Text></Pressable>
          <Pressable disabled={loading} onPress={() => void saveProfile()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>공개 프로필 저장</Text></Pressable>
          <Text style={styles.privacy}>개인 노트·하이라이트·읽기 기록은 커뮤니티에 자동 공개되거나 추천에 사용되지 않습니다.</Text>
        </View>
      ) : null}

      {loading ? <Text style={styles.loading}>불러오는 중…</Text> : null}

      <Modal animationType="slide" onRequestClose={() => setComposerOpen(false)} transparent visible={composerOpen}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
          <View style={styles.modalBackdrop}>
            <ScrollView contentContainerStyle={[styles.modalSurface, { paddingBottom: Math.max(24, safeAreaInsets.bottom + 16) }]} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}><Text style={styles.subtitle}>{editingPostId ? "QT 나눔 수정" : quotedPostId ? "인용 QT 나눔" : "새 QT 나눔"}</Text><Pressable onPress={() => setComposerOpen(false)}><Text style={styles.buttonText}>닫기</Text></Pressable></View>
              <TextInput accessibilityLabel="연결 구절" autoCapitalize="characters" onChangeText={setComposerVerses} placeholder="JHN.3.16, ROM.8.28" placeholderTextColor={theme.muted} style={styles.input} value={composerVerses} />
              {!currentReference ? <Pressable onPress={onOpenReader} style={styles.secondaryButton}><Text style={styles.buttonText}>본문에서 구절 선택</Text></Pressable> : null}
              <TextInput accessibilityLabel="QT 제목" maxLength={120} onChangeText={setComposerTitle} placeholder="제목 (선택)" placeholderTextColor={theme.muted} style={styles.input} value={composerTitle} />
              <TextInput accessibilityLabel="QT 나눔" maxLength={4000} multiline onChangeText={setComposerBody} placeholder="말씀에서 발견한 것과 오늘의 적용" placeholderTextColor={theme.muted} style={[styles.input as TextStyle, styles.composerTextarea as TextStyle]} textAlignVertical="top" value={composerBody} />
              <TextInput accessibilityLabel="해시태그" onChangeText={setComposerTags} placeholder="#은혜 #기도" placeholderTextColor={theme.muted} style={styles.input} value={composerTags} />
              <Pressable onPress={() => void selectImage()} style={styles.secondaryButton}><Text style={styles.buttonText}>{composerImage ? "이미지 선택됨" : "이미지 1장 추가"}</Text></Pressable>
              <Pressable disabled={loading || composerBody.trim().length < 10 || !composerVerses.trim()} onPress={() => void publishPost()} style={[styles.primaryButton, loading || composerBody.trim().length < 10 || !composerVerses.trim() ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{editingPostId ? "수정 저장" : "게시"}</Text></Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setSelectedPost(null)} transparent visible={Boolean(selectedPost)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}>
          <View style={styles.modalBackdrop}>
            <ScrollView contentContainerStyle={[styles.modalSurface, { paddingBottom: Math.max(24, safeAreaInsets.bottom + 16) }]} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}><Text style={styles.subtitle}>QT 나눔과 댓글</Text><Pressable onPress={() => setSelectedPost(null)}><Text style={styles.buttonText}>닫기</Text></Pressable></View>
              {selectedPost ? renderPost(selectedPost) : null}
              <Text style={styles.subtitle}>댓글 {comments.length}</Text>
              {comments.map((item) => <View key={item.id} style={[styles.comment, item.parentCommentId ? styles.reply : null]}><Text style={styles.author}>{item.author?.displayName ?? "탈퇴한 사용자"}</Text><Text style={styles.body}>{item.body}</Text><View style={styles.actionRow}>{!item.parentCommentId ? <Pressable onPress={() => { setEditingCommentId(null); setReplyParentId(item.id); setCommentBody(`@${item.author?.handle ?? ""} `); }}><Text style={styles.actionText}>답글</Text></Pressable> : null}<Pressable onPress={() => void toggleCommentLike(item)}><Text style={styles.actionText}>{item.viewerLiked ? "♥" : "♡"} {item.likeCount}</Text></Pressable>{item.author?.isCurrentUser ? <><Pressable onPress={() => { setEditingCommentId(item.id); setReplyParentId(null); setCommentBody(item.body); }}><Text style={styles.actionText}>수정</Text></Pressable><Pressable onPress={() => deleteComment(item)}><Text style={styles.dangerText}>삭제</Text></Pressable></> : null}</View></View>)}
              <View style={styles.commentForm}><TextInput accessibilityLabel="댓글" maxLength={3000} onChangeText={setCommentBody} placeholder={editingCommentId ? "댓글 수정" : replyParentId ? "답글 작성" : "댓글 작성"} placeholderTextColor={theme.muted} style={[styles.input, styles.flex]} value={commentBody} /><Pressable disabled={!commentBody.trim() || loading} onPress={() => void publishComment()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{editingCommentId ? "저장" : "게시"}</Text></Pressable></View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    action: { alignItems: "center", borderRadius: 18, justifyContent: "center", minHeight: 36, paddingHorizontal: 10 },
    actionActive: { backgroundColor: theme.surfaceStrong },
    actionRow: { alignItems: "center", borderTopColor: theme.border, borderTopWidth: 1, flexDirection: "row", gap: 6, justifyContent: "space-around", marginTop: 10, paddingTop: 8 },
    actionText: { color: theme.accent, fontSize: 12, fontWeight: "700" },
    author: { color: theme.text, fontSize: 14, fontWeight: "800" },
    avatar: { borderRadius: 20, height: 40, width: 40 },
    avatarFallback: { alignItems: "center", backgroundColor: theme.surfaceStrong, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
    avatarText: { color: theme.accent, fontWeight: "900" },
    backButton: { alignItems: "center", borderColor: theme.border, borderRadius: 8, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
    backGlyph: { color: theme.text, fontSize: 30, lineHeight: 32 },
    body: { color: theme.text, fontSize: 14, lineHeight: 22 },
    buttonText: { color: theme.text, fontSize: 13, fontWeight: "700" },
    byline: { alignItems: "center", flexDirection: "row", gap: 10 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    comment: { borderTopColor: theme.border, borderTopWidth: 1, gap: 6, paddingVertical: 12 },
    commentForm: { alignItems: "center", flexDirection: "row", gap: 8 },
    composeGlyph: { color: theme.accent, fontSize: 24, fontWeight: "800" },
    composeTrigger: { alignItems: "center", backgroundColor: theme.surfaceStrong, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14 },
    composerTextarea: { minHeight: 160 },
    dangerText: { color: theme.danger, fontSize: 12, fontWeight: "800" },
    disabled: { opacity: 0.45 },
    empty: { color: theme.muted, padding: 28, textAlign: "center" },
    error: { backgroundColor: `${theme.danger}18`, borderRadius: 8, color: theme.danger, padding: 10 },
    flex: { flex: 1, minWidth: 0 },
    header: { alignItems: "center", borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingBottom: 12 },
    headerButton: { alignItems: "center", borderColor: theme.border, borderRadius: 8, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
    headerGlyph: { color: theme.text, fontSize: 20 },
    input: { borderColor: theme.border, borderRadius: 9, borderWidth: 1, color: theme.text, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
    loading: { color: theme.accent, fontSize: 12, padding: 8, textAlign: "center" },
    meta: { color: theme.muted, fontSize: 12, lineHeight: 18 },
    modalBackdrop: { backgroundColor: "rgba(0,0,0,0.5)", flex: 1, justifyContent: "flex-end" },
    modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    modalKeyboard: { flex: 1 },
    modalSurface: { backgroundColor: theme.surface, borderColor: theme.border, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, gap: 14, maxHeight: "94%", padding: 16 },
    notification: { borderBottomColor: theme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 14 },
    ownerActions: { alignItems: "center", flexDirection: "row", gap: 10 },
    panel: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 10, borderWidth: 1, gap: 14, overflow: "hidden", padding: 14 },
    postCard: { borderColor: theme.border, borderRadius: 12, borderWidth: 1, gap: 10, padding: 14 },
    postImage: { borderRadius: 10, maxHeight: 520, width: "100%" },
    postTitle: { color: theme.text, fontSize: 17, fontWeight: "800", lineHeight: 23 },
    primaryButton: { alignItems: "center", backgroundColor: theme.accent, borderRadius: 9, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
    primaryButtonText: { color: theme.accentText, fontWeight: "800" },
    privacy: { borderColor: theme.border, borderTopWidth: 1, color: theme.muted, fontSize: 12, lineHeight: 19, paddingTop: 12 },
    profileResult: { alignItems: "center", borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 12 },
    quoteCard: { borderColor: theme.border, borderRadius: 9, borderWidth: 1, gap: 4, padding: 10 },
    reply: { marginLeft: 32 },
    searchRow: { flexDirection: "row", gap: 8 },
    secondaryButton: { alignItems: "center", borderColor: theme.border, borderRadius: 9, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
    section: { gap: 12 },
    smallButton: { borderColor: theme.border, borderRadius: 16, borderWidth: 1, minHeight: 34, paddingHorizontal: 9, paddingVertical: 7 },
    subtitle: { color: theme.text, fontSize: 17, fontWeight: "800" },
    success: { backgroundColor: theme.surfaceStrong, borderRadius: 8, color: theme.accent, padding: 10 },
    tab: { alignItems: "center", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 42 },
    tabActive: { backgroundColor: theme.surfaceStrong },
    tabTextActive: { color: theme.accent, fontSize: 12, fontWeight: "800" },
    tabs: { borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", padding: 4 },
    tag: { color: theme.accent, fontSize: 12, fontWeight: "700" },
    textarea: { minHeight: 100, textAlignVertical: "top" },
    title: { color: theme.text, fontSize: 19, fontWeight: "900" },
    verseChip: { backgroundColor: theme.surfaceStrong, borderRadius: 14, color: theme.accent, fontSize: 12, fontWeight: "700", paddingHorizontal: 9, paddingVertical: 6 },
    verseQuote: { borderLeftColor: theme.accent, borderLeftWidth: 3, color: theme.muted, fontSize: 13, lineHeight: 20, paddingLeft: 10 },
  });
}
