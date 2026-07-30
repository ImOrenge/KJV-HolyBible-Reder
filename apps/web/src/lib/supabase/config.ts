type SupabasePublicConfig = {
  publicKey: string;
  url: string;
};

type SupabaseServiceRoleConfig = {
  serviceRoleKey: string;
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

function isPlaceholderSecret(value: string) {
  return /^(your[-_]|replace[-_]|example|placeholder|<)/i.test(value.trim());
}

export function tryGetSupabaseServiceRoleConfig(): SupabaseServiceRoleConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || isPlaceholderSecret(serviceRoleKey)) {
    return null;
  }

  return {
    serviceRoleKey,
    url,
  };
}

export function getSupabaseServiceRoleConfig(): SupabaseServiceRoleConfig {
  const config = tryGetSupabaseServiceRoleConfig();

  if (!config) {
    throw new Error("Supabase service role configuration is missing.");
  }

  return config;
}
