import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "KJV Reader Note",
  owner: "nicholas0913",
  slug: "kjv-reader-note",
  scheme: "kjvreadernote",
  version: "0.5.0",
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
    versionCode: 5,
  },
  web: {
    bundler: "metro",
  },
};

export default config;
