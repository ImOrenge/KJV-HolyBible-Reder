import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "KJV Reader Note",
  owner: "nicholas0913",
  slug: "kjv-reader-note",
  scheme: "kjvreadernote",
  version: "0.8.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_KJV_API_BASE_URL ?? "",
    eas: {
      projectId: "eeb3b72e-d475-4af1-a059-8af3d679ebe7",
    },
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.kjvreader",
    versionCode: 8,
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
        photosPermission: "프로필 사진을 선택할 수 있도록 사진 접근을 허용합니다.",
      },
    ],
  ],
};

export default config;
