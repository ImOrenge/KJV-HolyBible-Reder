import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleConfig,
  tryGetSupabaseServiceRoleConfig,
} from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { publicKey, url } = getSupabasePublicConfig({ includeServerFallback: true });

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Route Handlers, Server Actions,
          // and the auth proxy handle session cookie refreshes.
        }
      },
    },
  });
}

export function createBearerClient(accessToken: string) {
  const { publicKey, url } = getSupabasePublicConfig({ includeServerFallback: true });

  return createSupabaseClient(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createServiceRoleClient() {
  const { serviceRoleKey, url } = getSupabaseServiceRoleConfig();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function tryCreateServiceRoleClient() {
  const config = tryGetSupabaseServiceRoleConfig();
  if (!config) return null;

  return createSupabaseClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
