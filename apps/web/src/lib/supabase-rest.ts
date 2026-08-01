type SupabaseRequestOptions = {
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY;

export function hasSupabaseRestConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function supabaseRestGet<T>(path: string, options: SupabaseRequestOptions = {}): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase REST configuration is missing.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    ...(options.cache ? { cache: options.cache } : options.next ? {} : { cache: "no-store" as const }),
    ...(options.next ? { next: options.next } : {}),
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

export async function supabaseRestRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase REST configuration is missing.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${encodeURIComponent(functionName)}`;
  const response = await fetch(url, {
    method: "POST",
    cache: options.cache ?? "no-store",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase RPC request failed ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export function encodeFilterValue(value: string | number) {
  return encodeURIComponent(String(value));
}
