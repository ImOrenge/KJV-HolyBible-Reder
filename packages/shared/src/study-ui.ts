import { bibleBookByAppId, type AppBookId } from "./bible-book-codes";

export const STUDY_CONTEXT_SOURCES = [
  "reader",
  "search",
  "dictionary",
  "note",
  "library",
  "today",
] as const;

export const STUDY_CONTEXT_PANELS = ["note", "dictionary", "links", "saved"] as const;

export const STUDY_UI_WEB_VIEW_KEYS = [
  "dashboard",
  "reader",
  "progress",
  "highlights",
  "favorites",
  "notes",
  "dictionary",
  "search",
  "settings",
] as const;

export const STUDY_UI_AREAS = ["today", "read", "study", "library", "settings"] as const;

export type StudyContextSource = (typeof STUDY_CONTEXT_SOURCES)[number];
export type StudyContextPanel = (typeof STUDY_CONTEXT_PANELS)[number];
export type StudyUiWebViewKey = (typeof STUDY_UI_WEB_VIEW_KEYS)[number];
export type StudyUiMobileViewKey = StudyUiWebViewKey | "quickMove";
export type StudyUiArea = (typeof STUDY_UI_AREAS)[number];

export type StudyUiReaderRoute = {
  bookId: AppBookId;
  chapter: number;
  primaryVerseKey?: string;
  panel?: StudyContextPanel;
  word?: string;
};

export type StudyUiRouteState = {
  reader?: StudyUiReaderRoute;
  view: StudyUiWebViewKey;
};

export type CreateStudyUiReaderRouteInput = {
  bookId: string;
  chapter: number;
  panel?: StudyContextPanel;
  verse?: number;
  word?: string;
};

export type StudyUiNavigationEvent = {
  name: "study_navigation";
  source: StudyUiArea;
  destination: StudyUiArea;
  bookId?: AppBookId;
  chapter?: number;
  verseCount?: number;
};

export type StudyReturnTarget = {
  route: string;
  scrollAnchor?: string;
};

export type StudyContext = {
  source: StudyContextSource;
  bookId: AppBookId;
  chapter: number;
  verseKeys: string[];
  primaryVerseKey?: string;
  selectedText?: string;
  dictionaryEntryId?: string;
  returnTarget: StudyReturnTarget;
};

export type StudyContextInput = Omit<StudyContext, "bookId"> & { bookId: string };

export type StudyContextValidationResult =
  | { context: StudyContext; valid: true }
  | { message: string; valid: false };

export type ParseStudyContextQueryInput = {
  bookId: string;
  chapter: number;
  params: URLSearchParams;
  returnTarget: StudyReturnTarget;
  source: StudyContextSource;
};

export type StudyContextQueryOptions = {
  panel?: StudyContextPanel;
  word?: string;
};

export type StudyUiSemanticColors = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  scriptureText: string;
  borderSubtle: string;
  actionPrimary: string;
  actionStudy: string;
  actionSave: string;
  focusRing: string;
  success: string;
  warning: string;
  danger: string;
};

export type StudyUiTheme = "light" | "dark";

export const STUDY_UI_COLOR_TOKENS = {
  light: {
    canvas: "#f7f8f5",
    surface: "#ffffff",
    surfaceMuted: "#eef3ee",
    textPrimary: "#1e2522",
    textSecondary: "#667069",
    scriptureText: "#1e2522",
    borderSubtle: "#d9ded8",
    actionPrimary: "#176f63",
    actionStudy: "#8b2635",
    actionSave: "#9f6b12",
    focusRing: "#176f63",
    success: "#176f63",
    warning: "#9f6b12",
    danger: "#a6372e",
  },
  dark: {
    canvas: "#151716",
    surface: "#202421",
    surfaceMuted: "#2b312d",
    textPrimary: "#f0f3ed",
    textSecondary: "#aab3aa",
    scriptureText: "#f0f3ed",
    borderSubtle: "#3b423d",
    actionPrimary: "#59c6a9",
    actionStudy: "#f07f90",
    actionSave: "#d0a848",
    focusRing: "#59c6a9",
    success: "#59c6a9",
    warning: "#d0a848",
    danger: "#ff8a7a",
  },
} as const satisfies Record<StudyUiTheme, StudyUiSemanticColors>;

export const STUDY_UI_SPACING_TOKENS = {
  compact: 4,
  controlGap: 8,
  contentGap: 12,
  sectionGap: 16,
  bandGap: 24,
  pageGap: 32,
} as const;

export const STUDY_UI_LAYOUT_TOKENS = {
  controlRadius: 6,
  panelRadius: 8,
  minTouchTarget: 44,
  topBarHeight: 56,
  mobileBottomNavigationHeight: 64,
  webSidebarExpandedWidth: 232,
  webSidebarCollapsedWidth: 72,
  scriptureMaxWidth: 760,
  scriptureLineHeightMin: 1.55,
  scriptureLineHeightMax: 2,
} as const;

export const STUDY_UI_TARGET_ROUTES: Record<StudyUiWebViewKey, string> = {
  dashboard: "/app/today",
  reader: "/app/read",
  progress: "/app/progress",
  highlights: "/app/library?section=highlights",
  favorites: "/app/library?section=saved",
  notes: "/app/study/notes",
  dictionary: "/app/study/dictionary",
  search: "/app/search",
  settings: "/app/settings",
};

export const STUDY_UI_AREA_DEFAULT_VIEW: Record<StudyUiArea, StudyUiWebViewKey> = {
  today: "dashboard",
  read: "reader",
  study: "notes",
  library: "favorites",
  settings: "settings",
};

const VERSE_KEY_PATTERN = /^([1-3A-Z][A-Z]{2})\.([1-9]\d{0,2})\.([1-9]\d{0,2})$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SCROLL_ANCHOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_SELECTED_TEXT_LENGTH = 20_000;

function isInternalRoute(route: string) {
  return route.startsWith("/") && !route.startsWith("//") && !/[\u0000-\u001f\u007f]/.test(route);
}

function normalizeVerseKeys(verseKeys: readonly string[]) {
  return [...new Set(verseKeys.map((key) => key.trim()).filter(Boolean))];
}

export function parseStudyUiWebView(value: string | null | undefined): StudyUiWebViewKey {
  return STUDY_UI_WEB_VIEW_KEYS.find((candidate) => candidate === value) ?? "dashboard";
}

export function getStudyUiAreaForView(view: StudyUiWebViewKey): StudyUiArea {
  if (view === "dashboard" || view === "progress") return "today";
  if (view === "reader" || view === "search") return "read";
  if (view === "notes" || view === "dictionary") return "study";
  if (view === "highlights" || view === "favorites") return "library";
  return "settings";
}

export function buildLegacyStudyAppUrl(view: StudyUiWebViewKey) {
  return view === "dashboard" ? "/app" : `/app?view=${encodeURIComponent(view)}`;
}

export function createStudyUiReaderRoute(input: CreateStudyUiReaderRouteInput): StudyUiReaderRoute {
  const book = bibleBookByAppId.get(input.bookId as AppBookId);
  if (!book) throw new Error("성경 권 ID를 확인하세요.");
  if (!Number.isInteger(input.chapter) || input.chapter < 1 || input.chapter > book.chapterCount) {
    throw new Error("성경 장 번호를 확인하세요.");
  }
  if (input.verse !== undefined && (!Number.isInteger(input.verse) || input.verse < 1 || input.verse > 999)) {
    throw new Error("성경 절 번호를 확인하세요.");
  }
  if (input.word && !IDENTIFIER_PATTERN.test(input.word)) throw new Error("사전 항목 ID를 확인하세요.");

  return {
    bookId: book.appBookId,
    chapter: input.chapter,
    ...(input.verse !== undefined ? { primaryVerseKey: `${book.verseKeyCode}.${input.chapter}.${input.verse}` } : {}),
    ...(input.panel ? { panel: input.panel } : {}),
    ...(input.word ? { word: input.word } : {}),
  };
}

export function getStudyUiReaderVerseNumber(route: StudyUiReaderRoute | undefined) {
  if (!route?.primaryVerseKey) return undefined;
  const segments = route.primaryVerseKey.split(".");
  const verse = Number(segments[segments.length - 1]);
  return Number.isInteger(verse) && verse > 0 ? verse : undefined;
}

export function buildStudyUiTargetUrl(view: StudyUiWebViewKey, reader?: StudyUiReaderRoute) {
  if (view !== "reader" || !reader) return STUDY_UI_TARGET_ROUTES[view];

  const validated = validateStudyContext({
    source: "reader",
    bookId: reader.bookId,
    chapter: reader.chapter,
    verseKeys: reader.primaryVerseKey ? [reader.primaryVerseKey] : [],
    primaryVerseKey: reader.primaryVerseKey,
    dictionaryEntryId: reader.word,
    returnTarget: { route: `/app/read/${reader.bookId}/${reader.chapter}` },
  });
  if (!validated.valid) throw new Error(validated.message);

  const path = `/app/read/${reader.bookId}/${reader.chapter}`;
  const query = serializeStudyContextQuery(validated.context, { panel: reader.panel, word: reader.word });
  return query.size ? `${path}?${query.toString()}` : path;
}

export function parseStudyUiRoute(pathname: string, params = new URLSearchParams()): StudyUiRouteState | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") return null;

  if (segments.length === 1) return { view: parseStudyUiWebView(params.get("view")) };
  if (segments.length === 2) {
    if (segments[1] === "today") return { view: "dashboard" };
    if (segments[1] === "read") return { view: "reader" };
    if (segments[1] === "search") return { view: "search" };
    if (segments[1] === "progress") return { view: "progress" };
    if (segments[1] === "settings") return { view: "settings" };
    if (segments[1] === "library") {
      return { view: params.get("section") === "highlights" ? "highlights" : "favorites" };
    }
    if (segments[1] === "study") return { view: "notes" };
    return null;
  }

  if (segments[1] === "study" && segments.length === 3) {
    if (segments[2] === "notes") return { view: "notes" };
    if (segments[2] === "dictionary") return { view: "dictionary" };
    return null;
  }

  if (segments[1] === "read" && segments.length === 4) {
    const chapter = Number(segments[3]);
    const parsed = parseStudyContextQuery({
      source: "reader",
      bookId: segments[2],
      chapter,
      params,
      returnTarget: { route: pathname },
    });
    if (!parsed.valid) return null;

    return {
      view: "reader",
      reader: {
        bookId: parsed.context.bookId,
        chapter: parsed.context.chapter,
        ...(parsed.context.primaryVerseKey ? { primaryVerseKey: parsed.context.primaryVerseKey } : {}),
        ...(parseStudyContextPanel(params) ? { panel: parseStudyContextPanel(params) } : {}),
        ...(parsed.context.dictionaryEntryId ? { word: parsed.context.dictionaryEntryId } : {}),
      },
    };
  }

  return null;
}

export function createStudyUiNavigationEvent(input: Omit<StudyUiNavigationEvent, "name">): StudyUiNavigationEvent {
  const book = input.bookId ? bibleBookByAppId.get(input.bookId) : undefined;
  if (input.bookId && !book) throw new Error("성경 권 ID를 확인하세요.");
  if (input.chapter !== undefined && (!book || !Number.isInteger(input.chapter) || input.chapter < 1 || input.chapter > book.chapterCount)) {
    throw new Error("성경 장 번호를 확인하세요.");
  }
  if (input.verseCount !== undefined && (!Number.isInteger(input.verseCount) || input.verseCount < 0)) {
    throw new Error("구절 수를 확인하세요.");
  }

  return {
    name: "study_navigation",
    source: input.source,
    destination: input.destination,
    ...(book ? { bookId: book.appBookId } : {}),
    ...(input.chapter !== undefined ? { chapter: input.chapter } : {}),
    ...(input.verseCount !== undefined ? { verseCount: input.verseCount } : {}),
  };
}

export function validateStudyContext(input: StudyContextInput): StudyContextValidationResult {
  if (!STUDY_CONTEXT_SOURCES.includes(input.source)) {
    return { message: "공부 문맥 출처를 확인하세요.", valid: false };
  }

  const book = bibleBookByAppId.get(input.bookId as AppBookId);
  if (!book) return { message: "성경 권 ID를 확인하세요.", valid: false };
  if (!Number.isInteger(input.chapter) || input.chapter < 1 || input.chapter > book.chapterCount) {
    return { message: "성경 장 번호를 확인하세요.", valid: false };
  }

  const verseKeys = normalizeVerseKeys(input.verseKeys);
  for (const verseKey of verseKeys) {
    const match = VERSE_KEY_PATTERN.exec(verseKey);
    if (!match || match[1] !== book.verseKeyCode || Number(match[2]) !== input.chapter) {
      return { message: "공부 문맥의 구절 키를 확인하세요.", valid: false };
    }
  }

  const primaryVerseKey = input.primaryVerseKey?.trim() || undefined;
  if (primaryVerseKey && !verseKeys.includes(primaryVerseKey)) {
    return { message: "대표 구절은 선택 구절 목록에 포함되어야 합니다.", valid: false };
  }

  const selectedText = input.selectedText?.trim() || undefined;
  if (selectedText && selectedText.length > MAX_SELECTED_TEXT_LENGTH) {
    return { message: "선택 본문이 너무 깁니다.", valid: false };
  }

  const dictionaryEntryId = input.dictionaryEntryId?.trim() || undefined;
  if (dictionaryEntryId && !IDENTIFIER_PATTERN.test(dictionaryEntryId)) {
    return { message: "사전 항목 ID를 확인하세요.", valid: false };
  }

  const route = input.returnTarget.route.trim();
  if (!isInternalRoute(route)) return { message: "복귀 경로는 앱 내부 경로여야 합니다.", valid: false };

  const scrollAnchor = input.returnTarget.scrollAnchor?.trim() || undefined;
  if (scrollAnchor && !SCROLL_ANCHOR_PATTERN.test(scrollAnchor)) {
    return { message: "복귀 위치 식별자를 확인하세요.", valid: false };
  }

  return {
    context: {
      source: input.source,
      bookId: book.appBookId,
      chapter: input.chapter,
      verseKeys,
      ...(primaryVerseKey ? { primaryVerseKey } : {}),
      ...(selectedText ? { selectedText } : {}),
      ...(dictionaryEntryId ? { dictionaryEntryId } : {}),
      returnTarget: { route, ...(scrollAnchor ? { scrollAnchor } : {}) },
    },
    valid: true,
  };
}

export function parseStudyContextQuery(input: ParseStudyContextQueryInput): StudyContextValidationResult {
  const primaryVerseKey = input.params.get("verse")?.trim() || undefined;
  const verseKeys = (input.params.get("verses") ?? primaryVerseKey ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (primaryVerseKey && !verseKeys.includes(primaryVerseKey)) verseKeys.unshift(primaryVerseKey);

  return validateStudyContext({
    source: input.source,
    bookId: input.bookId,
    chapter: input.chapter,
    verseKeys,
    primaryVerseKey,
    dictionaryEntryId: input.params.get("word")?.trim() || undefined,
    returnTarget: input.returnTarget,
  });
}

export function serializeStudyContextQuery(context: StudyContext, options: StudyContextQueryOptions = {}) {
  const validation = validateStudyContext(context);
  if (!validation.valid) throw new Error(validation.message);
  if (options.word && !IDENTIFIER_PATTERN.test(options.word)) throw new Error("사전 항목 ID를 확인하세요.");

  const params = new URLSearchParams();
  if (validation.context.primaryVerseKey) params.set("verse", validation.context.primaryVerseKey);
  if (validation.context.verseKeys.length > 1) params.set("verses", validation.context.verseKeys.join(","));
  if (options.panel) params.set("panel", options.panel);
  if (options.word) params.set("word", options.word);
  return params;
}

export function parseStudyContextPanel(params: URLSearchParams): StudyContextPanel | undefined {
  const panel = params.get("panel");
  return STUDY_CONTEXT_PANELS.find((candidate) => candidate === panel);
}

export const STUDY_UI_FEATURE_FLAG_KEYS = ["uiShellV2", "readerV2", "notesV2"] as const;

export type StudyUiFeatureFlagKey = (typeof STUDY_UI_FEATURE_FLAG_KEYS)[number];
export type StudyUiFeatureFlags = Record<StudyUiFeatureFlagKey, boolean>;
export type StudyUiFeatureFlagValue = boolean | number | string | null | undefined;
export type StudyUiFeatureFlagInput = Partial<Record<StudyUiFeatureFlagKey, StudyUiFeatureFlagValue>>;

const ENABLED_FLAG_VALUES = new Set(["1", "true", "yes", "on", "enabled"]);

export function resolveStudyUiFeatureFlags(input: StudyUiFeatureFlagInput = {}): StudyUiFeatureFlags {
  return Object.fromEntries(
    STUDY_UI_FEATURE_FLAG_KEYS.map((key) => {
      const value = input[key];
      if (typeof value === "boolean") return [key, value];
      if (typeof value === "number") return [key, value === 1];
      return [key, ENABLED_FLAG_VALUES.has(value?.trim().toLowerCase() ?? "")];
    }),
  ) as StudyUiFeatureFlags;
}
