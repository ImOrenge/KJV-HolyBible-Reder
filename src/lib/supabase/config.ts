type SupabasePublicConfig = {
  publicKey: string;
  url: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    throw new Error("Supabase public configuration is missing.");
  }

  return {
    publicKey,
    url,
  };
}
