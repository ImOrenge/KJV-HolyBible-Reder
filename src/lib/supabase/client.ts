import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./config";

export function createClient() {
  const { publicKey, url } = getSupabasePublicConfig();

  return createBrowserClient(url, publicKey);
}
