import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputRoot = path.resolve(".tmp/study-ui-validation");
fs.rmSync(outputRoot, { force: true, recursive: true });
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, "package.json"), JSON.stringify({ type: "commonjs" }));

try {
  const tscCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const compiled = spawnSync(tscCommand, ["tsc", "-p", "scripts/tsconfig.study-ui-validation.json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (compiled.stdout) process.stdout.write(compiled.stdout);
  if (compiled.stderr) process.stderr.write(compiled.stderr);
  if (compiled.status !== 0) throw new Error(`Study UI validation compile failed with exit code ${compiled.status}.`);

  const executed = spawnSync(process.execPath, [path.join(outputRoot, "scripts/validate-study-context.js")], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (executed.stdout) process.stdout.write(executed.stdout);
  if (executed.stderr) process.stderr.write(executed.stderr);
  if (executed.status !== 0) throw new Error(`Study UI validation failed with exit code ${executed.status}.`);
} finally {
  fs.rmSync(outputRoot, { force: true, recursive: true });
}
