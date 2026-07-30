import fs from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/)
      .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]),
  );
}

const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const supabaseCommand = process.platform === "win32" ? "supabase.exe" : "supabase";
const supabaseArgs = ["db", "dump", "--linked", "--dry-run"];
const commandOptions = {
  cwd: process.cwd(),
  encoding: "utf8",
  env: {
    ...env,
    npm_config_cpu: process.platform === "win32" ? "x64" : process.env.npm_config_cpu,
    npm_config_os: process.platform === "win32" ? "win32" : process.env.npm_config_os,
  },
};
let connection = spawnSync(supabaseCommand, supabaseArgs, commandOptions);
if (connection.error?.code === "ENOENT") {
  connection = spawnSync(
    npxCommand,
    ["--yes", "supabase@latest", ...supabaseArgs],
    { ...commandOptions, shell: process.platform === "win32" },
  );
}
if (connection.error) throw connection.error;
const output = `${connection.stdout ?? ""}\n${connection.stderr ?? ""}`;
if (connection.status !== 0) {
  throw new Error(`Supabase CLI connection discovery failed with exit code ${connection.status}: ${output.trim()}`);
}
const postgresEnv = Object.fromEntries(
  ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"].map((key) => {
    const value = new RegExp(`export ${key}="([^"]+)"`).exec(output)?.[1];
    if (!value) throw new Error(`Supabase CLI did not provide ${key} for the linked database.`);
    return [key, value];
  }),
);
const result = spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", "scripts/smoke-remote-community-v2.sql"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, ...postgresEnv },
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) throw new Error(`Remote community v2 SQL smoke failed with exit code ${result.status}.`);
