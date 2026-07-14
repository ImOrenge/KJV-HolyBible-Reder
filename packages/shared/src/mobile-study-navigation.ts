import type { AppBookId } from "./bible-book-codes";
import {
  getStudyUiAreaForView,
  serializeStudyContextQuery,
  validateStudyContext,
  type StudyContext,
  type StudyContextSource,
  type StudyReturnTarget,
  type StudyUiArea,
  type StudyUiMobileViewKey,
} from "./study-ui";

export type MobileStudyRouteContext = Omit<StudyContext, "selectedText">;

export type MobileStudyRoute = {
  context?: MobileStudyRouteContext;
  dictionaryEntryId?: string;
  key: string;
  noteId?: string;
  path: string;
  view: StudyUiMobileViewKey;
};

export type MobileStudyRouteInput = {
  context?: {
    bookId: string;
    chapter: number;
    dictionaryEntryId?: string;
    primaryVerseKey?: string;
    returnTarget: StudyReturnTarget;
    source: StudyContextSource;
    verseKeys: string[];
  };
  dictionaryEntryId?: string;
  noteId?: string;
  view: StudyUiMobileViewKey;
};

export type MobileStudyNavigationState = {
  routes: MobileStudyRoute[];
};

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const MOBILE_TAB_DEFAULT_VIEW: Record<StudyUiArea, StudyUiMobileViewKey> = {
  today: "dashboard",
  read: "reader",
  study: "notes",
  library: "favorites",
  settings: "settings",
};

const MOBILE_VIEW_PATH: Record<StudyUiMobileViewKey, string> = {
  dashboard: "/(tabs)/today",
  reader: "/(tabs)/read",
  progress: "/progress",
  highlights: "/library/highlights",
  favorites: "/(tabs)/library",
  notes: "/(tabs)/study",
  dictionary: "/dictionary",
  search: "/search",
  settings: "/(tabs)/settings",
  quickMove: "/quick-move",
};

function validateIdentifier(value: string | undefined, label: string) {
  const normalized = value?.trim() || undefined;
  if (normalized && !IDENTIFIER_PATTERN.test(normalized)) throw new Error(`${label} 식별자를 확인하세요.`);
  return normalized;
}

function normalizeRouteContext(input: MobileStudyRouteInput["context"]) {
  if (!input) return undefined;
  const validated = validateStudyContext({
    source: input.source,
    bookId: input.bookId,
    chapter: input.chapter,
    verseKeys: input.verseKeys,
    primaryVerseKey: input.primaryVerseKey,
    dictionaryEntryId: input.dictionaryEntryId,
    returnTarget: input.returnTarget,
  });
  if (!validated.valid) throw new Error(validated.message);

  const { selectedText: _privateText, ...context } = validated.context;
  return context;
}

function buildRoutePath(
  view: StudyUiMobileViewKey,
  context: MobileStudyRouteContext | undefined,
  noteId: string | undefined,
  dictionaryEntryId: string | undefined,
) {
  let path = MOBILE_VIEW_PATH[view];
  if (view === "reader" && context) path = `/read/${context.bookId}/${context.chapter}`;
  if (view === "notes" && noteId) path = `/notes/${noteId}`;
  if (view === "dictionary" && dictionaryEntryId) path = `/dictionary/${dictionaryEntryId}`;
  if (!context) return path;

  const params = serializeStudyContextQuery(context, { word: dictionaryEntryId ?? context.dictionaryEntryId });
  params.set("source", context.source);
  params.set("return", context.returnTarget.route);
  if (context.returnTarget.scrollAnchor) params.set("anchor", context.returnTarget.scrollAnchor);
  if (view !== "reader") {
    params.set("book", context.bookId);
    params.set("chapter", String(context.chapter));
  }
  return params.size ? `${path}?${params.toString()}` : path;
}

export function createMobileStudyRoute(input: MobileStudyRouteInput): MobileStudyRoute {
  const context = normalizeRouteContext(input.context);
  const noteId = validateIdentifier(input.noteId, "노트");
  const dictionaryEntryId = validateIdentifier(input.dictionaryEntryId, "사전 항목");
  const path = buildRoutePath(input.view, context, noteId, dictionaryEntryId);

  return {
    key: path,
    path,
    view: input.view,
    ...(context ? { context } : {}),
    ...(noteId ? { noteId } : {}),
    ...(dictionaryEntryId ? { dictionaryEntryId } : {}),
  };
}

export function createMobileStudyTabRoute(area: StudyUiArea) {
  return createMobileStudyRoute({ view: MOBILE_TAB_DEFAULT_VIEW[area] });
}

export function createMobileStudyNavigationState(initialArea: StudyUiArea = "today"): MobileStudyNavigationState {
  return { routes: [createMobileStudyTabRoute(initialArea)] };
}

export function getActiveMobileStudyRoute(state: MobileStudyNavigationState) {
  return state.routes[state.routes.length - 1] ?? createMobileStudyTabRoute("today");
}

export function pushMobileStudyRoute(state: MobileStudyNavigationState, route: MobileStudyRoute): MobileStudyNavigationState {
  return { routes: [...state.routes, route] };
}

export function replaceMobileStudyRoute(state: MobileStudyNavigationState, route: MobileStudyRoute): MobileStudyNavigationState {
  return { routes: [...state.routes.slice(0, -1), route] };
}

export function selectMobileStudyTab(_state: MobileStudyNavigationState, area: StudyUiArea): MobileStudyNavigationState {
  return { routes: [createMobileStudyTabRoute(area)] };
}

export function popMobileStudyRoute(state: MobileStudyNavigationState): MobileStudyNavigationState {
  return state.routes.length > 1 ? { routes: state.routes.slice(0, -1) } : state;
}

export function canPopMobileStudyRoute(state: MobileStudyNavigationState) {
  return state.routes.length > 1;
}

export function getMobileStudyRouteArea(route: MobileStudyRoute): StudyUiArea | null {
  return route.view === "quickMove" ? null : getStudyUiAreaForView(route.view);
}

export function createMobileReaderContext(input: {
  bookId: string;
  chapter: number;
  primaryVerseKey?: string;
  returnTarget: StudyReturnTarget;
  source: StudyContextSource;
  verseKeys?: string[];
}) {
  return normalizeRouteContext({
    source: input.source,
    bookId: input.bookId,
    chapter: input.chapter,
    verseKeys: input.verseKeys ?? (input.primaryVerseKey ? [input.primaryVerseKey] : []),
    primaryVerseKey: input.primaryVerseKey,
    returnTarget: input.returnTarget,
  }) as MobileStudyRouteContext;
}

export function getMobileReaderLocation(route: MobileStudyRoute) {
  if (route.view !== "reader" || !route.context) return null;
  return {
    bookId: route.context.bookId as AppBookId,
    chapter: route.context.chapter,
    primaryVerseKey: route.context.primaryVerseKey,
  };
}
