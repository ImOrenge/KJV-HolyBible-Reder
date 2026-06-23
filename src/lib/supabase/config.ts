type SupabasePublicConfig = {
  publicKey: string;
  url: string;
};

type SupabasePublicConfigOptions = {
  includeServerFallback?: boolean;
};

export function tryGetSupabasePublicConfig({
  includeServerFallback = false,
}: SupabasePublicConfigOptions = {}): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    (includeServerFallback ? process.env.SUPABASE_ANON_KEY : undefined);

  if (!url || !publicKey) {
    return null;
  }

  return {
    publicKey,
    url,
  };
}

export function hasSupabasePublicConfig(options?: SupabasePublicConfigOptions) {
  return Boolean(tryGetSupabasePublicConfig(options));
}

export function getSupabasePublicConfig(options?: SupabasePublicConfigOptions): SupabasePublicConfig {
  const config = tryGetSupabasePublicConfig(options);

  if (!config) {
    throw new Error("Supabase public configuration is missing.");
  }

  return config;
}
