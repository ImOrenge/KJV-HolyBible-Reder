import { APP_SLUG } from "./brand";
import type { UserDataState, UserSettings } from "./types";

const storagePrefix = `${APP_SLUG}:v0:user-data`;
const legacyStoragePrefix = "kjv-educator:v0:user-data";
export const defaultFavoriteListId = "default-favorite-list";

export type UserDataStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

export const defaultSettings: UserSettings = {
  fontSize: 18,
  lineHeight: 1.75,
  theme: "light",
  readingMode: "normal",
  defaultTranslation: "en",
  showParallelTranslation: false,
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
    personalNotes: [],
    personalNoteVerseLinks: [],
    personalNoteTags: [],
    verseTags: [],
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

export function normalizeUserData(parsed: Partial<UserDataState>, userId: string): UserDataState {
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
    personalNotes: (parsed.personalNotes ?? []).map((note) => withCurrentUser(note, userId)),
    personalNoteVerseLinks: (parsed.personalNoteVerseLinks ?? []).map((link) => withCurrentUser(link, userId)),
    personalNoteTags: (parsed.personalNoteTags ?? []).map((tag) => withCurrentUser(tag, userId)),
    verseTags: (parsed.verseTags ?? []).map((tag) => withCurrentUser(tag, userId)),
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

export function getUserDataStorageKeys(userId: string) {
  return {
    current: `${storagePrefix}:${userId}`,
    legacy: `${legacyStoragePrefix}:${userId}`,
  };
}

function getBrowserStorage(): UserDataStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadUserData(userId: string): UserDataState {
  const storage = getBrowserStorage();
  if (!storage) {
    return createInitialUserData(userId);
  }

  const { current, legacy } = getUserDataStorageKeys(userId);
  const stored = storage.getItem(current) as string | null;
  const legacyStored = stored ? null : (storage.getItem(legacy) as string | null);
  const storedUserData = stored ?? legacyStored;
  if (!storedUserData) {
    return createInitialUserData(userId);
  }

  try {
    const parsed = JSON.parse(storedUserData) as Partial<UserDataState>;
    const userData = normalizeUserData(parsed, userId);
    if (!stored && legacyStored) {
      storage.setItem(current, JSON.stringify(userData));
    }
    return userData;
  } catch {
    return createInitialUserData(userId);
  }
}

export function saveUserData(userId: string, data: UserDataState) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const serialized = JSON.stringify(data);
  const { current, legacy } = getUserDataStorageKeys(userId);
  storage.setItem(current, serialized);
  storage.setItem(legacy, serialized);
}

export function clearUserData(userId: string) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const { current, legacy } = getUserDataStorageKeys(userId);
  storage.removeItem(current);
  storage.removeItem(legacy);
}

export async function loadUserDataFromStorage(storage: UserDataStorage, userId: string): Promise<UserDataState> {
  const { current, legacy } = getUserDataStorageKeys(userId);
  const stored = await storage.getItem(current);
  const legacyStored = stored ? null : await storage.getItem(legacy);
  const storedUserData = stored ?? legacyStored;
  if (!storedUserData) {
    return createInitialUserData(userId);
  }

  try {
    const parsed = JSON.parse(storedUserData) as Partial<UserDataState>;
    const userData = normalizeUserData(parsed, userId);
    if (!stored && legacyStored) {
      await storage.setItem(current, JSON.stringify(userData));
    }
    return userData;
  } catch {
    return createInitialUserData(userId);
  }
}

export async function saveUserDataToStorage(storage: UserDataStorage, userId: string, data: UserDataState) {
  const serialized = JSON.stringify(data);
  const { current, legacy } = getUserDataStorageKeys(userId);
  await storage.setItem(current, serialized);
  await storage.setItem(legacy, serialized);
}

export async function clearUserDataFromStorage(storage: UserDataStorage, userId: string) {
  const { current, legacy } = getUserDataStorageKeys(userId);
  await storage.removeItem(current);
  await storage.removeItem(legacy);
}
