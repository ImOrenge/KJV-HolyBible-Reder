import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

export function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

export function loadDotEnv(path = ".env") {
  if (!existsSync(path)) {
    return {};
  }

  const env = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#") || !line.includes("=")) {
      continue;
    }

    const [rawKey, ...rawValue] = line.split("=");
    const key = rawKey.trim();
    let value = rawValue.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      env[key] = value;
    }
  }

  return env;
}

export function resolveDatabaseUrl(args) {
  const env = loadDotEnv(args.env ?? ".env");
  const explicitDatabaseUrl = args["database-url"];
  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  const configuredDatabaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
  const explicitPoolerUrl = process.env.SUPABASE_DB_POOLER_URL || env.SUPABASE_DB_POOLER_URL;
  const poolerUrlPath = args["pooler-url-path"] || env.SUPABASE_DB_POOLER_URL_PATH || "supabase/.temp/pooler-url";
  const filePoolerUrl = existsSync(poolerUrlPath) ? readFileSync(poolerUrlPath, "utf8").trim() : "";
  const poolerUrl = explicitPoolerUrl || filePoolerUrl;

  if (!configuredDatabaseUrl || !poolerUrl || !configuredDatabaseUrl.includes("supabase.co")) {
    return configuredDatabaseUrl;
  }

  return mergePoolerConnection(configuredDatabaseUrl, poolerUrl);
}

function mergePoolerConnection(databaseUrl, poolerUrl) {
  try {
    const direct = new URL(databaseUrl);
    const pooler = new URL(poolerUrl);
    const password = direct.password ? decodeURIComponent(direct.password) : "";
    const username = pooler.username ? decodeURIComponent(pooler.username) : decodeURIComponent(direct.username);

    if (!username || !password) {
      return databaseUrl;
    }

    pooler.username = username;
    pooler.password = password;
    if (!pooler.searchParams.has("sslmode")) {
      pooler.searchParams.set("sslmode", "require");
    }

    return pooler.toString();
  } catch {
    return databaseUrl;
  }
}

export function runPsql(databaseUrl, psqlArgs, options = {}) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Set it in .env or pass --database-url.");
  }

  const result = spawnSync("psql", [databaseUrl, ...psqlArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 256,
    ...options,
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(detail || `psql failed with exit code ${result.status}`);
  }

  return result.stdout.trim();
}

export function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function csvPathForPsql(path) {
  return path.replaceAll("\\", "/");
}
