import fs from "node:fs";
import { spawnSync } from "node:child_process";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
}

const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
const baseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!baseUrl || !anonKey) {
  throw new Error("Missing Supabase onboarding smoke environment variables.");
}

if (!serviceKey || serviceKey.startsWith("your-")) {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const connection = spawnSync(
    npxCommand,
    ["--yes", "supabase@latest", "db", "dump", "--linked", "--dry-run"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_cpu: process.platform === "win32" ? "x64" : process.env.npm_config_cpu,
        npm_config_os: process.platform === "win32" ? "win32" : process.env.npm_config_os,
      },
      shell: process.platform === "win32",
    },
  );
  const output = `${connection.stdout ?? ""}\n${connection.stderr ?? ""}`;
  const postgresEnv = Object.fromEntries(
    ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"].map((key) => {
      const value = new RegExp(`export ${key}="([^"]+)"`).exec(output)?.[1];
      if (!value) throw new Error(`Supabase CLI did not provide ${key} for the linked database.`);
      return [key, value];
    }),
  );
  const result = spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", "scripts/smoke-remote-onboarding.sql"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...postgresEnv },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Remote onboarding SQL smoke failed with exit code ${result.status}.`);
  process.exit(0);
}

async function request(path, { token = anonKey, method = "GET", body, rawBody, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? rawBody : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = text;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  return { response, payload };
}

async function createUser(label) {
  const password = `Kjv-${crypto.randomUUID()}-Aa1!`;
  const email = `codex-onboarding-${label}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const created = await request("/auth/v1/admin/users", {
    token: serviceKey,
    method: "POST",
    body: { email, password, email_confirm: true },
  });
  if (!created.response.ok) throw new Error(`User creation failed: ${created.response.status}`);

  const signedIn = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  if (!signedIn.response.ok || !signedIn.payload?.access_token) {
    throw new Error(`User sign-in failed: ${signedIn.response.status}`);
  }
  return { id: created.payload.id, accessToken: signedIn.payload.access_token };
}

const users = [];
const uploadedObjects = [];

try {
  const userA = await createUser("a"); users.push(userA);
  const userB = await createUser("b"); users.push(userB);
  const nickname = `smoke-${crypto.randomUUID().slice(0, 12)}`;

  const completed = await request("/rest/v1/rpc/complete_user_onboarding", {
    token: userA.accessToken,
    method: "POST",
    body: {
      p_nickname: nickname,
      p_full_name: "온보딩 테스트 사용자",
      p_honorific: "성도님",
      p_avatar_path: null,
    },
  });
  if (!completed.response.ok) throw new Error(`Onboarding RPC failed: ${completed.response.status}`);

  const ownProfile = await request(`/rest/v1/user_profiles?select=*&user_id=eq.${userA.id}`, {
    token: userA.accessToken,
  });
  if (!ownProfile.response.ok || ownProfile.payload?.[0]?.nickname !== nickname) {
    throw new Error("Own private profile was not readable.");
  }

  const crossPrivateRead = await request(`/rest/v1/user_profiles?select=*&user_id=eq.${userA.id}`, {
    token: userB.accessToken,
  });
  if (!crossPrivateRead.response.ok || crossPrivateRead.payload?.length !== 0) {
    throw new Error("Cross-account private profile read was not isolated.");
  }

  const crossPrivateWrite = await request(`/rest/v1/user_profiles?user_id=eq.${userA.id}`, {
    token: userB.accessToken,
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: { full_name: "변조된 이름" },
  });
  if (!crossPrivateWrite.response.ok || crossPrivateWrite.payload?.length !== 0) {
    throw new Error("Cross-account private profile write was not isolated.");
  }

  const publicProfile = await request(`/rest/v1/user_public_profiles?select=*&user_id=eq.${userA.id}`, {
    token: userB.accessToken,
  });
  if (!publicProfile.response.ok || publicProfile.payload?.[0]?.display_name !== nickname) {
    throw new Error("Public onboarding profile was not readable by an authenticated member.");
  }
  if ("full_name" in publicProfile.payload[0]) throw new Error("Private full name leaked into public profile.");

  const duplicateNickname = await request("/rest/v1/rpc/complete_user_onboarding", {
    token: userB.accessToken,
    method: "POST",
    body: {
      p_nickname: nickname.toUpperCase(),
      p_full_name: "중복 테스트 사용자",
      p_honorific: "형제님",
      p_avatar_path: null,
    },
  });
  if (duplicateNickname.response.ok || duplicateNickname.response.status !== 409) {
    throw new Error(`Duplicate nickname was not rejected: ${duplicateNickname.response.status}`);
  }

  const avatarPath = `${userA.id}/avatar`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const ownAvatarUpload = await request(`/storage/v1/object/profile-avatars/${avatarPath}`, {
    token: userA.accessToken,
    method: "POST",
    headers: { "Content-Type": "image/png", "x-upsert": "true" },
    rawBody: png,
  });
  if (!ownAvatarUpload.response.ok) throw new Error(`Own avatar upload failed: ${ownAvatarUpload.response.status}`);
  uploadedObjects.push({ token: userA.accessToken, path: avatarPath });

  const crossAvatarUpload = await request(`/storage/v1/object/profile-avatars/${userA.id}/cross-avatar`, {
    token: userB.accessToken,
    method: "POST",
    headers: { "Content-Type": "image/png" },
    rawBody: png,
  });
  if (crossAvatarUpload.response.ok) throw new Error("Cross-account avatar upload was not isolated.");

  console.log("remote onboarding smoke passed: migration=true, private-profile-isolation=true, public-profile-safe=true, nickname-unique=true, avatar-isolation=true");
} finally {
  for (const object of uploadedObjects) {
    await request(`/storage/v1/object/profile-avatars/${object.path}`, {
      token: object.token,
      method: "DELETE",
    }).catch(() => undefined);
  }
  for (const user of users) {
    await request(`/auth/v1/admin/users/${user.id}`, { token: serviceKey, method: "DELETE" }).catch(() => undefined);
  }
}
