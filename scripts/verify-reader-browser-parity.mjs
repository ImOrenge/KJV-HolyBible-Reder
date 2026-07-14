import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
    this.events = [];
    this.socket = new WebSocket(webSocketUrl);
    this.ready = new Promise((resolveReady, rejectReady) => {
      const timeout = setTimeout(() => rejectReady(new Error("Chrome DevTools WebSocket connection timed out.")), 10_000);
      this.socket.addEventListener("open", () => {
        clearTimeout(timeout);
        resolveReady();
      }, { once: true });
      this.socket.addEventListener("error", (error) => {
        clearTimeout(timeout);
        rejectReady(error);
      }, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (!payload.id || !this.pending.has(payload.id)) {
        if (payload.method) {
          this.events.push(payload);
        }
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
  await cdp.send("Network.enable");
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
  const deadline = Date.now() + 35_000;
  let lastBodyText = "";
  while (Date.now() < deadline) {
    lastBodyText = await evaluate(cdp, () => (document.body.innerText || document.body.textContent || "").replace(/\s+/g, " ")).catch(() => "");
    if (lastBodyText.includes("KJV 리더노트") || lastBodyText.includes("KJV Reader")) {
      return;
    }
    await sleep(250);
  }
  const exceptions = cdp.events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description ?? event.params?.exceptionDetails?.text)
    .filter(Boolean)
    .slice(-5);
  const consoleErrors = cdp.events
    .filter((event) => event.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(event.params?.type))
    .map((event) => event.params?.args?.map((arg) => arg.value ?? arg.description).filter(Boolean).join(" "))
    .filter(Boolean)
    .slice(-5);
  const failures = cdp.events
    .filter((event) => event.method === "Network.loadingFailed")
    .map((event) => event.params?.errorText)
    .filter(Boolean)
    .slice(-5);
  throw new Error(`Rendered app text did not appear before timeout. Body: ${lastBodyText.slice(0, 300)} Exceptions: ${JSON.stringify(exceptions)} Console: ${JSON.stringify(consoleErrors)} Network: ${JSON.stringify(failures)}`);
}

function findTextCenter(label) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function normalizedText(el) {
    return `${el.getAttribute?.("aria-label") ?? ""} ${el.innerText || el.textContent || ""}`.trim().replace(/\s+/g, " ");
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
    return `${el.getAttribute?.("aria-label") ?? ""} ${el.innerText || el.textContent || ""}`.trim().replace(/\s+/g, " ");
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
  const requests = cdp.events
    .filter((event) => event.method === "Network.requestWillBeSent")
    .map((event) => event.params?.request?.url)
    .filter((url) => typeof url === "string" && url.includes("/api/"))
    .slice(-5);
  const failures = cdp.events
    .filter((event) => event.method === "Network.loadingFailed")
    .map((event) => ({ error: event.params?.errorText, requestId: event.params?.requestId }))
    .slice(-5);
  throw new Error(`Timed out waiting for text: ${expected.join(", ")}. Requests: ${JSON.stringify(requests)}. Failures: ${JSON.stringify(failures)}. Last body: ${lastText.slice(0, 500)}`);
}

async function waitForAccessibilityLabel(cdp, label, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = await evaluate(cdp, (targetLabel) =>
      [...document.querySelectorAll("[aria-label]")].some(
        (element) => element.getAttribute("aria-label") === targetLabel,
      ), label).catch(() => false);
    if (found) return true;
    await sleep(200);
  }
  return false;
}

async function ensureGuestReader(cdp) {
  const clicked = await clickExactText(cdp, "비회원 리더 로그인").catch(() => false)
    || await clickText(cdp, "비회원 리더 로그인").catch(() => false);
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
    return `${el.getAttribute?.("aria-label") ?? ""} ${el.innerText || el.textContent || ""}`.trim().replace(/\s+/g, " ");
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
          r.width >= 40 &&
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
      const value = (el.innerText || el.textContent || "").trim();
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

  const labeledSelectionSheet = document.querySelector('[aria-label="선택 구절 작업"]');
  const selectionSheet = labeledSelectionSheet && visible(labeledSelectionSheet)
    ? rect(labeledSelectionSheet)
    : [...document.querySelectorAll("section, div")]
    .filter((el) => {
      const value = normalizedText(el);
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return visible(el) && r.width >= 320 && r.height <= 380 && Number.parseFloat(s.borderRadius) >= 5 && value.includes("선택") && r.y > window.innerHeight - 420;
    })
    .map(rect)
    .sort((a, b) => b.y - a.y)[0] ?? null;

  return {
    actionButtons,
    accessibilityLabels: [...document.querySelectorAll("[aria-label]")].filter(visible).map((el) => el.getAttribute("aria-label")),
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

function findAccessibilityCenter(label) {
  const target = [...document.querySelectorAll("[aria-label]")].find((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      el.getAttribute("aria-label") === label &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
  if (!target) {
    return null;
  }
  const rect = target.getBoundingClientRect();
  return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
}

async function clickAccessibilityLabel(cdp, label) {
  const center = await evaluate(cdp, findAccessibilityCenter, label);
  if (!center) {
    return false;
  }
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x: center.x, y: center.y });
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 0, clickCount: 1, type: "mouseReleased", x: center.x, y: center.y });
  return true;
}

async function clickFirstAccessibilityLabelPrefix(cdp, prefix) {
  const center = await evaluate(cdp, (targetPrefix) => {
    const target = [...document.querySelectorAll("[aria-label]")].find((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return element.getAttribute("aria-label")?.startsWith(targetPrefix)
        && rect.width > 0
        && rect.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden";
    });
    if (!target) return null;
    target.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = target.getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  }, prefix);
  if (!center) return false;
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 1, clickCount: 1, type: "mousePressed", x: center.x, y: center.y });
  await cdp.send("Input.dispatchMouseEvent", { button: "left", buttons: 0, clickCount: 1, type: "mouseReleased", x: center.x, y: center.y });
  return true;
}

async function waitForAccessibilityInputValue(cdp, label, expectedFragment, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await evaluate(cdp, ({ expectedLabel }) => {
      const input = document.querySelector(`[aria-label="${expectedLabel}"]`);
      return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input.value : null;
    }, { expectedLabel: label }).catch(() => null);
    if (typeof value === "string" && value.includes(expectedFragment)) return value;
    await sleep(200);
  }
  return null;
}

async function scrollAccessibilityLabelIntoView(cdp, label) {
  return evaluate(cdp, (targetLabel) => {
    const target = [...document.querySelectorAll("[aria-label]")].find(
      (element) => element.getAttribute("aria-label") === targetLabel,
    );
    if (!target) return false;
    target.scrollIntoView({ block: "center", inline: "nearest" });
    return true;
  }, label);
}

async function clickFirstVerse(cdp) {
  return evaluate(cdp, dispatchClickFirstVerse);
}

async function captureScreenshot(cdp, filePath) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(filePath, Buffer.from(result.data, "base64"));
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
  const bodyText = `${metrics.bodyText ?? ""} ${(metrics.accessibilityLabels ?? []).join(" ")}`;
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

  const firstVerse = metrics.verseRows?.[0];
  if (!firstVerse) {
    failures.push(`${name}.verseRows: missing Genesis 1:1 row`);
  } else {
    assertMetric(`${name}.verseRows[0].radius`, firstVerse.borderRadius, 6, 2, failures);
    if (!firstVerse.padding.includes("11px") || !firstVerse.padding.includes("8px")) {
      failures.push(`${name}.verseRows[0].padding: expected compact V2 padding, got ${firstVerse.padding}`);
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
  if (!(await clickAccessibilityLabel(cdp, "장 선택 열기"))) {
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

  if (!(await clickAccessibilityLabel(cdp, "1장으로 이동"))) {
    failures.push(`${name}.chapterPicker.close: could not click chapter 1`);
  }
  await sleep(600);
  const pickerStillOpen = await evaluate(cdp, () => (document.body.innerText || "").includes("성경 이동"));
  if (pickerStillOpen) {
    failures.push(`${name}.chapterPicker.close: sheet remained open after chapter selection`);
  }
  return failures;
}

async function verifyChapterNavigationFlow(cdp, name) {
  const failures = [];
  if (!(await clickAccessibilityLabel(cdp, "다음 장"))) {
    failures.push(`${name}.chapterNavigation.next: button missing`);
    return failures;
  }
  await waitForText(cdp, "창세기 2장", 8_000).catch((error) => {
    failures.push(`${name}.chapterNavigation.next: ${error.message}`);
  });
  await sleep(700);

  const firstVerseVisibility = await evaluate(cdp, () => {
    const target = document.querySelector('[aria-label="2장 1절"]');
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { bottom: rect.bottom, top: rect.top, viewportHeight: window.innerHeight };
  });
  if (firstVerseVisibility && (firstVerseVisibility.bottom <= 0 || firstVerseVisibility.top >= firstVerseVisibility.viewportHeight)) {
    failures.push(`${name}.chapterNavigation.focus: Genesis 2:1 is outside the viewport`);
  }

  if (!(await clickAccessibilityLabel(cdp, "이전 장"))) {
    failures.push(`${name}.chapterNavigation.previous: button missing`);
    return failures;
  }
  await waitForText(cdp, "창세기 1장", 8_000).catch((error) => {
    failures.push(`${name}.chapterNavigation.previous: ${error.message}`);
  });
  return failures;
}

async function verifyMobileStackFlow(cdp, name) {
  if (name !== "mobile") return [];
  const failures = [];
  await evaluate(cdp, () => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    for (const element of document.querySelectorAll("*")) {
      if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight) {
        element.scrollTop = 0;
      }
    }
  });
  await sleep(250);
  if (!(await clickAccessibilityLabel(cdp, "명령 검색"))) {
    failures.push(`${name}.stack.command: command button missing`);
    return failures;
  }
  await waitForText(cdp, "빠른 이동", 5_000).catch((error) => {
    failures.push(`${name}.stack.commandSheet: ${error.message}`);
  });
  if (!(await scrollAccessibilityLabelIntoView(cdp, "명령: 검색"))) {
    failures.push(`${name}.stack.searchPush: search command missing`);
    return failures;
  }
  await sleep(250);
  if (!(await clickAccessibilityLabel(cdp, "명령: 검색"))) {
    failures.push(`${name}.stack.searchPush: search command missing`);
    return failures;
  }
  await waitForText(cdp, ["본문 검색", "키워드"], 5_000).catch((error) => {
    failures.push(`${name}.stack.searchScreen: ${error.message}`);
  });
  await evaluate(cdp, () => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    for (const element of document.querySelectorAll("*")) {
      if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight) {
        element.scrollTop = 0;
      }
    }
  });
  await sleep(250);
  if (!(await clickAccessibilityLabel(cdp, "이전 화면"))) {
    const backButtonDebug = await evaluate(cdp, () =>
      [...document.querySelectorAll('[aria-label="이전 화면"]')].map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          display: style.display,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          visibility: style.visibility,
          width: rect.width,
        };
      }),
    );
    failures.push(`${name}.stack.back: back button missing ${JSON.stringify(backButtonDebug)}`);
    return failures;
  }
  await waitForText(cdp, "창세기 1장", 8_000).catch((error) => {
    failures.push(`${name}.stack.readerRestore: ${error.message}`);
  });
  return failures;
}

async function verifyMobileNoteStackFlow(cdp, name) {
  if (name !== "mobile") return [];
  const failures = [];
  await evaluate(cdp, () => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    for (const element of document.querySelectorAll("*")) {
      if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight) element.scrollTop = 0;
    }
  });
  await sleep(250);

  if (!(await clickAccessibilityLabel(cdp, "명령 검색"))) {
    failures.push(`${name}.noteStack.command: command button missing`);
    return failures;
  }
  await waitForText(cdp, "빠른 이동", 5_000).catch((error) => {
    failures.push(`${name}.noteStack.commandSheet: ${error.message}`);
  });
  if (!(await scrollAccessibilityLabelIntoView(cdp, "명령: 성경노트"))) {
    failures.push(`${name}.noteStack.commandItem: notes command missing`);
    return failures;
  }
  await sleep(250);
  if (!(await clickAccessibilityLabel(cdp, "명령: 성경노트"))) {
    failures.push(`${name}.noteStack.listPush: notes command was not clickable`);
    return failures;
  }
  if (!(await waitForAccessibilityLabel(cdp, "노트 목록 화면"))) {
    failures.push(`${name}.noteStack.list: list screen missing`);
    return failures;
  }

  const listState = await evaluate(cdp, () => ({
    editor: document.querySelectorAll('[aria-label="노트 편집 화면"]').length,
    list: document.querySelectorAll('[aria-label="노트 목록 화면"]').length,
  }));
  if (listState.list !== 1 || listState.editor !== 0) {
    failures.push(`${name}.noteStack.listExclusive: ${JSON.stringify(listState)}`);
  }

  if (!(await clickAccessibilityLabel(cdp, "새 노트")) && !(await clickAccessibilityLabel(cdp, "첫 노트 만들기"))) {
    failures.push(`${name}.noteStack.create: create note button missing`);
    return failures;
  }
  if (!(await waitForAccessibilityLabel(cdp, "노트 편집 화면", 8_000))) {
    failures.push(`${name}.noteStack.editor: editor screen missing`);
    return failures;
  }

  const editorState = await evaluate(cdp, () => ({
    advancedToolbar: document.querySelectorAll('[aria-label="노트 고급 서식 도구"]').length,
    editor: document.querySelectorAll('[aria-label="노트 편집 화면"]').length,
    list: document.querySelectorAll('[aria-label="노트 목록 화면"]').length,
    pageOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    primaryToolbar: document.querySelectorAll('[aria-label="노트 기본 서식 도구"]').length,
  }));
  if (editorState.editor !== 1 || editorState.list !== 0 || editorState.primaryToolbar !== 1 || editorState.advancedToolbar !== 0 || editorState.pageOverflow > 1) {
    failures.push(`${name}.noteStack.editorExclusive: ${JSON.stringify(editorState)}`);
  }

  if (!(await clickAccessibilityLabel(cdp, "노트 서식 더보기"))) {
    failures.push(`${name}.noteStack.toolbarMore: compact toolbar more button missing`);
  } else if (!(await waitForAccessibilityLabel(cdp, "노트 고급 서식 도구"))) {
    failures.push(`${name}.noteStack.toolbarAdvanced: advanced toolbar did not open`);
  } else {
    const expandedToolbarState = await evaluate(cdp, () => {
      const advancedToolbar = document.querySelector('[aria-label="노트 고급 서식 도구"]');
      const primaryToolbar = document.querySelector('[aria-label="노트 기본 서식 도구"]');
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { height: Math.round(bounds.height), left: Math.round(bounds.left), right: Math.round(bounds.right), width: Math.round(bounds.width) };
      };
      return {
        advancedRect: rect(advancedToolbar),
        advancedToolbar: document.querySelectorAll('[aria-label="노트 고급 서식 도구"]').length,
        editor: document.querySelectorAll('[aria-label="노트 편집 화면"]').length,
        list: document.querySelectorAll('[aria-label="노트 목록 화면"]').length,
        pageOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        primaryRect: rect(primaryToolbar),
        primaryToolbar: document.querySelectorAll('[aria-label="노트 기본 서식 도구"]').length,
        viewportWidth: window.innerWidth,
      };
    });
    const toolbarRectsFit = [expandedToolbarState.primaryRect, expandedToolbarState.advancedRect].every((rect) =>
      Boolean(rect && rect.height >= 44 && rect.left >= -1 && rect.right <= expandedToolbarState.viewportWidth + 1),
    );
    if (expandedToolbarState.advancedToolbar !== 1 || expandedToolbarState.primaryToolbar !== 1 || expandedToolbarState.editor !== 1 || expandedToolbarState.list !== 0 || expandedToolbarState.pageOverflow > 1 || !toolbarRectsFit) {
      failures.push(`${name}.noteStack.toolbarExclusive: ${JSON.stringify(expandedToolbarState)}`);
    }
    if (!(await clickAccessibilityLabel(cdp, "노트 고급 서식 닫기"))) {
      failures.push(`${name}.noteStack.toolbarClose: advanced toolbar close button missing`);
    } else {
      await sleep(250);
      const advancedToolbarStillOpen = await evaluate(cdp, () => document.querySelectorAll('[aria-label="노트 고급 서식 도구"]').length);
      if (advancedToolbarStillOpen !== 0) failures.push(`${name}.noteStack.toolbarCloseState: advanced toolbar remained open`);
    }
  }

  let draftTitle = null;
  if (!(await clickAccessibilityLabel(cdp, "노트 제목"))) {
    failures.push(`${name}.noteStack.draftInput: note title input missing`);
  } else {
    await cdp.send("Input.insertText", { text: " 임시복구" });
    draftTitle = await waitForAccessibilityInputValue(cdp, "노트 제목", "임시복구", 3_000);
    if (!draftTitle) {
      failures.push(`${name}.noteStack.draftInputValue: note title did not change`);
    } else {
      if (!(await waitForAccessibilityLabel(cdp, "노트 저장 상태: 이 기기에 임시 저장됨", 5_000))) {
        failures.push(`${name}.noteStack.draftSaved: local draft saved status missing`);
      }
    }
  }

  if (!(await clickAccessibilityLabel(cdp, "노트 편집기 이전 화면"))) {
    failures.push(`${name}.noteStack.editorBack: editor back button missing`);
    return failures;
  }
  if (!(await waitForAccessibilityLabel(cdp, "노트 목록 화면"))) {
    failures.push(`${name}.noteStack.listRestore: list screen was not restored`);
    return failures;
  }
  if (draftTitle) {
    if (!(await clickFirstAccessibilityLabelPrefix(cdp, "노트 열기:"))) {
      failures.push(`${name}.noteStack.draftReopen: saved note row missing`);
      return failures;
    }
    if (!(await waitForAccessibilityLabel(cdp, "노트 편집 화면", 8_000))) {
      failures.push(`${name}.noteStack.draftEditor: editor did not reopen`);
      return failures;
    }
    const restoredTitle = await waitForAccessibilityInputValue(cdp, "노트 제목", "임시복구", 5_000);
    if (!restoredTitle || restoredTitle !== draftTitle) {
      failures.push(`${name}.noteStack.draftRestore: expected ${JSON.stringify(draftTitle)}, got ${JSON.stringify(restoredTitle)}`);
    }
    if (!(await waitForAccessibilityLabel(cdp, "노트 저장 상태: 이 기기의 임시 저장을 복구했습니다.", 5_000))) {
      failures.push(`${name}.noteStack.draftRestoreStatus: restored local draft status missing`);
    }
    if (!(await clickAccessibilityLabel(cdp, "노트 편집기 이전 화면"))) {
      failures.push(`${name}.noteStack.draftEditorBack: editor back button missing after draft restore`);
      return failures;
    }
    if (!(await waitForAccessibilityLabel(cdp, "노트 목록 화면"))) {
      failures.push(`${name}.noteStack.draftListRestore: list screen was not restored after draft check`);
      return failures;
    }
  }
  if (!(await clickAccessibilityLabel(cdp, "이전 화면"))) {
    failures.push(`${name}.noteStack.readerBack: list return button missing`);
    return failures;
  }
  await waitForText(cdp, "창세기 1장", 8_000).catch((error) => {
    failures.push(`${name}.noteStack.readerRestore: ${error.message}`);
  });
  return failures;
}

async function verifySelectionFlow(cdp, name) {
  const failures = [];
  if (!(await evaluate(cdp, dispatchFirstVersePointer, "down"))) {
    failures.push(`${name}.selection.longPress: verse target missing`);
    return failures;
  }
  await sleep(620);
  await evaluate(cdp, dispatchFirstVersePointer, "up");
  await sleep(600);
  const text = await waitForText(cdp, "1개 선택", 5_000).catch((error) => {
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

async function verifyV2ContextFlow(cdp, name) {
  const failures = [];
  if (!(await clickText(cdp, "동시"))) {
    failures.push(`${name}.parallel.button: missing`);
    return failures;
  }
  const parallelExpectations = await evaluate(cdp, () => (document.body.innerText || "").includes("Local fixture"))
    ? ["EN/KR", "In the beginning"]
    : ["태초에", "In the beginning"];
  await waitForText(cdp, parallelExpectations, 5_000).catch((error) => {
    failures.push(`${name}.parallel.content: ${error.message}`);
  });

  if (!(await clickFirstVerse(cdp))) {
    failures.push(`${name}.singleSheet.verse: missing`);
    return failures;
  }
  await sleep(500);
  const sheetText = await waitForText(cdp, ["구절 노트", "성경노트", "강조"], 5_000).catch((error) => {
    failures.push(`${name}.singleSheet.actions: ${error.message}`);
    return "";
  });
  if (!sheetText.includes("복사") || !sheetText.includes("인용 저장")) {
    failures.push(`${name}.singleSheet.actions: copy or citation action missing`);
  }
  await captureScreenshot(cdp, resolve(`.tmp/mobile-reader-parity/${name}-reader-v2.png`));

  const expanded = await evaluate(cdp, collectReaderMetrics);
  if (!expanded.selectionSheet) {
    failures.push(`${name}.singleSheet.metric: missing`);
  }
  if (!(await clickAccessibilityLabel(cdp, "선택 구절 작업 접기"))) {
    failures.push(`${name}.singleSheet.collapse: handle missing`);
  } else {
    await sleep(900);
    const compact = await evaluate(cdp, collectReaderMetrics);
    const compactStateExposed = compact.accessibilityLabels?.includes("선택 구절 작업 펼치기");
    const movedToCompactPosition = expanded.selectionSheet && compact.selectionSheet && compact.selectionSheet.y >= expanded.selectionSheet.y + 50;
    if (!compactStateExposed || !movedToCompactPosition) {
      if (!compactStateExposed) {
        failures.push(`${name}.singleSheet.snap: compact state was not exposed`);
      }
    }
  }
  await clickAccessibilityLabel(cdp, "선택 구절 작업 닫기");
  await sleep(350);
  return failures;
}

function dispatchFirstVersePointer(phase) {
  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  const target = [...document.querySelectorAll('[aria-label$="장 1절"], [aria-label="1장 1절"]')]
    .find((el) => visible(el));
  if (!target) {
    return false;
  }

  const rect = target.getBoundingClientRect();
  const x = rect.left + Math.min(72, rect.width / 2);
  const y = rect.top + rect.height / 2;
  const Pointer = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  if (phase === "down") {
    target.dispatchEvent(new Pointer("pointerdown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 7, pointerType: "touch", view: window }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0, buttons: 1, cancelable: true, clientX: x, clientY: y, view: window }));
  } else {
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, view: window }));
    target.dispatchEvent(new Pointer("pointerup", { bubbles: true, button: 0, buttons: 0, cancelable: true, clientX: x, clientY: y, isPrimary: true, pointerId: 7, pointerType: "touch", view: window }));
  }
  return true;
}

async function verifyReader(cdp, name, threshold) {
  await openReader(cdp);
  const metrics = await evaluate(cdp, collectReaderMetrics);
  const layoutFailures = verifyReaderLayout(name, metrics, threshold);
  const chapterNavigationFailures = await verifyChapterNavigationFlow(cdp, name);
  const chapterPickerFailures = await verifyChapterPickerFlow(cdp, name, threshold);
  const stackFailures = await verifyMobileStackFlow(cdp, name);
  const noteStackFailures = await verifyMobileNoteStackFlow(cdp, name);
  const contextFailures = await verifyV2ContextFlow(cdp, name);
  const selectionFailures = await verifySelectionFlow(cdp, name);
  return { chapterNavigationFailures, chapterPickerFailures, contextFailures, layoutFailures, metrics, name, noteStackFailures, selectionFailures, stackFailures };
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
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-sandbox",
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
    if (options.single === "true") {
      const mobile = await openPage(options.port, options.mobileUrl, viewport);
      sessions.push(mobile);
      await ensureGuestReader(mobile);
      const mobileResult = await verifyReader(mobile, "mobile", options.threshold);
      const report = {
        mobile: mobileResult,
        options,
        passed:
          mobileResult.chapterNavigationFailures.length === 0 &&
          mobileResult.chapterPickerFailures.length === 0 &&
          mobileResult.contextFailures.length === 0 &&
          mobileResult.layoutFailures.length === 0 &&
          mobileResult.noteStackFailures.length === 0 &&
          mobileResult.selectionFailures.length === 0 &&
          mobileResult.stackFailures.length === 0,
      };
      console.log(JSON.stringify(report, null, 2));
      if (!report.passed) {
        process.exitCode = 1;
      }
      return;
    }
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
        webResult.chapterNavigationFailures.length === 0 &&
        webResult.chapterPickerFailures.length === 0 &&
        webResult.contextFailures.length === 0 &&
        webResult.layoutFailures.length === 0 &&
        webResult.noteStackFailures.length === 0 &&
        webResult.selectionFailures.length === 0 &&
        webResult.stackFailures.length === 0 &&
        mobileResult.chapterNavigationFailures.length === 0 &&
        mobileResult.chapterPickerFailures.length === 0 &&
        mobileResult.contextFailures.length === 0 &&
        mobileResult.layoutFailures.length === 0 &&
        mobileResult.noteStackFailures.length === 0 &&
        mobileResult.selectionFailures.length === 0 &&
        mobileResult.stackFailures.length === 0,
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

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
