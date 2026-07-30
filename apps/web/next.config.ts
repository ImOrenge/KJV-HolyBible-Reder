import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(process.cwd(), "../.."));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageRemotePattern = (() => {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    return {
      hostname: url.hostname,
      pathname: "/storage/v1/object/**",
      port: url.port,
      protocol: url.protocol.replace(":", "") as "http" | "https",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: storageRemotePattern ? { remotePatterns: [storageRemotePattern] } : undefined,
  transpilePackages: ["@kjv/shared"],
};

export default nextConfig;
