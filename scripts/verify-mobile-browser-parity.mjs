import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { tmpdir } from "node:os";

const defaults = {
  height: 844,
  mobileUrl: "http://localhost:8082",
  port: 9338,
  threshold: 4,
  webUrl: "http://localhost:3001/app",
  width: 390,
};

function parseArgs(argv) {
  const options = { ...defaults };
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, rawValue = "true"] = arg.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (["height", "port", "threshold", "width"].includes(key)) {
      options[key] = Number(rawValue);
    } else {
      options[key] = rawValue;
    }
  }
  return options;
}

function resolveChromeBinary() {
  const candidates = [
    process.env.CHROME,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe") : null,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe") : null,
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe") : null,
    "google-chrome",
    "chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && (candidate.includes("/") || candidate.includes("\\") ? existsSync(candidate) : true)) {
      return candidate;
    }
  }

  throw new Error("Cannot find Chrome or Edge. Set CHROME to the browser binary path.");
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForJsonVersion(port) {
  const url = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + 15_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }

  throw new Error(`Chrome DevTools did not become ready: ${lastError}`);
}

async function createTarget(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Cannot create Chrome target: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

class CdpSession {
  constructor(webSocketUrl) {
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", rejectReady, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { reject, resolve } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          reject(new Error(payload.error.message));
        } else {
          resolve(payload.result);
        }
        return;
      }
      if (payload.method) {
        this.events.push(payload);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = (this.id += 1);
    const message = JSON.stringify({ id, method, params });
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
    });
    this.socket.send(message);
    return result;
  }

  async close() {
    await this.ready;
    this.socket.close();
  }
}

async function openPage(port, url, viewport) {
  const target = await createTarget(port, url);
  const cdp = new CdpSession(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: true,
    width: viewport.width,
  });
  await cdp.send("Page.navigate", { url });
  await waitForRenderedApp(cdp);
  return cdp;
}

async function waitForRenderedApp(cdp) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const bodyText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " "), null).catch(() => "");
    if (bodyText.includes("KJV 리더노트") || bodyText.includes("KJV Reader")) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Rendered app text did not appear before timeout.");
}

async function evaluate(cdp, pageFunction, arg) {
  const expression = `(${pageFunction.toString()})(${JSON.stringify(arg)})`;
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
  }
  return result.result.value;
}

function collectLayoutMetrics() {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function rect(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      borderRadius: Number.parseFloat(s.borderRadius) || 0,
      height: Math.round(r.height),
      padding: s.padding,
      text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      width: Math.round(r.width),
      x: Math.round(r.x),
      y: Math.round(r.y),
    };
  }

  const text = document.body.innerText || document.body.textContent || "";
  const panelCandidates = [...document.querySelectorAll("section, article, div")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const value = (el.innerText || el.textContent || "").trim();
      return visible(el) && value && r.width > 280 && r.height > 60 && Number.parseFloat(s.borderRadius) >= 6;
    })
    .map(rect)
    .slice(0, 8);

  const bottomNav = [...document.querySelectorAll("nav, div")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ");
      return visible(el) && r.y > window.innerHeight - 90 && value.includes("홈") && value.includes("설정");
    })
    .map(rect)
    .sort((a, b) => b.width - a.width)[0];

  const navItems = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ");
      return visible(el) && r.y > window.innerHeight - 90 && r.height >= 38 && r.width >= 40 && ["홈", "성경", "인용", "빠른이동", "설정"].some((label) => value.includes(label));
    })
    .map(rect)
    .slice(-5);

  const actionButtons = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ");
      return visible(el) && r.height >= 38 && r.height <= 58 && r.width >= 50 && r.width <= 380 && Number.parseFloat(s.borderRadius) >= 5 && ["이어 읽기", "읽음 완료", "읽음 취소", "EN", "KR", "읽기", "다중 선택"].some((label) => value.includes(label));
    })
    .map(rect)
    .slice(0, 12);

  return {
    actionButtons,
    bodyText: text.replace(/\s+/g, " ").slice(0, 600),
    bottomNav,
    navItems,
    panels: panelCandidates,
  };
}

function clickText(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const candidates = [...document.querySelectorAll("button, [role='button'], div, a")]
    .filter((el) => visible(el) && (el.innerText || el.textContent || "").replace(/\s+/g, " ").includes(label))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, el };
    })
    .sort((a, b) => a.area - b.area);

  const target = candidates[0]?.el;
  if (!target) {
    return false;
  }
  target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
}

async function ensureGuestReader(cdp) {
  const clicked = await evaluate(cdp, clickText, "비회원 리더 로그인").catch(() => false);
  if (!clicked) {
    return;
  }

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const bodyText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " "), null).catch(() => "");
    if (bodyText.includes("오늘 통독 플랜")) {
      return;
    }
    await sleep(250);
  }
}

function fillSearch(value) {
  const input = [...document.querySelectorAll("input, textarea")].find((candidate) => {
    const r = candidate.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  if (!input) {
    return false;
  }

  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setSearchLanguageSelect(value) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll("select")]
    .filter((candidate) => visible(candidate) && candidate.querySelector(`option[value="${value}"]`) && candidate.querySelector('option[value="ko"]'))
    .find((candidate) => (candidate.closest("label")?.innerText || candidate.parentElement?.innerText || "").includes("언어"));

  if (!target) {
    return false;
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function findSearchInputCenter() {
  const input = [...document.querySelectorAll("input, textarea")].find((candidate) => {
    const r = candidate.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  if (!input) {
    return null;
  }

  const rect = input.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
}

function findTextCenter(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const match = [...document.querySelectorAll("button, [role='button'], div, a")]
    .filter((el) => visible(el) && (el.innerText || el.textContent || "").replace(/\s+/g, " ").includes(label))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, rect: r };
    })
    .sort((a, b) => a.area - b.area)[0];

  if (!match) {
    return null;
  }

  return {
    x: Math.round(match.rect.left + match.rect.width / 2),
    y: Math.round(match.rect.top + match.rect.height / 2),
  };
}

async function selectEnglishSearch(cdp) {
  if (await evaluate(cdp, setSearchLanguageSelect, "en")) {
    await sleep(400);
    return true;
  }

  const opened = await evaluate(cdp, clickText, "한국어");
  await sleep(500);
  const selected = await evaluate(cdp, clickText, "KJV 영어");
  await sleep(500);
  return opened && selected;
}

async function verifyFlow(cdp, name) {
  const checks = [
    { click: "성경", expect: ["창세기", "읽음"] },
    { click: "인용", expect: ["인용 구절 보관함", "목록", "기본 목록"] },
    { click: "빠른이동", expect: ["빠른"] },
    { click: "검색", expect: ["검색"] },
    { click: "설정", expect: ["설정"] },
  ];
  const failures = [];

  for (const check of checks) {
    const clicked = await evaluate(cdp, clickText, check.click);
    await sleep(700);
    const bodyText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " "), null);
    const missing = check.expect.filter((value) => !bodyText.includes(value));
    if (!clicked || missing.length) {
      failures.push({ clicked, click: check.click, missing });
    }
  }

  await evaluate(cdp, clickText, "빠른이동");
  await sleep(500);
  await evaluate(cdp, clickText, "검색");
  await sleep(500);
  const languageSelected = await selectEnglishSearch(cdp);
  const inputCenter = await evaluate(cdp, findSearchInputCenter, null);
  let filled = false;
  if (inputCenter) {
    await cdp.send("Input.dispatchMouseEvent", { button: "left", clickCount: 1, type: "mousePressed", x: inputCenter.x, y: inputCenter.y });
    await cdp.send("Input.dispatchMouseEvent", { button: "left", clickCount: 1, type: "mouseReleased", x: inputCenter.x, y: inputCenter.y });
    await cdp.send("Input.insertText", { text: "beginning" });
    filled = true;
  } else {
    filled = await evaluate(cdp, fillSearch, "beginning");
  }
  await sleep(500);
  await sleep(2200);
  const searchText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " "), null);
  if (!languageSelected || !filled || !searchText.includes("개 결과") || searchText.includes("두 글자 이상") || !searchText.includes("In the beginning")) {
    failures.push({
      click: "자동 검색",
      excerpt: searchText.slice(0, 500),
      filled,
      languageSelected,
      missing: ["영어 검색 결과", "In the beginning"],
    });
  }

  return { failures, name };
}

function assertMetric(name, actual, expected, threshold, failures) {
  if (actual == null || Number.isNaN(actual)) {
    failures.push(`${name}: missing`);
    return;
  }
  if (Math.abs(actual - expected) > threshold) {
    failures.push(`${name}: expected ${expected}±${threshold}, got ${actual}`);
  }
}

function verifyLayout(name, metrics, threshold) {
  const failures = [];
  assertMetric(`${name}.bottomNav.height`, metrics.bottomNav?.height, 65, threshold, failures);

  for (const [index, item] of (metrics.navItems ?? []).entries()) {
    assertMetric(`${name}.navItems[${index}].height`, item.height, 48, threshold, failures);
    assertMetric(`${name}.navItems[${index}].radius`, item.borderRadius, 6, 1, failures);
  }

  const firstPanel = metrics.panels?.[0];
  if (!firstPanel) {
    failures.push(`${name}.panels: missing`);
  } else {
    assertMetric(`${name}.firstPanel.radius`, firstPanel.borderRadius, 8, 1, failures);
    if (!firstPanel.padding.includes("14px")) {
      failures.push(`${name}.firstPanel.padding: expected 14px, got ${firstPanel.padding}`);
    }
  }

  const primaryAction = metrics.actionButtons?.find((item) => item.text.includes("이어 읽기")) ?? metrics.actionButtons?.[0];
  if (primaryAction) {
    assertMetric(`${name}.action.height`, primaryAction.height, 44, threshold, failures);
    assertMetric(`${name}.action.radius`, primaryAction.borderRadius, 6, 1, failures);
    if (primaryAction.text.includes("이어 읽기") && primaryAction.width > 180) {
      failures.push(`${name}.action.width: expected inline button width <= 180, got ${primaryAction.width}`);
    }
  } else {
    failures.push(`${name}.action: missing`);
  }

  return failures;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chrome = resolveChromeBinary();
  const outputDir = resolve(".tmp/mobile-browser-parity");
  const userDataDir = await mkdtemp(join(tmpdir(), "kjv-browser-parity-"));
  await mkdir(outputDir, { recursive: true });

  const child = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${options.port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${options.width},${options.height}`,
    "about:blank",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });

  const sessions = [];
  try {
    await waitForJsonVersion(options.port);
    const viewport = { height: options.height, width: options.width };
    const web = await openPage(options.port, options.webUrl, viewport);
    const mobile = await openPage(options.port, options.mobileUrl, viewport);
    sessions.push(web, mobile);

    await Promise.all([ensureGuestReader(web), ensureGuestReader(mobile)]);

    const [webMetrics, mobileMetrics] = await Promise.all([
      evaluate(web, collectLayoutMetrics, null),
      evaluate(mobile, collectLayoutMetrics, null),
    ]);

    const [webFlow, mobileFlow] = await Promise.all([
      verifyFlow(web, "web"),
      verifyFlow(mobile, "mobile"),
    ]);

    const report = {
      layoutFailures: [
        ...verifyLayout("web", webMetrics, options.threshold),
        ...verifyLayout("mobile", mobileMetrics, options.threshold),
      ],
      mobile: mobileMetrics,
      mobileFlow,
      options,
      web: webMetrics,
      webFlow,
    };

    report.passed = report.layoutFailures.length === 0 && webFlow.failures.length === 0 && mobileFlow.failures.length === 0;
    console.log(JSON.stringify(report, null, 2));

    if (!report.passed) {
      process.exitCode = 1;
    }
  } finally {
    await Promise.allSettled(sessions.map((session) => session.close()));
    child.kill();
    try {
      await rm(userDataDir, { force: true, recursive: true });
    } catch {
      // Chrome can keep Crashpad files locked briefly on Windows; the temp folder is disposable.
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
