import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const defaultStates = [
  "home",
  "homeActivity",
  "homeStudy",
  "reader",
  "chapterPicker",
  "selectionSheet",
  "chapterNote",
  "selectedVersePanel",
  "favoriteModal",
  "verseNote",
  "feedbackModal",
  "quickMove",
  "progress",
  "highlights",
  "favorites",
  "search",
  "searchResults",
  "searchEnglishResults",
  "settings",
  "settingsTts",
  "settingsText",
  "settingsView",
];

const defaults = {
  height: 844,
  mobileBottomCrop: 0,
  mobileTopCrop: 0,
  mobileUrl: "http://localhost:8082",
  outDir: ".tmp/visual-parity",
  port: 9344,
  states: defaultStates.join(","),
  threshold: 0.28,
  webBottomCrop: 0,
  webTopCrop: 0,
  webUrl: "http://localhost:3001/app",
  width: 390,
};

function parseArgs(argv) {
  const options = { ...defaults };
  const numericKeys = new Set([
    "height",
    "mobileBottomCrop",
    "mobileTopCrop",
    "port",
    "threshold",
    "webBottomCrop",
    "webTopCrop",
    "width",
  ]);

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, rawValue = "true"] = arg.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    options[key] = numericKeys.has(key) ? Number(rawValue) : rawValue;
  }

  return options;
}

async function runNodeScript(scriptPath, args, maxBuffer = 1024 * 1024 * 16) {
  const { stderr, stdout } = await execFileAsync(process.execPath, [scriptPath, ...args], {
    maxBuffer,
    windowsHide: true,
  });

  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  return stdout;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(String(options.outDir));
  const states = String(options.states)
    .split(",")
    .map((state) => state.trim())
    .filter(Boolean);

  if (!states.length) {
    throw new Error("At least one visual parity state is required.");
  }

  await mkdir(outDir, { recursive: true });

  await runNodeScript("scripts/capture-mobile-visuals.mjs", [
    `--web-url=${options.webUrl}`,
    `--mobile-url=${options.mobileUrl}`,
    `--width=${options.width}`,
    `--height=${options.height}`,
    `--port=${options.port}`,
    `--out-dir=${outDir}`,
    `--states=${states.join(",")}`,
  ]);

  const reports = [];
  for (const state of states) {
    const web = resolve(outDir, `${state}-web.png`);
    const mobile = resolve(outDir, `${state}-mobile.png`);
    const diff = resolve(outDir, `${state}-diff.png`);
    const json = resolve(outDir, `${state}-report.json`);
    const stdout = await runNodeScript("scripts/compare-mobile-visuals.mjs", [
      `--web=${web}`,
      `--mobile=${mobile}`,
      `--out=${diff}`,
      `--json=${json}`,
      `--width=${options.width}`,
      `--height=${options.height}`,
      `--threshold=${options.threshold}`,
      `--mobile-top-crop=${options.mobileTopCrop}`,
      `--mobile-bottom-crop=${options.mobileBottomCrop}`,
      `--web-top-crop=${options.webTopCrop}`,
      `--web-bottom-crop=${options.webBottomCrop}`,
    ]);
    const report = JSON.parse(await readFile(json, "utf8"));
    reports.push({ state, ...report });
    process.stdout.write(`${state}: ${stdout.trim()}\n`);
  }

  const summary = {
    failed: reports.filter((report) => !report.passed).map((report) => report.state),
    options: {
      height: options.height,
      mobileUrl: options.mobileUrl,
      mobileBottomCrop: options.mobileBottomCrop,
      mobileTopCrop: options.mobileTopCrop,
      outDir,
      states,
      threshold: options.threshold,
      webBottomCrop: options.webBottomCrop,
      webTopCrop: options.webTopCrop,
      webUrl: options.webUrl,
      width: options.width,
    },
    passed: reports.every((report) => report.passed),
    reports,
  };
  const summaryPath = resolve(outDir, "visual-parity-report.json");
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ failed: summary.failed, passed: summary.passed, report: summaryPath, states: states.length }, null, 2));

  if (!summary.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
