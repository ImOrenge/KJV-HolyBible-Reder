import fs from "node:fs";

function readEnvFile(path) {
  if (!fs.existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
}

const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};

const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase REST environment variables.");
}

const baseUrl = supabaseUrl.replace(/\/$/, "");
const headers = {
  Accept: "application/json",
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
};

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const rpcResponse = await fetch(`${baseUrl}/rest/v1/rpc/search_hebrew_dictionary`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_query: "reshith",
    p_alphabet: "all",
    p_theme: "all",
    p_book_id: "all",
    p_sort: "alphabetical",
    p_limit: 10,
    p_offset: 0,
  }),
});
const rpcRows = await readJson(rpcResponse);
if (!rpcResponse.ok || !Array.isArray(rpcRows) || rpcRows[0]?.normalized_key !== "reshith") {
  throw new Error(`Hebrew dictionary RPC smoke failed: ${rpcResponse.status} ${JSON.stringify(rpcRows).slice(0, 500)}`);
}

const occurrenceResponse = await fetch(
  `${baseUrl}/rest/v1/hebrew_word_occurrences?select=id,verse_key&verse_key=eq.GEN.1.1`,
  { headers },
);
const occurrenceRows = await readJson(occurrenceResponse);
if (!occurrenceResponse.ok || !Array.isArray(occurrenceRows) || occurrenceRows.length < 5) {
  throw new Error(`Hebrew occurrence smoke failed: ${occurrenceResponse.status} ${JSON.stringify(occurrenceRows).slice(0, 500)}`);
}

console.log(`remote Hebrew lexicon smoke passed: rpc=${rpcRows.length}, GEN.1.1 occurrences=${occurrenceRows.length}`);
