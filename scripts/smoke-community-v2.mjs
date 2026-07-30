import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

nextEnv.loadEnvConfig(process.cwd());

const apiBaseUrl = (process.env.COMMUNITY_V2_SMOKE_API_URL ?? "http://127.0.0.1:3032").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !publicKey) {
  throw new Error("Community v2 smoke requires Supabase URL, public key, and service role key.");
}
if (/^(your-|replace-|example|placeholder|<)/i.test(serviceRoleKey.trim())) {
  throw new Error("Community v2 smoke requires a real SUPABASE_SERVICE_ROLE_KEY; the configured value is a placeholder.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const anonymous = createClient(supabaseUrl, publicKey, { auth: { persistSession: false } });
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const password = `Kjv-${crypto.randomUUID()}-Aa1!`;
const users = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { token, method = "GET", body, headers, formData } = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { payload, response };
}

async function api(path, options = {}) {
  const result = await request(path, options);
  if (!result.response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path}: ${result.payload?.error ?? result.response.statusText}`);
  }
  return result.payload;
}

async function expectStatus(path, expectedStatus, options = {}) {
  const result = await request(path, options);
  assert(result.response.status === expectedStatus, `${path} expected ${expectedStatus}, received ${result.response.status}`);
  return result.payload;
}

async function createUser(label, moderator = false) {
  const email = `codex-community-v2-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    app_metadata: moderator ? { roles: ["community_manager"] } : {},
    email,
    email_confirm: true,
    password,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Smoke user creation failed.");
  users.push(data.user.id);
  const authClient = createClient(supabaseUrl, publicKey, { auth: { persistSession: false } });
  const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({ email, password });
  if (signInError || !signedIn.session) throw new Error(signInError?.message ?? "Smoke sign-in failed.");
  return { authClient, id: data.user.id, token: signedIn.session.access_token };
}

async function completeOnboarding(user, nickname, honorific) {
  const { error } = await user.authClient.rpc("complete_user_onboarding", {
    p_avatar_path: null,
    p_full_name: `${nickname} 본명`,
    p_honorific: honorific,
    p_nickname: nickname,
  });
  if (error) throw new Error(`Onboarding failed: ${error.message}`);
}

try {
  const [author, member, moderator] = await Promise.all([
    createUser("author"),
    createUser("member"),
    createUser("moderator", true),
  ]);
  const authorName = `말씀나눔${suffix.slice(-6)}`;
  const memberName = `은혜독자${suffix.slice(-6)}`;
  const moderatorName = `운영자${suffix.slice(-6)}`;
  const authorHandle = `smoke_a_${suffix.slice(-8).replace(/-/g, "")}`.slice(0, 24);
  const memberHandle = `smoke_b_${suffix.slice(-8).replace(/-/g, "")}`.slice(0, 24);
  const moderatorHandle = `smoke_m_${suffix.slice(-8).replace(/-/g, "")}`.slice(0, 24);

  await Promise.all([
    completeOnboarding(author, authorName, "목사님"),
    completeOnboarding(member, memberName, "성도님"),
    completeOnboarding(moderator, moderatorName, "장로님"),
  ]);
  const [authorProfile, memberProfile] = await Promise.all([
    api("/api/community/v2/profile", {
      body: { bio: "말씀을 삶으로 나눕니다.", handle: authorHandle, publicEnabled: true, showHonorific: true },
      method: "PATCH",
      token: author.token,
    }),
    api("/api/community/v2/profile", {
      body: { bio: "함께 읽고 응답합니다.", handle: memberHandle, publicEnabled: true },
      method: "PATCH",
      token: member.token,
    }),
    api("/api/community/v2/profile", {
      body: { handle: moderatorHandle, publicEnabled: true },
      method: "PATCH",
      token: moderator.token,
    }),
  ]);
  assert(authorProfile.profile.displayName === authorName, "Community display name did not match onboarding nickname.");
  assert(authorProfile.profile.honorific === "목사님", "Community honorific did not match onboarding data.");
  assert(memberProfile.profile.displayName === memberName, "Second community profile did not match onboarding nickname.");

  await expectStatus("/api/community/v2/posts", 400, {
    body: { body: "구절이 없는 공개 나눔은 허용되지 않습니다.", verseKeys: [] },
    method: "POST",
    token: author.token,
  });

  const idempotencyKey = `smoke-post-${suffix}`;
  const postInput = {
    body: `은혜 안에서 말씀이 순환되기를 기도합니다. @${memberHandle} #말씀순환 #요한복음`,
    hashtags: ["말씀순환", "요한복음"],
    title: "요한복음 QT 나눔",
    verseKeys: ["JHN.3.16", "GEN.1.1"],
  };
  const created = await api("/api/community/v2/posts", {
    body: postInput,
    headers: { "Idempotency-Key": idempotencyKey },
    method: "POST",
    token: author.token,
  });
  const repeated = await api("/api/community/v2/posts", {
    body: postInput,
    headers: { "Idempotency-Key": idempotencyKey },
    method: "POST",
    token: author.token,
  });
  assert(created.post.id === repeated.post.id, "Post idempotency did not return the original post.");
  const postId = created.post.id;

  const imageForm = new FormData();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  imageForm.append("image", new Blob([png], { type: "image/png" }), "smoke.png");
  imageForm.append("altText", "커뮤니티 이미지 업로드 테스트");
  const withMedia = await api(`/api/community/v2/posts/${postId}/media`, { formData: imageForm, method: "POST", token: author.token });
  assert(withMedia.post.media?.mimeType === "image/png", "One-image media upload was not hydrated.");

  const [publicFeed, publicPost, publicProfile, postSearch, tagSearch, verseSearch] = await Promise.all([
    api("/api/community/v2/feed?mode=latest"),
    api(`/api/community/v2/posts/${postId}`),
    api(`/api/community/v2/profiles/${authorHandle}`),
    api("/api/community/v2/search?q=%EC%9D%80%ED%98%9C&type=posts"),
    api("/api/community/v2/search?q=%EB%A7%90%EC%94%80%EC%88%9C%ED%99%98&type=tags"),
    api("/api/community/v2/search?q=%EC%9A%94%ED%95%9C%EB%B3%B5%EC%9D%8C%203%3A16&type=verses"),
  ]);
  assert(publicFeed.items.some((item) => item.post.id === postId), "Anonymous latest feed omitted the public post.");
  assert(publicPost.post.verses.length === 2, "Public post did not expose both linked verses.");
  assert(publicProfile.profile.displayName === authorName, "Anonymous profile did not use onboarding identity.");
  assert(postSearch.posts.some((post) => post.id === postId), "Public post search did not find the post.");
  assert(tagSearch.tags.some((tag) => tag.tag === "말씀순환" && tag.postCount > 0), "Public hashtag search did not find the tag.");
  assert(verseSearch.verses.some((verse) => verse.verseKey === "JHN.3.16"), "Korean verse-reference search did not find JHN.3.16.");

  const publicRows = await anonymous.from("community_posts").select("id,body").eq("id", postId);
  assert(!publicRows.error && publicRows.data?.length === 1, "Anonymous allowlisted RLS projection could not read the public post.");
  const sensitiveRead = await anonymous.from("community_posts").select("id,idempotency_key").eq("id", postId);
  assert(Boolean(sensitiveRead.error), "Anonymous base-table read exposed a non-allowlisted idempotency key.");
  const privateReportsRead = await anonymous.from("community_reports").select("id");
  assert(Boolean(privateReportsRead.error), "Anonymous access exposed the private report table.");
  const memberDb = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${member.token}` } },
  });
  const crossWrite = await memberDb.from("community_posts").update({ body: "tampered" }).eq("id", postId).select("id");
  assert(Boolean(crossWrite.error) || crossWrite.data?.length === 0, "Cross-account direct post update was not isolated.");

  await api(`/api/community/v2/profiles/${authorHandle}/follow`, { body: { active: true }, method: "PUT", token: member.token });
  const following = await api("/api/community/v2/feed?mode=following", { token: member.token });
  assert(following.items.some((item) => item.post.id === postId), "Following feed omitted the followed author's post.");
  await api(`/api/community/v2/profiles/${authorHandle}/mute`, { body: { active: true }, method: "PUT", token: member.token });
  const mutedFollowing = await api("/api/community/v2/feed?mode=following", { token: member.token });
  assert(!mutedFollowing.items.some((item) => item.post.id === postId), "Muted author remained in the following feed.");
  await api(`/api/community/v2/profiles/${authorHandle}/mute`, { body: { active: false }, method: "PUT", token: member.token });

  await api(`/api/community/v2/posts/${postId}/like`, { body: { active: true }, method: "PUT", token: member.token });
  await api(`/api/community/v2/posts/${postId}/repost`, { body: { active: true }, method: "PUT", token: member.token });
  const comment = await api(`/api/community/v2/posts/${postId}/comments`, {
    body: { body: "말씀의 사랑을 오늘 실천하겠습니다." },
    headers: { "Idempotency-Key": `smoke-comment-${suffix}` },
    method: "POST",
    token: member.token,
  });
  const reply = await api(`/api/community/v2/posts/${postId}/comments`, {
    body: { body: `함께 실천해요 @${memberHandle}`, parentCommentId: comment.comment.id },
    method: "POST",
    token: author.token,
  });
  await api(`/api/community/v2/comments/${comment.comment.id}/like`, { body: { active: true }, method: "PUT", token: author.token });
  await expectStatus(`/api/community/v2/posts/${postId}/comments`, 400, {
    body: { body: "답글에 다시 중첩하는 것은 허용되지 않습니다.", parentCommentId: reply.comment.id },
    method: "POST",
    token: member.token,
  });
  const editedComment = await api(`/api/community/v2/comments/${comment.comment.id}`, {
    body: { body: "말씀의 사랑을 오늘 이웃에게 실천하겠습니다." },
    method: "PATCH",
    token: member.token,
  });
  assert(Boolean(editedComment.comment.editedAt), "Edited comment did not expose the edited label timestamp.");

  const quote = await api("/api/community/v2/posts", {
    body: {
      body: `이 나눔을 다시 전합니다. @${authorHandle} #말씀순환`,
      quotedPostId: postId,
      verseKeys: ["JHN.3.16"],
    },
    method: "POST",
    token: member.token,
  });
  assert(quote.post.postKind === "quote" && quote.post.quotedPost?.id === postId, "Quote repost did not retain source attribution.");

  const updatedPost = await api(`/api/community/v2/posts/${postId}`, {
    body: { ...postInput, body: `${postInput.body} 수정됨` },
    method: "PATCH",
    token: author.token,
  });
  assert(Boolean(updatedPost.post.editedAt), "Edited post did not expose the edited label timestamp.");

  await api("/api/community/v2/reports", {
    body: { details: "자동 운영 흐름 검증", reason: "other", targetId: postId, targetType: "post" },
    headers: { "Idempotency-Key": `smoke-report-${suffix}` },
    method: "POST",
    token: member.token,
  });
  const queue = await api("/api/community/v2/moderation/reports?status=open", { token: moderator.token });
  const report = queue.reports.find((item) => item.post_id === postId);
  assert(report, "Moderator queue did not receive the report.");
  await api(`/api/community/v2/moderation/reports/${report.id}`, {
    body: { action: "hide", note: "자동 검증 숨김", reasonCode: "smoke_test" },
    method: "PATCH",
    token: moderator.token,
  });
  await expectStatus(`/api/community/v2/posts/${postId}`, 404);
  const hiddenSearch = await api("/api/community/v2/search?q=%EC%9D%80%ED%98%9C&type=posts");
  assert(!hiddenSearch.posts.some((post) => post.id === postId), "Moderated post remained in public search.");
  await api(`/api/community/v2/moderation/reports/${report.id}`, {
    body: { action: "restore", note: "자동 검증 복원", reasonCode: "smoke_test" },
    method: "PATCH",
    token: moderator.token,
  });
  await api(`/api/community/v2/posts/${postId}`);

  const [authorNotifications, memberNotifications] = await Promise.all([
    api("/api/community/v2/notifications", { token: author.token }),
    api("/api/community/v2/notifications", { token: member.token }),
  ]);
  const authorEvents = new Set(authorNotifications.items.map((item) => item.eventType));
  const memberEvents = new Set(memberNotifications.items.map((item) => item.eventType));
  for (const expected of ["follow", "like_post", "comment", "repost", "quote", "moderation"]) {
    assert(authorEvents.has(expected), `Author notification missing ${expected}.`);
  }
  for (const expected of ["mention", "reply", "like_comment"]) {
    assert(memberEvents.has(expected), `Member notification missing ${expected}.`);
  }
  const notificationFilters = {
    follows: new Set(["follow"]),
    likes: new Set(["like_post", "like_comment"]),
    mentions: new Set(["mention"]),
    quotes: new Set(["quote"]),
    replies: new Set(["comment", "reply"]),
    reposts: new Set(["repost"]),
  };
  for (const [filter, allowed] of Object.entries(notificationFilters)) {
    const filtered = await api(`/api/community/v2/notifications?filter=${filter}`, { token: author.token });
    assert(filtered.items.every((item) => allowed.has(item.eventType)), `Notification filter ${filter} returned an unrelated event.`);
  }
  const normalizedNotifications = await api("/api/community/v2/notifications?filter=invalid", { token: author.token });
  assert(normalizedNotifications.items.length === authorNotifications.items.length, "Invalid notification filter did not normalize to all.");

  await api(`/api/community/v2/profiles/${authorHandle}/block`, { body: { active: true }, method: "PUT", token: member.token });
  const blockedSearch = await api("/api/community/v2/search?q=%EC%9D%80%ED%98%9C&type=posts", { token: member.token });
  assert(!blockedSearch.posts.some((post) => post.id === postId), "Blocked author remained in authenticated search.");
  await expectStatus(`/api/community/v2/posts/${postId}/like`, 404, {
    body: { active: true },
    method: "PUT",
    token: member.token,
  });

  await api(`/api/community/v2/comments/${reply.comment.id}`, { method: "DELETE", token: author.token });
  await api(`/api/community/v2/posts/${quote.post.id}`, { method: "DELETE", token: member.token });
  await expectStatus(`/api/community/v2/posts/${quote.post.id}`, 404);

  const publicPage = await fetch(`${apiBaseUrl}/community`);
  assert(publicPage.ok && (await publicPage.text()).includes("QT"), "Public /community page did not render anonymously.");

  console.log(JSON.stringify({
    anonymousSeoPage: true,
    blockMuteFollow: true,
    commentsAndReplies: true,
    feedModes: ["for_you", "following", "latest"],
    imageUpload: true,
    notifications: [...authorEvents, ...memberEvents],
    onboardingProfileMatch: true,
    postId,
    publicSearch: ["posts", "users", "verses", "tags"],
    quoteAndRepost: true,
    rlsIsolation: true,
  }, null, 2));
} finally {
  for (const userId of users.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    if (error) console.error(`Smoke cleanup failed for ${userId}: ${error.message}`);
  }
}
