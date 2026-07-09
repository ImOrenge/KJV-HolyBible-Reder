import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const defaults = {
  height: 844,
  mobileUrl: "http://localhost:8082",
  port: 9340,
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
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", rejectReady, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (!payload.id || !this.pending.has(payload.id)) {
        return;
      }
      const { reject, resolve } = this.pending.get(payload.id);
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
      this.pending.set(id, { reject, resolve });
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
    throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
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
  await waitForApp(cdp);
  return cdp;
}

async function waitForApp(cdp) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const bodyText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " ")).catch(() => "");
    if (bodyText.includes("KJV 리더노트") || bodyText.includes("KJV Reader")) {
      return;
    }
    await sleep(250);
  }
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

  const controls = [];
  for (const textNode of [...document.querySelectorAll("button, [role='button'], a, [tabindex], div, span")]) {
    if (!visible(textNode) || !normalizedText(textNode).includes(label)) {
      continue;
    }

    let node = textNode;
    for (let depth = 0; node && node !== document.body && depth < 6; depth += 1) {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      const borderRadius = Number.parseFloat(s.borderRadius) || 0;
      const isNativeControl = ["BUTTON", "A"].includes(node.tagName) || node.getAttribute("role") === "button" || node.hasAttribute("tabindex");
      const isStyledControl = r.height >= 36 && r.width >= 40 && borderRadius >= 5;
      if (visible(node) && normalizedText(node).includes(label) && (isNativeControl || isStyledControl)) {
        controls.push({ area: r.width * r.height, rect: r });
        break;
      }
      node = node.parentElement;
    }
  }

  const match = controls.sort((a, b) => a.area - b.area)[0];

  if (!match) {
    return null;
  }

  return {
    x: Math.round(match.rect.left + match.rect.width / 2),
    y: Math.round(match.rect.top + match.rect.height / 2),
  };
}

function dispatchClickText(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
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

  const rawTarget = candidates.sort((a, b) => a.area - b.area)[0]?.el;
  const target = rawTarget?.closest?.("button, [role='button'], a, [tabindex]") || rawTarget;
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

async function clickText(cdp, label) {
  return evaluate(cdp, dispatchClickText, label);
}

async function waitForText(cdp, labels, timeout = 10_000) {
  const expected = Array.isArray(labels) ? labels : [labels];
  const deadline = Date.now() + timeout;
  let lastText = "";
  while (Date.now() < deadline) {
    lastText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " "));
    if (expected.every((label) => lastText.includes(label))) {
      return lastText;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for text: ${expected.join(", ")}. Last body: ${lastText.slice(0, 500)}`);
}

async function ensureGuestReader(cdp) {
  const clicked = await clickText(cdp, "비회원 리더 로그인").catch(() => false);
  if (clicked) {
    await waitForText(cdp, "오늘 통독 플랜", 10_000);
  }
}

function collectReaderMetrics() {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  function rect(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      borderRadius: Number.parseFloat(s.borderRadius) || 0,
      height: Math.round(r.height),
      padding: s.padding,
      text: normalizedText(el).slice(0, 120),
      width: Math.round(r.width),
      x: Math.round(r.x),
      y: Math.round(r.y),
    };
  }

  function controlRectForText(label) {
    const controls = [];
    for (const textNode of [...document.querySelectorAll("button, [role='button'], div, span")]) {
      if (!visible(textNode) || !normalizedText(textNode).includes(label)) {
        continue;
      }

      let node = textNode;
      for (let depth = 0; node && node !== document.body && depth < 6; depth += 1) {
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        const borderRadius = Number.parseFloat(s.borderRadius) || 0;
        const value = normalizedText(node);
        if (
          visible(node) &&
          value.includes(label) &&
          r.height >= 38 &&
          r.height <= 74 &&
          r.width >= 44 &&
          r.width <= 380 &&
          borderRadius >= 5
        ) {
          controls.push(rect(node));
          break;
        }
        node = node.parentElement;
      }
    }

    return controls.sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
  }

  const actionLabels = ["읽음 완료", "읽음 취소", "EN", "KR", "읽기", "다중 선택", "장 노트"];
  const actionButtons = actionLabels.map((label) => controlRectForText(label)).filter(Boolean);

  const chapterButtons = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const value = normalizedText(el);
      const r = el.getBoundingClientRect();
      return visible(el) && /^\d{1,3}$/.test(value) && r.width >= 30 && r.width <= 80 && r.height >= 30 && r.height <= 60;
    })
    .map(rect)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 8);

  const verseRows = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const value = normalizedText(el);
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        visible(el) &&
        r.width >= 300 &&
        r.height >= 44 &&
        r.height <= 180 &&
        Number.parseFloat(s.borderRadius) >= 5 &&
        (value.includes("In the beginning") || value.includes("태초"))
      );
    })
    .map(rect)
    .sort((a, b) => a.y - b.y)
    .slice(0, 3);

  const selectionSheet = [...document.querySelectorAll("section, div")]
    .filter((el) => {
      const value = normalizedText(el);
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return visible(el) && r.width >= 320 && r.height <= 280 && Number.parseFloat(s.borderRadius) >= 5 && value.includes("선택") && r.y > window.innerHeight - 340;
    })
    .map(rect)
    .sort((a, b) => b.y - a.y)[0] ?? null;

  return {
    actionButtons,
    bodyText: normalizedText(document.body).slice(0, 1000),
    chapterButtons,
    selectionSheet,
    verseRows,
  };
}

function findFirstVerseCenter() {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const match = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ");
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        visible(el) &&
        r.width >= 300 &&
        r.height >= 44 &&
        r.height <= 180 &&
        Number.parseFloat(s.borderRadius) >= 5 &&
        (value.includes("In the beginning") || value.includes("태초"))
      );
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, rect: r };
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.area - b.area)[0];

  if (!match) {
    return null;
  }

  return {
    x: Math.round(match.rect.left + Math.min(72, match.rect.width / 2)),
    y: Math.round(match.rect.top + match.rect.height / 2),
  };
}

function dispatchClickFirstVerse() {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const match = [...document.querySelectorAll("button, [role='button'], div")]
    .filter((el) => {
      const value = (el.innerText || el.textContent || "").replace(/\s+/g, " ");
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        visible(el) &&
        r.width >= 300 &&
        r.height >= 44 &&
        r.height <= 180 &&
        Number.parseFloat(s.borderRadius) >= 5 &&
        (value.includes("In the beginning") || value.includes("태초"))
      );
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { area: r.width * r.height, el, y: r.y };
    })
    .sort((a, b) => a.y - b.y || a.area - b.area)[0];

  if (!match) {
    return false;
  }

  const target = match.el.closest?.("button, [role='button'], a, [tabindex]") || match.el;
  const r = target.getBoundingClientRect();
  const x = r.left + Math.min(72, r.width / 2);
  const y = r.top + r.height / 2;
  const pointerEvent = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  target.focus?.();
  target.dispatchEvent(new pointerEvent("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.dispatchEvent(new pointerEvent("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 1, pointerType: "mouse", view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
  target.click?.();
  return true;
}

function findExactTextCenter(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const match = [...document.querySelectorAll("button, [role='button'], div, span")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return visible(el) && normalizedText(el) === label && r.height >= 16 && r.height <= 70;
    })
    .map((el) => {
      let node = el;
      for (let depth = 0; node && node !== document.body && depth < 5; depth += 1) {
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        if (visible(node) && normalizedText(node) === label && r.height >= 38 && Number.parseFloat(s.borderRadius) >= 5) {
          return { area: r.width * r.height, rect: r };
        }
        node = node.parentElement;
      }
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

async function clickExactText(cdp, label) {
  const center = await evaluate(cdp, findExactTextCenter, label);
  if (!center) {
    return false;
  }
  await cdp.send("Page.bringToFront").catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x: center.x, y: center.y });
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 0, clickCount: 1, type: "mouseReleased", x: center.x, y: center.y });
  return true;
}

function findBottomNavTextCenter(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  const match = [...document.querySelectorAll("button, [role='button'], div, span")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return visible(el) && r.y > window.innerHeight - 94 && normalizedText(el).includes(label);
    })
    .map((el) => {
      let node = el;
      for (let depth = 0; node && node !== document.body && depth < 5; depth += 1) {
        const r = node.getBoundingClientRect();
        if (visible(node) && r.y > window.innerHeight - 94 && r.height >= 38 && r.width >= 40 && normalizedText(node).includes(label)) {
          return { area: r.width * r.height, rect: r };
        }
        node = node.parentElement;
      }
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

async function clickBottomNavText(cdp, label) {
  const center = await evaluate(cdp, findBottomNavTextCenter, label);
  if (!center) {
    return false;
  }
  await cdp.send("Page.bringToFront").catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x: center.x, y: center.y });
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 0, clickCount: 1, type: "mouseReleased", x: center.x, y: center.y });
  return true;
}

async function clickFirstVerse(cdp) {
  return evaluate(cdp, dispatchClickFirstVerse);
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

function verifyReaderLayout(name, metrics, threshold) {
  const failures = [];
  const bodyText = metrics.bodyText ?? "";
  for (const label of ["EN", "KR", "읽기", "장 노트"]) {
    if (!bodyText.includes(label)) {
      failures.push(`${name}.label.${label}: missing`);
    }
  }
  if (!bodyText.includes("읽음 완료") && !bodyText.includes("읽음 취소")) {
    failures.push(`${name}.label.readComplete: missing`);
  }
  if (!bodyText.includes("다중 선택") && !bodyText.includes("0개 선택") && !bodyText.includes("1개 선택")) {
    failures.push(`${name}.label.multiSelect: missing`);
  }

  const usableActions = (metrics.actionButtons ?? []).filter((item) => item.text !== "읽음 취소");
  if (usableActions.length < 5) {
    failures.push(`${name}.actionButtons: expected at least 5, got ${usableActions.length}`);
  }
  for (const [index, action] of usableActions.slice(0, 6).entries()) {
    assertMetric(`${name}.actionButtons[${index}].height`, action.height, 44, threshold, failures);
    assertMetric(`${name}.actionButtons[${index}].radius`, action.borderRadius, 6, 2, failures);
  }

  const firstRowActions = usableActions.slice(0, 3);
  if (firstRowActions.length === 3) {
    const widths = firstRowActions.map((item) => item.width);
    if (Math.max(...widths) - Math.min(...widths) > 28) {
      failures.push(`${name}.actionButtons.rowWidth: expected balanced first row widths, got ${widths.join("/")}`);
    }
  }

  const firstVerse = metrics.verseRows?.[0];
  if (!firstVerse) {
    failures.push(`${name}.verseRows: missing Genesis 1:1 row`);
  } else {
    assertMetric(`${name}.verseRows[0].radius`, firstVerse.borderRadius, 8, 2, failures);
    if (!firstVerse.padding.includes("10px")) {
      failures.push(`${name}.verseRows[0].padding: expected 10px, got ${firstVerse.padding}`);
    }
  }

  return failures;
}

async function openReader(cdp) {
  if (!(await clickBottomNavText(cdp, "성경"))) {
    await clickText(cdp, "성경");
  }
  await waitForText(cdp, ["창세기", "EN", "KR"], 15_000);
  await waitForText(cdp, "In the beginning", 15_000);
}

async function verifyChapterPickerFlow(cdp, name, threshold) {
  const failures = [];
  if (!(await clickText(cdp, "창세기 1장"))) {
    failures.push(`${name}.chapterPicker.open: title button missing`);
    return failures;
  }
  await sleep(500);
  await waitForText(cdp, "성경 이동", 5_000).catch((error) => {
    failures.push(`${name}.chapterPicker.sheet: ${error.message}`);
  });

  const metrics = await evaluate(cdp, collectReaderMetrics);
  if ((metrics.chapterButtons ?? []).length < 6) {
    failures.push(`${name}.chapterPicker.buttons: expected chapter picker buttons, got ${(metrics.chapterButtons ?? []).length}`);
  }
  for (const [index, chapter] of (metrics.chapterButtons ?? []).slice(0, 6).entries()) {
    assertMetric(`${name}.chapterPicker.buttons[${index}].height`, chapter.height, 44, threshold, failures);
    assertMetric(`${name}.chapterPicker.buttons[${index}].radius`, chapter.borderRadius, 6, 2, failures);
  }

  if (!(await clickExactText(cdp, "1"))) {
    failures.push(`${name}.chapterPicker.close: could not click chapter 1`);
  }
  await sleep(600);
  return failures;
}

async function verifySelectionFlow(cdp, name) {
  const failures = [];
  if (!(await clickText(cdp, "다중 선택"))) {
    failures.push(`${name}.selection.open: button missing`);
    return failures;
  }
  await sleep(500);
  let text = await waitForText(cdp, "선택", 5_000).catch((error) => {
    failures.push(`${name}.selection.emptySheet: ${error.message}`);
    return "";
  });

  if (!text.includes("첫 절을 선택하세요") && !text.includes("0개 선택")) {
    failures.push(`${name}.selection.emptyCopy: expected empty selection guidance`);
  }

  if (!(await clickFirstVerse(cdp))) {
    failures.push(`${name}.selection.firstVerse: missing first verse click target`);
    return failures;
  }
  await sleep(600);
  text = await waitForText(cdp, "1개 선택", 5_000).catch((error) => {
    failures.push(`${name}.selection.count: ${error.message}`);
    return "";
  });
  if (!text.includes("복사") || !text.includes("인용 저장") || !text.includes("읽기") || !text.includes("선택 해제")) {
    failures.push(`${name}.selection.actions: missing expected sheet actions`);
  }

  const metrics = await evaluate(cdp, collectReaderMetrics);
  if (!metrics.selectionSheet) {
    failures.push(`${name}.selection.sheetMetric: missing fixed bottom sheet`);
  } else {
    assertMetric(`${name}.selection.sheetRadius`, metrics.selectionSheet.borderRadius, 8, 2, failures);
    if (metrics.selectionSheet.y < 500) {
      failures.push(`${name}.selection.sheetY: expected bottom sheet near viewport bottom, got y=${metrics.selectionSheet.y}`);
    }
  }

  await clickText(cdp, "선택 해제");
  await sleep(300);
  return failures;
}

async function verifyReader(cdp, name, threshold) {
  await openReader(cdp);
  const metrics = await evaluate(cdp, collectReaderMetrics);
  const layoutFailures = verifyReaderLayout(name, metrics, threshold);
  const chapterPickerFailures = await verifyChapterPickerFlow(cdp, name, threshold);
  const selectionFailures = await verifySelectionFlow(cdp, name);
  return { chapterPickerFailures, layoutFailures, metrics, name, selectionFailures };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chrome = resolveChromeBinary();
  const outputDir = resolve(".tmp/mobile-reader-parity");
  const userDataDir = await mkdtemp(join(tmpdir(), "kjv-reader-parity-"));
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

    const [webResult, mobileResult] = await Promise.all([
      verifyReader(web, "web", options.threshold),
      verifyReader(mobile, "mobile", options.threshold),
    ]);

    const report = {
      mobile: mobileResult,
      options,
      passed:
        webResult.chapterPickerFailures.length === 0 &&
        webResult.layoutFailures.length === 0 &&
        webResult.selectionFailures.length === 0 &&
        mobileResult.chapterPickerFailures.length === 0 &&
        mobileResult.layoutFailures.length === 0 &&
        mobileResult.selectionFailures.length === 0,
      web: webResult,
    };

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
      // Chrome can keep disposable Crashpad files locked briefly on Windows.
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
