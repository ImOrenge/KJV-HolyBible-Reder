import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputDir = resolve(".tmp/mobile-click-audit");
const adbBinary = resolveAdbBinary();
const adbCommandTimeoutMs = 15_000;
const adbBufferTimeoutMs = 30_000;
const expoAuditUrl = process.env.EXPO_AUDIT_URL ?? "exp://10.0.2.2:8081";

function resolveAdbBinary() {
  const candidates = [
    process.env.ADB,
    process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : null,
    process.env.ANDROID_SDK_ROOT ? join(process.env.ANDROID_SDK_ROOT, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe") : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return "adb";
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function adb(args, options = {}) {
  const { stdout } = await execFileAsync(adbBinary, args, {
    maxBuffer: 1024 * 1024 * 8,
    timeout: adbCommandTimeoutMs,
    windowsHide: true,
    ...options,
  });
  return stdout;
}

async function adbBuffer(args, options = {}) {
  const { stdout } = await execFileAsync(adbBinary, args, {
    encoding: "buffer",
    maxBuffer: 1024 * 1024 * 8,
    timeout: adbBufferTimeoutMs,
    windowsHide: true,
    ...options,
  });
  return stdout;
}

async function getScreenSize() {
  const output = await adb(["shell", "wm", "size"]);
  const match = output.match(/Physical size:\s*(\d+)x(\d+)/);
  if (!match) {
    throw new Error(`Cannot parse adb wm size output: ${output}`);
  }
  return { height: Number(match[2]), width: Number(match[1]) };
}

async function tap(size, xRatio, yRatio) {
  const x = Math.round(size.width * xRatio);
  const y = Math.round(size.height * yRatio);
  await tapPoint(x, y);
}

async function tapPoint(x, y) {
  await adb(["shell", "input", "tap", String(x), String(y)], { timeout: 5_000 });
}

async function swipe(size, fromXRatio, fromYRatio, toXRatio, toYRatio, durationMs = 450) {
  const fromX = Math.round(size.width * fromXRatio);
  const fromY = Math.round(size.height * fromYRatio);
  const toX = Math.round(size.width * toXRatio);
  const toY = Math.round(size.height * toYRatio);
  await adb(["shell", "input", "swipe", String(fromX), String(fromY), String(toX), String(toY), String(durationMs)]);
}

async function text(value) {
  await adb(["shell", "input", "text", value.replace(/\s/g, "%s")]);
}

async function clearText(times = 24) {
  for (let index = 0; index < times; index += 1) {
    await adb(["shell", "input", "keyevent", "67"]);
  }
}

async function dismissTransientUi() {
  await adb(["shell", "input", "keyevent", "4"]);
  await sleep(300);
  await adb(["shell", "input", "keyevent", "111"]);
  await sleep(300);
}

async function getFocusedPackage() {
  const output = await adb(["shell", "dumpsys", "window"]).catch(() => "");
  const match = output.match(/mCurrentFocus=Window\{[^ ]+\s+u\d+\s+([^/}\s]+)/)
    ?? output.match(/mFocusedApp=ActivityRecord\{[^ ]+\s+u\d+\s+([^/}\s]+)/);
  return match?.[1] ?? "";
}

async function launchExpoApp() {
  await adb(["shell", "am", "force-stop", "com.android.vending"]).catch(() => "");
  await adb(["shell", "am", "force-stop", "com.google.android.apps.nexuslauncher"]).catch(() => "");
  await adb(["shell", "am", "force-stop", "host.exp.exponent"]).catch(() => "");
  await sleep(800);
  await adb(["reverse", "tcp:8081", "tcp:8081"]).catch(() => "");
  await adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", expoAuditUrl, "host.exp.exponent"]);
  await sleep(5500);
}

async function ensureExpoFocused() {
  const focusedPackage = await getFocusedPackage();
  if (focusedPackage === "host.exp.exponent") {
    return true;
  }

  await adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", expoAuditUrl, "host.exp.exponent"]);
  await sleep(2500);
  return (await getFocusedPackage()) === "host.exp.exponent";
}

async function screenshot(name) {
  await mkdir(outputDir, { recursive: true });
  const local = resolve(outputDir, `${name}.png`);
  const png = await adbBuffer(["exec-out", "screencap", "-p"]);
  await writeFile(local, png);
  return local;
}

async function dumpUiXml(name) {
  await mkdir(outputDir, { recursive: true });
  const remote = `/sdcard/${name}.xml`;
  const local = resolve(outputDir, `${name}.xml`);
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await adb(["shell", "uiautomator", "dump", remote]);
      await adb(["pull", remote, local]);
      const xml = await readFile(local, "utf8");
      if (xml.includes("<hierarchy")) {
        return { local, xml };
      }
      lastError = new Error(`UI dump did not contain hierarchy for ${name}.`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw lastError instanceof Error ? lastError : new Error(`Cannot dump UI XML for ${name}.`);
}

async function tapIfTextVisible(size, textValue, xRatio, yRatio) {
  const { xml } = await dumpUiXml(`before-${textValue.replace(/[^\w-]/g, "") || "conditional-tap"}`);
  if (xml.includes(`text="${textValue}"`) || xml.includes(`content-desc="${textValue}`) || xml.includes(`, ${textValue}"`)) {
    await tap(size, xRatio, yRatio);
  }
}

function readXmlTexts(xml) {
  return [...xml.matchAll(/\b(?:text|content-desc)="([^"]*)"/g)].map((match) =>
    match[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

function normalizeVisibleText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function xmlHasVisibleText(xml, textValue) {
  if (xml.includes(textValue)) {
    return true;
  }

  return normalizeVisibleText(readXmlTexts(xml).join(" ")).includes(normalizeVisibleText(textValue));
}

function xmlHasAnyVisibleText(xml, labels) {
  return labels.some((label) => xmlHasVisibleText(xml, label));
}

function readReaderHeading(xml) {
  return readXmlTexts(xml).find((value) => /^[가-힣A-Za-z\s]+ \d+장$/.test(value)) ?? "";
}

function decodeXmlAttr(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readNodeAttr(node, attrName) {
  const match = node.match(new RegExp(`\\b${attrName}="([^"]*)"`));
  return match ? decodeXmlAttr(match[1]) : "";
}

function readNodeBounds(node) {
  const match = node.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!match) {
    return null;
  }

  const [, left, top, right, bottom] = match.map(Number);
  return {
    bottom,
    left,
    right,
    top,
  };
}

function centerOfBounds(bounds) {
  return {
    x: Math.round((bounds.left + bounds.right) / 2),
    y: Math.round((bounds.top + bounds.bottom) / 2),
  };
}

function readTextBounds(xml, textValue) {
  const candidates = [];

  for (const match of xml.matchAll(/<node\b[^>]*>/g)) {
    const node = match[0];
    const textAttr = readNodeAttr(node, "text");
    const contentDesc = readNodeAttr(node, "content-desc");
    const bounds = readNodeBounds(node);
    if (!bounds) {
      continue;
    }

    const hasExactText = textAttr === textValue || contentDesc === textValue;
    const hasAccessibleLabel = contentDesc === textValue || contentDesc.startsWith(`${textValue},`) || contentDesc.includes(`, ${textValue}`);
    if (!hasExactText && !hasAccessibleLabel) {
      continue;
    }

    const isClickable = readNodeAttr(node, "clickable") === "true";
    const area = Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
    candidates.push({
      bounds,
      isClickable,
      isExact: hasExactText,
      isSane: bounds.right > bounds.left && bounds.bottom > bounds.top,
      score: (isClickable ? 10_000_000 : 0) + (hasAccessibleLabel ? 1_000_000 : 0) + (hasExactText ? 100_000 : 0) + area,
    });
  }

  const best = candidates
    .filter((candidate) => candidate.isSane)
    .sort((left, right) => right.score - left.score)[0];

  return best ? centerOfBounds(best.bounds) : null;
}

async function tapVisibleText(size, textValue, name, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { xml } = await dumpUiXml(`${name}-${attempt}`);
    const point = readTextBounds(xml, textValue);
    if (point) {
      try {
        await tapPoint(point.x, point.y);
        return true;
      } catch {
        if (attempt >= attempts - 1) {
          return false;
        }
      }
    }
    if (attempt < attempts - 1) {
      await swipe(size, 0.5, 0.72, 0.5, 0.45);
      await sleep(300);
    }
  }
  return false;
}

async function tapAnyVisibleText(size, labels, name) {
  for (const label of labels) {
    if (await tapVisibleText(size, label, `${name}-${label.replace(/[^\w-]/g, "") || "label"}`, 1)) {
      return true;
    }
  }
  return false;
}

async function tapFirstSearchResult(size, name) {
  const { xml } = await dumpUiXml(`${name}-search-results`);
  const point = readTextBounds(xml, "창세기 1:1") ?? readTextBounds(xml, "In the beginning God created the heaven and the earth.");
  if (point) {
    await tapPoint(point.x, point.y);
    return true;
  }

  await tap(size, 0.5, 0.855);
  return true;
}

async function closeInAppOverlay(size, name) {
  const { xml } = await dumpUiXml(`${name}-overlay-check`);
  const visibleText = normalizeVisibleText(readXmlTexts(xml).join(" "));
  const hasOverlay =
    visibleText.includes("성경 노트")
    || visibleText.includes("인용 구절")
    || visibleText.includes("구절 노트")
    || visibleText.includes("의견 보내기")
    || visibleText.includes("검색 필터")
    || visibleText.includes("목록 삭제 확인")
    || visibleText.includes("취소");

  if (!hasOverlay) {
    return false;
  }

  if (await tapVisibleText(size, "취소", `${name}-cancel`, 1)) {
    await sleep(350);
    return true;
  }
  if (await tapVisibleText(size, "×", `${name}-close`, 1)) {
    await sleep(350);
    return true;
  }
  await dismissTransientUi();
  return false;
}

async function closeExpoToolsOverlay(size, name) {
  const { xml } = await dumpUiXml(`${name}-expo-tools`);
  const visibleText = normalizeVisibleText(readXmlTexts(xml).join(" "));
  const devMenuOpen = visibleText.includes("Open DevTools") || visibleText.includes("Reload Go home");
  const toolsOverlayFocused = visibleText.includes("KJV Reader Note") && !visibleText.includes("KJV 리더노트");

  if (devMenuOpen) {
    await tap(size, 0.9, 0.45);
    await sleep(500);
    return true;
  }

  if (toolsOverlayFocused) {
    await tap(size, 0.9, 0.1);
    await sleep(500);
    await tap(size, 0.9, 0.45);
    await sleep(500);
    return true;
  }

  return false;
}

async function runStep(size, report, step, context) {
  await ensureExpoFocused();
  await closeExpoToolsOverlay(size, `${step.name}-pre`);
  await step.run(size, context);
  await sleep(step.waitMs ?? 700);
  let snapshot = await dumpUiXml(step.name);
  let missingText = (step.assertText ?? []).filter((textValue) => !xmlHasVisibleText(snapshot.xml, textValue));

  for (let attempt = 0; missingText.length && attempt < 6; attempt += 1) {
    await sleep(700);
    snapshot = await dumpUiXml(`${step.name}-wait-${attempt}`);
    missingText = (step.assertText ?? []).filter((textValue) => !xmlHasVisibleText(snapshot.xml, textValue));
  }

  const focusedPackage = await getFocusedPackage();
  const image = await screenshot(step.name);
  const validationFailures = step.validate?.({ context, xml: snapshot.xml }) ?? [];
  if (focusedPackage !== "host.exp.exponent") {
    validationFailures.push(`focused package changed to ${focusedPackage || "unknown"}`);
  }
  const result = {
    expected: step.expected,
    image,
    missingText,
    name: step.name,
    uiDump: snapshot.local,
    validationFailures,
  };
  report.steps.push(result);

  if (missingText.length > 0 || validationFailures.length > 0) {
    report.failures.push({
      missingText,
      name: step.name,
      validationFailures,
    });
  }
}

async function main() {
  const size = await getScreenSize();
  await launchExpoApp();
  await closeExpoToolsOverlay(size, "initial");
  const report = {
    createdAt: new Date().toISOString(),
    device: size,
    failures: [],
    steps: [],
  };
  const context = {
    readerHeading: "",
  };

  const steps = [
    {
      assertText: ["KJV 리더노트", "by CrossWire KJV 3.1", "로그인", "회원가입", "비회원 리더 로그인"],
      expected: "Cold start without a Supabase session shows the native auth entry screen.",
      name: "00-auth-entry",
      run: async () => {},
    },
    {
      assertText: ["로그인", "이메일", "비밀번호"],
      expected: "Login action opens the native email/password login form.",
      name: "00-auth-login",
      run: (currentSize) => tapVisibleText(currentSize, "로그인", "auth-entry-login"),
    },
    {
      assertText: ["회원가입", "이메일", "비밀번호"],
      expected: "Sign-up action opens the native email/password sign-up form.",
      name: "00-auth-sign-up",
      run: async (currentSize) => {
        await tapVisibleText(currentSize, "처음으로", "auth-login-back");
        await sleep(350);
        await tapVisibleText(currentSize, "회원가입", "auth-entry-sign-up");
      },
    },
    {
      assertText: ["오늘 통독 플랜"],
      expected: "Guest reader login enters the existing dashboard with guest-reader local data.",
      name: "00-auth-guest",
      run: async (currentSize) => {
        await tapVisibleText(currentSize, "처음으로", "auth-sign-up-back");
        await sleep(350);
        await tapVisibleText(currentSize, "비회원 리더 로그인", "auth-entry-guest");
      },
      waitMs: 1200,
    },
    {
      assertText: ["KJV 리더노트", "오늘 통독 플랜"],
      expected: "Home tab opens the mobile dashboard with today/progress/activity/study segment controls.",
      name: "01-home",
      run: async (currentSize) => {
        await tap(currentSize, 0.12, 0.93);
        await sleep(300);
        await tap(currentSize, 0.12, 0.155);
      },
    },
    {
      assertText: ["전체 통독률", "오늘 읽은 장"],
      expected: "Home progress segment shows reading progress metrics.",
      name: "02-home-progress",
      run: (currentSize) => tap(currentSize, 0.39, 0.16),
    },
    {
      assertText: ["최근 활동"],
      expected: "Home activity segment shows recent reading activity.",
      name: "03-home-activity",
      run: (currentSize) => tap(currentSize, 0.63, 0.16),
    },
    {
      assertText: ["최근 강조", "최근 인용 구절", "노트와 태그"],
      expected: "Home study segment shows highlight, citation, and note counts.",
      name: "04-home-study",
      run: (currentSize) => tap(currentSize, 0.82, 0.18),
    },
    {
      assertText: ["창세기", "Genesis", "읽음 완료", "EN", "KR", "읽기", "장 노트"],
      expected: "Reader tab opens the native Bible reader.",
      name: "05-reader",
      run: async (currentSize, currentContext) => {
        await tap(currentSize, 0.31, 0.93);
        await sleep(900);
        currentContext.readerHeading = "";
      },
      validate: ({ context: currentContext, xml }) => {
        const heading = readReaderHeading(xml);
        if (!heading) {
          return ["reader heading was not found"];
        }
        currentContext.readerHeading = heading;
        return [];
      },
    },
    {
      assertText: ["창세기", "Genesis"],
      expected: "Reader next chapter control changes the chapter.",
      name: "06-reader-next",
      run: (currentSize) => tap(currentSize, 0.88, 0.21),
      validate: ({ context: currentContext, xml }) => {
        const heading = readReaderHeading(xml);
        if (!heading) {
          return ["reader heading was not found after next chapter"];
        }
        if (heading === currentContext.readerHeading) {
          return [`reader heading did not change from ${currentContext.readerHeading}`];
        }
        currentContext.readerHeading = heading;
        return [];
      },
      waitMs: 1200,
    },
    {
      assertText: ["창세기", "Genesis"],
      expected: "Reader previous chapter control changes the chapter back.",
      name: "07-reader-prev",
      run: (currentSize) => tap(currentSize, 0.12, 0.21),
      validate: ({ context: currentContext, xml }) => {
        const heading = readReaderHeading(xml);
        if (!heading) {
          return ["reader heading was not found after previous chapter"];
        }
        if (heading === currentContext.readerHeading) {
          return [`reader heading did not change from ${currentContext.readerHeading}`];
        }
        currentContext.readerHeading = heading;
        return [];
      },
      waitMs: 1200,
    },
    {
      assertText: ["창세기", "EN", "KR"],
      expected: "Reader language controls can switch EN and KR in place.",
      name: "08-reader-language",
      run: async (currentSize) => {
        await tap(currentSize, 0.5, 0.315);
        await sleep(300);
        await tap(currentSize, 0.82, 0.315);
      },
      waitMs: 800,
    },
    {
      assertText: ["1개 선택", "복사", "인용 저장", "읽기", "선택 해제"],
      expected: "Reader multi-select mode exposes the same batch action sheet as the web mobile reader.",
      name: "09-reader-selection-sheet",
      run: async (currentSize) => {
        const { xml } = await dumpUiXml("before-reader-selection-sheet");
        if (xml.includes("선택 해제")) {
          await tap(currentSize, 0.72, 0.873);
          await sleep(350);
        } else if (xml.includes("개 선택") && !xml.includes("다중 선택")) {
          await tap(currentSize, 0.5, 0.386);
          await sleep(350);
        }
        await tapVisibleText(currentSize, "다중 선택", "reader-multi-select-button");
        await sleep(350);
        await tap(currentSize, 0.5, 0.48);
      },
    },
    {
      assertText: ["1개 구절 복사 완료"],
      expected: "Selected verses can be copied from the native batch action sheet.",
      name: "10-reader-selection-copy",
      run: (currentSize) => tapVisibleText(currentSize, "복사", "reader-selection-copy"),
      waitMs: 100,
    },
    {
      assertText: ["인용 구절", "저장할 목록", "새 목록 이름", "목록 생성", "저장"],
      expected: "Selected verses open the same citation save modal shape as the web mobile reader.",
      name: "11-reader-selection-favorite-modal",
      run: (currentSize) => tapVisibleText(currentSize, "인용 저장", "reader-selection-save"),
      waitMs: 700,
    },
    {
      assertText: ["1개 선택", "인용 저장", "선택 해제"],
      expected: "Saving from the native favorite modal closes back to the selection sheet; the following favorites steps verify persisted citations.",
      name: "12-reader-selection-favorite-save",
      run: (currentSize) => tapVisibleText(currentSize, "저장", "reader-favorite-modal-save"),
      waitMs: 700,
    },
    {
      assertText: ["성경 노트", "삭제", "저장"],
      expected: "Reader chapter note panel opens from the reader action grid.",
      name: "13-reader-chapter-note",
      run: async (currentSize) => {
        await tapVisibleText(currentSize, "선택 해제", "reader-selection-clear");
        await sleep(350);
        await tapVisibleText(currentSize, "장 노트", "reader-chapter-note-button");
      },
      waitMs: 900,
    },
    {
      assertText: ["인용 구절 보관함", "목록", "기본 목록", "목록 전체 복사", "목록 삭제", "창세기"],
      expected: "Favorites tab opens the citation list boundary state or saved citation list.",
      name: "14-favorites",
      run: async (currentSize) => {
        await closeInAppOverlay(currentSize, "reader-chapter-note-overlay");
        await sleep(350);
        await tapVisibleText(currentSize, "선택 모드 종료", "favorites-exit-selection-mode", 1);
        await sleep(350);
        await tap(currentSize, 0.7, 0.93);
      },
    },
    {
      assertText: ["인용 구절 보관함", "최근 저장순", "성경 순서", "자주 사용순", "목록 전체 복사"],
      expected: "Favorites tab exposes search, sort, copy list, open, copy, and delete actions when a citation exists.",
      name: "15-favorites-actions",
      run: (currentSize) => tapVisibleText(currentSize, "최근 저장순", "favorites-sort-trigger"),
    },
    {
      assertText: ["빠른 이동", "이어 읽기", "홈 · 오늘"],
      expected: "Quick move tab opens the web-style command palette.",
      name: "16-quick-move",
      run: (currentSize) => tapVisibleText(currentSize, "명령 검색", "header-command-search"),
    },
    {
      assertText: ["강조 구절", "전체 색상", "성경 권", "열기", "복사", "해제"],
      expected: "Quick move highlight command opens the highlight list.",
      name: "17-highlights",
      run: (currentSize) => tapVisibleText(currentSize, "강조 구절", "command-highlight"),
      validate: ({ xml }) => (xml.includes("빠른 이동") ? ["quick move command palette stayed open"] : []),
      waitMs: 1200,
    },
    {
      assertText: ["강조 구절", "전체 색상", "성경 권", "열기", "복사", "해제"],
      expected: "Highlight list exposes color and book filters plus open, copy, and remove actions when a highlight exists.",
      name: "17-highlights-actions",
      run: (currentSize) => tap(currentSize, 0.22, 0.32),
    },
    {
      assertText: ["빠른 이동", "이어 읽기", "홈 · 오늘"],
      expected: "Quick move command palette reopens from the highlight list.",
      name: "18-quick-move-again",
      run: (currentSize) => tapVisibleText(currentSize, "명령 검색", "header-command-search-again"),
    },
    {
      assertText: ["본문 검색", "키워드", "언어", "정렬", "범위", "성경 권"],
      expected: "Quick move search command opens Bible search.",
      name: "19-search",
      run: async (currentSize) => {
        await tapVisibleText(currentSize, "KJV 본문 검색", "command-search");
        await sleep(500);
        await swipe(currentSize, 0.5, 0.34, 0.5, 0.78, 350);
        await swipe(currentSize, 0.5, 0.34, 0.5, 0.78, 350);
      },
    },
    {
      assertText: ["본문 검색", "KJV 영어"],
      expected: "Search language select sheet can choose KJV English.",
      name: "20-search-en",
      run: async (currentSize) => {
        const { xml } = await dumpUiXml("before-search-language-select");
        if (!xml.includes("KJV 영어")) {
          await tapVisibleText(currentSize, "한국어", "search-language-field");
          await sleep(400);
          await tapVisibleText(currentSize, "KJV 영어", "search-language-option");
        }
      },
    },
    {
      assertText: ["개 결과", "In the beginning"],
      expected: "Search input accepts text and searches through the web API automatically.",
      name: "21-search-results",
      run: async (currentSize) => {
        await tap(currentSize, 0.22, 0.22);
        await adb(["shell", "input", "keyevent", "123"]);
        await clearText(64);
        await text("beginning");
        await adb(["shell", "input", "keyevent", "66"]);
        await sleep(500);
      },
      waitMs: 3000,
    },
    {
      assertText: ["읽음 완료", "EN", "KR"],
      expected: "Opening a search result moves to the reader with that verse selected.",
      name: "22-open-search-result",
      run: async (currentSize) => {
        const openedByReference = await tapVisibleText(currentSize, "창세기 1:1", "search-result-reference", 2);
        if (!openedByReference && !(await tapVisibleText(currentSize, "In the beginning", "search-result-open", 2))) {
          await tapFirstSearchResult(currentSize, "search-result-fallback");
        }
        await sleep(500);
      },
      waitMs: 1600,
    },
    {
      assertText: ["계정 설정", "현재 계정", "로컬 데이터 초기화"],
      expected: "Settings tab opens the account summary and local reset controls.",
      name: "23-settings-account",
      run: async (currentSize) => {
        await closeInAppOverlay(currentSize, "settings-before-account");
        await sleep(350);
        await tap(currentSize, 0.9, 0.93);
        await sleep(500);
        await tapVisibleText(currentSize, "계정 설정", "settings-account-menu");
      },
    },
    {
      assertText: ["TTS 설정", "속도", "음성", "기기 기본", "읽는 절로 자동 이동", "일시정지", "정지", "상태"],
      expected: "Settings TTS section exposes speed, voice, repeat, auto-move, and playback controls.",
      name: "24-settings-tts",
      run: (currentSize) => tapVisibleText(currentSize, "TTS", "settings-tts-menu"),
    },
    {
      assertText: ["텍스트 설정", "글자 크기", "줄 간격"],
      expected: "Settings text section exposes font-size and line-height controls.",
      name: "25-settings-text",
      run: (currentSize) => tapVisibleText(currentSize, "텍스트", "settings-text-menu"),
    },
    {
      assertText: ["보기 모드", "읽기 모드", "다크 모드"],
      expected: "Settings view section exposes reading mode and theme controls.",
      name: "26-settings-view",
      run: (currentSize) => tapVisibleText(currentSize, "보기 모드", "settings-view-menu"),
      validate: ({ xml }) => xmlHasAnyVisibleText(xml, ["일반 보기", "절 번호 강조", "집중 읽기"]) ? [] : ["reading mode control label was not found"],
    },
    {
      assertText: ["보기 모드", "읽기 모드"],
      expected: "Settings reading mode control cycles to the next web-supported mode.",
      name: "27-settings-reading-mode-cycle",
      run: (currentSize) => tapAnyVisibleText(currentSize, ["일반 보기", "절 번호 강조", "집중 읽기"], "settings-reading-mode-cycle"),
      validate: ({ xml }) => xmlHasAnyVisibleText(xml, ["일반 보기", "절 번호 강조", "집중 읽기"]) ? [] : ["reading mode control label was not found after cycling"],
    },
  ];

  for (const step of steps) {
    await runStep(size, report, step, context);
  }

  const reportPath = resolve(outputDir, "report.json");
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ failures: report.failures.length, report: reportPath, steps: report.steps.length }, null, 2));

  if (report.failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
