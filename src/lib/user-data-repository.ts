import { APP_SLUG } from "./brand";
import type { UserDataState, UserSettings } from "./types";

const storagePrefix = `${APP_SLUG}:v0:user-data`;
const legacyStoragePrefix = "kjv-educator:v0:user-data";
export const defaultFavoriteListId = "default-favorite-list";

export const defaultSettings: UserSettings = {
  fontSize: 18,
  lineHeight: 1.75,
  theme: "light",
  readingMode: "normal",
  defaultTranslation: "en",
  ttsVoice: "",
  ttsSpeed: 1,
  ttsRepeat: false,
  ttsAutoScroll: true,
};

export function createInitialUserData(userId = "demo-user"): UserDataState {
  return {
    progress: null,
    activeReadingPlan: null,
    recentReads: [],
    completedChapters: [],
    highlights: [],
    studyNotes: [],
    favoriteVerses: [],
    favoriteLists: [
      {
        id: defaultFavoriteListId,
        userId,
        name: "기본 목록",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    tags: [],
    settings: defaultSettings,
  };
}

function withCurrentUser<T extends { userId: string }>(item: T, userId: string): T {
  return {
    ...item,
    userId,
  };
}

function normalizeUserData(parsed: Partial<UserDataState>, userId: string): UserDataState {
  const initial = createInitialUserData(userId);
  const favoriteLists = (parsed.favoriteLists?.length ? parsed.favoriteLists : initial.favoriteLists).map((list) =>
    withCurrentUser(list, userId),
  );
  const fallbackListId = favoriteLists[0]?.id ?? defaultFavoriteListId;

  return {
    ...initial,
    ...parsed,
    progress: parsed.progress ? withCurrentUser(parsed.progress, userId) : null,
    activeReadingPlan: parsed.activeReadingPlan ? withCurrentUser(parsed.activeReadingPlan, userId) : null,
    recentReads: (parsed.recentReads ?? []).map((read) => withCurrentUser(read, userId)),
    completedChapters: (parsed.completedChapters ?? []).map((chapter) => withCurrentUser(chapter, userId)),
    highlights: (parsed.highlights ?? []).map((highlight) => withCurrentUser(highlight, userId)),
    studyNotes: (parsed.studyNotes ?? []).map((note) => withCurrentUser(note, userId)),
    favoriteLists,
    favoriteVerses: (parsed.favoriteVerses ?? []).map((favorite) => ({
      ...withCurrentUser(favorite, userId),
      listIds: favorite.listIds?.length ? favorite.listIds : [fallbackListId],
    })),
    tags: (parsed.tags ?? []).map((tag) => withCurrentUser(tag, userId)),
    settings: {
      ...defaultSettings,
      ...parsed.settings,
    },
  };
}

export function loadUserData(userId: string): UserDataState {
  if (typeof window === "undefined") {
    return createInitialUserData(userId);
  }

  const storageKey = `${storagePrefix}:${userId}`;
  const legacyStorageKey = `${legacyStoragePrefix}:${userId}`;
  const stored = window.localStorage.getItem(storageKey);
  const legacyStored = stored ? null : window.localStorage.getItem(legacyStorageKey);
  const storedUserData = stored ?? legacyStored;
  if (!storedUserData) {
    return createInitialUserData(userId);
  }

  try {
    const parsed = JSON.parse(storedUserData) as Partial<UserDataState>;
    const userData = normalizeUserData(parsed, userId);
    if (!stored && legacyStored) {
      window.localStorage.setItem(storageKey, JSON.stringify(userData));
    }
    return userData;
  } catch {
    return createInitialUserData(userId);
  }
}

export function saveUserData(userId: string, data: UserDataState) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(data);
  window.localStorage.setItem(`${storagePrefix}:${userId}`, serialized);
  window.localStorage.setItem(`${legacyStoragePrefix}:${userId}`, serialized);
}

export function clearUserData(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${storagePrefix}:${userId}`);
  window.localStorage.removeItem(`${legacyStoragePrefix}:${userId}`);
}
