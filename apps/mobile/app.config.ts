import type { ExpoConfig } from "expo/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const publicEnvKeys = [
  "EXPO_PUBLIC_KJV_API_BASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID",
  "EXPO_PUBLIC_ADMOB_IOS_BANNER_ID",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

function readWorkspacePublicEnv() {
  const envPath = resolve(__dirname, "../../.env");
  if (!existsSync(envPath)) {
    return {};
  }

  const allowedKeys = new Set<string>(publicEnvKeys);
  return readFileSync(envPath, "utf8")
    .split(/\r?\n/u)
    .reduce<Record<string, string>>((values, line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/u);
      if (!match || !allowedKeys.has(match[1])) {
        return values;
      }

      const rawValue = match[2].trim();
      values[match[1]] = rawValue.replace(/^(["'])(.*)\1$/u, "$2");
      return values;
    }, {});
}

const workspacePublicEnv = readWorkspacePublicEnv();

const testAdMobAppIds = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
};

function readPublicEnv(...keys: typeof publicEnvKeys[number][]) {
  for (const key of keys) {
    const value = process.env[key] ?? workspacePublicEnv[key];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readAdMobAppId(key: typeof publicEnvKeys[number], fallback: string) {
  const value = readPublicEnv(key);
  if (value) return value;
  if (process.env.EAS_BUILD_PROFILE === "production") {
    throw new Error(`${key} must be configured for production AdMob builds.`);
  }
  return fallback;
}

const androidAdMobAppId = readAdMobAppId("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", testAdMobAppIds.android);
const iosAdMobAppId = readAdMobAppId("EXPO_PUBLIC_ADMOB_IOS_APP_ID", testAdMobAppIds.ios);

if (process.env.EAS_BUILD_PROFILE === "production") {
  for (const key of ["EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID", "EXPO_PUBLIC_ADMOB_IOS_BANNER_ID"] as const) {
    if (!readPublicEnv(key)) {
      throw new Error(`${key} must be configured for production AdMob builds.`);
    }
  }
}

const config: ExpoConfig = {
  name: "KJV Reader Note",
  owner: "nicholas0913",
  slug: "kjv-reader-note",
  scheme: "kjvreadernote",
  version: "0.9.3",
  orientation: "default",
  userInterfaceStyle: "automatic",
  extra: {
    apiBaseUrl: readPublicEnv("EXPO_PUBLIC_KJV_API_BASE_URL"),
    eas: {
      projectId: "eeb3b72e-d475-4af1-a059-8af3d679ebe7",
    },
    supabaseAnonKey: readPublicEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseUrl: readPublicEnv("EXPO_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.kjvreader",
    softwareKeyboardLayoutMode: "resize",
    versionCode: 13,
  },
  web: {
    bundler: "metro",
  },
  plugins: [
    "expo-status-bar",
    [
      "expo-web-browser",
      {
        experimentalLauncherActivity: false,
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission: false,
        microphonePermission: false,
        photosPermission: "프로필 사진과 QT 나눔 이미지를 선택할 수 있도록 사진 접근을 허용합니다.",
      },
    ],
    "expo-notifications",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: androidAdMobAppId,
        iosAppId: iosAdMobAppId,
      },
    ],
  ],
};

export default config;
