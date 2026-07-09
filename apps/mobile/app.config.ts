import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "KJV Reader Note",
  slug: "kjv-reader-note",
  scheme: "kjvreadernote",
  version: "0.3.1",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_KJV_API_BASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "app.kjvreadernote.mobile",
  },
  web: {
    bundler: "metro",
  },
};

export default config;
