import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import process from "node:process";
import { delimiter, join } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);

const mobileTarget = args.get("mobile") ?? "start";
const webPort = args.get("web-port") ?? "3000";
const apiBaseUrl =
  args.get("api-base-url") ??
  (mobileTarget === "android" ? `http://10.0.2.2:${webPort}` : `http://localhost:${webPort}`);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function loadRootEnv() {
  try {
    return Object.fromEntries(
      readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const rootEnv = loadRootEnv();
const androidSdkRoot =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Android", "Sdk") : "");
const androidPathEntries = androidSdkRoot
  ? [join(androidSdkRoot, "platform-tools"), join(androidSdkRoot, "emulator")].filter((entry) => existsSync(entry))
  : [];
const childPath = androidPathEntries.length ? `${androidPathEntries.join(delimiter)}${delimiter}${process.env.PATH ?? ""}` : process.env.PATH;

function run(label, command, commandArgs, env = {}) {
  const childEnv = {
    ...process.env,
    ANDROID_HOME: androidSdkRoot || process.env.ANDROID_HOME,
    ANDROID_SDK_ROOT: androidSdkRoot || process.env.ANDROID_SDK_ROOT,
    PATH: childPath,
    ...env,
  };

  for (const [key, value] of Object.entries(childEnv)) {
    if (value == null) {
      delete childEnv[key];
    }
  }

  const child = spawn(command, commandArgs, {
    env: childEnv,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited via ${signal}`);
      return;
    }
    console.log(`[${label}] exited with code ${code}`);
  });
  return child;
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

console.log(`Web:    http://localhost:${webPort}/app`);
console.log(`Expo:   ${mobileTarget}`);
console.log(`API:    ${apiBaseUrl}`);
console.log("");

run("web", npmCommand, ["run", "dev", "-w", "@kjv/web", "--", "--port", webPort]);

setTimeout(() => {
  const expoScript =
    mobileTarget === "android"
      ? "android"
      : mobileTarget === "ios"
        ? "ios"
        : mobileTarget === "web"
          ? "web"
          : "start";

  run("mobile", npmCommand, ["run", expoScript, "-w", "@kjv/mobile"], {
    EXPO_PUBLIC_KJV_API_BASE_URL: apiBaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
    EXPO_PUBLIC_SUPABASE_URL:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      rootEnv.NEXT_PUBLIC_SUPABASE_URL ??
      "",
  });
}, 2500);
