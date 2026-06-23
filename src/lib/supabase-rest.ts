type SupabaseRequestOptions = {
  cache?: RequestCache;
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseRestConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function supabaseRestGet<T>(path: string, options: SupabaseRequestOptions = {}): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase REST configuration is missing.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    cache: options.cache ?? "no-store",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST request failed ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export function encodeFilterValue(value: string | number) {
  return encodeURIComponent(String(value));
}
