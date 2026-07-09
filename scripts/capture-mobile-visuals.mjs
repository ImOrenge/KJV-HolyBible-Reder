import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const defaults = {
  height: 844,
  mobileUrl: "http://localhost:8082",
  outDir: ".tmp/visual-parity",
  port: 9344,
  states: "home,reader",
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
    options[key] = ["height", "port", "width"].includes(key) ? Number(rawValue) : rawValue;
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
  const deadline = Date.now() + 15_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
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
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", (event) => {
        rejectReady(new Error(`Chrome DevTools WebSocket failed: ${webSocketUrl} (${event.type})`));
      }, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (!payload.id || !this.pending.has(payload.id)) {
        return;
      }
      const { reject, resolve, timeout } = this.pending.get(payload.id);
      clearTimeout(timeout);
      this.pending.delete(payload.id);
      if (payload.error) {
        reject(new Error(payload.error.message));
      } else {
        resolve(payload.result);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = (this.id += 1);
    const result = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome DevTools command timed out: ${method}`));
      }, 45_000);
      this.pending.set(id, { reject, resolve, timeout });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  async close() {
    await this.ready;
    this.socket.close();
  }
}

async function evaluate(cdp, pageFunction, arg = null) {
  const expression = `(${pageFunction.toString()})(${JSON.stringify(arg)})`;
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.exception?.value
      ?? result.exceptionDetails.text
      ?? "Runtime.evaluate failed";
    throw new Error(description);
  }
  return result.result.value;
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

function withCaptureReset(url, key) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("__captureReset", key);
    return parsed.href;
  } catch {
    return url;
  }
}

async function resetPage(cdp, url, key) {
  await cdp.send("Page.navigate", { url: withCaptureReset(url, key) });
  await waitForRenderedApp(cdp);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitForRenderedApp(cdp);
}

async function navigateWebReaderFixture(cdp) {
  const fixtureUrl = await evaluate(cdp, () => {
    const url = new URL(window.location.href);
    if (!["localhost:3001", "127.0.0.1:3001"].includes(url.host)) {
      return null;
    }
    url.searchParams.set("view", "reader");
    url.searchParams.set("book", "gen");
    url.searchParams.set("chapter", "1");
    return url.href;
  }).catch(() => null);

  if (!fixtureUrl) {
    return;
  }

  await cdp.send("Page.navigate", { url: fixtureUrl });
  await waitForRenderedApp(cdp);
}

async function waitForRenderedApp(cdp) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const bodyText = await evaluate(cdp, () => (document.body ? document.body.innerText || document.body.textContent || "" : "").replace(/\s+/g, " ")).catch(() => "");
    if (bodyText.includes("KJV 리더노트") || bodyText.includes("KJV Reader")) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Rendered app text did not appear before timeout.");
}

async function ensureGuestReader(cdp) {
  if (!(await hasText(cdp, ["by CrossWire KJV 3.1", "비회원 리더 로그인"]))) {
    return;
  }
  await evaluate(cdp, clickText, "비회원 리더 로그인");
  await waitForText(cdp, ["오늘 통독 플랜"], "Guest reader entry");
}

function clickText(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const candidates = [];
  for (const textNode of [...document.querySelectorAll("button, [role='button'], a, div, span")]) {
    if (!visible(textNode) || !normalizedText(textNode).includes(label)) {
      continue;
    }

    let node = textNode;
    for (let depth = 0; node && node !== document.body && depth < 6; depth += 1) {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      const borderRadius = Number.parseFloat(s.borderRadius) || 0;
      const isNativeControl = ["BUTTON", "A"].includes(node.tagName) || node.getAttribute("role") === "button";
      const isStyledControl = r.height >= 36 && r.width >= 40 && borderRadius >= 5;
      if (visible(node) && normalizedText(node).includes(label) && (isNativeControl || isStyledControl)) {
        candidates.push({ area: r.width * r.height, el: node });
        break;
      }
      node = node.parentElement;
    }

    const r = textNode.getBoundingClientRect();
    candidates.push({ area: r.width * r.height + 1_000_000, el: textNode });
  }

  const target = candidates.sort((a, b) => a.area - b.area)[0]?.el;
  if (!target) {
    return false;
  }
  target.scrollIntoView?.({ block: "center", inline: "nearest" });
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  target.click?.();
  return true;
}

function clickBottomNavItem(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const candidates = [];
  for (const labelNode of [...document.querySelectorAll("button, [role='button'], a, div, span")]) {
    if (!visible(labelNode) || !normalizedText(labelNode).includes(label)) {
      continue;
    }

    let node = labelNode;
    for (let depth = 0; node && node !== document.body && depth < 6; depth += 1) {
      const r = node.getBoundingClientRect();
      const isNativeControl = ["BUTTON", "A"].includes(node.tagName) || node.getAttribute("role") === "button";
      const isBottomSizedControl = r.y > window.innerHeight - 110 && r.height >= 36 && r.width >= 40;
      if (visible(node) && normalizedText(node).includes(label) && (isNativeControl || isBottomSizedControl)) {
        candidates.push({ area: r.width * r.height, el: node });
        break;
      }
      node = node.parentElement;
    }
  }

  candidates.sort((a, b) => a.area - b.area);

  const target = candidates[0]?.el;
  if (!target) {
    return false;
  }
  const r = target.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.click?.();
  return true;
}

function clickCommandItem(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const labels = [...document.querySelectorAll("button, [role='button'], a, div, span, strong")]
    .filter((el) => normalizedText(el).includes(label));

  const candidates = [];
  for (const labelNode of labels) {
    let node = labelNode;
    for (let depth = 0; node && node !== document.body && depth < 7; depth += 1) {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      const borderRadius = Number.parseFloat(s.borderRadius) || 0;
      const exactOrPair = normalizedText(node) === label || normalizedText(node).startsWith(`${label} `) || normalizedText(node).includes(label);
      const isCommandSized = r.width >= 160 && r.height >= 50 && borderRadius >= 5;
      const isNativeControl = ["BUTTON", "A"].includes(node.tagName) || node.getAttribute("role") === "button";
      if (visible(node) && exactOrPair && (isCommandSized || isNativeControl)) {
        candidates.push({ area: r.width * r.height, el: node });
        break;
      }
      node = node.parentElement;
    }
  }

  const target = candidates.sort((a, b) => a.area - b.area)[0]?.el;
  if (!target) {
    return false;
  }

  target.scrollIntoView?.({ block: "center", inline: "nearest" });
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  target.click?.();
  return true;
}

function fillSearchInput(query) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll("input, textarea")]
    .filter((el) => visible(el))
    .find((el) => {
      const placeholder = el.getAttribute("placeholder") || "";
      const type = el.getAttribute("type") || "";
      return type === "search" || placeholder.includes("믿음") || placeholder.includes("grace");
    });

  if (!target) {
    return false;
  }

  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
  setter?.call(target, query);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function fillCommandInput(query) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll("input, textarea")]
    .filter((el) => visible(el))
    .find((el) => (el.getAttribute("placeholder") || "").includes("이동하거나 실행할 항목 검색"));

  if (!target) {
    return false;
  }

  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
  setter?.call(target, query);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setSearchLanguageSelect(value) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll("select")]
    .filter((el) => visible(el) && el.querySelector(`option[value="${value}"]`) && el.querySelector('option[value="ko"]'))
    .find((el) => (el.closest("label")?.innerText || el.parentElement?.innerText || "").includes("언어"));

  if (!target) {
    return false;
  }

  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
  setter?.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function scrollViewport(position) {
  const top = position === "bottom" ? document.documentElement.scrollHeight : 0;
  document.scrollingElement?.scrollTo({ behavior: "instant", top });
  window.scrollTo({ behavior: "instant", top });
  const scrollViews = [...document.querySelectorAll("div, section, main, article")]
    .filter((el) => el.scrollHeight > el.clientHeight + 20);
  for (const view of scrollViews) {
    view.scrollTop = position === "bottom" ? view.scrollHeight : 0;
  }
}

function scrollTextIntoView(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const target = [...document.querySelectorAll("h1, h2, h3, strong, p, div, span")]
    .filter((el) => normalizedText(el).includes(label))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, el };
    })
    .sort((a, b) => a.area - b.area)[0]?.el;

  if (!target) {
    return false;
  }
  let container = target.parentElement;
  while (container && container !== document.body) {
    if (container.scrollHeight > container.clientHeight + 20) {
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      container.scrollTop += targetRect.top - containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
      break;
    }
    container = container.parentElement;
  }
  target.scrollIntoView?.({ block: "center", inline: "nearest" });
  return true;
}

function clickPoint(point) {
  const rawTarget = document.elementFromPoint(point.x, point.y);
  const target = rawTarget?.closest?.("button, [role='button'], a, [tabindex]") || rawTarget;
  if (!target) {
    return false;
  }
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.focus?.();
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: point.x, clientY: point.y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: point.x, clientY: point.y, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: point.x, clientY: point.y, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: point.x, clientY: point.y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: point.x, clientY: point.y, view: window }));
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.click?.();
  return true;
}

function findTextCenter(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const candidates = [...document.querySelectorAll("button, [role='button'], a, div, span")]
    .filter((el) => visible(el) && normalizedText(el).includes(label))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const isNativeControl = ["BUTTON", "A"].includes(el.tagName) || el.getAttribute("role") === "button";
      const borderRadius = Number.parseFloat(s.borderRadius) || 0;
      const isStyledControl = r.height >= 34 && r.width >= 38 && borderRadius >= 4;
      return {
        area: r.width * r.height,
        controlPriority: isNativeControl || isStyledControl ? 0 : 1,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    })
    .sort((a, b) => a.controlPriority - b.controlPriority || a.area - b.area);

  return candidates[0] ?? null;
}

function activateVisibleControl(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const target = [...document.querySelectorAll("button, [role='button'], a, [tabindex]")]
    .filter((el) => visible(el) && normalizedText(el).includes(label))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const text = normalizedText(el);
      return {
        area: r.width * r.height,
        el,
        exactPriority: text === label ? 0 : 1,
      };
    })
    .sort((a, b) => a.exactPriority - b.exactPriority || a.area - b.area)[0]?.el;

  if (!target) {
    return false;
  }

  const r = target.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.focus?.();
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.click?.();
  return true;
}

function activateAccessibleControl(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll("button, [role='button'], a, [tabindex], [aria-label]")]
    .filter((el) => visible(el) && (el.getAttribute("aria-label") === label || el.getAttribute("accessibilityLabel") === label))
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.width * ar.height - br.width * br.height;
    })[0];

  if (!target) {
    return false;
  }

  const r = target.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.focus?.();
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, code: "Enter", key: "Enter", view: window }));
  target.click?.();
  return true;
}

async function waitForText(cdp, labels, description) {
  const requiredLabels = Array.isArray(labels) ? labels : [labels];
  const deadline = Date.now() + 10_000;
  let excerpt = "";
  while (Date.now() < deadline) {
    const state = await evaluate(cdp, (values) => {
      const text = document.body ? document.body.innerText || document.body.textContent || "" : "";
      return {
        excerpt: text.replace(/\s+/g, " ").slice(0, 500),
        ready: values.every((value) => text.includes(value)),
      };
    }, requiredLabels);
    excerpt = state.excerpt;
    if (state.ready) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`${description} did not become ready. Expected ${requiredLabels.join(", ")} in: ${excerpt}`);
}

async function waitForAnyText(cdp, groups, description) {
  const expectedGroups = groups.map((group) => (Array.isArray(group) ? group : [group]));
  const deadline = Date.now() + 10_000;
  let excerpt = "";
  while (Date.now() < deadline) {
    const state = await evaluate(cdp, (values) => {
      const text = document.body ? document.body.innerText || document.body.textContent || "" : "";
      return {
        excerpt: text.replace(/\s+/g, " ").slice(0, 500),
        ready: values.some((group) => group.every((value) => text.includes(value))),
      };
    }, expectedGroups);
    excerpt = state.excerpt;
    if (state.ready) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`${description} did not become ready. Expected one of ${expectedGroups.map((group) => group.join(", ")).join(" | ")} in: ${excerpt}`);
}

async function waitForAuthForm(cdp, title, description) {
  const deadline = Date.now() + 10_000;
  let excerpt = "";
  while (Date.now() < deadline) {
    const state = await evaluate(cdp, (value) => {
      const text = document.body ? document.body.innerText || document.body.textContent || "" : "";
      const placeholders = [...document.querySelectorAll("input, textarea")]
        .map((input) => input.getAttribute("placeholder") ?? "")
        .filter(Boolean);
      return {
        excerpt: `${text.replace(/\s+/g, " ").slice(0, 500)} placeholders=${placeholders.join(", ")}`,
        ready: text.includes(value) && placeholders.includes("이메일") && placeholders.includes("비밀번호"),
      };
    }, title);
    excerpt = state.excerpt;
    if (state.ready) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`${description} did not become ready. Expected ${title}, 이메일, 비밀번호 in: ${excerpt}`);
}

async function waitForVisibleText(cdp, label, description) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const ready = await evaluate(cdp, (value) => {
      function visible(el) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0
          && r.height > 0
          && r.bottom > 0
          && r.right > 0
          && r.top < window.innerHeight
          && r.left < window.innerWidth
          && s.display !== "none"
          && s.visibility !== "hidden";
      }

      return [...document.querySelectorAll("button, [role='button'], a, [tabindex], div, span")]
        .some((el) => visible(el) && (el.innerText || el.textContent || "").includes(value));
    }, label);
    if (ready) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`${description} did not become visible: ${label}`);
}

async function selectSearchLanguage(cdp, value, label) {
  if (await evaluate(cdp, setSearchLanguageSelect, value)) {
    await sleep(400);
    return;
  }

  if (!(await evaluate(cdp, activateVisibleControl, "한국어"))) {
    await evaluate(cdp, clickText, "한국어");
  }
  await waitForText(cdp, [label], "Search language options");
  if (!(await evaluate(cdp, activateVisibleControl, label))) {
    await evaluate(cdp, clickText, label);
  }
  await sleep(500);
}

async function hasText(cdp, labels) {
  const requiredLabels = Array.isArray(labels) ? labels : [labels];
  return evaluate(cdp, (values) => {
    const text = document.body ? document.body.innerText || document.body.textContent || "" : "";
    return values.every((value) => text.includes(value));
  }, requiredLabels);
}

async function hasChapterNoteModal(cdp) {
  return evaluate(cdp, () => {
    function visible(el) {
      if (!el) {
        return false;
      }
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
    }

    const text = document.body ? document.body.innerText || document.body.textContent || "" : "";
    const noteInput = [...document.querySelectorAll("textarea, input")].find((el) => {
      const placeholder = el.getAttribute("placeholder") || "";
      return visible(el) && (placeholder.includes("묵상") || placeholder.includes("관찰"));
    });
    const rnWebCloseButton = [...document.querySelectorAll("button, [role='button'], [tabindex], div")]
      .some((el) => {
        const label = (el.innerText || el.textContent || "").trim();
        const r = el.getBoundingClientRect();
        return visible(el) && (label === "×" || label.charCodeAt(0) === 215) && r.top < 420 && r.left > window.innerWidth / 2;
      });
    const pointLabel = (document.elementFromPoint(310, 294)?.textContent || "").trim();
    const pointLooksLikeClose = pointLabel === "×" || pointLabel.charCodeAt(0) === 215;
    return Boolean(noteInput || rnWebCloseButton || pointLooksLikeClose)
      && (text.includes("성경 노트") || text.includes("노트") || noteInput?.getAttribute("placeholder")?.includes("묵상") || rnWebCloseButton || pointLooksLikeClose);
  });
}

async function waitForChapterNoteModal(cdp) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await hasChapterNoteModal(cdp)) {
      return;
    }
    await sleep(250);
  }
  const excerpt = await evaluate(cdp, () => (document.body ? document.body.innerText || document.body.textContent || "" : "").replace(/\s+/g, " ").slice(0, 500)).catch(() => "");
  throw new Error(`Chapter note modal did not become ready. Current text: ${excerpt}`);
}

async function debugChapterNote(cdp, phase) {
  if (process.env.CAPTURE_DEBUG !== "1") {
    return;
  }

  const snapshot = await evaluate(cdp, (snapshotPhase) => {
    function visible(el) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
      return inViewport && r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
    }

    function textOf(el) {
      return (el?.innerText || el?.textContent || "").trim().replace(/\s+/g, " ");
    }

    const point = document.elementFromPoint(310, 294);
    const candidates = [...document.querySelectorAll("button, [role='button'], a, [tabindex], div, span")]
      .filter((el) => visible(el) && textOf(el).includes("장 노트"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          area: Math.round(r.width * r.height),
          role: el.getAttribute("role"),
          tabIndex: el.getAttribute("tabindex"),
          tag: el.tagName,
          text: textOf(el).slice(0, 80),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
        };
      })
      .sort((a, b) => a.area - b.area)
      .slice(0, 8);

    return {
      candidates,
      phase: snapshotPhase,
      point: {
        role: point?.getAttribute?.("role"),
        tabIndex: point?.getAttribute?.("tabindex"),
        tag: point?.tagName,
        text: textOf(point).slice(0, 80),
      },
      text: (document.body ? document.body.innerText || document.body.textContent || "" : "").replace(/\s+/g, " ").slice(0, 260),
    };
  }, phase).catch((error) => ({ error: error instanceof Error ? error.message : String(error), phase }));

  console.error(JSON.stringify(snapshot, null, 2));
}

async function openQuickMove(cdp) {
  if (!(await evaluate(cdp, clickBottomNavItem, "빠른이동"))) {
    await tapViewport(cdp, 270, 812);
  }
  await sleep(350);
  if (!(await hasText(cdp, ["빠른 이동", "이어 읽기"]))) {
    await tapViewport(cdp, 270, 812);
  }
  await waitForText(cdp, ["빠른 이동", "이어 읽기"], "Quick move command palette");
}

async function runQuickMoveCommand(cdp, label, readyLabels, description) {
  await openQuickMove(cdp);
  await evaluate(cdp, scrollTextIntoView, label);
  await sleep(300);
  if (!(await evaluate(cdp, clickCommandItem, label))) {
    await evaluate(cdp, clickText, label);
  }
  await waitForText(cdp, readyLabels, description);
}

async function tapViewport(cdp, x, y) {
  await cdp.send("Page.bringToFront").catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x, y });
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 0, clickCount: 1, type: "mouseReleased", x, y });
  await evaluate(cdp, clickPoint, { x, y });
}

async function nativeClickText(cdp, label) {
  const point = await evaluate(cdp, findTextCenter, label);
  if (!point) {
    return false;
  }
  await tapViewport(cdp, point.x, point.y);
  return true;
}

async function prepareState(cdp, state, target = "mobile") {
  if (state === "authEntry") {
    if (target !== "mobile") {
      return;
    }
    if (await hasText(cdp, ["by CrossWire KJV 3.1", "비회원 리더 로그인"])) {
      await waitForText(cdp, ["KJV 리더노트", "by CrossWire KJV 3.1", "비회원 리더 로그인"], "Auth entry state");
    }
    return;
  }

  if (state === "authLogin") {
    if (target !== "mobile") {
      return;
    }
    if (await hasText(cdp, ["by CrossWire KJV 3.1", "비회원 리더 로그인"])) {
      if (!(await evaluate(cdp, activateVisibleControl, "로그인"))) {
        await evaluate(cdp, clickText, "로그인");
      }
      await waitForAuthForm(cdp, "로그인", "Auth login state");
    }
    return;
  }

  if (state === "authSignup") {
    if (target !== "mobile") {
      return;
    }
    if (await hasText(cdp, ["by CrossWire KJV 3.1", "비회원 리더 로그인"])) {
      if (!(await evaluate(cdp, activateVisibleControl, "회원가입"))) {
        await evaluate(cdp, clickText, "회원가입");
      }
      await waitForAuthForm(cdp, "회원가입", "Auth sign-up state");
    }
    return;
  }

  await ensureGuestReader(cdp);

  if (state === "home") {
    await evaluate(cdp, clickBottomNavItem, "홈");
    await sleep(500);
    await evaluate(cdp, clickText, "오늘");
    await sleep(500);
    return;
  }

  if (state === "homeActivity") {
    await prepareState(cdp, "home");
    await evaluate(cdp, activateVisibleControl, "활동");
    await waitForText(cdp, ["최근 활동"], "Home activity state");
    return;
  }

  if (state === "homeStudy") {
    await prepareState(cdp, "home");
    await evaluate(cdp, activateVisibleControl, "공부");
    await waitForText(cdp, ["최근 강조", "최근 인용 구절", "노트와 태그"], "Home study state");
    return;
  }

  if (state === "reader") {
    await navigateWebReaderFixture(cdp);
    await evaluate(cdp, clickBottomNavItem, "성경");
    await waitForText(cdp, ["읽음 완료", "장 노트"], "Reader state");
    return;
  }

  if (state === "chapterPicker") {
    await prepareState(cdp, "reader");
    await tapViewport(cdp, 195, 148);
    await waitForText(cdp, ["성경 이동", "성경 권"], "Chapter picker state");
    return;
  }

  if (state === "selectionSheet") {
    await prepareState(cdp, "reader");
    await evaluate(cdp, clickText, "다중 선택");
    await sleep(400);
    await evaluate(cdp, activateVisibleControl, "In the beginning God created the heaven and the earth.");
    await sleep(300);
    if (!(await hasText(cdp, ["1개 선택"]))) {
      await evaluate(cdp, clickText, "In the beginning God created the heaven and the earth.");
      await sleep(300);
    }
    if (!(await hasText(cdp, ["1개 선택"]))) {
      await evaluate(cdp, clickPoint, { x: 195, y: 405 });
      await sleep(300);
    }
    await nativeClickText(cdp, "In the beginning God created the heaven and the earth.");
    await sleep(300);
    if (!(await hasText(cdp, ["1개 선택"]))) {
      await tapViewport(cdp, 195, 405);
      await sleep(300);
    }
    if (!(await hasText(cdp, ["1개 선택"]))) {
      await tapViewport(cdp, 44, 405);
      await sleep(300);
    }
    await waitForText(cdp, ["1개 선택", "인용 저장"], "Selection action sheet state");
    return;
  }

  if (state === "ttsPlayer") {
    await prepareState(cdp, "reader");
    await evaluate(cdp, activateVisibleControl, "읽기");
    await sleep(900);
    await waitForAnyText(cdp, [
      ["TTS", "현재 장", "일시정지"],
      ["TTS", "창세기", "일시정지"],
      ["TTS", "재생 중", "정지"],
    ], "TTS player state");
    return;
  }

  if (state === "chapterNote") {
    await prepareState(cdp, "reader");
    await debugChapterNote(cdp, "before");
    await evaluate(cdp, activateVisibleControl, "장 노트");
    await sleep(400);
    await debugChapterNote(cdp, "after-control");
    if (!(await hasChapterNoteModal(cdp))) {
      await tapViewport(cdp, 310, 294);
    }
    await sleep(400);
    await debugChapterNote(cdp, "after-coordinate");
    if (!(await hasChapterNoteModal(cdp))) {
      await nativeClickText(cdp, "장 노트");
    }
    await debugChapterNote(cdp, "after-native");
    await waitForChapterNoteModal(cdp);
    return;
  }

  if (state === "selectedVersePanel") {
    await prepareState(cdp, "reader");
    await evaluate(cdp, scrollViewport, "top");
    await sleep(300);
    await evaluate(cdp, activateVisibleControl, "In the beginning God created the heaven and the earth.");
    await sleep(300);
    if (!(await hasText(cdp, ["창세기 1:1", "인용"]))) {
      await evaluate(cdp, clickText, "In the beginning God created the heaven and the earth.");
      await sleep(300);
    }
    if (!(await hasText(cdp, ["창세기 1:1", "인용"]))) {
      await evaluate(cdp, clickPoint, { x: 195, y: 405 });
      await sleep(300);
    }
    await nativeClickText(cdp, "In the beginning God created the heaven and the earth.");
    await sleep(400);
    if (!(await hasText(cdp, ["창세기 1:1", "인용"]))) {
      await tapViewport(cdp, 195, 360);
    }
    await sleep(400);
    await evaluate(cdp, scrollViewport, "bottom");
    await sleep(300);
    await waitForText(cdp, ["창세기 1:1", "인용 구절"], "Selected verse action panel state");
    await waitForVisibleText(cdp, "인용 구절", "Selected verse action panel");
    return;
  }

  if (state === "favoriteModal") {
    await prepareState(cdp, "selectedVersePanel");
    await evaluate(cdp, scrollViewport, "bottom");
    await sleep(300);
    await evaluate(cdp, clickText, "인용 구절 저장");
    if (!(await hasText(cdp, ["인용 제목", "저장할 목록", "목록 생성"]))) {
      await evaluate(cdp, clickText, "인용 구절 수정");
    }
    await sleep(400);
    if (!(await hasText(cdp, ["인용 제목", "저장할 목록", "목록 생성"]))) {
      await nativeClickText(cdp, "인용 구절 저장");
    }
    await sleep(300);
    if (!(await hasText(cdp, ["인용 제목", "저장할 목록", "목록 생성"]))) {
      await tapViewport(cdp, 195, 578);
    }
    await sleep(300);
    if (!(await hasText(cdp, ["인용 제목", "저장할 목록", "목록 생성"]))) {
      await tapViewport(cdp, 195, 704);
    }
    await waitForText(cdp, ["인용 제목", "저장할 목록", "목록 생성"], "Favorite modal state");
    return;
  }

  if (state === "verseNote") {
    await prepareState(cdp, "selectedVersePanel");
    await evaluate(cdp, activateAccessibleControl, "구절 노트");
    await waitForChapterNoteModal(cdp);
    return;
  }

  if (state === "feedbackModal") {
    await prepareState(cdp, "selectedVersePanel");
    await evaluate(cdp, activateAccessibleControl, "번역 의견");
    await sleep(500);
    if (!(await hasText(cdp, ["어떤 문제가 있나요?", "문제가 되는 표현", "의견 보내기"]))) {
      await nativeClickText(cdp, "번역 의견");
    }
    await waitForAnyText(cdp, [
      ["번역 의견", "어떤 문제가 있나요?", "문제가 되는 표현", "의견 보내기"],
      ["번역 의견은 로그인 후 보낼 수 있습니다."],
      ["승인된 한국어 번역이 없습니다."],
      ["인용 구절 저장"],
    ], "Translation feedback modal or auth-gated feedback state");
    return;
  }

  if (state === "quickMove") {
    await openQuickMove(cdp);
    await waitForText(cdp, ["빠른 이동", "이어 읽기", "검색"], "Quick move command palette");
    return;
  }

  if (state === "progress") {
    await runQuickMoveCommand(cdp, "통독 진척도", ["전체", "구약", "신약"], "Progress state");
    return;
  }

  if (state === "highlights") {
    await runQuickMoveCommand(cdp, "강조 구절", ["강조", "성경 권"], "Highlights state");
    return;
  }

  if (state === "favorites") {
    await evaluate(cdp, clickBottomNavItem, "인용");
    await sleep(350);
    if (!(await hasText(cdp, ["인용 구절 보관함", "최근 저장순"]))) {
      await tapViewport(cdp, 195, 812);
    }
    await waitForText(cdp, ["인용 구절 보관함", "최근 저장순"], "Favorites state");
    return;
  }

  if (state === "search") {
    await openQuickMove(cdp);
    await evaluate(cdp, fillCommandInput, "검색");
    await sleep(400);
    if (!(await evaluate(cdp, clickCommandItem, "KJV 본문 검색"))) {
      await tapViewport(cdp, 195, 306);
    }
    await waitForText(cdp, ["성경 권", "전체 성경"], "Search state");
    return;
  }

  if (state === "searchResults") {
    await prepareState(cdp, "search");
    await evaluate(cdp, fillSearchInput, "하나님");
    await waitForText(cdp, ["개 결과"], "Search results state");
    return;
  }

  if (state === "searchEnglishResults") {
    await prepareState(cdp, "search");
    await selectSearchLanguage(cdp, "en", "KJV 영어");
    await evaluate(cdp, fillSearchInput, "beginning");
    await waitForText(cdp, ["개 결과", "In the beginning"], "English search results state");
    return;
  }

  if (state === "settings") {
    await evaluate(cdp, clickBottomNavItem, "설정");
    await sleep(350);
    if (!(await hasText(cdp, ["설정", "계정 설정"]))) {
      await tapViewport(cdp, 345, 812);
    }
    await waitForText(cdp, ["설정", "계정 설정"], "Settings state");
    return;
  }

  if (state === "settingsTts") {
    await prepareState(cdp, "settings");
    await evaluate(cdp, activateVisibleControl, "TTS");
    await waitForText(cdp, ["TTS 설정", "속도", "음성"], "Settings TTS state");
    return;
  }

  if (state === "settingsText") {
    await prepareState(cdp, "settings");
    await evaluate(cdp, activateVisibleControl, "텍스트");
    await waitForText(cdp, ["텍스트 설정", "글자 크기", "줄 간격"], "Settings text state");
    return;
  }

  if (state === "settingsView") {
    await prepareState(cdp, "settings");
    await evaluate(cdp, activateVisibleControl, "보기 모드");
    await waitForText(cdp, ["보기 모드", "읽기 모드"], "Settings view state");
    return;
  }

  throw new Error(`Unsupported capture state: ${state}`);
}

async function capture(cdp, filePath) {
  const result = await cdp.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  await writeFile(filePath, result.data, "base64");
}

async function collectLayoutProbe(cdp) {
  return evaluate(cdp, () => {
    function visible(el) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0
        && r.height > 0
        && r.bottom > 0
        && r.right > 0
        && r.top < window.innerHeight
        && r.left < window.innerWidth
        && s.display !== "none"
        && s.visibility !== "hidden";
    }

    function textOf(el) {
      return (el.innerText || el.textContent || el.value || el.getAttribute?.("placeholder") || "").trim().replace(/\s+/g, " ");
    }

    function boxOf(el) {
      if (!el) {
        return null;
      }
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        borderColor: s.borderColor,
        borderRadius: s.borderRadius,
        borderWidth: s.borderWidth,
        bottom: Math.round(r.bottom),
        color: s.color,
        display: s.display,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        height: Math.round(r.height),
        left: Math.round(r.left),
        lineHeight: s.lineHeight,
        padding: `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`,
        right: Math.round(r.right),
        tag: el.tagName,
        text: textOf(el).slice(0, 120),
        top: Math.round(r.top),
        width: Math.round(r.width),
      };
    }

    function candidateByClass(selector) {
      return [...document.querySelectorAll(selector)].find(visible) ?? null;
    }

    function candidatesContaining(...labels) {
      return [...document.querySelectorAll("section, form, div, label, button, input, textarea, [role='button']")]
        .filter((el) => visible(el) && labels.every((label) => textOf(el).includes(label)))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { area: r.width * r.height, el };
        })
        .sort((a, b) => a.area - b.area);
    }

    function candidateContaining(...labels) {
      return candidatesContaining(...labels)[0]?.el ?? null;
    }

    function inputByPlaceholder(part) {
      return [...document.querySelectorAll("input, textarea")]
        .find((el) => visible(el) && ((el.getAttribute("placeholder") || "").includes(part) || String(el.value || "").includes(part))) ?? null;
    }

    const sheet = candidateByClass(".favorite-modal") ?? candidateContaining("인용 제목", "저장할 목록", "목록 생성");
    const heading = candidateByClass(".modal-heading") ?? candidateContaining("인용 구절", "창세기");
    const versePreview = candidateByClass(".modal-verse") ?? candidateContaining("In the beginning");
    const formGrid = candidateByClass(".favorite-modal-grid") ?? candidateContaining("인용 제목", "태그", "인용 메모");
    const listSection = candidateByClass(".modal-section") ?? candidateContaining("저장할 목록", "기본 목록");
    const checkGrid = candidateByClass(".favorite-check-grid") ?? candidateContaining("기본 목록", "0");
    const listRow = candidateByClass(".check-row") ?? candidateContaining("기본 목록");
    const newListRow = candidateByClass(".new-list-row") ?? candidateContaining("새 목록 이름", "목록 생성");
    const actions = candidateByClass(".modal-actions") ?? candidateContaining("취소", "저장");

    const titleInput = inputByPlaceholder("구원 설명");
    const tagInput = inputByPlaceholder("구원");
    const memoInput = inputByPlaceholder("어디에");
    const newListInput = inputByPlaceholder("새 목록");
    const createButton = candidateContaining("목록 생성");
    const cancelButton = candidateContaining("취소");
    const saveButton = candidateContaining("저장");
    const readerPanel = candidateByClass(".reader-panel") ?? candidateContaining("창세기 1장", "읽음 완료", "In the beginning");
    const readerToolbar = candidateByClass(".reader-toolbar") ?? candidateContaining("창세기 1장", "현재 위치");
    const readerActions = candidateByClass(".reader-actions") ?? candidateContaining("읽음 완료", "EN", "KR");
    const verseList = candidateByClass(".verse-list") ?? candidateContaining("In the beginning", "And the earth was without");
    const firstVerse = candidateByClass(".verse-row") ?? candidateContaining("In the beginning");
    const secondVerse = [...document.querySelectorAll(".verse-row")].filter(visible)[1] ?? candidateContaining("And the earth was without");

    const boxes = {
      actions: boxOf(actions),
      cancelButton: boxOf(cancelButton),
      checkGrid: boxOf(checkGrid),
      createButton: boxOf(createButton),
      formGrid: boxOf(formGrid),
      heading: boxOf(heading),
      listRow: boxOf(listRow),
      listSection: boxOf(listSection),
      memoInput: boxOf(memoInput),
      newListInput: boxOf(newListInput),
      newListRow: boxOf(newListRow),
      saveButton: boxOf(saveButton),
      sheet: boxOf(sheet),
      tagInput: boxOf(tagInput),
      titleInput: boxOf(titleInput),
      versePreview: boxOf(versePreview),
      readerActions: boxOf(readerActions),
      readerPanel: boxOf(readerPanel),
      readerToolbar: boxOf(readerToolbar),
      verseList: boxOf(verseList),
      firstVerse: boxOf(firstVerse),
      secondVerse: boxOf(secondVerse),
    };

    function verticalGap(upper, lower) {
      return upper && lower ? lower.top - upper.bottom : null;
    }

    return {
      boxes,
      gaps: {
        actionsToSave: verticalGap(boxes.actions, boxes.saveButton),
        headingToPreview: verticalGap(boxes.heading, boxes.versePreview),
        listRowToNewList: verticalGap(boxes.listRow, boxes.newListRow),
        memoToListSection: verticalGap(boxes.memoInput, boxes.listSection),
        previewToTitleInput: verticalGap(boxes.versePreview, boxes.titleInput),
        sheetBottomToActions: boxes.sheet && boxes.actions ? boxes.sheet.bottom - boxes.actions.bottom : null,
        sheetTopToHeading: boxes.sheet && boxes.heading ? boxes.heading.top - boxes.sheet.top : null,
        tagToMemo: verticalGap(boxes.tagInput, boxes.memoInput),
        titleToTag: verticalGap(boxes.titleInput, boxes.tagInput),
        readerPanelToToolbar: boxes.readerPanel && boxes.readerToolbar ? boxes.readerToolbar.top - boxes.readerPanel.top : null,
        readerToolbarToActions: verticalGap(boxes.readerToolbar, boxes.readerActions),
        readerActionsToVerseList: verticalGap(boxes.readerActions, boxes.verseList),
        readerActionsToFirstVerse: verticalGap(boxes.readerActions, boxes.firstVerse),
        firstVerseToSecondVerse: verticalGap(boxes.firstVerse, boxes.secondVerse),
      },
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    };
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chrome = resolveChromeBinary();
  const outDir = resolve(String(options.outDir));
  const states = String(options.states).split(",").map((state) => state.trim()).filter(Boolean);
  const userDataDir = await mkdtemp(join(tmpdir(), "kjv-mobile-visuals-"));
  await mkdir(outDir, { recursive: true });

  const child = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--disable-gpu-watchdog",
    "--hide-scrollbars",
    "--in-process-gpu",
    "--no-sandbox",
    "--no-first-run",
    `--remote-debugging-port=${options.port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${options.width},${options.height}`,
    "about:blank",
  ], {
    stdio: process.env.CAPTURE_DEBUG === "1" ? ["ignore", "pipe", "pipe"] : "ignore",
    windowsHide: true,
  });
  if (process.env.CAPTURE_DEBUG === "1") {
    child.stdout?.on("data", (chunk) => process.stderr.write(chunk));
    child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  }

  const sessions = [];
  const report = [];
  try {
    await waitForJsonVersion(options.port);
    const viewport = { height: options.height, width: options.width };
    const web = await openPage(options.port, options.webUrl, viewport);
    const mobile = await openPage(options.port, options.mobileUrl, viewport);
    sessions.push(web, mobile);

    for (const state of states) {
      await Promise.all([
        resetPage(web, options.webUrl, `${state}-web-${Date.now()}`),
        resetPage(mobile, options.mobileUrl, `${state}-mobile-${Date.now()}`),
      ]);
      await prepareState(web, state, "web");
      await prepareState(mobile, state, "mobile");
      const webPath = resolve(outDir, `${state}-web.png`);
      const mobilePath = resolve(outDir, `${state}-mobile.png`);
      await Promise.all([capture(web, webPath), capture(mobile, mobilePath)]);
      const item = { mobile: mobilePath, state, web: webPath };
      if (String(options.probeBoxes) === "true") {
        item.probes = {
          mobile: await collectLayoutProbe(mobile),
          web: await collectLayoutProbe(web),
        };
      }
      report.push(item);
    }

    console.log(JSON.stringify({ captures: report, options }, null, 2));
  } finally {
    await Promise.allSettled(sessions.map((session) => session.close()));
    child.kill();
    try {
      await rm(userDataDir, { force: true, recursive: true });
    } catch {
      // Chrome can keep disposable Crashpad files locked briefly on Windows.
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
