import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

nextEnv.loadEnvConfig(process.cwd());

const apiBaseUrl = process.env.COMMUNITY_SMOKE_API_URL ?? "http://localhost:3032";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !publicKey) throw new Error("Supabase smoke configuration is missing.");

const admin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) : null;
const publicClient = createClient(supabaseUrl, publicKey, { auth: { persistSession: false } });
const allowPublicSignup = process.env.COMMUNITY_SMOKE_ALLOW_PUBLIC_SIGNUP === "1";
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `Smoke-${crypto.randomUUID()}!aA1`;
const createdUserIds = [];

async function createTestUser(label) {
  const email = `kjv.community.${label}+${suffix}@gmail.com`;
  const { data, error } = allowPublicSignup
    ? await publicClient.auth.signUp({ email, password })
    : admin
      ? await admin.auth.admin.createUser({ email, email_confirm: true, password })
      : { data: { user: null }, error: new Error("Service role configuration is missing.") };
  if (error || !data.user) throw new Error(error?.message ?? "Smoke user creation failed.");
  createdUserIds.push(data.user.id);
  const { data: sessionData, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
  if (signInError || !sessionData.session) throw new Error(signInError?.message ?? "Smoke sign-in failed.");
  return { id: data.user.id, token: sessionData.session.access_token };
}

async function api(path, token, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path}: ${payload?.error ?? response.statusText}`);
  return payload;
}

try {
  const [readerA, readerB] = await Promise.all([createTestUser("a"), createTestUser("b")]);
  await Promise.all([
    api("/api/community/profile", readerA.token, { method: "PATCH", body: JSON.stringify({ displayName: "Smoke Reader A", rankingOptIn: true }) }),
    api("/api/community/profile", readerB.token, { method: "PATCH", body: JSON.stringify({ displayName: "Smoke Reader B", rankingOptIn: true }) }),
  ]);
  const created = await api("/api/community/threads", readerA.token, {
    method: "POST",
    body: JSON.stringify({ verseKey: "GEN.1.1", title: "창조 본문 QT 나눔", body: "태초에 하나님께서 먼저 일하셨다는 사실을 오늘의 삶에 적용합니다.", threadType: "qt_share" }),
  });
  await api(`/api/community/threads/${created.thread.id}/comments`, readerB.token, {
    method: "POST", body: JSON.stringify({ body: "하나님의 주권을 먼저 바라본다는 관찰에 공감하며 오늘의 선택에 적용해봅니다." }),
  });
  await api("/api/community/reactions", readerB.token, {
    method: "PUT", body: JSON.stringify({ targetType: "thread", targetId: created.thread.id, reactionType: "helpful", active: true }),
  });
  await api("/api/community/reading-completions", readerA.token, {
    method: "POST", body: JSON.stringify({ bookId: "gen", chapter: 1, method: "scroll" }),
  });
  const [summaryA, summaryB, detail, ranking] = await Promise.all([
    api("/api/community/summary", readerA.token),
    api("/api/community/summary", readerB.token),
    api(`/api/community/threads/${created.thread.id}`, readerA.token),
    api("/api/community/rankings?period=all_time", readerA.token),
  ]);
  if (summaryA.profile.points !== 16) throw new Error(`Reader A points mismatch: ${summaryA.profile.points}`);
  if (summaryB.profile.points !== 2) throw new Error(`Reader B points mismatch: ${summaryB.profile.points}`);
  if (detail.comments.length !== 1 || detail.thread.helpfulCount !== 1) throw new Error("Thread communication state mismatch.");
  if (!ranking.rankings.some((entry) => entry.userId === readerA.id && entry.points === 16)) throw new Error("Ranking result mismatch.");
  console.log(JSON.stringify({ ok: true, aPoints: 16, bPoints: 2, comments: 1, helpful: 1, rankingEntries: ranking.rankings.length }));
} finally {
  if (admin && !allowPublicSignup) {
    for (const id of createdUserIds) {
      const { error } = await admin.auth.admin.deleteUser(id, false);
      if (error) throw new Error(`Smoke user cleanup failed: ${error.message}`);
    }
  } else if (createdUserIds.length) {
    console.log(JSON.stringify({ manualCleanupSuffix: suffix }));
  }
}
