import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import process from "node:process";

nextEnv.loadEnvConfig(process.cwd());

const action = process.argv[2];
const tmpRoot = resolve(process.cwd(), ".tmp");
const outputPath = resolve(process.cwd(), process.argv[3] ?? ".tmp/community-ui-smoke-user.json");
const relativeOutputPath = relative(tmpRoot, outputPath);

if (!relativeOutputPath || relativeOutputPath.startsWith("..") || isAbsolute(relativeOutputPath)) {
  throw new Error("Community UI smoke credentials must stay under .tmp/.");
}
if (action !== "create" && action !== "cleanup") {
  throw new Error("Usage: node scripts/manage-community-ui-smoke-user.mjs <create|cleanup> [output-path]");
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !publicKey) {
  throw new Error("Supabase UI smoke configuration is missing.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

if (action === "cleanup") {
  if (!existsSync(outputPath)) {
    console.log(JSON.stringify({ action, cleaned: false, reason: "credential-file-missing" }));
    process.exit(0);
  }

  const credentials = JSON.parse(await readFile(outputPath, "utf8"));
  const { error } = await admin.auth.admin.deleteUser(credentials.userId, false);
  if (error) throw new Error(`Community UI smoke cleanup failed: ${error.message}`);
  await rm(outputPath, { force: true });
  console.log(JSON.stringify({ action, cleaned: true }));
  process.exit(0);
}

if (existsSync(outputPath)) {
  throw new Error(`Credential file already exists: ${relative(process.cwd(), outputPath)}`);
}

const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const email = `kjv.community.ui+${suffix}@example.com`;
const password = `Community-${randomUUID()}!aA1`;
const nickname = `ui${Date.now().toString(36)}`.slice(0, 24);
let userId = null;

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (createError || !created.user) throw new Error(createError?.message ?? "Community UI smoke user creation failed.");
  userId = created.user.id;

  const publicClient = createClient(supabaseUrl, publicKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Community UI smoke sign-in failed: ${signInError.message}`);

  const { error: onboardingError } = await publicClient.rpc("complete_user_onboarding", {
    p_avatar_path: null,
    p_full_name: "UI 테스트 사용자",
    p_honorific: "성도님",
    p_nickname: nickname,
  });
  if (onboardingError) throw new Error(`Community UI smoke onboarding failed: ${onboardingError.message}`);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ email, password, userId })}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({ action, created: true }));
} catch (error) {
  if (userId) await admin.auth.admin.deleteUser(userId, false).catch(() => undefined);
  throw error;
}
