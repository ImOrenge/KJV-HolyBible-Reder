import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearUserDataFromStorage,
  collectSearchHighlightRanges,
  createReadingPlan,
  createBibleApiClient,
  createInitialUserData,
  defaultFavoriteListId,
  formatPlanChapters,
  getUserOnboarding,
  getAdjacentChapter,
  getBook,
  getBooks,
  getChapters,
  getLocalDateKey,
  getReadingPlanDay,
  getStudyUiAreaForView,
  getTotalChapterCount,
  hasImportableUserData,
  hebrewDictionaryThemes,
  issueTypeLabels,
  loadRemoteUserData,
  loadUserDataFromStorage,
  mergeUserDataForImport,
  markdownLiteToPersonalNoteDocument,
  normalizePersonalNoteDocument,
  personalNoteDocumentToMarkdown,
  personalNoteDocumentToText,
  normalizeVerseId,
  percent,
  privacyPolicyIntro,
  privacyPolicySections,
  privacyPolicyTitle,
  privacyPolicyUpdatedAt,
  readingPlanOptions,
  saveRemoteUserData,
  saveUserDataToStorage,
  searchHebrewDictionary,
  submitTranslationFeedback,
  translationFeedbackIssueTypes,
  type BibleSearchLanguage,
  type BibleSearchSort,
  type FavoriteList,
  type HebrewDictionarySort,
  type Highlight,
  type HighlightColor,
  type PersonalNote,
  type PersonalNoteDocument,
  type ReadingMode,
  type ReadingPlanTemplate,
  type Tag,
  type TranslationLanguage,
  type TranslationFeedbackIssueType,
  type UserDataState,
  type UserOnboardingProfile,
  type Verse,
  type StudyUiMobileViewKey,
} from "@kjv/shared";
import { createClient as createSupabaseClient, type Session, type User } from "@supabase/supabase-js";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import { createElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PersonalNoteRichTextEditor } from "./src/components/personal-note-rich-text-editor";
import { OnboardingScreen } from "./src/onboarding-screen";
import { studyUiFeatureFlags } from "./src/study-ui-feature-flags";

type ViewKey = StudyUiMobileViewKey;
type HomeTab = "today" | "progress" | "activity" | "study";
type SettingsSectionKey = "account" | "tts" | "text" | "view";
type SearchSelectKey = "language" | "sort" | "testament" | "book";
type EntryMode = "welcome" | "login" | "sign-up" | "guest";
type AuthCredentialMode = "login" | "sign-up";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type SubmitStatus = "idle" | "submitting" | "success" | "error";
type SyncStatus = "idle" | "loading" | "ready" | "saving" | "error";
type OnboardingStatus = "idle" | "checking" | "required" | "complete" | "error";
type TtsPlaybackState = "idle" | "playing" | "paused";
type SpeechQueueItem = {
  id?: string;
  label: string;
  text: string;
};
const ttsSpeedOptions = [0.75, 1, 1.25, 1.5] as const;
const iconGlyphs = {
  "book-outline": "▤",
  "bookmark-outline": "▯",
  "calendar-outline": "▦",
  "checkmark-circle": "✓",
  "checkmark-circle-outline": "✓",
  "checkmark-done-outline": "✓",
  "chevron-back": "‹",
  "chevron-down": "⌄",
  "chevron-forward": "›",
  "close-outline": "×",
  "command-outline": "⌘",
  "color-wand": "◆",
  "color-wand-outline": "◇",
  "copy-outline": "⧉",
  "flag-outline": "⚑",
  "funnel-outline": "≡",
  "language-outline": "가",
  "library-outline": "A",
  "list-checks": "☑",
  "home-outline": "⌂",
  "layers-outline": "▤",
  "log-in-outline": "↪",
  "log-out-outline": "↩",
  "moon-outline": "◐",
  "pause-circle-outline": "Ⅱ",
  "person-add-outline": "+",
  "play-circle-outline": "▶",
  "reader-outline": "▤",
  "refresh-outline": "↻",
  "save-outline": "▣",
  "search-outline": "⌕",
  "settings-outline": "⚙",
  "stats-chart-outline": "%",
  "stop-circle-outline": "■",
  "sunny-outline": "☼",
  "text-outline": "T",
  "trash-outline": "×",
  "volume-medium-outline": "▶",
} as const;

type IconName = keyof typeof iconGlyphs;
type WebIconShape = {
  attrs: Record<string, number | string>;
  tag: "circle" | "line" | "path" | "polygon" | "polyline" | "rect";
};

const webIconShapes: Partial<Record<IconName, WebIconShape[]>> = {
  "book-outline": [
    { tag: "path", attrs: { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" } },
    { tag: "path", attrs: { d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" } },
  ],
  "bookmark-outline": [{ tag: "path", attrs: { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" } }],
  "calendar-outline": [
    { tag: "rect", attrs: { height: 18, rx: 2, width: 18, x: 3, y: 4 } },
    { tag: "line", attrs: { x1: 16, x2: 16, y1: 2, y2: 6 } },
    { tag: "line", attrs: { x1: 8, x2: 8, y1: 2, y2: 6 } },
    { tag: "line", attrs: { x1: 3, x2: 21, y1: 10, y2: 10 } },
  ],
  "checkmark-circle": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-5" } },
  ],
  "checkmark-circle-outline": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-5" } },
  ],
  "checkmark-done-outline": [{ tag: "path", attrs: { d: "m5 12 4 4L19 6" } }],
  "chevron-back": [{ tag: "polyline", attrs: { points: "15 18 9 12 15 6" } }],
  "chevron-down": [{ tag: "polyline", attrs: { points: "6 9 12 15 18 9" } }],
  "chevron-forward": [{ tag: "polyline", attrs: { points: "9 18 15 12 9 6" } }],
  "close-outline": [
    { tag: "line", attrs: { x1: 18, x2: 6, y1: 6, y2: 18 } },
    { tag: "line", attrs: { x1: 6, x2: 18, y1: 6, y2: 18 } },
  ],
  "command-outline": [
    { tag: "path", attrs: { d: "M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0 0-6z" } },
  ],
  "copy-outline": [
    { tag: "rect", attrs: { height: 13, rx: 2, width: 13, x: 9, y: 9 } },
    { tag: "path", attrs: { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" } },
  ],
  "flag-outline": [
    { tag: "path", attrs: { d: "M4 22V4" } },
    { tag: "path", attrs: { d: "M4 4h13l-1 5 1 5H4" } },
  ],
  "home-outline": [
    { tag: "path", attrs: { d: "m3 9 9-7 9 7" } },
    { tag: "path", attrs: { d: "M5 10v12h14V10" } },
    { tag: "path", attrs: { d: "M9 22V12h6v10" } },
  ],
  "language-outline": [
    { tag: "path", attrs: { d: "m5 8 6 6" } },
    { tag: "path", attrs: { d: "m4 14 6-6 2-3" } },
    { tag: "path", attrs: { d: "M2 5h12" } },
    { tag: "path", attrs: { d: "M7 2h1" } },
    { tag: "path", attrs: { d: "m22 22-5-10-5 10" } },
    { tag: "path", attrs: { d: "M14 18h6" } },
  ],
  "layers-outline": [
    { tag: "path", attrs: { d: "m12 2 10 5-10 5L2 7z" } },
    { tag: "path", attrs: { d: "m2 17 10 5 10-5" } },
    { tag: "path", attrs: { d: "m2 12 10 5 10-5" } },
  ],
  "list-checks": [
    { tag: "path", attrs: { d: "m3 17 2 2 4-4" } },
    { tag: "path", attrs: { d: "m3 7 2 2 4-4" } },
    { tag: "line", attrs: { x1: 13, x2: 21, y1: 6, y2: 6 } },
    { tag: "line", attrs: { x1: 13, x2: 21, y1: 18, y2: 18 } },
  ],
  "log-in-outline": [
    { tag: "path", attrs: { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" } },
    { tag: "polyline", attrs: { points: "10 17 15 12 10 7" } },
    { tag: "line", attrs: { x1: 15, x2: 3, y1: 12, y2: 12 } },
  ],
  "log-out-outline": [
    { tag: "path", attrs: { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" } },
    { tag: "polyline", attrs: { points: "16 17 21 12 16 7" } },
    { tag: "line", attrs: { x1: 21, x2: 9, y1: 12, y2: 12 } },
  ],
  "pause-circle-outline": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "line", attrs: { x1: 10, x2: 10, y1: 15, y2: 9 } },
    { tag: "line", attrs: { x1: 14, x2: 14, y1: 15, y2: 9 } },
  ],
  "play-circle-outline": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "polygon", attrs: { points: "10 8 16 12 10 16 10 8" } },
  ],
  "reader-outline": [
    { tag: "path", attrs: { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" } },
    { tag: "path", attrs: { d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" } },
  ],
  "refresh-outline": [
    { tag: "path", attrs: { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" } },
    { tag: "path", attrs: { d: "M3 21v-5h5" } },
    { tag: "path", attrs: { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" } },
    { tag: "path", attrs: { d: "M16 8h5V3" } },
  ],
  "save-outline": [
    { tag: "path", attrs: { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" } },
    { tag: "path", attrs: { d: "M17 21v-8H7v8" } },
    { tag: "path", attrs: { d: "M7 3v5h8" } },
  ],
  "search-outline": [
    { tag: "circle", attrs: { cx: 11, cy: 11, r: 8 } },
    { tag: "line", attrs: { x1: 21, x2: 16.65, y1: 21, y2: 16.65 } },
  ],
  "settings-outline": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 3 } },
    { tag: "path", attrs: { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.06V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1.06 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.06-.33H3a2 2 0 1 1 0-4h.09c.4 0 .77-.12 1.06-.33.29-.21.5-.57.6-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.19 3.6l.06.06c.45.45 1.1.6 1.82.33.43-.1.79-.31 1-.6.21-.29.33-.66.33-1.06V2a2 2 0 1 1 4 0v.09c0 .4.12.77.33 1.06.21.29.57.5 1 .6.72.27 1.37.12 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.45.45-.6 1.1-.33 1.82.1.43.31.79.6 1 .29.21.66.33 1.06.33H21a2 2 0 1 1 0 4h-.09c-.4 0-.77.12-1.06.33-.29.21-.5.57-.6 1z" } },
  ],
  "stats-chart-outline": [
    { tag: "line", attrs: { x1: 18, x2: 18, y1: 20, y2: 10 } },
    { tag: "line", attrs: { x1: 12, x2: 12, y1: 20, y2: 4 } },
    { tag: "line", attrs: { x1: 6, x2: 6, y1: 20, y2: 14 } },
  ],
  "stop-circle-outline": [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "rect", attrs: { height: 6, width: 6, x: 9, y: 9 } },
  ],
  "trash-outline": [
    { tag: "path", attrs: { d: "M3 6h18" } },
    { tag: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
    { tag: "path", attrs: { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" } },
  ],
  "volume-medium-outline": [
    { tag: "path", attrs: { d: "M11 5 6 9H2v6h4l5 4z" } },
    { tag: "path", attrs: { d: "M15.54 8.46a5 5 0 0 1 0 7.07" } },
    { tag: "path", attrs: { d: "M19.07 4.93a10 10 0 0 1 0 14.14" } },
  ],
};

const guestUserId = "guest-reader";
const highlightOptions: Array<{ color: HighlightColor; label: string }> = [
  { color: "yellow", label: "중요" },
  { color: "blue", label: "묵상" },
  { color: "green", label: "약속" },
  { color: "red", label: "경고" },
  { color: "purple", label: "예언" },
];
const searchLanguageLabels: Record<BibleSearchLanguage, string> = {
  all: "전체",
  en: "KJV 영어",
  ko: "한국어",
};
const readingModeOptions: Array<{ label: string; value: ReadingMode }> = [
  { label: "일반 보기", value: "normal" },
  { label: "절 번호 강조", value: "verse-numbers" },
  { label: "집중 읽기", value: "focus" },
];

function getDefaultApiBaseUrl() {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001";
  }

  return "http://localhost:3001";
}

function getConfiguredApiBaseUrl() {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl;
  return typeof configured === "string" && configured.trim() ? configured.trim() : getDefaultApiBaseUrl();
}

function getConfiguredSupabaseConfig() {
  const extra = Constants.expoConfig?.extra ?? {};
  const supabaseUrl = typeof extra.supabaseUrl === "string" ? extra.supabaseUrl.trim() : "";
  const supabaseAnonKey = typeof extra.supabaseAnonKey === "string" ? extra.supabaseAnonKey.trim() : "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseAnonKey, supabaseUrl };
}

function createMobileSupabaseClient(config: { supabaseAnonKey: string; supabaseUrl: string } | null) {
  if (!config) {
    return null;
  }

  return createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
}

function formatReference(verse: Verse) {
  const book = getBook(verse.bookId);
  return `${book?.nameKo ?? verse.bookId} ${verse.chapter}:${verse.verse}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getVerseDisplayText(verse: Verse, language: TranslationLanguage) {
  if (language === "ko" && verse.textKo) {
    return verse.textKo;
  }

  return verse.textEn ?? verse.text;
}

function getVerseDisplaySource(verse: Verse, language: TranslationLanguage) {
  if (language === "ko") {
    return verse.textKo ? (verse.translationName ?? "KJV Reader Note") : "한국어 본문 없음";
  }

  return verse.sourceModuleVersion ? `${verse.translation} ${verse.sourceModuleVersion}` : verse.translation;
}

function formatVoiceLabel(voice: Speech.Voice) {
  const name = voice.name.length > 18 ? `${voice.name.slice(0, 18)}...` : voice.name;
  return `${name} · ${voice.language}`;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chapterKey(bookId: string, chapter: number) {
  return `${bookId}:${chapter}`;
}

function verseIdFromProgress(bookId: string, chapter: number, verse: number) {
  return normalizeVerseId(`${bookId}-${chapter}-${verse}`);
}

function upsertRecentRead(state: UserDataState, userId: string, bookId: string, chapter: number, verse = 1): UserDataState {
  const now = new Date().toISOString();
  const nextProgress = {
    userId,
    bookId,
    chapter,
    verse,
    scrollPosition: 0,
    lastReadAt: now,
  };

  return {
    ...state,
    progress: nextProgress,
    recentReads: [
      nextProgress,
      ...state.recentReads.filter((read) => read.bookId !== bookId || read.chapter !== chapter),
    ].slice(0, 10),
  };
}

function AppShell() {
  const books = useMemo(() => getBooks(), []);
  const oldBooks = useMemo(() => getBooks("old"), []);
  const newBooks = useMemo(() => getBooks("new"), []);
  const supabaseConfig = useMemo(() => getConfiguredSupabaseConfig(), []);
  const supabase = useMemo(() => createMobileSupabaseClient(supabaseConfig), [supabaseConfig]);
  const [apiBaseUrl, setApiBaseUrl] = useState(getConfiguredApiBaseUrl);
  const apiClient = useMemo(() => createBibleApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [homeTab, setHomeTab] = useState<HomeTab>("today");
  const [isQuickMoveOpen, setIsQuickMoveOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionKey>("account");
  const [authReady, setAuthReady] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("welcome");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>("idle");
  const [onboardingProfile, setOnboardingProfile] = useState<UserOnboardingProfile | null>(null);
  const [onboardingMessage, setOnboardingMessage] = useState("");
  const [onboardingRetryToken, setOnboardingRetryToken] = useState(0);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState<SubmitStatus>("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [bookId, setBookId] = useState("gen");
  const [chapter, setChapter] = useState(1);
  const [chapterStatus, setChapterStatus] = useState<LoadStatus>("idle");
  const [chapterError, setChapterError] = useState("");
  const [chapterSource, setChapterSource] = useState("CrossWire KJV");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isChapterPickerOpen, setIsChapterPickerOpen] = useState(false);
  const [chapterPickerBookId, setChapterPickerBookId] = useState("gen");
  const [isChapterPickerBookMenuOpen, setIsChapterPickerBookMenuOpen] = useState(false);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [currentReadingVerseId, setCurrentReadingVerseId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVerseIds, setSelectedVerseIds] = useState<string[]>([]);
  const [selectionAnchorVerseId, setSelectionAnchorVerseId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserDataState>(() => createInitialUserData(guestUserId));
  const [storageReady, setStorageReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [hasDeviceDataToImport, setHasDeviceDataToImport] = useState(false);
  const [importStatus, setImportStatus] = useState<SubmitStatus>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [deleteAccountStatus, setDeleteAccountStatus] = useState<SubmitStatus>("idle");
  const [deleteAccountMessage, setDeleteAccountMessage] = useState("");
  const [query, setQuery] = useState("");
  const [searchLanguage, setSearchLanguage] = useState<BibleSearchLanguage>("ko");
  const [searchSort, setSearchSort] = useState<BibleSearchSort>("canonical");
  const [searchTestament, setSearchTestament] = useState<"all" | "OT" | "NT">("all");
  const [searchBookFilter, setSearchBookFilter] = useState("all");
  const [activeSearchSelect, setActiveSearchSelect] = useState<SearchSelectKey | null>(null);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryTheme, setDictionaryTheme] = useState("all");
  const [dictionaryBookFilter, setDictionaryBookFilter] = useState("all");
  const [dictionarySort, setDictionarySort] = useState<HebrewDictionarySort>("canonical");
  const [selectedDictionaryEntryId, setSelectedDictionaryEntryId] = useState<string | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [selectedPersonalNoteId, setSelectedPersonalNoteId] = useState<string | null>(null);
  const [personalNoteTitle, setPersonalNoteTitle] = useState("");
  const [personalNoteDocument, setPersonalNoteDocument] = useState<PersonalNoteDocument>(() => markdownLiteToPersonalNoteDocument(""));
  const [personalNoteTagInput, setPersonalNoteTagInput] = useState("");
  const [highlightColorFilter, setHighlightColorFilter] = useState<"all" | HighlightColor>("all");
  const [highlightBookFilter, setHighlightBookFilter] = useState("all");
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [favoriteSortKey, setFavoriteSortKey] = useState<"recent" | "bible" | "usage">("recent");
  const [favoriteTitle, setFavoriteTitle] = useState("");
  const [favoriteMemo, setFavoriteMemo] = useState("");
  const [favoriteTagInput, setFavoriteTagInput] = useState("구원, 복음");
  const [favoriteTargetVerseIds, setFavoriteTargetVerseIds] = useState<string[]>([]);
  const [favoriteListSelection, setFavoriteListSelection] = useState<string[]>([defaultFavoriteListId]);
  const [newFavoriteListName, setNewFavoriteListName] = useState("");
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [selectedFavoriteListId, setSelectedFavoriteListId] = useState(defaultFavoriteListId);
  const [isFavoriteListDropdownOpen, setIsFavoriteListDropdownOpen] = useState(false);
  const [isFavoriteSortDropdownOpen, setIsFavoriteSortDropdownOpen] = useState(false);
  const [pendingDeleteFavoriteListId, setPendingDeleteFavoriteListId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<LoadStatus>("idle");
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [storedVerses, setStoredVerses] = useState<Record<string, Verse>>({});
  const [ttsVoices, setTtsVoices] = useState<Speech.Voice[]>([]);
  const [ttsPlaybackState, setTtsPlaybackState] = useState<TtsPlaybackState>("idle");
  const [ttsStatus, setTtsStatus] = useState("대기");
  const [ttsQueueLabel, setTtsQueueLabel] = useState("대기");
  const [speakingVerseId, setSpeakingVerseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [chapterNoteDraft, setChapterNoteDraft] = useState("");
  const [showChapterNote, setShowChapterNote] = useState(false);
  const [showVerseNote, setShowVerseNote] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackIssueType, setFeedbackIssueType] = useState<TranslationFeedbackIssueType>("wrong_meaning");
  const [feedbackSelectedText, setFeedbackSelectedText] = useState("");
  const [feedbackSuggestedText, setFeedbackSuggestedText] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<SubmitStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const didLoadStorageRef = useRef(false);
  const remoteSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRemoteSnapshotRef = useRef("");
  const pendingSelectedVerseIdRef = useRef<string | null>(null);
  const pendingStoredVerseFetchesRef = useRef(new Set<string>());
  const verseLayoutsRef = useRef(new Map<string, { height: number; y: number }>());
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const speechIndexRef = useRef(0);
  const speechCancelRef = useRef(false);

  const activeUserId = authUser?.id ?? guestUserId;
  const currentBook = getBook(bookId) ?? books[0];
  const chapterPickerBook = getBook(chapterPickerBookId) ?? currentBook;
  const knownVerses = useMemo(
    () => new Map([...Object.values(storedVerses), ...verses, ...searchResults].map((verse) => [verse.id, verse])),
    [searchResults, storedVerses, verses],
  );
  const selectedVerse = selectedVerseId ? knownVerses.get(selectedVerseId) ?? null : null;
  const currentReadingVerse = currentReadingVerseId ? knownVerses.get(currentReadingVerseId) ?? null : null;
  const authenticatedDisplayName = onboardingProfile
    ? `${onboardingProfile.nickname} ${onboardingProfile.honorific}`
    : authUser?.email ?? "로그인 리더";
  const readingLanguage = userData.settings.defaultTranslation;
  const isDark = userData.settings.theme === "dark";
  const colors = isDark ? darkColors : lightColors;
  const { height: viewportHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, viewportHeight), [colors, viewportHeight]);
  const selectedTtsVoice = useMemo(
    () =>
      ttsVoices.find((voice) => voice.identifier === userData.settings.ttsVoice || voice.name === userData.settings.ttsVoice) ??
      null,
    [ttsVoices, userData.settings.ttsVoice],
  );
  const defaultTtsVoiceLabel = Platform.OS === "web" ? "브라우저 기본" : "기기 기본";
  const ttsVoiceOptions = useMemo(() => {
    const languagePrefix = readingLanguage === "ko" ? "ko" : "en";
    const matchingVoices = ttsVoices.filter((voice) => voice.language.toLocaleLowerCase("en-US").startsWith(languagePrefix));
    return (matchingVoices.length ? matchingVoices : ttsVoices).slice(0, 8);
  }, [readingLanguage, ttsVoices]);
  const selectedTtsVoiceLabel = selectedTtsVoice ? selectedTtsVoice.name : defaultTtsVoiceLabel;
  const ttsVoiceChoices = useMemo(
    () => [
      { label: defaultTtsVoiceLabel, value: "" },
      ...ttsVoiceOptions.map((voice) => ({ label: formatVoiceLabel(voice), value: voice.identifier })),
    ],
    [defaultTtsVoiceLabel, ttsVoiceOptions],
  );
  const selectedReadingModeLabel = readingModeOptions.find((option) => option.value === userData.settings.readingMode)?.label ?? "일반 보기";
  const ttsPlaybackLabel = ttsPlaybackState === "playing" ? "재생 중" : ttsPlaybackState === "paused" ? "일시정지" : "대기";
  const shouldShowTtsOverlay = ttsPlaybackState === "playing" || ttsPlaybackState === "paused";
  const selectedNote = selectedVerse
    ? userData.studyNotes.find((note) => note.scope === "verse" && note.verseId === selectedVerse.id)
    : null;
  const chapterNote =
    userData.studyNotes.find((note) => note.scope === "chapter" && note.bookId === bookId && note.chapter === chapter) ?? null;
  const selectedVerseIdSet = useMemo(() => new Set(selectedVerseIds), [selectedVerseIds]);
  const selectedVerses = useMemo(
    () => verses.filter((verse) => selectedVerseIdSet.has(verse.id)),
    [selectedVerseIdSet, verses],
  );
  const favoriteTargetVerses = useMemo(
    () => favoriteTargetVerseIds.map((verseId) => knownVerses.get(verseId)).filter((verse): verse is Verse => Boolean(verse)),
    [favoriteTargetVerseIds, knownVerses],
  );
  const favoriteIds = new Set(userData.favoriteVerses.map((favorite) => favorite.verseId));
  const selectedFavoriteList = useMemo(
    () => userData.favoriteLists.find((list) => list.id === selectedFavoriteListId) ?? userData.favoriteLists[0] ?? null,
    [selectedFavoriteListId, userData.favoriteLists],
  );
  const selectedListFavorites = useMemo(
    () => userData.favoriteVerses.filter((favorite) => favorite.listIds.includes(selectedFavoriteList?.id ?? "")),
    [selectedFavoriteList, userData.favoriteVerses],
  );
  const favoriteListCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const list of userData.favoriteLists) {
      counts.set(list.id, 0);
    }
    for (const favorite of userData.favoriteVerses) {
      for (const listId of favorite.listIds) {
        counts.set(listId, (counts.get(listId) ?? 0) + 1);
      }
    }
    return counts;
  }, [userData.favoriteLists, userData.favoriteVerses]);
  const pendingDeleteFavoriteList = pendingDeleteFavoriteListId
    ? userData.favoriteLists.find((list) => list.id === pendingDeleteFavoriteListId) ?? null
    : null;
  const searchBookOptions = searchTestament === "OT" ? oldBooks : searchTestament === "NT" ? newBooks : books;
  const searchBookSelectOptions = [{ label: "전체 성경", value: "all" }, ...searchBookOptions.map((book) => ({ label: book.nameKo, value: book.id }))];
  const selectedSearchBookLabel = searchBookSelectOptions.find((option) => option.value === searchBookFilter)?.label ?? "전체 성경";
  const searchDisplayLanguage: TranslationLanguage = searchLanguage === "en" ? "en" : "ko";
  const dictionarySearchResult = useMemo(
    () =>
      searchHebrewDictionary({
        bookId: dictionaryBookFilter,
        limit: 30,
        q: dictionaryQuery,
        sort: dictionarySort,
        theme: dictionaryTheme,
      }),
    [dictionaryBookFilter, dictionaryQuery, dictionarySort, dictionaryTheme],
  );
  const selectedDictionaryEntry =
    dictionarySearchResult.entries.find((entry) => entry.id === selectedDictionaryEntryId) ?? dictionarySearchResult.entries[0] ?? null;
  const visiblePersonalNotes = useMemo(() => {
    const normalizedQuery = noteSearchQuery.trim().toLocaleLowerCase("ko-KR");
    return userData.personalNotes
      .filter((note) => note.status === "active")
      .filter((note) => {
        if (!normalizedQuery) {
          return true;
        }
        const noteTags = userData.personalNoteTags
          .filter((tagLink) => tagLink.noteId === note.id)
          .map((tagLink) => userData.tags.find((tag) => tag.id === tagLink.tagId)?.name)
          .filter(Boolean)
          .join(" ");
        return [note.title, note.bodyText, noteTags].join(" ").toLocaleLowerCase("ko-KR").includes(normalizedQuery);
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [noteSearchQuery, userData.personalNoteTags, userData.personalNotes, userData.tags]);
  const selectedPersonalNote =
    (selectedPersonalNoteId ? userData.personalNotes.find((note) => note.id === selectedPersonalNoteId) : null) ??
    visiblePersonalNotes[0] ??
    null;
  const selectedPersonalNoteLinks = selectedPersonalNote
    ? userData.personalNoteVerseLinks
        .filter((link) => link.noteId === selectedPersonalNote.id)
        .sort((left, right) => left.linkOrder - right.linkOrder)
    : [];
  const activePrimaryArea = activeView === "quickMove" ? null : getStudyUiAreaForView(activeView);
  const filteredHighlights = useMemo(
    () =>
      userData.highlights
        .filter((highlight) => highlightColorFilter === "all" || highlight.color === highlightColorFilter)
        .filter((highlight) => highlightBookFilter === "all" || highlight.bookId === highlightBookFilter),
    [highlightBookFilter, highlightColorFilter, userData.highlights],
  );
  const visibleFavorites = useMemo(() => {
    const normalizedQuery = favoriteSearchQuery.trim().toLocaleLowerCase("ko-KR");
    const filtered = selectedListFavorites.filter((favorite) => {
      if (!normalizedQuery) {
        return true;
      }
      const verseText = knownVerses.get(favorite.verseId);
      const tagText = favorite.tagIds
        .map((tagId) => userData.tags.find((tag) => tag.id === tagId)?.name)
        .filter(Boolean)
        .join(" ");
      return [favorite.title, favorite.memo, tagText, verseText ? getVerseDisplayText(verseText, readingLanguage) : ""]
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(normalizedQuery);
    });

    return [...filtered].sort((left, right) => {
      if (favoriteSortKey === "usage") {
        return right.usageCount - left.usageCount;
      }
      if (favoriteSortKey === "bible") {
        const leftOrder = getBook(left.bookId)?.order ?? 0;
        const rightOrder = getBook(right.bookId)?.order ?? 0;
        return leftOrder - rightOrder || left.chapter - right.chapter || left.verse - right.verse;
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [favoriteSearchQuery, favoriteSortKey, knownVerses, readingLanguage, selectedListFavorites, userData.tags]);
  const completedKeys = new Set(userData.completedChapters.map((item) => chapterKey(item.bookId, item.chapter)));
  const currentChapterCompleted = completedKeys.has(chapterKey(bookId, chapter));
  const totalChapters = getTotalChapterCount();
  const oldChapterTotal = getTotalChapterCount("old");
  const newChapterTotal = getTotalChapterCount("new");
  const completedOld = userData.completedChapters.filter((item) => getBook(item.bookId)?.testament === "old").length;
  const completedNew = userData.completedChapters.filter((item) => getBook(item.bookId)?.testament === "new").length;
  const completedToday = userData.completedChapters.filter((item) => item.completedAt.startsWith(getLocalDateKey())).length;
  const overallPercent = percent(userData.completedChapters.length, totalChapters);
  const oldPercent = percent(completedOld, oldChapterTotal);
  const newPercent = percent(completedNew, newChapterTotal);
  const readingPlanDay = userData.activeReadingPlan ? getReadingPlanDay(userData.activeReadingPlan) : null;
  const readingPlanDayCompleted = readingPlanDay
    ? readingPlanDay.chapters.filter((item) => completedKeys.has(chapterKey(item.bookId, item.chapter))).length
    : 0;
  const readingPlanTargetChapter =
    readingPlanDay?.chapters.find((item) => !completedKeys.has(chapterKey(item.bookId, item.chapter))) ??
    readingPlanDay?.chapters[0] ??
    null;
  const recentActivities = useMemo(() => {
    const items = [
      ...userData.recentReads.map((read) => ({
        at: read.lastReadAt,
        bookId: read.bookId,
        chapter: read.chapter,
        id: `read-${read.bookId}-${read.chapter}-${read.lastReadAt}`,
        label: `${getBook(read.bookId)?.nameKo ?? read.bookId} ${read.chapter}장 ${read.verse}절`,
        type: "읽기",
        verse: read.verse,
      })),
      ...userData.highlights.map((highlight) => ({
        at: highlight.updatedAt,
        bookId: highlight.bookId,
        chapter: highlight.chapter,
        id: `highlight-${highlight.id}`,
        label: `${getBook(highlight.bookId)?.nameKo ?? highlight.bookId} ${highlight.chapter}장 ${highlight.verse}절`,
        type: "강조",
        verse: highlight.verse,
      })),
      ...userData.favoriteVerses.map((favorite) => ({
        at: favorite.updatedAt,
        bookId: favorite.bookId,
        chapter: favorite.chapter,
        id: `favorite-${favorite.id}`,
        label: favorite.title,
        type: "인용",
        verse: favorite.verse,
      })),
      ...userData.studyNotes.map((note) => ({
        at: note.updatedAt,
        bookId: note.bookId,
        chapter: note.chapter,
        id: `note-${note.id}`,
        label: note.scope === "verse" && note.verse
          ? `${getBook(note.bookId)?.nameKo ?? note.bookId} ${note.chapter}장 ${note.verse}절`
          : `${getBook(note.bookId)?.nameKo ?? note.bookId} ${note.chapter}장`,
        type: "노트",
        verse: note.verse ?? 1,
      })),
    ];

    return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()).slice(0, 8);
  }, [userData.favoriteVerses, userData.highlights, userData.recentReads, userData.studyNotes]);

  useEffect(() => {
    if (!userData.favoriteLists.some((list) => list.id === selectedFavoriteListId)) {
      setSelectedFavoriteListId(userData.favoriteLists[0]?.id ?? defaultFavoriteListId);
    }
  }, [selectedFavoriteListId, userData.favoriteLists]);

  useEffect(() => {
    setAuthReady(false);

    if (!supabase) {
      setAuthSession(null);
      setAuthUser(null);
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    let completed = false;
    const authTimeout = setTimeout(() => {
      if (cancelled || completed) {
        return;
      }
      completed = true;
      setAuthSession(null);
      setAuthUser(null);
      setAuthReady(true);
      setAuthStatus("error");
      setAuthMessage("세션 확인이 지연되어 비로그인 상태로 시작합니다.");
    }, 5000);

    const finishAuthCheck = (session: Session | null) => {
      if (cancelled || completed) {
        return;
      }
      completed = true;
      clearTimeout(authTimeout);
      setAuthSession(session);
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        finishAuthCheck(data.session);
      })
      .catch(() => {
        if (cancelled || completed) {
          return;
        }
        completed = true;
        clearTimeout(authTimeout);
        setAuthSession(null);
        setAuthUser(null);
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(authTimeout);
      completed = true;
      setAuthSession(session);
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const accessToken = authSession?.access_token;

    if (!authUser) {
      setOnboardingStatus("idle");
      setOnboardingProfile(null);
      setOnboardingMessage("");
      return;
    }

    if (!accessToken) {
      setOnboardingStatus("error");
      setOnboardingProfile(null);
      setOnboardingMessage("로그인 세션을 확인하지 못했습니다.");
      return;
    }

    setOnboardingStatus("checking");
    setOnboardingMessage("");
    void getUserOnboarding({ accessToken, baseUrl: apiBaseUrl })
      .then((result) => {
        if (cancelled) return;
        setOnboardingProfile(result.profile);
        setOnboardingStatus(result.completed && result.profile ? "complete" : "required");
      })
      .catch((error) => {
        if (cancelled) return;
        setOnboardingProfile(null);
        setOnboardingStatus("error");
        setOnboardingMessage(error instanceof Error ? error.message : "프로필 상태를 확인하지 못했습니다.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, authSession?.access_token, authUser, onboardingRetryToken]);

  useEffect(() => {
    let cancelled = false;
    didLoadStorageRef.current = false;
    setStorageReady(false);

    const applyLoadedData = (data: UserDataState) => {
      setUserData(data);
      if (data.progress) {
        pendingSelectedVerseIdRef.current = verseIdFromProgress(data.progress.bookId, data.progress.chapter, data.progress.verse);
        setBookId(data.progress.bookId);
        setChapter(data.progress.chapter);
      }
    };

    const finishLoad = () => {
      if (!cancelled) {
        didLoadStorageRef.current = true;
        setStorageReady(true);
      }
    };

    if (authUser && supabase) {
      setSyncStatus("loading");
      setSyncMessage("서버 데이터 불러오는 중");
      loadRemoteUserData(supabase, authUser.id)
        .then((data) => {
          if (cancelled) {
            return;
          }
          applyLoadedData(data);
          lastSavedRemoteSnapshotRef.current = JSON.stringify(data);
          setSyncStatus("ready");
          setSyncMessage("서버 동기화 연결됨");
          void saveUserDataToStorage(AsyncStorage, authUser.id, data);
        })
        .catch((error) => {
          return loadUserDataFromStorage(AsyncStorage, authUser.id).then((data) => {
            if (cancelled) {
              return;
            }
            applyLoadedData(data);
            lastSavedRemoteSnapshotRef.current = JSON.stringify(data);
            setSyncStatus("error");
            setSyncMessage(
              `서버 데이터를 불러오지 못해 이 기기 캐시로 열었습니다. ${
                error instanceof Error ? error.message : "네트워크 상태를 확인하세요."
              }`,
            );
          });
        })
        .finally(finishLoad);
      return () => {
        cancelled = true;
      };
    }

    setSyncStatus("idle");
    setSyncMessage("");
    loadUserDataFromStorage(AsyncStorage, activeUserId)
      .then((data) => {
        if (!cancelled) {
          applyLoadedData(data);
        }
      })
      .finally(finishLoad);

    return () => {
      cancelled = true;
    };
  }, [activeUserId, authUser, supabase]);

  useEffect(() => {
    if (!storageReady || !didLoadStorageRef.current) {
      return;
    }

    if (!authUser || !supabase) {
      void saveUserDataToStorage(AsyncStorage, activeUserId, userData);
      return;
    }

    const serialized = JSON.stringify(userData);
    if (serialized === lastSavedRemoteSnapshotRef.current) {
      return;
    }

    if (remoteSaveDebounceRef.current) {
      clearTimeout(remoteSaveDebounceRef.current);
    }

    setSyncStatus("saving");
    setSyncMessage("서버 저장 중");
    remoteSaveDebounceRef.current = setTimeout(() => {
      remoteSaveDebounceRef.current = null;
      void saveRemoteUserData(supabase, activeUserId, userData)
        .then(() => {
          lastSavedRemoteSnapshotRef.current = serialized;
          setSyncStatus("ready");
          setSyncMessage("서버 동기화 완료");
          void saveUserDataToStorage(AsyncStorage, activeUserId, userData);
        })
        .catch((error) => {
          setSyncStatus("error");
          setSyncMessage(
            `서버 저장 실패. 이 기기에 임시 저장했습니다. ${
              error instanceof Error ? error.message : "네트워크 상태를 확인하세요."
            }`,
          );
          void saveUserDataToStorage(AsyncStorage, activeUserId, userData);
        });
    }, 650);

    return () => {
      if (remoteSaveDebounceRef.current) {
        clearTimeout(remoteSaveDebounceRef.current);
        remoteSaveDebounceRef.current = null;
      }
    };
  }, [activeUserId, authUser, storageReady, supabase, userData]);

  useEffect(() => {
    let cancelled = false;

    if (!authUser) {
      setHasDeviceDataToImport(false);
      setImportStatus("idle");
      setImportMessage("");
      return () => {
        cancelled = true;
      };
    }

    loadUserDataFromStorage(AsyncStorage, guestUserId)
      .then((data) => {
        if (!cancelled) {
          setHasDeviceDataToImport(hasImportableUserData(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasDeviceDataToImport(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;

    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!cancelled) {
          setTtsVoices(voices);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTtsVoices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadChapter = useCallback(async () => {
    setChapterStatus("loading");
    setChapterError("");

    try {
      const response = await apiClient.fetchBibleChapter(bookId, chapter);
      verseLayoutsRef.current.clear();
      setVerses(response.verses);
      setChapterSource(response.source.version ? `${response.source.name} ${response.source.version}` : response.source.name);
      setChapterStatus("ready");
      const pendingVerseId = pendingSelectedVerseIdRef.current;
      const nextSelectedVerseId =
        pendingVerseId && response.verses.some((verse) => verse.id === pendingVerseId)
          ? pendingVerseId
          : null;
      pendingSelectedVerseIdRef.current = null;
      setSelectedVerseId(nextSelectedVerseId);
      setCurrentReadingVerseId(nextSelectedVerseId);
      setSelectedVerseIds([]);
      setSelectionAnchorVerseId(null);
      setIsSelectionMode(false);
      setShowChapterNote(false);
      setShowVerseNote(false);
      setShowFeedbackModal(false);
    } catch (error) {
      setChapterStatus("error");
      setChapterError(error instanceof Error ? error.message : "본문을 불러오지 못했습니다.");
      setVerses([]);
    }
  }, [activeUserId, apiClient, bookId, chapter]);

  useEffect(() => {
    void loadChapter();
  }, [loadChapter]);

  useEffect(() => {
    if (!verses.length) {
      return;
    }

    if (currentReadingVerseId) {
      return;
    }

    const progressMatchesChapter = userData.progress?.bookId === bookId && userData.progress.chapter === chapter;
    const targetVerse = progressMatchesChapter
      ? verses.find((verse) => verse.verse === userData.progress?.verse) ?? verses[0]
      : verses[0];

    setCurrentReadingVerseId(targetVerse.id);
    if (progressMatchesChapter && !selectedVerseId) {
      setSelectedVerseId(targetVerse.id);
    }
  }, [bookId, chapter, currentReadingVerseId, selectedVerseId, userData.progress, verses]);

  useEffect(() => {
    const targetVerseIds = new Set([
      ...userData.highlights.map((highlight) => highlight.verseId),
      ...userData.favoriteVerses.map((favorite) => favorite.verseId),
    ]);
    const missingVerseIds = Array.from(targetVerseIds)
      .filter((verseId) => !knownVerses.has(verseId) && !pendingStoredVerseFetchesRef.current.has(verseId))
      .slice(0, 24);

    for (const verseId of missingVerseIds) {
      pendingStoredVerseFetchesRef.current.add(verseId);
      apiClient.fetchBibleVerse(verseId)
        .then((response) => {
          setStoredVerses((current) => current[response.verse.id] ? current : { ...current, [response.verse.id]: response.verse });
        })
        .catch(() => undefined)
        .finally(() => pendingStoredVerseFetchesRef.current.delete(verseId));
    }
  }, [apiClient, knownVerses, userData.favoriteVerses, userData.highlights]);

  useEffect(() => {
    setNoteDraft(selectedNote?.note ?? "");
  }, [selectedNote?.note, selectedVerseId]);

  useEffect(() => {
    setChapterNoteDraft(chapterNote?.note ?? "");
  }, [chapterNote?.note, bookId, chapter]);

  useEffect(() => {
    if (!selectedPersonalNote) {
      setSelectedPersonalNoteId(null);
      setPersonalNoteTitle("");
      setPersonalNoteDocument(markdownLiteToPersonalNoteDocument(""));
      setPersonalNoteTagInput("");
      return;
    }

    setSelectedPersonalNoteId(selectedPersonalNote.id);
    setPersonalNoteTitle(selectedPersonalNote.title);
    setPersonalNoteDocument(normalizePersonalNoteDocument(selectedPersonalNote.bodyDocument, selectedPersonalNote.bodyMarkdown));
    setPersonalNoteTagInput(
      userData.personalNoteTags
        .filter((tagLink) => tagLink.noteId === selectedPersonalNote.id)
        .map((tagLink) => userData.tags.find((tag) => tag.id === tagLink.tagId)?.name)
        .filter(Boolean)
        .join(", "),
    );
  }, [selectedPersonalNote?.id, selectedPersonalNote?.title, selectedPersonalNote?.bodyDocument, selectedPersonalNote?.bodyMarkdown, userData.personalNoteTags, userData.tags]);

  const setReadingLanguage = (language: TranslationLanguage) => {
    updateSettings({ defaultTranslation: language });
  };

  const updateSettings = (settings: Partial<UserDataState["settings"]>) => {
    setUserData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...settings,
      },
    }));
  };

  const navigateChapter = (direction: -1 | 1) => {
    const adjacent = getAdjacentChapter(bookId, chapter, direction);
    if (!adjacent) {
      return;
    }
    setBookId(adjacent.bookId);
    setChapter(adjacent.chapter);
  };

  const openChapterPicker = () => {
    setChapterPickerBookId(bookId);
    setIsChapterPickerBookMenuOpen(false);
    setIsChapterPickerOpen(true);
  };

  const selectChapterFromPicker = (nextChapter: number) => {
    setBookId(chapterPickerBookId);
    setChapter(nextChapter);
    setIsChapterPickerBookMenuOpen(false);
    setIsChapterPickerOpen(false);
  };

  const executeSearch = useCallback(async (rawQuery: string, showValidation = false) => {
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) {
      setSearchError(showValidation ? "두 글자 이상 입력하세요." : "");
      setSearchResults([]);
      setSearchTotal(0);
      setSearchStatus("idle");
      return;
    }

    setSearchStatus("loading");
    setSearchError("");

    try {
      const response = await apiClient.searchBibleVerses(trimmed, {
        bookId: searchBookFilter,
        lang: searchLanguage,
        sort: searchSort,
        testament: searchTestament,
        limit: 50,
      });
      setSearchResults(response.verses);
      setSearchTotal(response.total ?? response.verses.length);
      setSearchStatus("ready");
    } catch (error) {
      setSearchStatus("error");
      setSearchError(error instanceof Error ? error.message : "검색에 실패했습니다.");
      setSearchResults([]);
      setSearchTotal(0);
    }
  }, [apiClient, searchBookFilter, searchLanguage, searchSort, searchTestament]);

  const runSearch = useCallback(() => {
    void executeSearch(query, true);
  }, [executeSearch, query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError("");
      setSearchResults([]);
      setSearchTotal(0);
      setSearchStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      void executeSearch(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [executeSearch, query]);

  const openVerse = (verse: Verse) => {
    pendingSelectedVerseIdRef.current = verse.id;
    setBookId(verse.bookId);
    setChapter(verse.chapter);
    setSelectedVerseId(verse.id);
    setCurrentReadingVerseId(verse.id);
    setActiveView("reader");
  };

  const createFavoriteList = (name: string, now = new Date().toISOString()): FavoriteList => ({
    id: createId("favorite-list"),
    userId: activeUserId,
    name,
    createdAt: now,
    updatedAt: now,
  });

  const toggleFavoriteListSelection = (listId: string) => {
    setFavoriteListSelection((current) => (current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId]));
  };

  const createFavoriteListFromModal = () => {
    const name = newFavoriteListName.trim();
    if (!name) {
      return;
    }

    const existing = userData.favoriteLists.find((list) => list.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"));
    if (existing) {
      setFavoriteListSelection((current) => (current.includes(existing.id) ? current : [...current, existing.id]));
      setSelectedFavoriteListId(existing.id);
      setNewFavoriteListName("");
      return;
    }

    const list = createFavoriteList(name);
    setUserData((current) => ({
      ...current,
      favoriteLists: [...current.favoriteLists, list],
    }));
    setFavoriteListSelection((current) => (current.includes(list.id) ? current : [...current, list.id]));
    setSelectedFavoriteListId(list.id);
    setNewFavoriteListName("");
  };

  const openFavoriteModal = (targetVerses: Verse[]) => {
    if (!targetVerses.length) {
      return;
    }

    const existing = targetVerses.length === 1
      ? userData.favoriteVerses.find((favorite) => favorite.verseId === targetVerses[0].id)
      : null;
    const nextSelection = existing?.listIds.length
      ? existing.listIds
      : [userData.favoriteLists[0]?.id ?? defaultFavoriteListId];
    const tagNames = existing
      ? existing.tagIds
          .map((tagId) => userData.tags.find((tag) => tag.id === tagId)?.name)
          .filter(Boolean)
          .join(", ")
      : "구원, 복음";

    setFavoriteTargetVerseIds(targetVerses.map((verse) => verse.id));
    setFavoriteTitle(existing?.title ?? "");
    setFavoriteMemo(existing?.memo ?? "");
    setFavoriteTagInput(tagNames);
    setFavoriteListSelection(nextSelection);
    setNewFavoriteListName("");
    setShowFavoriteModal(true);
  };

  const closeFavoriteModal = () => {
    setShowFavoriteModal(false);
    setFavoriteTargetVerseIds([]);
  };

  const saveFavorite = () => {
    if (!favoriteTargetVerses.length) {
      return;
    }

    if (!favoriteListSelection.length) {
      setCopyStatus("인용 목록을 1개 이상 선택하세요.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    const tagNames = favoriteTagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setUserData((current) => {
      const now = new Date().toISOString();
      const nextTags = [...current.tags];
      const validListIds = favoriteListSelection.filter((listId) => current.favoriteLists.some((list) => list.id === listId));
      const listIds = validListIds.length ? validListIds : [current.favoriteLists[0]?.id ?? defaultFavoriteListId];
      const tagIds = tagNames.map((name) => {
        const existingTag = nextTags.find((tag) => tag.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"));
        if (existingTag) {
          return existingTag.id;
        }

        const tag: Tag = {
          id: createId("tag"),
          userId: activeUserId,
          name,
          createdAt: now,
        };
        nextTags.push(tag);
        return tag.id;
      });

      const targetIds = new Set(favoriteTargetVerses.map((verse) => verse.id));
      const updatedFavorites = current.favoriteVerses.map((favorite) => {
        const verse = favoriteTargetVerses.find((item) => item.id === favorite.verseId);
        if (!verse) {
          return favorite;
        }

        return {
          ...favorite,
          title: favoriteTargetVerses.length === 1 && favoriteTitle.trim() ? favoriteTitle.trim() : formatReference(verse),
          memo: favoriteMemo,
          tagIds,
          listIds,
          updatedAt: now,
        };
      });
      const existingIds = new Set(current.favoriteVerses.filter((favorite) => targetIds.has(favorite.verseId)).map((favorite) => favorite.verseId));
      const additions = favoriteTargetVerses
        .filter((verse) => !existingIds.has(verse.id))
        .map((verse) => ({
          id: createId("favorite"),
          userId: activeUserId,
          verseId: verse.id,
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          title: favoriteTargetVerses.length === 1 && favoriteTitle.trim() ? favoriteTitle.trim() : formatReference(verse),
          memo: favoriteMemo,
          usageCount: 0,
          tagIds,
          listIds,
          createdAt: now,
          updatedAt: now,
        }));

      return {
        ...current,
        tags: nextTags,
        favoriteVerses: [...additions, ...updatedFavorites],
      };
    });
    setCopyStatus(`${favoriteTargetVerses.length}개 인용 저장 완료`);
    setTimeout(() => setCopyStatus(""), 1600);
    closeFavoriteModal();
  };

  const removeHighlight = (verseId: string) => {
    setUserData((current) => ({
      ...current,
      highlights: current.highlights.filter((highlight) => highlight.verseId !== verseId),
    }));
  };

  const removeFavorite = (favoriteId: string) => {
    setUserData((current) => ({
      ...current,
      favoriteVerses: current.favoriteVerses.filter((favorite) => favorite.id !== favoriteId),
    }));
  };

  const confirmDeleteFavoriteList = () => {
    const listId = pendingDeleteFavoriteListId;
    if (!listId) {
      return;
    }

    setUserData((current) => {
      const remainingLists = current.favoriteLists.filter((list) => list.id !== listId);
      const now = new Date().toISOString();
      const nextLists = remainingLists.length
        ? remainingLists
        : [
            {
              id: defaultFavoriteListId,
              userId: activeUserId,
              name: "기본 목록",
              createdAt: now,
              updatedAt: now,
            },
          ];
      const nextFavorites = current.favoriteVerses
        .map((favorite) =>
          favorite.listIds.includes(listId)
            ? {
                ...favorite,
                listIds: favorite.listIds.filter((id) => id !== listId),
                updatedAt: now,
              }
            : favorite,
        )
        .filter((favorite) => favorite.listIds.length > 0);

      setSelectedFavoriteListId(nextLists[0].id);
      return {
        ...current,
        favoriteLists: nextLists,
        favoriteVerses: nextFavorites,
      };
    });
    setPendingDeleteFavoriteListId(null);
  };

  const resolveStoredVerse = useCallback(
    async (verseId: string) => {
      const knownVerse = knownVerses.get(verseId);
      if (knownVerse) {
        return knownVerse;
      }

      const response = await apiClient.fetchBibleVerse(verseId);
      setStoredVerses((current) => current[response.verse.id] ? current : { ...current, [response.verse.id]: response.verse });
      return response.verse;
    },
    [apiClient, knownVerses],
  );

  const copyFavoriteList = async () => {
    if (!selectedFavoriteList || !selectedListFavorites.length) {
      setCopyStatus("복사할 인용 구절이 없습니다.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    const resolvedVerses = (
      await Promise.all(selectedListFavorites.map((favorite) => resolveStoredVerse(favorite.verseId).catch(() => null)))
    ).filter((verse): verse is Verse => Boolean(verse));

    if (!resolvedVerses.length) {
      setCopyStatus("목록 구절을 불러오지 못했습니다.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    const text = [
      `[${selectedFavoriteList.name}]`,
      ...resolvedVerses.map((verse) => `${getVerseDisplayText(verse, readingLanguage)}\n${formatReference(verse)}`),
    ].join("\n\n");
    await Clipboard.setStringAsync(text);
    const copiedFavoriteIds = new Set(selectedListFavorites.map((favorite) => favorite.id));
    setUserData((current) => ({
      ...current,
      favoriteVerses: current.favoriteVerses.map((favorite) =>
        copiedFavoriteIds.has(favorite.id) ? { ...favorite, usageCount: favorite.usageCount + 1 } : favorite,
      ),
    }));
    setCopyStatus(`${selectedFavoriteList.name} 목록 복사 완료`);
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const saveNote = () => {
    if (!selectedVerse) {
      return;
    }

    const trimmed = noteDraft.trim();
    setUserData((current) => {
      const now = new Date().toISOString();
      const rest = current.studyNotes.filter((note) => note.verseId !== selectedVerse.id);

      if (!trimmed) {
        return {
          ...current,
          studyNotes: rest,
        };
      }

      return {
        ...current,
        studyNotes: [
          {
            id: selectedNote?.id ?? createId("note"),
            userId: activeUserId,
            scope: "verse",
            bookId: selectedVerse.bookId,
            chapter: selectedVerse.chapter,
            verse: selectedVerse.verse,
            verseId: selectedVerse.id,
            note: trimmed,
            createdAt: selectedNote?.createdAt ?? now,
            updatedAt: now,
          },
          ...rest,
        ],
      };
    });
    setCopyStatus(trimmed ? "구절 노트 저장됨" : "구절 노트 삭제됨");
    setShowVerseNote(false);
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const deleteVerseNote = () => {
    if (!selectedVerse) {
      return;
    }

    setUserData((current) => ({
      ...current,
      studyNotes: current.studyNotes.filter((note) => note.verseId !== selectedVerse.id),
    }));
    setNoteDraft("");
    setCopyStatus("구절 노트 삭제됨");
    setShowVerseNote(false);
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const saveChapterNote = () => {
    const trimmed = chapterNoteDraft.trim();
    setUserData((current) => {
      const now = new Date().toISOString();
      const rest = current.studyNotes.filter(
        (note) => !(note.scope === "chapter" && note.bookId === bookId && note.chapter === chapter),
      );

      if (!trimmed) {
        return {
          ...current,
          studyNotes: rest,
        };
      }

      return {
        ...current,
        studyNotes: [
          {
            id: chapterNote?.id ?? createId("note"),
            userId: activeUserId,
            scope: "chapter",
            bookId,
            chapter,
            note: trimmed,
            createdAt: chapterNote?.createdAt ?? now,
            updatedAt: now,
          },
          ...rest,
        ],
      };
    });
    setCopyStatus("장 노트 저장됨");
    setShowChapterNote(false);
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const deleteChapterNote = () => {
    setUserData((current) => ({
      ...current,
      studyNotes: current.studyNotes.filter(
        (note) => !(note.scope === "chapter" && note.bookId === bookId && note.chapter === chapter),
      ),
    }));
    setChapterNoteDraft("");
    setCopyStatus("장 노트 삭제됨");
    setShowChapterNote(false);
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const openNewPersonalNote = (
    linkedVerses: Verse[] = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [],
    initial?: { bodyMarkdown?: string; tagInput?: string; title?: string },
  ) => {
    const now = new Date().toISOString();
    const noteId = createId("personal-note");
    const title =
      initial?.title ??
      (linkedVerses.length === 1
        ? `${formatReference(linkedVerses[0])} 노트`
        : linkedVerses.length > 1
          ? `${linkedVerses.length}개 구절 노트`
          : "새 성경노트");
    const bodyMarkdown = initial?.bodyMarkdown ?? "";
    const note: PersonalNote = {
      id: noteId,
      userId: activeUserId,
      title,
      bodyMarkdown,
      bodyText: bodyMarkdown.replace(/[#*_>`-]/g, " ").replace(/\s+/g, " ").trim(),
      bodyDocument: markdownLiteToPersonalNoteDocument(bodyMarkdown),
      editorFormat: "rich-text-v1",
      status: "active",
      pinned: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
    };

    setUserData((current) => ({
      ...current,
      personalNotes: [note, ...current.personalNotes],
      personalNoteVerseLinks: [
        ...linkedVerses.map((verse, index) => ({
          id: createId("note-link"),
          userId: activeUserId,
          noteId,
          verseKey: verse.id,
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          selectedText: getVerseDisplayText(verse, readingLanguage),
          source: "reader" as const,
          linkOrder: index,
          createdAt: now,
        })),
        ...current.personalNoteVerseLinks,
      ],
    }));
    setSelectedPersonalNoteId(noteId);
    setPersonalNoteTitle(title);
    setPersonalNoteDocument(markdownLiteToPersonalNoteDocument(bodyMarkdown));
    setPersonalNoteTagInput(initial?.tagInput ?? "");
    setActiveView("notes");
    setReaderSelectionMode(false);
  };

  const savePersonalNote = () => {
    const now = new Date().toISOString();
    const existingId = selectedPersonalNote?.id ?? selectedPersonalNoteId ?? createId("personal-note");
    const title = personalNoteTitle.trim() || "제목 없는 성경노트";
    const bodyMarkdown = personalNoteDocumentToMarkdown(personalNoteDocument);
    const bodyText = personalNoteDocumentToText(personalNoteDocument);
    const tagNames = personalNoteTagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setUserData((current) => {
      const nextTags = [...current.tags];
      const tagIds = tagNames.map((name) => {
        const existingTag = nextTags.find((tag) => tag.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"));
        if (existingTag) {
          return existingTag.id;
        }

        const tag: Tag = {
          id: createId("tag"),
          userId: activeUserId,
          name,
          createdAt: now,
        };
        nextTags.push(tag);
        return tag.id;
      });
      const existingNote = current.personalNotes.find((note) => note.id === existingId);
      const nextNote: PersonalNote = {
        id: existingId,
        userId: activeUserId,
        title,
        bodyMarkdown,
        bodyText,
        bodyDocument: personalNoteDocument,
        editorFormat: "rich-text-v1",
        status: "active",
        pinned: existingNote?.pinned ?? false,
        revision: existingNote?.revision ?? 1,
        createdAt: existingNote?.createdAt ?? now,
        updatedAt: now,
        lastSavedAt: now,
      };

      return {
        ...current,
        tags: nextTags,
        personalNotes: [nextNote, ...current.personalNotes.filter((note) => note.id !== existingId)],
        personalNoteTags: [
          ...tagIds.map((tagId) => ({
            userId: activeUserId,
            noteId: existingId,
            tagId,
            createdAt: now,
          })),
          ...current.personalNoteTags.filter((tagLink) => tagLink.noteId !== existingId),
        ],
      };
    });
    setSelectedPersonalNoteId(existingId);
    setCopyStatus("성경노트 저장됨");
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const addPersonalNoteVerseReference = (suggestion: { bookId: string; chapter: number; verse: number; verseKey: string }) => {
    const noteId = selectedPersonalNote?.id;
    if (!noteId) return;
    setUserData((current) => {
      if (current.personalNoteVerseLinks.some((link) => link.noteId === noteId && link.verseKey === suggestion.verseKey)) return current;
      const now = new Date().toISOString();
      return {
        ...current,
        personalNoteVerseLinks: [
          ...current.personalNoteVerseLinks,
          {
            id: createId("note-link"),
            userId: activeUserId,
            noteId,
            verseKey: suggestion.verseKey,
            bookId: suggestion.bookId,
            chapter: suggestion.chapter,
            verse: suggestion.verse,
            source: "inline-tag" as const,
            linkOrder: current.personalNoteVerseLinks.filter((link) => link.noteId === noteId).length * 10 + 10,
            createdAt: now,
          },
        ],
      };
    });
    setCopyStatus("구절 태그 추가됨 · 저장 필요");
  };

  const deletePersonalNote = () => {
    const noteId = selectedPersonalNote?.id;
    if (!noteId) {
      return;
    }

    setUserData((current) => ({
      ...current,
      personalNotes: current.personalNotes.filter((note) => note.id !== noteId),
      personalNoteTags: current.personalNoteTags.filter((tagLink) => tagLink.noteId !== noteId),
      personalNoteVerseLinks: current.personalNoteVerseLinks.filter((link) => link.noteId !== noteId),
      verseTags: current.verseTags.filter((tag) => tag.sourceNoteId !== noteId),
    }));
    setSelectedPersonalNoteId(null);
    setPersonalNoteTitle("");
    setPersonalNoteDocument(markdownLiteToPersonalNoteDocument(""));
    setPersonalNoteTagInput("");
    setCopyStatus("성경노트 삭제됨");
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const clearVerseSelection = () => {
    setSelectedVerseIds([]);
    setSelectionAnchorVerseId(null);
  };

  const setReaderSelectionMode = (nextMode: boolean) => {
    setIsSelectionMode(nextMode);
    if (!nextMode) {
      clearVerseSelection();
    }
  };

  const selectVerseForBatch = (verse: Verse) => {
    setSelectedVerseId(verse.id);

    if (!selectionAnchorVerseId || !selectedVerseIds.length) {
      setSelectionAnchorVerseId(verse.id);
      setSelectedVerseIds([verse.id]);
      return;
    }

    const anchorIndex = verses.findIndex((item) => item.id === selectionAnchorVerseId);
    const targetIndex = verses.findIndex((item) => item.id === verse.id);
    if (anchorIndex >= 0 && targetIndex >= 0 && anchorIndex !== targetIndex) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      setSelectedVerseIds(verses.slice(start, end + 1).map((item) => item.id));
      return;
    }

    setSelectedVerseIds((current) =>
      current.includes(verse.id) ? current.filter((verseId) => verseId !== verse.id) : [...current, verse.id],
    );
    setCurrentReadingVerseId(verse.id);
  };

  const selectReaderVerse = (verse: Verse) => {
    if (isSelectionMode) {
      selectVerseForBatch(verse);
      return;
    }

    setSelectedVerseId(verse.id);
    setCurrentReadingVerseId(verse.id);
    setUserData((current) => upsertRecentRead(current, activeUserId, verse.bookId, verse.chapter, verse.verse));
  };

  const cycleTtsSpeed = () => {
    const currentIndex = ttsSpeedOptions.findIndex((speed) => speed === userData.settings.ttsSpeed);
    const nextSpeed = ttsSpeedOptions[(currentIndex + 1) % ttsSpeedOptions.length] ?? 1;
    updateSettings({ ttsSpeed: nextSpeed });
  };

  const cycleTtsVoice = () => {
    const currentIndex = ttsVoiceChoices.findIndex((choice) => choice.value === userData.settings.ttsVoice);
    const nextVoice = ttsVoiceChoices[(currentIndex + 1) % ttsVoiceChoices.length] ?? ttsVoiceChoices[0];
    updateSettings({ ttsVoice: nextVoice.value });
  };

  const cycleReadingMode = () => {
    const currentIndex = readingModeOptions.findIndex((option) => option.value === userData.settings.readingMode);
    const nextMode = readingModeOptions[(currentIndex + 1) % readingModeOptions.length] ?? readingModeOptions[0];
    updateSettings({ readingMode: nextMode.value });
  };

  const recordVerseLayout = (verseId: string, event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    verseLayoutsRef.current.set(verseId, { height, y });
  };

  const handleContentScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeView !== "reader" || !verses.length) {
      return;
    }

    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const readingLine = contentOffset.y + Math.min(layoutMeasurement.height * 0.45, 360);
    const nextVerse = verses.find((verse) => {
      const layout = verseLayoutsRef.current.get(verse.id);
      return layout ? layout.y <= readingLine && layout.y + layout.height >= readingLine : false;
    }) ?? verses.find((verse) => {
      const layout = verseLayoutsRef.current.get(verse.id);
      return layout ? layout.y + layout.height >= readingLine : false;
    }) ?? verses[verses.length - 1];

    if (nextVerse && nextVerse.id !== currentReadingVerseId) {
      setCurrentReadingVerseId(nextVerse.id);
    }
  };

  const markChapterComplete = () => {
    setUserData((current) => {
      const key = chapterKey(bookId, chapter);
      const exists = current.completedChapters.some((item) => chapterKey(item.bookId, item.chapter) === key);
      if (exists) {
        return {
          ...current,
          completedChapters: current.completedChapters.filter((item) => chapterKey(item.bookId, item.chapter) !== key),
        };
      }

      return {
        ...current,
        completedChapters: [
          {
            id: createId("completed"),
            userId: activeUserId,
            bookId,
            chapter,
            completedAt: new Date().toISOString(),
          },
          ...current.completedChapters,
        ],
      };
    });
  };

  const speakQueueAtIndex = (index: number) => {
    const queue = speechQueueRef.current;
    const item = queue[index];
    if (!item?.text.trim()) {
      return;
    }

    const language = readingLanguage === "ko" ? "ko-KR" : "en-US";
    const voice = selectedTtsVoice?.identifier || userData.settings.ttsVoice || undefined;

    speechIndexRef.current = index;
    setSpeakingVerseId(item.id ?? null);
    setCurrentReadingVerseId(item.id ?? null);
    setTtsPlaybackState("playing");
    setTtsStatus(`${item.label} 재생 중`);
    Speech.speak(item.text, {
      language,
      onDone: () => {
        if (speechCancelRef.current) {
          return;
        }
        const nextIndex = index + 1;
        if (nextIndex < speechQueueRef.current.length) {
          speakQueueAtIndex(nextIndex);
          return;
        }
        if (userData.settings.ttsRepeat && speechQueueRef.current.length) {
          speakQueueAtIndex(0);
          return;
        }
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus(`${ttsQueueLabel} 완료`);
      },
      onError: () => {
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus("TTS 재생 오류");
      },
      onStart: () => {
        setTtsPlaybackState("playing");
        setTtsStatus(`${item.label} 재생 중`);
      },
      onStopped: () => {
        if (speechCancelRef.current) {
          return;
        }
        setSpeakingVerseId(null);
        setTtsPlaybackState("idle");
        setTtsStatus("정지");
      },
      rate: userData.settings.ttsSpeed,
      voice,
    });
  };

  const playSpeechQueue = (items: SpeechQueueItem[], startIndex = 0, label = "재생 목록") => {
    const queue = items.filter((item) => item.text.trim());
    if (!queue.length) {
      return;
    }

    speechCancelRef.current = true;
    void Speech.stop().finally(() => {
      speechCancelRef.current = false;
      speechQueueRef.current = queue;
      setTtsQueueLabel(`${label} · ${queue.length}개`);
      speakQueueAtIndex(Math.min(Math.max(startIndex, 0), queue.length - 1));
    });
  };

  const speakSelectedVerse = () => {
    if (!selectedVerse) {
      return;
    }

    playSpeechQueue(
      [{ id: selectedVerse.id, label: formatReference(selectedVerse), text: getVerseDisplayText(selectedVerse, readingLanguage) }],
      0,
      "선택 구절",
    );
  };

  const speakChapter = () => {
    if (!verses.length) {
      return;
    }

    playSpeechQueue(
      verses.map((verse) => ({ id: verse.id, label: formatReference(verse), text: getVerseDisplayText(verse, readingLanguage) })),
      0,
      "현재 장",
    );
  };

  const speakTodayPlan = async () => {
    if (!readingPlanDay?.chapters.length) {
      setTtsStatus("오늘 분량 없음");
      return;
    }

    setTtsStatus("오늘 분량 불러오는 중");
    try {
      const chapters = await Promise.all(readingPlanDay.chapters.map((item) => apiClient.fetchBibleChapter(item.bookId, item.chapter)));
      const planVerses = chapters.flatMap((chapterResponse) => chapterResponse.verses);
      playSpeechQueue(
        planVerses.map((verse) => ({ id: verse.id, label: formatReference(verse), text: getVerseDisplayText(verse, readingLanguage) })),
        0,
        "오늘 분량",
      );
    } catch {
      setTtsStatus("오늘 분량 재생 실패");
    }
  };

  const pauseOrResumeSpeech = async () => {
    try {
      if (ttsPlaybackState === "paused") {
        await Speech.resume();
        setTtsPlaybackState("playing");
        setTtsStatus("재개");
        return;
      }

      await Speech.pause();
      setTtsPlaybackState("paused");
      setTtsStatus("일시정지");
    } catch {
      setTtsStatus("이 플랫폼에서는 일시정지를 지원하지 않습니다.");
    }
  };

  const stopSpeech = async () => {
    speechCancelRef.current = true;
    await Speech.stop();
    speechCancelRef.current = false;
    setSpeakingVerseId(null);
    setTtsPlaybackState("idle");
    setTtsStatus("정지");
  };

  const moveSpeech = async (direction: -1 | 1) => {
    if (!speechQueueRef.current.length) {
      return;
    }

    const nextIndex = Math.min(Math.max(speechIndexRef.current + direction, 0), speechQueueRef.current.length - 1);
    speechCancelRef.current = true;
    await Speech.stop();
    speechCancelRef.current = false;
    speakQueueAtIndex(nextIndex);
  };

  const copySelectedVerse = async () => {
    if (!selectedVerse) {
      return;
    }

    await Clipboard.setStringAsync(`${getVerseDisplayText(selectedVerse, readingLanguage)}\n${formatReference(selectedVerse)}`);
    setCopyStatus("복사됨");
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const copySelectedVerses = async () => {
    if (!selectedVerses.length) {
      setCopyStatus("선택된 구절이 없습니다.");
      setTimeout(() => setCopyStatus(""), 3000);
      return;
    }

    await Clipboard.setStringAsync(
      selectedVerses.map((verse) => `${getVerseDisplayText(verse, readingLanguage)}\n${formatReference(verse)}`).join("\n\n"),
    );
    setCopyStatus(`${selectedVerses.length}개 구절 복사 완료`);
    setTimeout(() => setCopyStatus(""), 3000);
  };

  const speakSelectedVerses = () => {
    const speechVerses = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [];
    if (!speechVerses.length) {
      return;
    }

    playSpeechQueue(
      speechVerses.map((verse) => ({ id: verse.id, label: formatReference(verse), text: getVerseDisplayText(verse, readingLanguage) })),
      0,
      selectedVerses.length ? "선택 구절" : formatReference(speechVerses[0]),
    );
  };

  const playCurrentSpeechContext = () => {
    if (selectedVerses.length || selectedVerse) {
      speakSelectedVerses();
      return;
    }

    speakChapter();
  };

  const saveSelectedFavorites = () => {
    if (!selectedVerses.length) {
      setCopyStatus("인용 저장할 구절을 선택하세요.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    setFavoriteTitle("");
    setFavoriteMemo("");
    setFavoriteTagInput("구원, 복음");
    setFavoriteListSelection([userData.favoriteLists[0]?.id ?? defaultFavoriteListId]);
    setNewFavoriteListName("");
    openFavoriteModal(selectedVerses);
  };

  const copyStoredReference = async (verseId: string) => {
    const verse = await resolveStoredVerse(verseId).catch(() => null);
    await Clipboard.setStringAsync(verse ? `${getVerseDisplayText(verse, readingLanguage)}\n${formatReference(verse)}` : verseId);
    setCopyStatus(verse ? `${formatReference(verse)} 복사 완료` : "복사됨");
    setTimeout(() => setCopyStatus(""), 1600);
  };

  const startReadingPlan = (template: ReadingPlanTemplate) => {
    setUserData((current) => ({
      ...current,
      activeReadingPlan: createReadingPlan(activeUserId, template),
    }));
    setActiveView("progress");
  };

  const restartReadingPlan = () => {
    setUserData((current) => {
      if (!current.activeReadingPlan) {
        return current;
      }

      return {
        ...current,
        activeReadingPlan: createReadingPlan(activeUserId, current.activeReadingPlan.template),
      };
    });
  };

  const stopReadingPlan = () => {
    setUserData((current) => ({
      ...current,
      activeReadingPlan: null,
    }));
  };

  const openReadingPlanTarget = () => {
    if (!readingPlanTargetChapter) {
      return;
    }

    setBookId(readingPlanTargetChapter.bookId);
    setChapter(readingPlanTargetChapter.chapter);
    setActiveView("reader");
  };

  const openFirstIncompleteChapter = (targetBookId: string) => {
    const firstIncompleteChapter = getChapters(targetBookId).find((item) => !completedKeys.has(chapterKey(targetBookId, item)))
      ?? getChapters(targetBookId)[0]
      ?? 1;
    setBookId(targetBookId);
    setChapter(firstIncompleteChapter);
    setActiveView("reader");
  };

  const openActivityTarget = (target: { bookId: string; chapter: number; verse?: number }) => {
    setBookId(target.bookId);
    setChapter(target.chapter);
    setActiveView("reader");
  };

  const openStudyNote = (note: UserDataState["studyNotes"][number]) => {
    setBookId(note.bookId);
    setChapter(note.chapter);
    if (note.scope === "verse" && note.verseId) {
      pendingSelectedVerseIdRef.current = note.verseId;
      setSelectedVerseId(note.verseId);
      setCurrentReadingVerseId(note.verseId);
      setNoteDraft(note.note);
      setShowVerseNote(true);
      setActiveView("reader");
      return;
    }

    setChapterNoteDraft(note.note);
    setShowChapterNote(true);
    setActiveView("reader");
  };

  const markReadingPlanDayComplete = () => {
    if (!readingPlanDay) {
      return;
    }

    setUserData((current) => {
      const existing = new Set(current.completedChapters.map((item) => chapterKey(item.bookId, item.chapter)));
      const now = new Date().toISOString();
      const additions = readingPlanDay.chapters
        .filter((item) => !existing.has(chapterKey(item.bookId, item.chapter)))
        .map((item) => ({
          id: createId("completed"),
          userId: activeUserId,
          bookId: item.bookId,
          chapter: item.chapter,
          completedAt: now,
        }));

      return {
        ...current,
        completedChapters: [...current.completedChapters, ...additions],
      };
    });
  };

  const signIn = async () => {
    if (!supabase) {
      setAuthStatus("error");
      setAuthMessage("Expo Supabase 공개 설정이 없습니다.");
      return;
    }

    setAuthStatus("submitting");
    setAuthMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setAuthStatus("error");
      setAuthMessage(error.message);
      return;
    }

    setAuthSession(data.session);
    setAuthUser(data.session?.user ?? null);
    setAuthStatus("success");
    setAuthMessage("로그인되었습니다.");
    setAuthPassword("");
    setShowAuthForm(false);
  };

  const signUp = async () => {
    if (!supabase) {
      setAuthStatus("error");
      setAuthMessage("Expo Supabase 공개 설정이 없습니다.");
      return;
    }

    setAuthStatus("submitting");
    setAuthMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setAuthStatus("error");
      setAuthMessage(error.message);
      return;
    }

    setAuthSession(data.session);
    setAuthUser(data.session?.user ?? null);
    setAuthStatus("success");
    setAuthMessage(data.session ? "가입 후 로그인되었습니다." : "가입 확인 메일을 확인하세요.");
    setAuthPassword("");
    if (data.session) {
      setShowAuthForm(false);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAuthSession(null);
    setAuthUser(null);
    setOnboardingStatus("idle");
    setOnboardingProfile(null);
    setOnboardingMessage("");
    setAuthStatus("idle");
    setAuthMessage("");
    setAuthPassword("");
    setShowAuthForm(false);
    setSyncStatus("idle");
    setSyncMessage("");
    setImportStatus("idle");
    setImportMessage("");
    setHasDeviceDataToImport(false);
    setEntryMode("welcome");
  };

  const importDeviceData = async () => {
    if (!authUser || !supabase) {
      setImportStatus("error");
      setImportMessage("로그인 후 가져올 수 있습니다.");
      return;
    }

    setImportStatus("submitting");
    setImportMessage("");
    try {
      const localData = await loadUserDataFromStorage(AsyncStorage, guestUserId);
      if (!hasImportableUserData(localData)) {
        setHasDeviceDataToImport(false);
        setImportStatus("success");
        setImportMessage("가져올 비회원 데이터가 없습니다.");
        return;
      }

      const merged = mergeUserDataForImport(userData, localData, authUser.id);
      const saved = await saveRemoteUserData(supabase, authUser.id, merged);
      lastSavedRemoteSnapshotRef.current = JSON.stringify(saved);
      setUserData(saved);
      await saveUserDataToStorage(AsyncStorage, authUser.id, saved);
      setHasDeviceDataToImport(false);
      setImportStatus("success");
      setImportMessage("이 기기 데이터를 서버 계정에 병합했습니다.");
      setSyncStatus("ready");
      setSyncMessage("서버 동기화 완료");
    } catch (error) {
      setImportStatus("error");
      setImportMessage(error instanceof Error ? error.message : "이 기기 데이터를 가져오지 못했습니다.");
    }
  };

  const openDeleteAccountModal = () => {
    setDeleteAccountConfirmText("");
    setDeleteAccountStatus("idle");
    setDeleteAccountMessage("");
    setShowDeleteAccountModal(true);
  };

  const deleteAccount = async () => {
    if (!authUser || !authSession?.access_token || !supabase) {
      setDeleteAccountStatus("error");
      setDeleteAccountMessage("로그인 세션을 확인할 수 없습니다.");
      return;
    }

    if (deleteAccountConfirmText.trim() !== "회원탈퇴") {
      setDeleteAccountStatus("error");
      setDeleteAccountMessage("확인 문구를 정확히 입력하세요.");
      return;
    }

    setDeleteAccountStatus("submitting");
    setDeleteAccountMessage("");
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/account`, {
        headers: {
          Authorization: `Bearer ${authSession.access_token}`,
        },
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "삭제 실패");
      }

      await clearUserDataFromStorage(AsyncStorage, authUser.id);
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setAuthSession(null);
      setAuthUser(null);
      setAuthStatus("idle");
      setAuthMessage("계정이 삭제되었습니다.");
      setAuthPassword("");
      setShowAuthForm(false);
      setShowDeleteAccountModal(false);
      setDeleteAccountConfirmText("");
      setDeleteAccountStatus("success");
      setDeleteAccountMessage("");
      setSyncStatus("idle");
      setSyncMessage("");
      setImportStatus("idle");
      setImportMessage("");
      setHasDeviceDataToImport(false);
      setUserData(createInitialUserData(guestUserId));
      lastSavedRemoteSnapshotRef.current = "";
      setActiveView("dashboard");
      setEntryMode("welcome");
    } catch (error) {
      setDeleteAccountStatus("error");
      setDeleteAccountMessage(error instanceof Error ? error.message : "삭제 실패");
    }
  };

  const submitFeedback = async () => {
    if (!selectedVerse?.verseKey) {
      setFeedbackStatus("error");
      setFeedbackMessage("구절 정보가 없습니다.");
      return;
    }

    if (!selectedVerse.textKo) {
      setFeedbackStatus("error");
      setFeedbackMessage("승인된 한국어 번역이 있는 구절만 의견을 보낼 수 있습니다.");
      return;
    }

    if (!authSession?.access_token) {
      setFeedbackStatus("error");
      setFeedbackMessage("번역 의견은 로그인 후 보낼 수 있습니다.");
      return;
    }

    setFeedbackStatus("submitting");
    setFeedbackMessage("");

    try {
      await submitTranslationFeedback(
        {
          issueType: feedbackIssueType,
          selectedText: feedbackSelectedText,
          suggestedText: feedbackSuggestedText,
          userComment: feedbackComment,
          verseKey: selectedVerse.verseKey,
        },
        {
          accessToken: authSession.access_token,
          baseUrl: apiBaseUrl,
        },
      );
      setFeedbackStatus("success");
      setFeedbackMessage("번역 의견이 접수되었습니다.");
      setFeedbackSelectedText("");
      setFeedbackSuggestedText("");
      setFeedbackComment("");
      setShowFeedbackModal(false);
      setCopyStatus("번역 의견 접수 완료");
      setTimeout(() => setCopyStatus(""), 1600);
    } catch (error) {
      setFeedbackStatus("error");
      setFeedbackMessage(error instanceof Error ? error.message : "번역 의견을 저장하지 못했습니다.");
    }
  };

  const openFeedbackModal = () => {
    if (!selectedVerse?.textKo) {
      setCopyStatus("승인된 한국어 번역이 없습니다.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    if (!authSession?.access_token) {
      setCopyStatus("번역 의견은 로그인 후 보낼 수 있습니다.");
      setTimeout(() => setCopyStatus(""), 1600);
      return;
    }

    setFeedbackStatus("idle");
    setFeedbackMessage("");
    setShowFeedbackModal(true);
  };

  const clearLocalData = () => {
    Alert.alert("로컬 데이터 초기화", "이 기기의 하이라이트, 노트, 즐겨찾기를 초기화할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "초기화",
        style: "destructive",
        onPress: () => setUserData(createInitialUserData(activeUserId)),
      },
    ]);
  };

  const runQuickMoveCommand = (action: () => void) => {
    setIsQuickMoveOpen(false);
    setCommandQuery("");
    action();
  };

  const quickMoveCommands = [
    {
      label: "이어 읽기",
      description: userData.progress ? `${getBook(userData.progress.bookId)?.nameKo ?? userData.progress.bookId} ${userData.progress.chapter}장` : "창세기 1장",
      action: () => {
        if (userData.progress) {
          setBookId(userData.progress.bookId);
          setChapter(userData.progress.chapter);
        } else {
          setBookId("gen");
          setChapter(1);
        }
        setActiveView("reader");
      },
    },
    {
      label: "오늘 통독 분량 열기",
      description: readingPlanDay ? formatPlanChapters(readingPlanDay.chapters) : "통독 플랜 없음",
      action: openReadingPlanTarget,
      disabled: !readingPlanDay,
    },
    { label: "홈 · 오늘", description: "이어 읽기와 오늘 분량", action: () => { setHomeTab("today"); setActiveView("dashboard"); } },
    { label: "홈 · 통독", description: "통독률과 권별 진행", action: () => { setHomeTab("progress"); setActiveView("dashboard"); } },
    { label: "홈 · 활동", description: "최근 읽기와 작업", action: () => { setHomeTab("activity"); setActiveView("dashboard"); } },
    { label: "홈 · 공부", description: "노트, 태그, 인용 요약", action: () => { setHomeTab("study"); setActiveView("dashboard"); } },
    { label: "성경 리더", description: "본문 읽기", action: () => setActiveView("reader") },
    { label: "장 선택", description: `${currentBook.nameKo} ${chapter}장`, action: () => { setActiveView("reader"); openChapterPicker(); } },
    { label: "통독 진척도", description: "권별 진행률", action: () => setActiveView("progress") },
    { label: "강조 구절", description: "색상별 표시", action: () => setActiveView("highlights") },
    { label: "인용 보관함", description: "목록과 복사", action: () => setActiveView("favorites") },
    { label: "검색", description: "KJV 본문 검색", action: () => setActiveView("search") },
    { label: "성경노트", description: "개인 노트와 구절 링크", action: () => setActiveView("notes") },
    { label: "히브리어 사전", description: "원어, 발음, 한영 뜻, 출현 구절", action: () => setActiveView("dictionary") },
    { label: "설정", description: "읽기와 TTS", action: () => setActiveView("settings") },
    { label: "현재 장 노트", description: `${currentBook.nameKo} ${chapter}장`, action: () => { setActiveView("reader"); setShowChapterNote(true); } },
  ].filter((command) => {
    const normalizedQuery = commandQuery.trim().toLocaleLowerCase("ko-KR");
    if (!normalizedQuery) {
      return true;
    }
    return `${command.label} ${command.description}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
  });

  const activeSearchSelectConfig = activeSearchSelect
    ? {
        book: {
          options: searchBookSelectOptions,
          selectedValue: searchBookFilter,
          title: "성경 권",
        },
        language: {
          options: (["ko", "en", "all"] as BibleSearchLanguage[]).map((language) => ({
            label: searchLanguageLabels[language],
            value: language,
          })),
          selectedValue: searchLanguage,
          title: "언어",
        },
        sort: {
          options: [
            { label: "성경 순서", value: "canonical" },
            { label: "관련도", value: "relevance" },
          ],
          selectedValue: searchSort,
          title: "정렬",
        },
        testament: {
          options: [
            { label: "전체", value: "all" },
            { label: "구약", value: "OT" },
            { label: "신약", value: "NT" },
          ],
          selectedValue: searchTestament,
          title: "범위",
        },
      }[activeSearchSelect]
    : null;

  const selectSearchOption = (value: string) => {
    if (activeSearchSelect === "language") {
      setSearchLanguage(value as BibleSearchLanguage);
    }
    if (activeSearchSelect === "sort") {
      setSearchSort(value as BibleSearchSort);
    }
    if (activeSearchSelect === "testament") {
      setSearchTestament(value as "all" | "OT" | "NT");
      setSearchBookFilter("all");
    }
    if (activeSearchSelect === "book") {
      setSearchBookFilter(value);
    }
    setActiveSearchSelect(null);
  };

  const resetAuthEntryFeedback = () => {
    setAuthStatus("idle");
    setAuthMessage("");
    setAuthPassword("");
  };

  const openAuthEntryForm = (mode: AuthCredentialMode) => {
    resetAuthEntryFeedback();
    setEntryMode(mode);
  };

  const returnToWelcome = () => {
    resetAuthEntryFeedback();
    setEntryMode("welcome");
  };

  const continueAsGuest = () => {
    resetAuthEntryFeedback();
    setActiveView("dashboard");
    setHomeTab("today");
    setEntryMode("guest");
  };

  if (!authReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={styles.authLoadingScreen}>
            <Text style={styles.authEntryTitle}>KJV 리더노트</Text>
            <Text style={styles.authEntrySubtitle}>by CrossWire KJV 3.1</Text>
            <ActivityIndicator color={colors.accent} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!authUser && entryMode !== "guest") {
    const credentialMode = entryMode === "sign-up" ? "sign-up" : "login";

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
            <ScrollView contentContainerStyle={styles.authEntryScreen} keyboardShouldPersistTaps="handled">
              <View style={styles.authBrandBlock}>
                <View style={styles.authBrandMark}>
                  <Icon color={colors.accent} name="book-outline" size={30} />
                </View>
                <Text style={styles.authEntryTitle}>KJV 리더노트</Text>
                <Text style={styles.authEntrySubtitle}>by CrossWire KJV 3.1</Text>
              </View>

              {entryMode === "welcome" ? (
                <View style={styles.authEntryBottom}>
                  <View style={styles.authEntryLinkRow}>
                    <Pressable onPress={() => openAuthEntryForm("login")} style={styles.authEntryTextButton}>
                      <Text style={styles.authEntryTextButtonLabel}>로그인</Text>
                    </Pressable>
                    <Text style={styles.authEntrySeparator}>|</Text>
                    <Pressable onPress={() => openAuthEntryForm("sign-up")} style={styles.authEntryTextButton}>
                      <Text style={styles.authEntryTextButtonLabel}>회원가입</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={continueAsGuest} style={styles.authGuestButton}>
                    <Icon color="#fff" name="book-outline" size={18} />
                    <Text style={styles.authGuestButtonText}>비회원 리더 로그인</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.authEntryPanel}>
                  <View style={styles.authEntryPanelHeader}>
                    <View>
                      <Text style={styles.authEntryFormTitle}>{credentialMode === "login" ? "로그인" : "회원가입"}</Text>
                      <Text style={styles.authEntryFormCopy}>
                        {credentialMode === "login" ? "계정으로 통독 기록을 이어갑니다." : "이메일 계정으로 리더노트를 시작합니다."}
                      </Text>
                    </View>
                    <Pressable onPress={returnToWelcome} style={styles.authEntryBackButton}>
                      <Text style={styles.authEntryBackButtonText}>처음으로</Text>
                    </Pressable>
                  </View>
                  <AuthCredentialForm
                    authEmail={authEmail}
                    authMessage={authMessage}
                    authPassword={authPassword}
                    authStatus={authStatus}
                    mode={credentialMode}
                    onChangeEmail={setAuthEmail}
                    onChangePassword={setAuthPassword}
                    onPrivacyPress={credentialMode === "sign-up" ? () => setShowPrivacyPolicy(true) : undefined}
                    onSubmit={credentialMode === "login" ? signIn : signUp}
                    styles={styles}
                    supabaseAvailable={Boolean(supabase)}
                  />
                </View>
              )}
            </ScrollView>
            {showPrivacyPolicy ? <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} styles={styles} /> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authUser && onboardingStatus !== "complete") {
    if (onboardingStatus === "required" && authSession?.access_token) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <OnboardingScreen
              accessToken={authSession.access_token}
              apiBaseUrl={apiBaseUrl}
              email={authUser.email ?? ""}
              onComplete={(profile) => {
                setOnboardingProfile(profile);
                setOnboardingStatus("complete");
              }}
              onSignOut={() => { void signOut(); }}
              theme={colors}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    if (onboardingStatus === "error") {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <View style={styles.authLoadingScreen}>
              <Text style={styles.authEntryTitle}>프로필 확인 오류</Text>
              <Text style={styles.errorText}>{onboardingMessage}</Text>
              <Pressable onPress={() => setOnboardingRetryToken((value) => value + 1)} style={styles.authGuestButton}>
                <Text style={styles.authGuestButtonText}>다시 시도</Text>
              </Pressable>
              <Pressable onPress={() => { void signOut(); }} style={styles.authEntryTextButton}>
                <Text style={styles.authEntryTextButtonLabel}>다른 계정으로 로그인</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={styles.authLoadingScreen}>
            <Text style={styles.authEntryTitle}>프로필 확인 중</Text>
            <ActivityIndicator color={colors.accent} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>KJV 리더노트</Text>
            </View>
            <View style={styles.headerActions}>
              {studyUiFeatureFlags.uiShellV2 ? (
                <Pressable accessibilityLabel="명령 검색" onPress={() => setIsQuickMoveOpen(true)} style={styles.headerIconButton}>
                  <Icon color={colors.text} name="command-outline" size={18} />
                </Pressable>
              ) : null}
              {onboardingProfile?.avatarUrl ? <Image source={{ uri: onboardingProfile.avatarUrl }} style={styles.headerAvatar} /> : null}
              <Text numberOfLines={1} style={styles.mockUser}>{authUser ? authenticatedDisplayName : "비로그인 리더"}</Text>
              {!authUser ? (
                <Pill
                  active={false}
                  icon="log-in-outline"
                  label="로그인"
                  onPress={() => setActiveView("settings")}
                  styles={styles}
                />
              ) : null}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, activeView === "reader" && isSelectionMode ? styles.contentWithSelectionSheet : null]}
            keyboardShouldPersistTaps="handled"
            onScroll={handleContentScroll}
            scrollEventThrottle={100}
          >
            {activeView === "dashboard" ? (
              <View style={styles.section}>
                <View style={styles.homeSegment}>
                  <HomeTabButton active={homeTab === "today"} icon="calendar-outline" label="오늘" onPress={() => setHomeTab("today")} styles={styles} />
                  <HomeTabButton active={homeTab === "progress"} icon="stats-chart-outline" label="통독" onPress={() => setHomeTab("progress")} styles={styles} />
                  <HomeTabButton active={homeTab === "activity"} icon="layers-outline" label="활동" onPress={() => setHomeTab("activity")} styles={styles} />
                  <HomeTabButton active={homeTab === "study"} icon="bookmark-outline" label="공부" onPress={() => setHomeTab("study")} styles={styles} />
                </View>

                {homeTab === "today" ? (
                  <>
                    <View style={[styles.selectedPanel, styles.homePanel, styles.continuePanel]}>
                      <View style={styles.homePanelHeading}>
                        <Text style={styles.panelTitle}>이어 읽기</Text>
                        <Icon color={colors.text} name="book-outline" size={20} />
                      </View>
                      <Text style={styles.continuePanelTitle}>
                        {userData.progress ? `${getBook(userData.progress.bookId)?.nameKo ?? userData.progress.bookId} ${userData.progress.chapter}장` : `${currentBook.nameKo} ${chapter}장`}
                      </Text>
                      <Text style={styles.homePanelBodyText}>
                        {userData.progress ? `${userData.progress.verse}절 근처 · ${formatShortDate(userData.progress.lastReadAt)}` : "CrossWire KJV 본문으로 첫 통독을 시작합니다."}
                      </Text>
                      <ActionButton
                        icon="book-outline"
                        label="이어 읽기"
                        onPress={() => {
                          if (userData.progress) {
                            setBookId(userData.progress.bookId);
                            setChapter(userData.progress.chapter);
                          }
                          setActiveView("reader");
                        }}
                        styles={styles}
                        variant="primary"
                      />
                    </View>

                    <View style={[styles.selectedPanel, styles.homePanel, styles.homeSurfacePanel, styles.homePlanPanel]}>
                      <View style={styles.homePanelHeading}>
                        <Text style={styles.panelTitle}>오늘 통독 플랜</Text>
                        <Icon color={colors.text} name="calendar-outline" size={18} />
                      </View>
                      {userData.activeReadingPlan && readingPlanDay ? (
                        <>
                          <Text style={styles.metaText}>
                            {readingPlanDay.dayNumber}/{readingPlanDay.totalDays}일차 · {readingPlanDayCompleted}/{readingPlanDay.chapters.length}장
                          </Text>
                          <Text style={styles.planRangeText}>{formatPlanChapters(readingPlanDay.chapters)}</Text>
                          <View style={styles.progressBar} accessibilityLabel="오늘 통독 완료율">
                            <View style={[styles.progressFill, { width: `${percent(readingPlanDayCompleted, readingPlanDay.chapters.length)}%` }]} />
                          </View>
                          <View style={styles.planActionGrid}>
                            <ActionButton icon="book-outline" label="오늘 분량 열기" onPress={openReadingPlanTarget} styles={styles} variant="panel" />
                            <ActionButton icon="checkmark-done-outline" label="오늘 완료" onPress={markReadingPlanDayComplete} styles={styles} variant="panel" />
                            <ActionButton icon="refresh-outline" label="다시 시작" onPress={restartReadingPlan} styles={styles} variant="panel" />
                            <ActionButton icon="stop-circle-outline" label="제거" onPress={stopReadingPlan} styles={styles} variant="panel" />
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.metaText}>목표 기간을 선택하면 오늘 읽을 장을 자동으로 계산합니다.</Text>
                          <View style={styles.planOptionGrid}>
                            {readingPlanOptions.map((option) => (
                              <Pressable key={option.template} onPress={() => startReadingPlan(option.template)} style={styles.planOption}>
                                <Text style={styles.panelTitle}>{option.name}</Text>
                                <Text style={styles.metaText}>{option.description}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                  </>
                ) : null}

                {homeTab === "progress" ? (
                  <>
                    <ProgressMetricCard label="전체 통독률" percent={overallPercent} value={`${overallPercent}%`} styles={styles} />
                    <ProgressMetricCard detail={`총 ${userData.completedChapters.length} / ${totalChapters}장`} label="오늘 읽은 장" value={`${completedToday}`} styles={styles} />
                    <ProgressMetricCard detail={`${completedOld}/${oldChapterTotal} · ${completedNew}/${newChapterTotal}`} label="구약 / 신약" value={`${oldPercent}% · ${newPercent}%`} styles={styles} />
                  </>
                ) : null}

                {homeTab === "activity" ? (
                  <View style={[styles.selectedPanel, styles.homeSurfacePanel, styles.homeStudyPanel]}>
                    <View style={styles.homePanelHeading}>
                      <Text style={styles.sectionTitle}>최근 활동</Text>
                      <Icon color={colors.text} name="layers-outline" size={18} />
                    </View>
                    {recentActivities.slice(0, 5).map((activity) => (
                      <Pressable
                        key={activity.id}
                        onPress={() => openActivityTarget(activity)}
                        style={styles.studyItem}
                      >
                        <Text style={styles.panelTitle}>{activity.type} · {activity.label}</Text>
                        <Text style={styles.metaText}>{formatShortDate(activity.at)}</Text>
                      </Pressable>
                    ))}
                    {!recentActivities.length ? <Text style={styles.emptyText}>아직 활동 기록이 없습니다.</Text> : null}
                  </View>
                ) : null}

                {homeTab === "study" ? (
                  <>
                    <View style={[styles.selectedPanel, styles.homeSurfacePanel, styles.homeStudyPanel]}>
                      <View style={styles.homePanelHeading}>
                        <Text style={styles.sectionTitle}>최근 강조</Text>
                        <Icon color={colors.text} name="color-wand-outline" size={18} />
                      </View>
                      {userData.highlights.slice(-4).reverse().map((highlight) => {
                        const verse = knownVerses.get(highlight.verseId);
                        return (
                          <Pressable
                            key={highlight.id}
                            onPress={() => {
                              pendingSelectedVerseIdRef.current = highlight.verseId;
                              setBookId(highlight.bookId);
                              setChapter(highlight.chapter);
                              setSelectedVerseId(highlight.verseId);
                              setCurrentReadingVerseId(highlight.verseId);
                              setActiveView("reader");
                            }}
                            style={styles.plainListButton}
                          >
                            <Text style={styles.panelTitle}>{verse ? formatReference(verse) : `${getBook(highlight.bookId)?.nameKo ?? highlight.bookId} ${highlight.chapter}장 ${highlight.verse}절`}</Text>
                            {verse ? <Text numberOfLines={2} style={styles.metaText}>{getVerseDisplayText(verse, readingLanguage)}</Text> : null}
                          </Pressable>
                        );
                      })}
                      {!userData.highlights.length ? <Text style={styles.emptyText}>강조한 구절이 없습니다.</Text> : null}
                    </View>

                    <View style={[styles.selectedPanel, styles.homeSurfacePanel, styles.homeStudyPanel]}>
                      <View style={styles.homePanelHeading}>
                        <Text style={styles.sectionTitle}>최근 인용 구절</Text>
                        <Icon color={colors.text} name="bookmark-outline" size={18} />
                      </View>
                      {userData.favoriteVerses.slice(0, 4).map((favorite) => {
                        const verse = knownVerses.get(favorite.verseId);
                        return (
                          <Pressable
                            key={favorite.id}
                            onPress={() => {
                              pendingSelectedVerseIdRef.current = favorite.verseId;
                              setBookId(favorite.bookId);
                              setChapter(favorite.chapter);
                              setSelectedVerseId(favorite.verseId);
                              setCurrentReadingVerseId(favorite.verseId);
                              setActiveView("reader");
                            }}
                            style={styles.plainListButton}
                          >
                            <Text style={styles.panelTitle}>{verse ? formatReference(verse) : favorite.title}</Text>
                            {verse ? <Text numberOfLines={2} style={styles.metaText}>{getVerseDisplayText(verse, readingLanguage)}</Text> : null}
                          </Pressable>
                        );
                      })}
                      {!userData.favoriteVerses.length ? <Text style={styles.emptyText}>저장한 인용 구절이 없습니다.</Text> : null}
                    </View>

                    <View style={[styles.selectedPanel, styles.homeSurfacePanel, styles.homeStudyPanel]}>
                      <View style={styles.homePanelHeading}>
                        <Text style={styles.sectionTitle}>노트와 태그</Text>
                        <Icon color={colors.text} name="reader-outline" size={18} />
                      </View>
                      {userData.studyNotes.slice(0, 4).map((note) => (
                        <Pressable key={note.id} onPress={() => openStudyNote(note)} style={styles.plainListButton}>
                          <Text style={styles.panelTitle}>
                            {note.scope === "verse" && note.verse
                              ? `${getBook(note.bookId)?.nameKo ?? note.bookId} ${note.chapter}장 ${note.verse}절`
                              : `${getBook(note.bookId)?.nameKo ?? note.bookId} ${note.chapter}장`}
                          </Text>
                          <Text style={styles.metaText}>{formatShortDate(note.updatedAt)}</Text>
                        </Pressable>
                      ))}
                      {!userData.studyNotes.length ? <Text style={styles.emptyText}>저장한 노트가 없습니다.</Text> : null}
                      {userData.tags.length ? (
                        <View style={styles.favoriteTagStrip}>
                          {userData.tags.map((tag) => (
                            <Text key={tag.id} style={styles.favoriteTagChip}>{tag.name}</Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            {activeView === "reader" ? (
              <View style={[styles.section, styles.readerPanel]}>
                <View style={[styles.readerToolbar, styles.readerPanelToolbar]}>
                  <Pressable onPress={() => navigateChapter(-1)} style={styles.iconButton}>
                    <Icon color={colors.text} name="chevron-back" size={20} />
                  </Pressable>
                  <Pressable onPress={openChapterPicker} style={styles.readerTitleBlock}>
                    <Text style={styles.readerChapterTitle}>{currentBook.nameKo} {chapter}장</Text>
                    <Text style={styles.readerToolbarMeta}>{currentBook.nameEn} · {verses.length} {readingLanguage === "ko" ? "KR" : "EN"} 구절 · {chapterSource}</Text>
                    <Text style={styles.readerToolbarMeta}>{currentReadingVerse ? `현재 위치 ${formatReference(currentReadingVerse)}` : "현재 위치 자동 추적 대기"}</Text>
                  </Pressable>
                  <Pressable onPress={() => navigateChapter(1)} style={styles.iconButton}>
                    <Icon color={colors.text} name="chevron-forward" size={20} />
                  </Pressable>
                </View>

                <View style={styles.readerActionRow}>
                  <ActionButton
                    active={currentChapterCompleted}
                    icon="checkmark-circle-outline"
                    label={currentChapterCompleted ? "읽음 취소" : "읽음 완료"}
                    onPress={markChapterComplete}
                    styles={styles}
                    variant="reader"
                  />
                  <ActionButton active={readingLanguage === "en"} label="EN" onPress={() => setReadingLanguage("en")} styles={styles} variant="reader" />
                  <ActionButton active={readingLanguage === "ko"} label="KR" onPress={() => setReadingLanguage("ko")} styles={styles} variant="reader" />
                  <ActionButton icon="volume-medium-outline" label="읽기" onPress={speakChapter} styles={styles} variant="reader" />
                  <ActionButton
                    active={isSelectionMode}
                    icon="list-checks"
                    label={isSelectionMode ? `${selectedVerses.length}개 선택` : "다중 선택"}
                    onPress={() => setReaderSelectionMode(!isSelectionMode)}
                    styles={styles}
                    variant="reader"
                  />
                  <ActionButton
                    active={Boolean(chapterNote)}
                    icon="reader-outline"
                    label="장 노트"
                    onPress={() => setShowChapterNote((current) => !current)}
                    styles={styles}
                    variant="reader"
                  />
                  {readingPlanDay ? (
                    <ActionButton icon="calendar-outline" label="오늘 분량" onPress={openReadingPlanTarget} styles={styles} variant="reader" />
                  ) : null}
                  {readingPlanDay ? (
                    <ActionButton
                      icon="volume-medium-outline"
                      label="오늘 읽기"
                      onPress={() => {
                        void speakTodayPlan();
                      }}
                      styles={styles}
                      variant="reader"
                    />
                  ) : null}
                </View>
                {copyStatus ? <Text style={styles.successText}>{copyStatus}</Text> : null}

                {chapterStatus === "loading" ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
                {chapterStatus === "error" ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.errorText}>{chapterError}</Text>
                    <Text style={styles.metaText}>웹 서버가 실행 중인지, Expo API 주소가 맞는지 확인하세요.</Text>
                    <ActionButton icon="refresh-outline" label="다시 시도" onPress={loadChapter} styles={styles} />
                  </View>
                ) : null}

                {verses.map((verse) => {
                  const selected = verse.id === selectedVerseId;
                  const currentReading = verse.id === currentReadingVerseId;
                  const highlighted = userData.highlights.some((highlight) => highlight.verseId === verse.id);
                  const favorited = favoriteIds.has(verse.id);
                  const hasNote = userData.studyNotes.some((note) => note.scope === "verse" && note.verseId === verse.id);
                  return (
                    <Pressable
                      key={verse.id}
                      onLayout={(event) => recordVerseLayout(verse.id, event)}
                      onPress={() => selectReaderVerse(verse)}
                      style={[
                        styles.verseRow,
                        userData.settings.readingMode === "focus" ? styles.verseRowFocus : null,
                        speakingVerseId === verse.id ? styles.verseRowSpeaking : null,
                        currentReading ? styles.verseRowCurrentReading : null,
                        selected ? styles.verseRowSelected : null,
                        selectedVerseIdSet.has(verse.id) ? styles.verseRowBatchSelected : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.verseNumber,
                          userData.settings.readingMode === "verse-numbers" ? styles.verseNumberEmphasized : null,
                        ]}
                      >
                        {verse.verse}
                      </Text>
                      <View style={styles.verseTextBlock}>
                        <Text style={[styles.verseText, { fontSize: userData.settings.fontSize, lineHeight: userData.settings.fontSize * userData.settings.lineHeight }]}>
                          {getVerseDisplayText(verse, readingLanguage)}
                        </Text>
                      </View>
                      <View style={styles.verseMarkers}>
                        {isSelectionMode ? (
                          <View style={[styles.selectionCheck, selectedVerseIdSet.has(verse.id) ? styles.selectionCheckActive : null]}>
                            {selectedVerseIdSet.has(verse.id) ? <Icon color={colors.accentText} name="checkmark-done-outline" size={14} /> : null}
                          </View>
                        ) : null}
                        {hasNote ? <Icon color={colors.warning} name="reader-outline" size={15} /> : null}
                        {favorited ? <Icon color={colors.warning} name="bookmark-outline" size={16} /> : null}
                        {highlighted && !hasNote && !favorited ? <View style={styles.highlightMarker} /> : null}
                      </View>
                    </Pressable>
                  );
                })}

                {selectedVerse ? (
                  <View style={styles.verseActionPanel}>
                    <View style={styles.selectedReference}>
                      <Text style={styles.panelTitle}>{formatReference(selectedVerse)}</Text>
                      <Text style={styles.metaText}>{getVerseDisplaySource(selectedVerse, readingLanguage)}</Text>
                    </View>
                    <View style={styles.quickActions}>
                      <Pressable accessibilityLabel="구절 복사" onPress={copySelectedVerse} style={styles.compactIconButton}>
                        <Icon color={colors.text} name="copy-outline" size={16} />
                      </Pressable>
                      <Pressable accessibilityLabel="선택 구절 읽기" onPress={speakSelectedVerse} style={styles.compactIconButton}>
                        <Icon color={colors.text} name="volume-medium-outline" size={16} />
                      </Pressable>
                      <Pressable accessibilityLabel="구절 노트" onPress={() => setShowVerseNote(true)} style={styles.compactIconButton}>
                        <Icon color={colors.text} name="reader-outline" size={16} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="번역 의견"
                        disabled={!selectedVerse.textKo}
                        onPress={openFeedbackModal}
                        style={[styles.compactIconButton, !selectedVerse.textKo ? styles.compactIconButtonDisabled : null]}
                      >
                        <Icon color={!selectedVerse.textKo ? colors.muted : colors.text} name="flag-outline" size={16} />
                      </Pressable>
                    </View>
                    <ActionButton
                      icon="bookmark-outline"
                      label={favoriteIds.has(selectedVerse.id) ? "인용 구절 수정" : "인용 구절 저장"}
                      onPress={() => openFavoriteModal([selectedVerse])}
                      styles={styles}
                      variant="panel"
                    />
                    <ActionButton
                      icon="reader-outline"
                      label="성경노트 만들기"
                      onPress={() => openNewPersonalNote([selectedVerse])}
                      styles={styles}
                      variant="panel"
                    />
                  </View>
                ) : null}

              </View>
            ) : null}

            {activeView === "quickMove" ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>빠른이동</Text>
                <Pressable
                  onPress={() => {
                    setHomeTab("today");
                    setActiveView("dashboard");
                  }}
                  style={styles.quickAction}
                >
                  <View>
                    <Text style={styles.panelTitle}>홈 · 오늘</Text>
                    <Text style={styles.metaText}>이어 읽기와 오늘 분량</Text>
                  </View>
                  <Icon color={colors.accent} name="chevron-forward" size={18} />
                </Pressable>
                <Pressable
                  onPress={openReadingPlanTarget}
                  style={styles.quickAction}
                >
                  <View>
                    <Text style={styles.panelTitle}>오늘 통독 분량 열기</Text>
                    <Text style={styles.metaText}>{readingPlanDay ? formatPlanChapters(readingPlanDay.chapters) : "통독 플랜 없음"}</Text>
                  </View>
                  <Icon color={colors.accent} name="book-outline" size={18} />
                </Pressable>
                <Pressable onPress={() => setActiveView("progress")} style={styles.quickAction}>
                  <View>
                    <Text style={styles.panelTitle}>통독 진척도</Text>
                    <Text style={styles.metaText}>전체, 오늘, 구약/신약 진행률</Text>
                  </View>
                  <Icon color={colors.accent} name="stats-chart-outline" size={18} />
                </Pressable>
                <Pressable onPress={() => setActiveView("highlights")} style={styles.quickAction}>
                  <View>
                    <Text style={styles.panelTitle}>강조</Text>
                    <Text style={styles.metaText}>하이라이트한 구절 {userData.highlights.length}개</Text>
                  </View>
                  <Icon color={colors.accent} name="color-wand-outline" size={18} />
                </Pressable>
                <Pressable onPress={() => setActiveView("search")} style={styles.quickAction}>
                  <View>
                    <Text style={styles.panelTitle}>본문 검색</Text>
                    <Text style={styles.metaText}>한국어/KJV, 권별 검색</Text>
                  </View>
                  <Icon color={colors.accent} name="search-outline" size={18} />
                </Pressable>
                <Pressable onPress={() => setActiveView("notes")} style={styles.quickAction}>
                  <View>
                    <Text style={styles.panelTitle}>성경노트</Text>
                    <Text style={styles.metaText}>개인 노트 {userData.personalNotes.length}개</Text>
                  </View>
                  <Icon color={colors.accent} name="reader-outline" size={18} />
                </Pressable>
                <Pressable onPress={() => setActiveView("dictionary")} style={styles.quickAction}>
                  <View>
                    <Text style={styles.panelTitle}>히브리어 사전</Text>
                    <Text style={styles.metaText}>발음, 한영 뜻, 예시 구절</Text>
                  </View>
                  <Icon color={colors.accent} name="library-outline" size={18} />
                </Pressable>
              </View>
            ) : null}

            {activeView === "search" ? (
              <View style={styles.section}>
                <View style={[styles.selectedPanel, styles.formPanel, styles.searchPanel]}>
                  <View style={styles.panelHeading}>
                    <Text style={styles.panelTitle}>본문 검색</Text>
                    <Icon color={colors.text} name="search-outline" size={18} />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.groupLabel}>키워드</Text>
                    <TextInput
                      onChangeText={setQuery}
                      onSubmitEditing={runSearch}
                      placeholder={searchLanguage === "en" ? "예: grace, love, John" : "예: 믿음, 예수 그리스도, 성령"}
                      placeholderTextColor={colors.muted}
                      returnKeyType="search"
                      style={styles.searchInput}
                      value={query}
                    />
                  </View>
                  <View style={styles.formGrid}>
                    <SelectField
                      icon="language-outline"
                      label="언어"
                      onPress={() => setActiveSearchSelect("language")}
                      styles={styles}
                      value={searchLanguageLabels[searchLanguage]}
                    />
                    <SelectField
                      icon="funnel-outline"
                      label="정렬"
                      onPress={() => setActiveSearchSelect("sort")}
                      styles={styles}
                      value={searchSort === "canonical" ? "성경 순서" : "관련도"}
                    />
                    <SelectField
                      icon="layers-outline"
                      label="범위"
                      onPress={() => setActiveSearchSelect("testament")}
                      styles={styles}
                      value={searchTestament === "all" ? "전체" : searchTestament === "OT" ? "구약" : "신약"}
                    />
                    <SelectField
                      icon="book-outline"
                      label="성경 권"
                      onPress={() => setActiveSearchSelect("book")}
                      styles={styles}
                      value={selectedSearchBookLabel}
                    />
                  </View>
                  <Text style={styles.searchSummary}>
                    {searchStatus === "ready" && query.trim().length >= 2 ? `${searchResults.length}/${searchTotal}개 결과` : "2글자 이상 입력"}
                  </Text>
                </View>
                {searchStatus === "loading" ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
                {searchStatus === "loading" ? <Text style={styles.emptyText}>검색 중입니다.</Text> : null}
                {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
                {searchResults.map((verse) => (
                  <Pressable key={verse.id} onPress={() => openVerse(verse)} style={styles.searchResult}>
                    <Text style={styles.panelTitle}>{formatReference(verse)}</Text>
                    <HighlightedText
                      numberOfLines={3}
                      query={query}
                      style={styles.resultText}
                      highlightStyle={styles.searchHighlight}
                      text={getVerseDisplayText(verse, searchDisplayLanguage)}
                    />
                  </Pressable>
                ))}
                {searchStatus === "ready" && query.trim().length >= 2 && !searchResults.length ? (
                  <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
                ) : null}
              </View>
            ) : null}

            {activeView === "dictionary" ? (
              <View style={styles.section}>
                <View style={[styles.selectedPanel, styles.formPanel]}>
                  <View style={styles.panelHeading}>
                    <View>
                      <Text style={styles.eyebrow}>Hebrew Lexicon</Text>
                      <Text style={styles.panelTitle}>히브리어 사전</Text>
                    </View>
                    <Icon color={colors.text} name="library-outline" size={18} />
                  </View>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setDictionaryQuery}
                    placeholder="히브리어, 발음, Strong 번호, 한영 뜻 검색"
                    placeholderTextColor={colors.muted}
                    style={styles.searchInput}
                    value={dictionaryQuery}
                  />
                  <Text style={styles.groupLabel}>테마</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalStrip}>
                    <Chip active={dictionaryTheme === "all"} label="전체" onPress={() => setDictionaryTheme("all")} styles={styles} />
                    {hebrewDictionaryThemes.map((theme) => (
                      <Chip
                        active={dictionaryTheme === theme.id}
                        key={theme.id}
                        label={theme.titleKo}
                        onPress={() => setDictionaryTheme(theme.id)}
                        styles={styles}
                      />
                    ))}
                  </ScrollView>
                  <Text style={styles.groupLabel}>구약 권별 필터</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalStrip}>
                    <Chip active={dictionaryBookFilter === "all"} label="전체" onPress={() => setDictionaryBookFilter("all")} styles={styles} />
                    {oldBooks.map((book) => (
                      <Chip
                        active={dictionaryBookFilter === book.id}
                        key={book.id}
                        label={book.nameKo}
                        onPress={() => setDictionaryBookFilter(book.id)}
                        styles={styles}
                      />
                    ))}
                  </ScrollView>
                  <Text style={styles.groupLabel}>정렬</Text>
                  <View style={styles.actionRow}>
                    {[
                      ["canonical", "성경 순서"],
                      ["alphabetical", "알파벳"],
                      ["theme", "테마"],
                    ].map(([value, label]) => (
                      <Chip
                        active={dictionarySort === value}
                        key={value}
                        label={label}
                        onPress={() => setDictionarySort(value as HebrewDictionarySort)}
                        styles={styles}
                      />
                    ))}
                  </View>
                  <Text style={styles.searchSummary}>{dictionarySearchResult.total}개 단어</Text>
                </View>

                {selectedDictionaryEntry ? (
                  <View style={styles.selectedPanel}>
                    <View style={styles.panelHeading}>
                      <View style={styles.readerTitleBlock}>
                        <Text style={styles.eyebrow}>{selectedDictionaryEntry.strongNumber}</Text>
                        <Text style={styles.sectionTitle}>{selectedDictionaryEntry.lemmaHe} · {selectedDictionaryEntry.transliteration}</Text>
                        <Text style={styles.metaText}>{selectedDictionaryEntry.pronunciationSymbol} · {selectedDictionaryEntry.pronunciationKo}</Text>
                      </View>
                      <Text style={styles.badge}>{selectedDictionaryEntry.morphologySummary}</Text>
                    </View>
                    <Text style={styles.panelTitle}>{selectedDictionaryEntry.glossKo}</Text>
                    <Text style={styles.resultText}>{selectedDictionaryEntry.definitionKo}</Text>
                    <Text style={styles.metaText}>{selectedDictionaryEntry.glossEn} · {selectedDictionaryEntry.definitionEn}</Text>
                    <Text style={styles.metaText}>{selectedDictionaryEntry.interpretationNoteKo}</Text>
                    <Text style={styles.groupLabel}>출현 예시</Text>
                    {selectedDictionaryEntry.sampleVerses.map((occurrence) => (
                      <View key={occurrence.id} style={styles.studyItem}>
                        <Text style={styles.panelTitle}>
                          {getBook(occurrence.appBookId)?.nameKo ?? occurrence.appBookId} {occurrence.chapter}:{occurrence.verse}
                        </Text>
                        <Text style={styles.resultText}>{occurrence.surfaceHe} · {occurrence.transliteration}</Text>
                        {occurrence.phraseKo ? <Text style={styles.metaText}>{occurrence.phraseKo}</Text> : null}
                        {occurrence.phraseEn ? <Text style={styles.metaText}>{occurrence.phraseEn}</Text> : null}
                      </View>
                    ))}
                    <ActionButton
                      icon="reader-outline"
                      label="내 노트에 추가"
                      onPress={() => {
                        openNewPersonalNote([], {
                          bodyMarkdown: `# ${selectedDictionaryEntry.lemmaHe} (${selectedDictionaryEntry.transliteration})\n\n${selectedDictionaryEntry.glossKo}\n\n${selectedDictionaryEntry.definitionKo}`,
                          tagInput: "히브리어 사전",
                          title: `${selectedDictionaryEntry.transliteration} 단어 노트`,
                        });
                      }}
                      styles={styles}
                    />
                  </View>
                ) : null}

                {dictionarySearchResult.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => setSelectedDictionaryEntryId(entry.id)}
                    style={[styles.studyItem, selectedDictionaryEntry?.id === entry.id ? styles.verseRowSelected : null]}
                  >
                    <Text style={styles.panelTitle}>{entry.lemmaHe} · {entry.transliteration}</Text>
                    <Text style={styles.resultText}>{entry.glossKo}</Text>
                    <Text style={styles.metaText}>{entry.strongNumber} · {entry.pronunciationSymbol} · {entry.firstReference ?? "예시 구절 준비 중"}</Text>
                  </Pressable>
                ))}
                {!dictionarySearchResult.entries.length ? <Text style={styles.emptyText}>조건에 맞는 히브리어 단어가 없습니다.</Text> : null}
              </View>
            ) : null}

            {activeView === "notes" ? (
              <View style={styles.section}>
                <View style={[styles.selectedPanel, styles.formPanel]}>
                  <View style={styles.panelHeading}>
                    <View>
                      <Text style={styles.eyebrow}>Personal Notes</Text>
                      <Text style={styles.panelTitle}>성경노트</Text>
                    </View>
                    <ActionButton icon="reader-outline" label="새 노트" onPress={() => openNewPersonalNote([])} styles={styles} />
                  </View>
                  <TextInput
                    onChangeText={setNoteSearchQuery}
                    placeholder="제목, 본문, 태그 검색"
                    placeholderTextColor={colors.muted}
                    style={styles.searchInput}
                    value={noteSearchQuery}
                  />
                  <Text style={styles.searchSummary}>{visiblePersonalNotes.length}/{userData.personalNotes.length}개 노트</Text>
                </View>

                {selectedPersonalNote ? (
                  <View style={styles.selectedPanel}>
                    <View style={styles.panelHeading}>
                      <View>
                        <Text style={styles.eyebrow}>편집기</Text>
                        <Text style={styles.panelTitle}>{selectedPersonalNote.title}</Text>
                      </View>
                      <Text style={styles.badge}>{formatShortDate(selectedPersonalNote.updatedAt)}</Text>
                    </View>
                    <Text style={styles.groupLabel}>제목</Text>
                    <TextInput
                      onChangeText={setPersonalNoteTitle}
                      placeholder="노트 제목"
                      placeholderTextColor={colors.muted}
                      style={styles.searchInput}
                      value={personalNoteTitle}
                    />
                    <Text style={styles.groupLabel}>본문</Text>
                    <PersonalNoteRichTextEditor
                      key={selectedPersonalNote.id}
                      document={personalNoteDocument}
                      onAddVerseReference={addPersonalNoteVerseReference}
                      onChange={setPersonalNoteDocument}
                    />
                    <Text style={styles.groupLabel}>태그</Text>
                    <TextInput
                      onChangeText={setPersonalNoteTagInput}
                      placeholder="태그, 쉼표 구분"
                      placeholderTextColor={colors.muted}
                      style={styles.searchInput}
                      value={personalNoteTagInput}
                    />
                    {selectedPersonalNoteLinks.length ? (
                      <View style={styles.badgeRow}>
                        {selectedPersonalNoteLinks.map((link) => (
                          <Pressable
                            key={link.id}
                            onPress={() => {
                              pendingSelectedVerseIdRef.current = link.verseKey;
                              setBookId(link.bookId);
                              setChapter(link.chapter);
                              setActiveView("reader");
                            }}
                          >
                            <Text style={styles.badge}>{getBook(link.bookId)?.nameKo ?? link.bookId} {link.chapter}:{link.verse}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.metaText}>연결된 구절이 없습니다. 리더에서 구절을 선택해 새 노트를 만들 수 있습니다.</Text>
                    )}
                    {copyStatus ? <Text style={styles.successText}>{copyStatus}</Text> : null}
                    <View style={styles.actionRow}>
                      <ActionButton icon="save-outline" label="저장" onPress={savePersonalNote} styles={styles} />
                      <ActionButton icon="trash-outline" label="삭제" onPress={deletePersonalNote} styles={styles} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.panelTitle}>저장한 성경노트가 없습니다.</Text>
                    <Text style={styles.metaText}>개별 노트를 만들고 구절 링크와 태그를 함께 저장할 수 있습니다.</Text>
                    <ActionButton icon="reader-outline" label="첫 노트 만들기" onPress={() => openNewPersonalNote([])} styles={styles} />
                  </View>
                )}

                {visiblePersonalNotes.map((note) => (
                  <Pressable
                    key={note.id}
                    onPress={() => setSelectedPersonalNoteId(note.id)}
                    style={[styles.studyItem, selectedPersonalNote?.id === note.id ? styles.verseRowSelected : null]}
                  >
                    <Text style={styles.panelTitle}>{note.title}</Text>
                    <Text numberOfLines={3} style={styles.resultText}>{note.bodyText || note.bodyMarkdown || "본문 없음"}</Text>
                    <Text style={styles.metaText}>{formatShortDate(note.updatedAt)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {activeView === "progress" ? (
              <View style={styles.section}>
                <View style={styles.readerToolbar}>
                  <Text style={styles.sectionTitle}>통독 진척도</Text>
                  <Text style={styles.panelTitle}>{overallPercent}%</Text>
                </View>
                <View style={styles.progressSummary}>
                  {[
                    ["전체", `${userData.completedChapters.length}/${totalChapters}`],
                    ["구약", `${completedOld}/${getTotalChapterCount("old")}`],
                    ["신약", `${completedNew}/${getTotalChapterCount("new")}`],
                    ["오늘", `${completedToday}`],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.progressSummaryCard}>
                      <Text style={styles.progressSummaryLabel}>{label}</Text>
                      <Text style={styles.progressSummaryValue}>{value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.bookProgressList}>
                  {books.map((item) => {
                    const completed = userData.completedChapters.filter((chapterItem) => chapterItem.bookId === item.id).length;
                    const bookPercent = percent(completed, item.chapterCount);
                    return (
                      <Pressable key={item.id} onPress={() => openFirstIncompleteChapter(item.id)} style={styles.bookProgressRow}>
                        <Text numberOfLines={1} style={styles.bookProgressName}>{item.nameKo}</Text>
                        <View style={styles.bookProgressTrack}>
                          <View style={[styles.progressFill, { width: `${bookPercent}%` }]} />
                        </View>
                        <Text style={styles.bookProgressPercent}>{bookPercent}%</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {activeView === "highlights" ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>강조 구절</Text>
                <MetricRow label="강조 구절" value={`${filteredHighlights.length}/${userData.highlights.length}개`} styles={styles} />
                <Text style={styles.groupLabel}>색상</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalStrip}>
                  {[{ color: "all" as const, label: "전체 색상" }, ...highlightOptions].map((option) => (
                    <Chip
                      active={highlightColorFilter === option.color}
                      key={option.color}
                      label={option.label}
                      onPress={() => setHighlightColorFilter(option.color)}
                      styles={styles}
                    />
                  ))}
                </ScrollView>
                <Text style={styles.groupLabel}>성경 권</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalStrip}>
                  <Chip active={highlightBookFilter === "all"} label="전체 성경" onPress={() => setHighlightBookFilter("all")} styles={styles} />
                  {books.map((book) => (
                    <Chip
                      active={highlightBookFilter === book.id}
                      key={book.id}
                      label={book.nameKo}
                      onPress={() => setHighlightBookFilter(book.id)}
                      styles={styles}
                    />
                  ))}
                </ScrollView>
                {filteredHighlights.slice(0, 50).map((item) => {
                  const verse = knownVerses.get(item.verseId);
                  return (
                    <View key={item.id} style={styles.studyItem}>
                      <Text style={styles.panelTitle}>
                        {verse ? formatReference(verse) : `${getBook(item.bookId)?.nameKo ?? item.bookId} ${item.chapter}:${item.verse}`} <Text style={styles.badge}>{item.color}</Text>
                      </Text>
                      {verse ? (
                        <Text numberOfLines={3} style={styles.resultText}>{getVerseDisplayText(verse, readingLanguage)}</Text>
                      ) : (
                        <Text style={styles.metaText}>본문을 불러오는 중입니다.</Text>
                      )}
                      {item.note ? <Text style={styles.metaText}>{item.note}</Text> : null}
                      <Text style={styles.metaText}>{new Date(item.updatedAt).toLocaleString("ko-KR")}</Text>
                      <View style={styles.actionRow}>
                        <ActionButton
                          icon="book-outline"
                          label="열기"
                          onPress={() => {
                            pendingSelectedVerseIdRef.current = item.verseId;
                            setBookId(item.bookId);
                            setChapter(item.chapter);
                            setSelectedVerseId(item.verseId);
                            setCurrentReadingVerseId(item.verseId);
                            setActiveView("reader");
                          }}
                          styles={styles}
                        />
                        <ActionButton icon="copy-outline" label="복사" onPress={() => copyStoredReference(item.verseId)} styles={styles} />
                        <ActionButton icon="trash-outline" label="해제" onPress={() => removeHighlight(item.verseId)} styles={styles} />
                      </View>
                    </View>
                  );
                })}
                {!filteredHighlights.length ? (
                  <Text style={styles.emptyText}>{userData.highlights.length ? "선택한 필터에 맞는 강조 구절이 없습니다." : "강조한 구절이 없습니다."}</Text>
                ) : null}
              </View>
            ) : null}

            {activeView === "favorites" ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>인용 구절 보관함</Text>
                <View>
                  <Pressable
                    onPress={() => setIsFavoriteListDropdownOpen((current) => !current)}
                    style={styles.favoriteListSelector}
                  >
                    <View style={styles.favoriteListSelectorText}>
                      <Text style={styles.groupLabel}>목록</Text>
                      <Text numberOfLines={1} style={styles.favoriteListSelectorName}>{selectedFavoriteList?.name ?? "기본 목록"}</Text>
                    </View>
                    <Text style={styles.favoriteListCount}>{selectedListFavorites.length}</Text>
                    <Icon color={colors.text} name="chevron-down" size={16} />
                  </Pressable>
                  {isFavoriteListDropdownOpen ? (
                    <View style={styles.favoriteListDropdownMenu}>
                      <View style={styles.favoriteListDropdownHead}>
                        <Text style={styles.groupLabel}>목록</Text>
                        <Text style={styles.groupLabel}>구절</Text>
                      </View>
                      {userData.favoriteLists.map((list) => {
                        const active = selectedFavoriteList?.id === list.id;
                        return (
                          <Pressable
                            key={list.id}
                            onPress={() => {
                              setSelectedFavoriteListId(list.id);
                              setIsFavoriteListDropdownOpen(false);
                            }}
                            style={[styles.favoriteListDropdownRow, active ? styles.favoriteListDropdownRowActive : null]}
                          >
                            <Text numberOfLines={1} style={styles.favoriteListDropdownName}>{list.name}</Text>
                            <Text style={styles.favoriteListDropdownCount}>{favoriteListCounts.get(list.id) ?? 0}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <View style={styles.favoriteListTitleBlock}>
                  <View>
                    <Text style={styles.panelTitle}>{selectedFavoriteList?.name ?? "기본 목록"}</Text>
                    <Text style={styles.metaText}>{visibleFavorites.length}/{selectedListFavorites.length}개 구절</Text>
                  </View>
                </View>
                <View style={styles.favoriteToolbar}>
                  <ActionButton icon="copy-outline" label="목록 전체 복사" onPress={copyFavoriteList} styles={styles} variant="modal" />
                  <ActionButton
                    icon="trash-outline"
                    label="목록 삭제"
                    onPress={() => selectedFavoriteList ? setPendingDeleteFavoriteListId(selectedFavoriteList.id) : undefined}
                    styles={styles}
                    variant="modalDanger"
                  />
                </View>
                <Text style={styles.groupLabel}>목록 검색</Text>
                <TextInput
                  onChangeText={setFavoriteSearchQuery}
                  placeholder="제목, 본문, 태그 검색"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  value={favoriteSearchQuery}
                />
                <Text style={styles.groupLabel}>정렬</Text>
                <View>
                  <Pressable onPress={() => setIsFavoriteSortDropdownOpen((current) => !current)} style={styles.favoriteSortTrigger}>
                    <Text style={styles.favoriteSortLabel}>
                      {favoriteSortKey === "recent" ? "최근 저장순" : favoriteSortKey === "bible" ? "성경 순서" : "자주 사용순"}
                    </Text>
                    <Icon color={colors.text} name="chevron-down" size={16} />
                  </Pressable>
                  {isFavoriteSortDropdownOpen ? (
                    <View style={styles.favoriteListDropdownMenu}>
                      {[
                        ["recent", "최근 저장순"],
                        ["bible", "성경 순서"],
                        ["usage", "자주 사용순"],
                      ].map(([key, label]) => (
                        <Pressable
                          key={key}
                          onPress={() => {
                            setFavoriteSortKey(key as "recent" | "bible" | "usage");
                            setIsFavoriteSortDropdownOpen(false);
                          }}
                          style={[styles.favoriteListDropdownRow, favoriteSortKey === key ? styles.favoriteListDropdownRowActive : null]}
                        >
                          <Text style={styles.favoriteListDropdownName}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                {userData.tags.length ? (
                  <View style={styles.favoriteTagStrip}>
                    {userData.tags.map((tag) => (
                      <Text key={tag.id} style={styles.favoriteTagChip}>{tag.name}</Text>
                    ))}
                  </View>
                ) : null}
                {visibleFavorites.slice(0, 50).map((item) => (
                  <View key={item.id} style={styles.studyItem}>
                    <Text style={styles.panelTitle}>{item.title || `${getBook(item.bookId)?.nameKo ?? item.bookId} ${item.chapter}:${item.verse}`}</Text>
                    {knownVerses.get(item.verseId) ? (
                      <Text numberOfLines={3} style={styles.resultText}>{getVerseDisplayText(knownVerses.get(item.verseId) as Verse, readingLanguage)}</Text>
                    ) : null}
                    <Text style={styles.metaText}>{getBook(item.bookId)?.nameKo ?? item.bookId} {item.chapter}:{item.verse} · 복사 {item.usageCount}회</Text>
                    {item.memo ? <Text style={styles.metaText}>{item.memo}</Text> : null}
                    {item.tagIds.length ? (
                      <View style={styles.favoriteTagStrip}>
                        {item.tagIds.map((tagId) => {
                          const tag = userData.tags.find((candidate) => candidate.id === tagId);
                          return tag ? <Text key={tag.id} style={styles.favoriteTagChip}>{tag.name}</Text> : null;
                        })}
                      </View>
                    ) : null}
                    <View style={styles.actionRow}>
                      <ActionButton
                        icon="book-outline"
                        label="열기"
                        onPress={() => {
                          pendingSelectedVerseIdRef.current = item.verseId;
                          setBookId(item.bookId);
                          setChapter(item.chapter);
                          setSelectedVerseId(item.verseId);
                          setCurrentReadingVerseId(item.verseId);
                          setActiveView("reader");
                        }}
                        styles={styles}
                      />
                      <ActionButton icon="copy-outline" label="복사" onPress={() => copyStoredReference(item.verseId)} styles={styles} />
                      <ActionButton icon="trash-outline" label="삭제" onPress={() => removeFavorite(item.id)} styles={styles} />
                    </View>
                  </View>
                ))}
                {!visibleFavorites.length ? (
                  <Text style={styles.emptyText}>{selectedListFavorites.length ? "검색 조건에 맞는 구절이 없습니다." : "이 목록에 저장된 구절이 없습니다."}</Text>
                ) : null}
              </View>
            ) : null}

            {activeView === "settings" ? (
              <View style={styles.section}>
                <View style={[styles.selectedPanel, styles.settingsShell]}>
                  <View style={styles.panelHeading}>
                    <Text style={styles.panelTitle}>설정</Text>
                    <Icon color={colors.text} name="settings-outline" size={18} />
                  </View>
                  <View style={styles.settingsMenuGrid}>
                    <SettingsMenuButton
                      active={activeSettingsSection === "account"}
                      icon="log-in-outline"
                      label="계정 설정"
                      onPress={() => setActiveSettingsSection("account")}
                      styles={styles}
                    />
                    <SettingsMenuButton
                      active={activeSettingsSection === "tts"}
                      icon="volume-medium-outline"
                      label="TTS"
                      onPress={() => setActiveSettingsSection("tts")}
                      styles={styles}
                    />
                    <SettingsMenuButton
                      active={activeSettingsSection === "text"}
                      icon="text-outline"
                      label="텍스트"
                      onPress={() => setActiveSettingsSection("text")}
                      styles={styles}
                    />
                    <SettingsMenuButton
                      active={activeSettingsSection === "view"}
                      icon="reader-outline"
                      label="보기 모드"
                      onPress={() => setActiveSettingsSection("view")}
                      styles={styles}
                    />
                  </View>

                  {activeSettingsSection === "account" ? (
                    <View style={styles.settingsSection}>
                      <View style={styles.panelHeading}>
                        <Text style={styles.panelTitle}>계정 설정</Text>
                        <Icon color={colors.text} name={authUser ? "log-out-outline" : "log-in-outline"} size={18} />
                      </View>
                      <View style={styles.accountSummary}>
                        {onboardingProfile?.avatarUrl ? <Image source={{ uri: onboardingProfile.avatarUrl }} style={styles.accountAvatar} /> : null}
                        <View style={styles.accountTextBlock}>
                          <Text style={styles.eyebrow}>현재 계정</Text>
                          <Text style={styles.accountName}>{authUser ? authenticatedDisplayName : "비로그인 리더"}</Text>
                          <Text style={styles.metaText}>{authUser ? authUser.email ?? "로그인 상태" : "비로그인 리더"}</Text>
                        </View>
                        <Text style={[styles.statusBadge, authUser ? styles.statusBadgeActive : null]}>{authUser ? "로그인" : "비로그인"}</Text>
                      </View>
                      <View style={styles.settingsActionGrid}>
                        <ActionButton
                          icon={authUser ? "log-out-outline" : "log-in-outline"}
                          label={authUser ? "로그아웃" : authStatus === "submitting" ? "처리 중" : "로그인"}
                          onPress={authUser ? signOut : () => setShowAuthForm((visible) => !visible)}
                          styles={styles}
                          variant="setting"
                        />
                        {authUser ? (
                          <ActionButton
                            disabled={!hasDeviceDataToImport || importStatus === "submitting"}
                            icon="save-outline"
                            label={importStatus === "submitting" ? "가져오는 중" : "이 기기 데이터 가져오기"}
                            onPress={importDeviceData}
                            styles={styles}
                            variant="setting"
                          />
                        ) : null}
                        <ActionButton icon="trash-outline" label="로컬 데이터 초기화" onPress={clearLocalData} styles={styles} variant="setting" />
                        {authUser ? (
                          <ActionButton
                            icon="trash-outline"
                            label="회원탈퇴"
                            onPress={openDeleteAccountModal}
                            styles={styles}
                            variant="modalDanger"
                          />
                        ) : null}
                      </View>
                      {authUser ? (
                        <View style={styles.accountSyncPanel}>
                          <Text style={styles.eyebrow}>서버 동기화</Text>
                          <Text style={syncStatus === "error" ? styles.errorText : styles.metaText}>
                            {syncMessage || (syncStatus === "ready" ? "서버 동기화 연결됨" : "로그인 데이터는 서버 DB에 저장됩니다.")}
                          </Text>
                          <Text style={styles.metaText}>
                            {hasDeviceDataToImport
                              ? "비회원으로 작성한 이 기기 데이터가 있습니다."
                              : "가져올 비회원 로컬 데이터가 없습니다."}
                          </Text>
                          {importMessage ? (
                            <Text style={importStatus === "error" ? styles.errorText : styles.successText}>{importMessage}</Text>
                          ) : null}
                        </View>
                      ) : null}
                      {!authUser && showAuthForm ? (
                        <AuthCredentialForm
                          authEmail={authEmail}
                          authMessage={authMessage}
                          authPassword={authPassword}
                          authStatus={authStatus}
                          mode="login"
                          onChangeEmail={setAuthEmail}
                          onChangePassword={setAuthPassword}
                          onSecondarySubmit={signUp}
                          onSubmit={signIn}
                          secondaryIcon="person-add-outline"
                          secondaryLabel="회원가입"
                          styles={styles}
                          supabaseAvailable={Boolean(supabase)}
                        />
                      ) : null}
                      {authMessage && (authUser || !showAuthForm) ? <Text style={authStatus === "error" ? styles.errorText : styles.successText}>{authMessage}</Text> : null}
                    </View>
                  ) : null}

                  {activeSettingsSection === "tts" ? (
                  <View style={styles.settingsSection}>
                    <View style={styles.panelHeading}>
                      <Text style={styles.panelTitle}>TTS 설정</Text>
                      <Icon color={colors.text} name="volume-medium-outline" size={18} />
                    </View>
                    <SettingSelectField label="속도" onPress={cycleTtsSpeed} styles={styles} value={`${userData.settings.ttsSpeed.toFixed(2)}x`} />
                    <SettingSelectField label="음성" onPress={cycleTtsVoice} styles={styles} value={selectedTtsVoiceLabel} />
                    {!ttsVoiceOptions.length ? <Text style={styles.metaText}>기기 음성 목록을 불러오는 중입니다.</Text> : null}
                    <SettingToggleRow
                      checked={userData.settings.ttsRepeat}
                      label="반복 재생"
                      onPress={() => updateSettings({ ttsRepeat: !userData.settings.ttsRepeat })}
                      styles={styles}
                    />
                    <SettingToggleRow
                      checked={userData.settings.ttsAutoScroll}
                      label="읽는 절로 자동 이동"
                      onPress={() => updateSettings({ ttsAutoScroll: !userData.settings.ttsAutoScroll })}
                      styles={styles}
                    />
                    <View style={styles.ttsControls}>
                      <Pressable accessibilityLabel="재생" onPress={speakChapter} style={styles.compactIconButton}>
                        <Icon color={colors.text} name="play-circle-outline" size={17} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="일시정지 또는 재개"
                        onPress={() => {
                          void pauseOrResumeSpeech();
                        }}
                        style={styles.compactIconButton}
                      >
                        <Icon color={colors.text} name={ttsPlaybackState === "paused" ? "play-circle-outline" : "pause-circle-outline"} size={17} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="정지"
                        onPress={() => {
                          void stopSpeech();
                        }}
                        style={styles.compactIconButton}
                      >
                        <Icon color={colors.text} name="stop-circle-outline" size={17} />
                      </Pressable>
                    </View>
                    <MetricRow label="상태" value={ttsPlaybackLabel} styles={styles} />
                    <Text style={styles.metaText}>{ttsStatus}</Text>
                  </View>
                ) : null}

                {activeSettingsSection === "text" ? (
                  <View style={styles.settingsSection}>
                    <View style={styles.panelHeading}>
                      <Text style={styles.panelTitle}>텍스트 설정</Text>
                      <Icon color={colors.text} name="text-outline" size={18} />
                    </View>
                    <SettingRangeField
                      label="글자 크기"
                      max={26}
                      min={15}
                      onChange={(fontSize) => updateSettings({ fontSize })}
                      styles={styles}
                      value={userData.settings.fontSize}
                      valueLabel={`${userData.settings.fontSize}px`}
                    />
                    <SettingRangeField
                      label="줄 간격"
                      max={2.2}
                      min={1.35}
                      onChange={(lineHeight) => updateSettings({ lineHeight })}
                      step={0.05}
                      styles={styles}
                      value={userData.settings.lineHeight}
                      valueLabel={userData.settings.lineHeight.toFixed(2)}
                    />
                  </View>
                ) : null}

                {activeSettingsSection === "view" ? (
                  <View style={styles.settingsSection}>
                    <View style={styles.panelHeading}>
                      <Text style={styles.panelTitle}>보기 모드</Text>
                      <Icon color={colors.text} name="reader-outline" size={18} />
                    </View>
                    <SettingSelectField label="읽기 모드" onPress={cycleReadingMode} styles={styles} value={selectedReadingModeLabel} />
                    <ActionButton
                      icon={isDark ? "sunny-outline" : "moon-outline"}
                      label={isDark ? "라이트 모드" : "다크 모드"}
                      onPress={() => updateSettings({ theme: userData.settings.theme === "dark" ? "light" : "dark" })}
                      styles={styles}
                    />
                  </View>
                ) : null}
                </View>
              </View>
            ) : null}
          </ScrollView>
          {isQuickMoveOpen ? (
            <View style={styles.commandBackdrop}>
              <View style={styles.commandModal}>
                <View style={styles.commandHeading}>
                  <View>
                    <Text style={styles.eyebrow}>명령</Text>
                    <Text style={styles.sectionTitle}>빠른 이동</Text>
                  </View>
                  <Pressable onPress={() => setIsQuickMoveOpen(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setCommandQuery}
                  placeholder="이동하거나 실행할 항목 검색"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  value={commandQuery}
                />
                <ScrollView style={styles.commandList}>
                  {quickMoveCommands.map((command) => (
                    <Pressable
                      disabled={command.disabled}
                      key={command.label}
                      onPress={() => runQuickMoveCommand(command.action)}
                      style={[styles.commandItem, command.disabled ? styles.commandItemDisabled : null]}
                    >
                      <Text style={styles.panelTitle}>{command.label}</Text>
                      <Text style={styles.metaText}>{command.description}</Text>
                    </Pressable>
                  ))}
                  {!quickMoveCommands.length ? <Text style={styles.emptyText}>명령이 없습니다.</Text> : null}
                </ScrollView>
              </View>
            </View>
          ) : null}
          {activeSearchSelectConfig ? (
            <View style={styles.commandBackdrop}>
              <View style={styles.selectSheet}>
                <View style={styles.commandHeading}>
                  <View>
                    <Text style={styles.eyebrow}>검색 필터</Text>
                    <Text style={styles.sectionTitle}>{activeSearchSelectConfig.title}</Text>
                  </View>
                  <Pressable onPress={() => setActiveSearchSelect(null)} style={styles.iconButton}>
                    <Icon color={colors.text} name="trash-outline" size={18} />
                  </Pressable>
                </View>
                <ScrollView style={styles.commandList}>
                  {activeSearchSelectConfig.options.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => selectSearchOption(option.value)}
                      style={[
                        styles.selectOption,
                        option.value === activeSearchSelectConfig.selectedValue ? styles.selectOptionActive : null,
                      ]}
                    >
                      <Text style={styles.panelTitle}>{option.label}</Text>
                      {option.value === activeSearchSelectConfig.selectedValue ? (
                        <Icon color={colors.accent} name="checkmark-circle" size={18} />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : null}
          {isChapterPickerOpen ? (
            <View style={styles.modalBackdrop}>
              <View style={styles.chapterPickerSheet}>
                <View style={styles.chapterPickerHeader}>
                  <View>
                    <Text style={styles.groupLabel}>성경 이동</Text>
                    <Text style={styles.modalTitleText}>{chapterPickerBook.nameKo}</Text>
                  </View>
                  <Pressable onPress={() => setIsChapterPickerOpen(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <View style={styles.chapterPickerBookField}>
                  <Text style={styles.groupLabel}>성경 권</Text>
                  <Pressable
                    onPress={() => setIsChapterPickerBookMenuOpen((current) => !current)}
                    style={styles.chapterPickerBookTrigger}
                  >
                    <Text numberOfLines={1} style={styles.chapterPickerBookValue}>{chapterPickerBook.nameKo}</Text>
                    <Icon color={colors.text} name="chevron-down" size={16} />
                  </Pressable>
                  {isChapterPickerBookMenuOpen ? (
                    <ScrollView style={styles.chapterPickerBookMenu}>
                      {[oldBooks, newBooks].flat().map((book) => {
                        const active = book.id === chapterPickerBookId;
                        return (
                          <Pressable
                            key={book.id}
                            onPress={() => {
                              setChapterPickerBookId(book.id);
                              setIsChapterPickerBookMenuOpen(false);
                            }}
                            style={[styles.chapterPickerBookRow, active ? styles.chapterPickerBookRowActive : null]}
                          >
                            <Text numberOfLines={1} style={styles.chapterPickerBookRowText}>{book.nameKo}</Text>
                            {active ? <Icon color={colors.accent} name="checkmark-circle" size={16} /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
                <View style={styles.chapterPickerGrid}>
                  {getChapters(chapterPickerBook.id).map((chapterNumber) => {
                    const activeChapter = chapterPickerBook.id === bookId && chapterNumber === chapter;
                    const completedChapter = completedKeys.has(chapterKey(chapterPickerBook.id, chapterNumber));
                    return (
                      <Pressable
                        key={chapterNumber}
                        onPress={() => selectChapterFromPicker(chapterNumber)}
                        style={[styles.chapterPickerButton, activeChapter ? styles.chipActive : null]}
                      >
                        <Text style={[styles.chipText, activeChapter ? styles.chipTextActive : null]}>{chapterNumber}</Text>
                        {completedChapter ? <Icon color={activeChapter ? styles.tokens.accentText : styles.tokens.success} name="checkmark-circle" size={12} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
          {activeView === "reader" && showChapterNote ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.noteModalSheet}>
                <View style={styles.modalHeading}>
                  <View>
                    <Text style={styles.eyebrow}>성경 노트</Text>
                    <Text style={styles.noteModalTitleText}>{currentBook.nameKo} {chapter}장 노트</Text>
                  </View>
                  <Pressable onPress={() => setShowChapterNote(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <TextInput
                  multiline
                  onChangeText={setChapterNoteDraft}
                  placeholder="묵상, 관찰, 적용점을 기록"
                  placeholderTextColor={colors.muted}
                  style={styles.noteModalInput}
                  value={chapterNoteDraft}
                />
                <View style={[styles.modalActions, styles.noteModalActions]}>
                  <ModalTextButton label="삭제" onPress={deleteChapterNote} styles={styles} variant="danger" />
                  <ModalTextButton label="취소" onPress={() => setShowChapterNote(false)} styles={styles} />
                  <ModalTextButton label="저장" onPress={saveChapterNote} styles={styles} variant="primary" />
                </View>
              </View>
            </View>
          ) : null}
          {activeView === "reader" && selectedVerse && showVerseNote ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.noteModalSheet}>
                <View style={styles.modalHeading}>
                  <View>
                    <Text style={styles.eyebrow}>성경 노트</Text>
                    <Text style={styles.noteModalTitleText}>{getBook(selectedVerse.bookId)?.nameKo ?? selectedVerse.bookId} {selectedVerse.chapter}장 {selectedVerse.verse}절 노트</Text>
                  </View>
                  <Pressable onPress={() => setShowVerseNote(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <TextInput
                  multiline
                  onChangeText={setNoteDraft}
                  placeholder="묵상, 관찰, 적용점을 기록"
                  placeholderTextColor={colors.muted}
                  style={styles.noteModalInput}
                  value={noteDraft}
                />
                <View style={[styles.modalActions, styles.noteModalActions]}>
                  <ModalTextButton label="삭제" onPress={deleteVerseNote} styles={styles} variant="danger" />
                  <ModalTextButton label="취소" onPress={() => setShowVerseNote(false)} styles={styles} />
                  <ModalTextButton label="저장" onPress={saveNote} styles={styles} variant="primary" />
                </View>
              </View>
            </View>
          ) : null}
          {showFavoriteModal && favoriteTargetVerses.length ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.favoriteModalSheet}>
                <View style={styles.modalHeading}>
                  <View style={styles.favoriteModalTitleBlock}>
                    <Text style={styles.eyebrow}>인용 구절</Text>
                    <Text style={styles.favoriteModalTitleText}>
                      {favoriteTargetVerses.length === 1 ? formatReference(favoriteTargetVerses[0]) : `${favoriteTargetVerses.length}개 구절`}
                    </Text>
                  </View>
                  <Pressable onPress={closeFavoriteModal} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <ScrollView style={styles.favoriteModalBody}>
                  <View style={styles.favoriteVersePreview}>
                    {favoriteTargetVerses.slice(0, 4).map((verse) => (
                      <Text key={verse.id} style={styles.favoriteVersePreviewText}>
                        <Text style={styles.favoriteVerseReference}>{formatReference(verse)}</Text> {getVerseDisplayText(verse, readingLanguage)}
                      </Text>
                    ))}
                    {favoriteTargetVerses.length > 4 ? <Text style={styles.metaText}>외 {favoriteTargetVerses.length - 4}개 구절</Text> : null}
                  </View>
                  <Text style={[styles.groupLabel, styles.favoriteModalFieldLabel]}>인용 제목</Text>
                  <TextInput
                    onChangeText={setFavoriteTitle}
                    placeholder="예: 구원 설명"
                    placeholderTextColor={colors.muted}
                    style={[styles.searchInput, styles.favoriteModalInput]}
                    value={favoriteTitle}
                  />
                  <Text style={[styles.groupLabel, styles.favoriteModalFieldLabel]}>태그</Text>
                  <TextInput
                    onChangeText={setFavoriteTagInput}
                    placeholder="태그, 쉼표 구분"
                    placeholderTextColor={colors.muted}
                    style={[styles.searchInput, styles.favoriteModalInput]}
                    value={favoriteTagInput}
                  />
                  <Text style={[styles.groupLabel, styles.favoriteModalFieldLabel]}>인용 메모</Text>
                  <TextInput
                    multiline
                    onChangeText={setFavoriteMemo}
                    placeholder="어디에 인용할지, 어떤 맥락인지 기록"
                    placeholderTextColor={colors.muted}
                    style={[styles.noteInput, styles.favoriteModalInput]}
                    value={favoriteMemo}
                  />
                  <Text style={[styles.groupLabel, styles.favoriteModalFieldLabel]}>저장할 목록</Text>
                  <View style={styles.favoriteCheckGrid}>
                    {userData.favoriteLists.map((list) => {
                      const checked = favoriteListSelection.includes(list.id);
                      return (
                        <Pressable
                          key={list.id}
                          onPress={() => toggleFavoriteListSelection(list.id)}
                          style={[styles.favoriteCheckRow, checked ? styles.favoriteCheckRowActive : null]}
                        >
                          <View style={[styles.favoriteCheckBox, checked ? styles.favoriteCheckBoxActive : null]}>
                            {checked ? <Icon color="#fff" name="checkmark-circle" size={12} /> : null}
                          </View>
                          <Text numberOfLines={1} style={styles.favoriteCheckName}>{list.name}</Text>
                          <Text style={styles.favoriteCheckCount}>{favoriteListCounts.get(list.id) ?? 0}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.newFavoriteListRow}>
                    <TextInput
                      onChangeText={setNewFavoriteListName}
                      placeholder="새 목록 이름"
                      placeholderTextColor={colors.muted}
                      style={[styles.searchInput, styles.newFavoriteListInput]}
                      value={newFavoriteListName}
                    />
                    <ActionButton icon="bookmark-outline" label="목록 생성" onPress={createFavoriteListFromModal} styles={styles} variant="modal" />
                  </View>
                </ScrollView>
                {copyStatus ? <Text style={styles.successText}>{copyStatus}</Text> : null}
                <View style={styles.modalActions}>
                  <ModalTextButton label="취소" onPress={closeFavoriteModal} styles={styles} />
                  <ModalTextButton label="저장" onPress={saveFavorite} styles={styles} variant="primary" />
                </View>
              </View>
            </View>
          ) : null}
          {pendingDeleteFavoriteList ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.noteModalSheet}>
                <View style={styles.modalHeading}>
                  <View>
                    <Text style={styles.eyebrow}>목록 삭제</Text>
                    <Text style={styles.sectionTitle}>{pendingDeleteFavoriteList.name}</Text>
                  </View>
                  <Pressable onPress={() => setPendingDeleteFavoriteListId(null)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <Text style={styles.metaText}>
                  이 목록을 삭제합니다. 이 목록에만 있는 구절은 함께 삭제하고, 다른 목록에도 들어간 구절은 다른 목록에 보존합니다.
                </Text>
                <View style={styles.modalActions}>
                  <ModalTextButton label="취소" onPress={() => setPendingDeleteFavoriteListId(null)} styles={styles} />
                  <ModalTextButton label="목록 삭제 확인" onPress={confirmDeleteFavoriteList} styles={styles} variant="danger" />
                </View>
              </View>
            </View>
          ) : null}
          {activeView === "reader" && selectedVerse && showFeedbackModal ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.feedbackModalSheet}>
                <View style={styles.modalHeading}>
                  <View>
                    <Text style={styles.eyebrow}>번역 의견</Text>
                    <Text style={styles.modalTitleText}>{formatReference(selectedVerse)}</Text>
                  </View>
                  <Pressable onPress={() => setShowFeedbackModal(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <Text style={styles.metaText}>{authUser ? `${authUser.email ?? "로그인 사용자"} 계정으로 전송` : "번역 의견은 로그인 후 전송할 수 있습니다."}</Text>
                <View style={styles.feedbackVersePreview}>
                  <Text style={styles.feedbackVerseText}>{getVerseDisplayText(selectedVerse, readingLanguage)}</Text>
                  {!selectedVerse.textKo ? <Text style={styles.metaText}>이 구절에는 아직 승인된 한국어 번역이 없습니다.</Text> : null}
                </View>
                <Text style={styles.groupLabel}>어떤 문제가 있나요?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalStrip}>
                  {translationFeedbackIssueTypes.map((issueType) => (
                    <Chip
                      active={feedbackIssueType === issueType}
                      key={issueType}
                      label={issueTypeLabels[issueType]}
                      onPress={() => setFeedbackIssueType(issueType)}
                      styles={styles}
                    />
                  ))}
                </ScrollView>
                <Text style={styles.groupLabel}>문제가 되는 표현</Text>
                <TextInput
                  onChangeText={setFeedbackSelectedText}
                  placeholder="예: 특정 단어 또는 짧은 표현"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  value={feedbackSelectedText}
                />
                <Text style={styles.groupLabel}>더 적절한 번역 제안</Text>
                <TextInput
                  multiline
                  onChangeText={setFeedbackSuggestedText}
                  placeholder="가능하면 더 나은 표현을 적어주세요."
                  placeholderTextColor={colors.muted}
                  style={styles.noteInput}
                  value={feedbackSuggestedText}
                />
                <Text style={styles.groupLabel}>설명</Text>
                <TextInput
                  multiline
                  onChangeText={setFeedbackComment}
                  placeholder="왜 그렇게 생각하는지 선택적으로 남겨주세요."
                  placeholderTextColor={colors.muted}
                  style={styles.noteInput}
                  value={feedbackComment}
                />
                {feedbackMessage ? <Text style={feedbackStatus === "success" ? styles.successText : styles.errorText}>{feedbackMessage}</Text> : null}
                <View style={styles.modalActions}>
                  <ActionButton icon="close-outline" label="취소" onPress={() => setShowFeedbackModal(false)} styles={styles} variant="modal" />
                  <ActionButton
                    disabled={feedbackStatus === "submitting" || !selectedVerse.textKo}
                    icon="flag-outline"
                    label={feedbackStatus === "submitting" ? "보내는 중" : "의견 보내기"}
                    onPress={submitFeedback}
                    styles={styles}
                    variant="modalPrimary"
                  />
                </View>
              </View>
            </View>
          ) : null}
          {showDeleteAccountModal ? (
            <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
              <View style={styles.noteModalSheet}>
                <View style={styles.modalHeading}>
                  <View>
                    <Text style={styles.eyebrow}>계정 삭제</Text>
                    <Text style={styles.modalTitleText}>회원탈퇴</Text>
                  </View>
                  <Pressable onPress={() => setShowDeleteAccountModal(false)} style={styles.iconButton}>
                    <Icon color={colors.text} name="close-outline" size={18} />
                  </Pressable>
                </View>
                <Text style={styles.metaText}>
                  {authUser?.email ?? "현재 계정"} 계정과 서버에 저장된 통독 기록, 하이라이트, 노트, 인용 구절을 즉시 삭제합니다.
                </Text>
                <Text style={styles.metaText}>비회원으로 남긴 이 기기 로컬 데이터는 삭제하지 않습니다.</Text>
                <Text style={styles.groupLabel}>확인 문구</Text>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setDeleteAccountConfirmText}
                  placeholder="회원탈퇴"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  value={deleteAccountConfirmText}
                />
                {deleteAccountMessage ? (
                  <Text style={deleteAccountStatus === "success" ? styles.successText : styles.errorText}>{deleteAccountMessage}</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <ActionButton
                    icon="close-outline"
                    label="취소"
                    onPress={() => setShowDeleteAccountModal(false)}
                    styles={styles}
                    variant="modal"
                  />
                  <ActionButton
                    disabled={deleteAccountConfirmText.trim() !== "회원탈퇴" || deleteAccountStatus === "submitting"}
                    icon="trash-outline"
                    label={deleteAccountStatus === "submitting" ? "삭제 중" : "회원탈퇴"}
                    onPress={deleteAccount}
                    styles={styles}
                    variant="modalDanger"
                  />
                </View>
              </View>
            </View>
          ) : null}
          {activeView === "reader" && isSelectionMode ? (
            <View style={[styles.selectionActionSheet, selectedVerses.length ? null : styles.selectionActionSheetEmpty]}>
              <View style={styles.selectionSummary}>
                <Text style={styles.panelTitle}>{selectedVerses.length}개 선택</Text>
                <Text style={styles.metaText}>
                  {selectionAnchorVerseId ? "다음 절을 누르면 범위가 선택됩니다." : "첫 절을 선택하세요."}
                </Text>
                {copyStatus ? <Text style={styles.successText}>{copyStatus}</Text> : null}
              </View>
              {selectedVerses.length ? (
                <View style={styles.selectionActions}>
                  <ActionButton icon="copy-outline" label="복사" onPress={copySelectedVerses} styles={styles} variant="selection" />
                  <ActionButton icon="bookmark-outline" label="인용 저장" onPress={saveSelectedFavorites} styles={styles} variant="selection" />
                  <ActionButton icon="reader-outline" label="새 노트" onPress={() => openNewPersonalNote(selectedVerses)} styles={styles} variant="selection" />
                  <ActionButton icon="volume-medium-outline" label="읽기" onPress={speakSelectedVerses} styles={styles} variant="selection" />
                  <ActionButton icon="refresh-outline" label="선택 해제" onPress={clearVerseSelection} styles={styles} variant="selection" />
                </View>
              ) : (
                <ActionButton
                  icon="stop-circle-outline"
                  label="선택 모드 종료"
                  onPress={() => setReaderSelectionMode(false)}
                  styles={styles}
                />
              )}
            </View>
          ) : null}
          {shouldShowTtsOverlay ? (
            <View style={styles.playerBar}>
              <View style={styles.playerStatusBlock}>
                <Text style={styles.playerTitle}>TTS · {ttsPlaybackState}</Text>
                <Text numberOfLines={1} style={styles.metaText}>{ttsQueueLabel} · {ttsStatus}</Text>
              </View>
              <View style={styles.playerControls}>
                <Pressable accessibilityLabel="이전 구절" onPress={() => { void moveSpeech(-1); }} style={styles.playerIconButton}>
                  <Icon color={colors.text} name="chevron-back" size={16} />
                </Pressable>
                <Pressable accessibilityLabel="재생" onPress={playCurrentSpeechContext} style={styles.playerIconButton}>
                  <Icon color={colors.text} name="play-circle-outline" size={16} />
                </Pressable>
                <Pressable accessibilityLabel="일시정지 또는 재개" onPress={() => { void pauseOrResumeSpeech(); }} style={styles.playerIconButton}>
                  <Icon color={colors.text} name={ttsPlaybackState === "paused" ? "play-circle-outline" : "pause-circle-outline"} size={16} />
                </Pressable>
                <Pressable accessibilityLabel="정지" onPress={() => { void stopSpeech(); }} style={styles.playerIconButton}>
                  <Icon color={colors.text} name="stop-circle-outline" size={16} />
                </Pressable>
                <Pressable accessibilityLabel="다음 구절" onPress={() => { void moveSpeech(1); }} style={styles.playerIconButton}>
                  <Icon color={colors.text} name="chevron-forward" size={16} />
                </Pressable>
              </View>
              {ttsPlaybackState === "playing" ? <Text style={styles.liveDot}>재생</Text> : null}
            </View>
          ) : null}
          {studyUiFeatureFlags.uiShellV2 ? (
            <View style={styles.tabBar}>
              <TabButton active={activePrimaryArea === "today"} icon="home-outline" label="오늘" onPress={() => setActiveView("dashboard")} styles={styles} />
              <TabButton active={activePrimaryArea === "read"} icon="book-outline" label="성경" onPress={() => setActiveView("reader")} styles={styles} />
              <TabButton active={activePrimaryArea === "study"} icon="reader-outline" label="공부" onPress={() => setActiveView("notes")} styles={styles} />
              <TabButton active={activePrimaryArea === "library"} icon="bookmark-outline" label="보관함" onPress={() => setActiveView("favorites")} styles={styles} />
              <TabButton active={activePrimaryArea === "settings"} icon="settings-outline" label="설정" onPress={() => setActiveView("settings")} styles={styles} />
            </View>
          ) : (
            <View style={styles.tabBar}>
              <TabButton active={activeView === "dashboard"} icon="home-outline" label="홈" onPress={() => setActiveView("dashboard")} styles={styles} />
              <TabButton active={activeView === "reader"} icon="book-outline" label="성경" onPress={() => setActiveView("reader")} styles={styles} />
              <TabButton active={activeView === "favorites"} icon="bookmark-outline" label="인용" onPress={() => setActiveView("favorites")} styles={styles} />
              <TabButton active={isQuickMoveOpen || activeView === "quickMove"} icon="command-outline" label="빠른이동" onPress={() => setIsQuickMoveOpen(true)} styles={styles} />
              <TabButton active={activeView === "settings"} icon="settings-outline" label="설정" onPress={() => setActiveView("settings")} styles={styles} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Icon({ color, name, size }: { color: string; name: IconName; size: number }) {
  const webShapes = Platform.OS === "web" ? webIconShapes[name] : null;

  if (webShapes) {
    return createElement(
      "svg",
      {
        "aria-hidden": true,
        fill: "none",
        height: size,
        stroke: color,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: 2,
        style: { display: "block", flexShrink: 0, height: size, minWidth: size + 2, width: size },
        viewBox: "0 0 24 24",
        width: size,
      },
      webShapes.map((shape, index) => createElement(shape.tag, { ...shape.attrs, key: `${name}-${index}` })),
    );
  }

  return (
    <Text style={{ color, fontSize: size, fontWeight: "900", lineHeight: size + 2, minWidth: size + 2, textAlign: "center" }}>
      {iconGlyphs[name]}
    </Text>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active ? styles.tabButtonActive : null]}>
      <Icon color={active ? styles.tokens.text : styles.tokens.muted} name={icon} size={18} />
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Pill({
  active,
  icon,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active ? styles.pillActive : null]}>
      <Icon color={active ? styles.tokens.text : styles.tokens.text} name={icon} size={14} />
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function HomeTabButton({
  active,
  icon,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.homeTabButton, active ? styles.homeTabButtonActive : null]}>
      <Icon color={active ? styles.tokens.text : styles.tokens.muted} name={icon} size={16} />
      <Text style={[styles.homeTabText, active ? styles.homeTabTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  active,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function SelectField({
  icon,
  label,
  onPress,
  styles,
  value,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={[styles.formField, styles.selectField]}>
      <Text style={styles.groupLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.selectFieldButton}>
        <View style={styles.selectFieldValue}>
          <Icon color={styles.tokens.muted} name={icon} size={15} />
          <Text numberOfLines={1} style={styles.selectFieldText}>{value}</Text>
        </View>
        <Icon color={styles.tokens.muted} name="chevron-forward" size={16} />
      </Pressable>
    </View>
  );
}

function SettingsMenuButton({
  active,
  icon,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.settingsMenuButton, active ? styles.settingsMenuButtonActive : null]}>
      <Icon color={active ? styles.tokens.text : styles.tokens.muted} name={icon} size={17} />
      <Text style={[styles.settingsMenuText, active ? styles.settingsMenuTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function AuthCredentialForm({
  authEmail,
  authMessage,
  authPassword,
  authStatus,
  mode,
  onChangeEmail,
  onChangePassword,
  onPrivacyPress,
  onSecondarySubmit,
  onSubmit,
  secondaryIcon,
  secondaryLabel,
  styles,
  supabaseAvailable,
}: {
  authEmail: string;
  authMessage: string;
  authPassword: string;
  authStatus: SubmitStatus;
  mode: AuthCredentialMode;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onPrivacyPress?: () => void;
  onSubmit: () => void;
  styles: ReturnType<typeof createStyles>;
  supabaseAvailable: boolean;
  onSecondarySubmit?: () => void;
  secondaryIcon?: IconName;
  secondaryLabel?: string;
}) {
  const isSubmitting = authStatus === "submitting";
  const submitLabel = isSubmitting ? "처리 중" : mode === "login" ? "로그인" : "회원가입";

  return (
    <View style={styles.authForm}>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={onChangeEmail}
        placeholder="이메일"
        placeholderTextColor={styles.tokens.muted}
        style={styles.searchInput}
        value={authEmail}
      />
      <TextInput
        onChangeText={onChangePassword}
        placeholder="비밀번호"
        placeholderTextColor={styles.tokens.muted}
        secureTextEntry
        style={styles.searchInput}
        value={authPassword}
      />
      <View style={styles.settingsActionGrid}>
        <ActionButton
          disabled={isSubmitting}
          icon={mode === "login" ? "log-in-outline" : "person-add-outline"}
          label={submitLabel}
          onPress={onSubmit}
          styles={styles}
          variant="setting"
        />
        {secondaryLabel && onSecondarySubmit ? (
          <ActionButton
            disabled={isSubmitting}
            icon={secondaryIcon}
            label={secondaryLabel}
            onPress={onSecondarySubmit}
            styles={styles}
            variant="setting"
          />
        ) : null}
      </View>
      {mode === "sign-up" && onPrivacyPress ? (
        <Pressable onPress={onPrivacyPress} style={styles.authPrivacyLink}>
          <Text style={styles.authPrivacyText}>
            회원가입 전 <Text style={styles.authPrivacyLinkText}>개인정보 취급방침</Text>을 확인하세요.
          </Text>
        </Pressable>
      ) : null}
      {!supabaseAvailable ? <Text style={styles.errorText}>Supabase 공개 설정이 Expo에 전달되지 않았습니다.</Text> : null}
      {authMessage ? <Text style={authStatus === "error" ? styles.errorText : styles.successText}>{authMessage}</Text> : null}
    </View>
  );
}

function PrivacyPolicyModal({
  onClose,
  styles,
}: {
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.modalBackdrop, styles.centerModalBackdrop]}>
      <View style={styles.privacyModalSheet}>
        <View style={styles.chapterPickerHeader}>
          <View style={styles.favoriteModalTitleBlock}>
            <Text style={styles.noteModalTitleText}>{privacyPolicyTitle}</Text>
            <Text style={styles.metaText}>시행일: {privacyPolicyUpdatedAt}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Icon color={styles.tokens.text} name="close-outline" size={18} />
          </Pressable>
        </View>
        <ScrollView style={styles.privacyModalBody}>
          <Text style={styles.privacyModalIntro}>{privacyPolicyIntro}</Text>
          {privacyPolicySections.map((section) => (
            <View key={section.title} style={styles.privacyModalSection}>
              <Text style={styles.privacyModalSectionTitle}>{section.title}</Text>
              {section.body.map((paragraph) => (
                <Text key={paragraph} style={styles.privacyModalParagraph}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
        <View style={[styles.modalActions, styles.noteModalActions]}>
          <ModalTextButton label="닫기" onPress={onClose} styles={styles} variant="primary" />
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  active = false,
  disabled = false,
  icon,
  label,
  onPress,
  styles,
  variant = "default",
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "primary" | "reader" | "selection" | "setting" | "modal" | "modalDanger" | "modalPrimary" | "panel";
}) {
  const primary = variant === "primary" || variant === "modalPrimary";
  const danger = variant === "modalDanger";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === "reader" ? styles.readerActionButton : null,
        variant === "reader" && active ? styles.readerActionButtonActive : null,
        variant === "selection" ? styles.selectionActionButton : null,
        variant === "setting" ? styles.settingActionButton : null,
        variant === "panel" ? styles.panelActionButton : null,
        variant === "modal" || variant === "modalDanger" || variant === "modalPrimary" ? styles.modalActionButton : null,
        danger ? styles.modalDangerActionButton : null,
        primary ? styles.primaryActionButton : null,
        variant === "modalPrimary" ? styles.modalPrimaryActionButton : null,
        disabled ? styles.actionButtonDisabled : null,
      ]}
    >
      {icon ? <Icon color={primary ? "#fff" : danger ? styles.tokens.danger : styles.tokens.text} name={icon} size={17} /> : null}
      <Text style={[styles.actionText, primary ? styles.primaryActionText : null, danger ? styles.modalDangerActionText : null]}>{label}</Text>
    </Pressable>
  );
}

function ModalTextButton({
  label,
  onPress,
  styles,
  variant = "default",
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  variant?: "danger" | "default" | "primary";
}) {
  const primary = variant === "primary";
  const danger = variant === "danger";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modalTextActionButton,
        primary ? styles.modalTextPrimaryActionButton : null,
      ]}
    >
      <Text
        style={[
          styles.modalTextActionText,
          danger ? styles.modalTextDangerActionText : null,
          primary ? styles.modalTextPrimaryActionText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProgressMetricCard({
  detail,
  label,
  percent,
  styles,
  value,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  detail?: string;
  percent?: number;
}) {
  const safePercent = typeof percent === "number" ? Math.min(100, Math.max(0, percent)) : null;

  return (
    <View style={styles.progressMetricPanel}>
      <Text style={styles.progressMetricLabel}>{label}</Text>
      <Text style={styles.progressMetricValue}>{value}</Text>
      {safePercent !== null ? (
        <View style={styles.metricProgressTrack} accessibilityLabel={`${label} 진행률`}>
          <View style={[styles.metricProgressFill, { width: `${safePercent}%` }]} />
        </View>
      ) : null}
      {detail ? <Text style={styles.progressMetricDetail}>{detail}</Text> : null}
    </View>
  );
}

function MetricRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metaText}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SettingSelectField({
  label,
  onPress,
  styles,
  value,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  value: string;
}) {
  return (
    <View style={styles.settingsField}>
      <Text style={styles.settingsFieldLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.settingsSelectButton}>
        <Text numberOfLines={1} style={styles.settingsSelectValue}>{value}</Text>
        <Icon color={styles.tokens.text} name="chevron-down" size={16} />
      </Pressable>
    </View>
  );
}

function SettingToggleRow({
  checked,
  label,
  onPress,
  styles,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsToggleRow}>
      <View style={[styles.settingsCheckBox, checked ? styles.settingsCheckBoxActive : null]}>
        {checked ? <Icon color="#fff" name="checkmark-circle" size={12} /> : null}
      </View>
      <Text style={styles.settingsToggleText}>{label}</Text>
    </Pressable>
  );
}

function SettingRangeField({
  label,
  max,
  min,
  onChange,
  step = 1,
  styles,
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  styles: ReturnType<typeof createStyles>;
  value: number;
  valueLabel: string;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const updateFromEvent = (event: GestureResponderEvent) => {
    const nextRatio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
    const rawValue = min + (max - min) * nextRatio;
    const steppedValue = Math.round(rawValue / step) * step;
    const precision = step < 1 ? 2 : 0;
    onChange(Number(Math.max(min, Math.min(max, steppedValue)).toFixed(precision)));
  };

  return (
    <View style={styles.settingsRangeField}>
      <View style={styles.settingsValueRow}>
        <Text style={styles.settingsFieldLabel}>{label}</Text>
        <Text style={styles.settingsValueStrong}>{valueLabel}</Text>
      </View>
      <Pressable
        onLayout={(event) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
        onPress={updateFromEvent}
        style={styles.settingsRangeTrack}
      >
        <View style={[styles.settingsRangeFill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.settingsRangeThumb, { left: `${ratio * 100}%` }]} />
      </Pressable>
    </View>
  );
}

function HighlightedText({
  highlightStyle,
  numberOfLines,
  query,
  style,
  text,
}: {
  highlightStyle: object;
  numberOfLines?: number;
  query: string;
  style: object;
  text: string;
}) {
  const ranges = collectSearchHighlightRanges(text, query);

  if (!ranges.length) {
    return (
      <Text numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (cursor < range.start) {
      nodes.push(text.slice(cursor, range.start));
    }

    nodes.push(
      <Text key={`${range.start}-${range.end}-${index}`} style={highlightStyle}>
        {text.slice(range.start, range.end)}
      </Text>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {nodes}
    </Text>
  );
}

const lightColors = {
  background: "#f7f8f5",
  surface: "#ffffff",
  surfaceStrong: "#eef3ee",
  text: "#1e2522",
  muted: "#667069",
  border: "#d9ded8",
  accent: "#176f63",
  accentSecondary: "#8b2635",
  accentSoft: "#eef3ee",
  accentText: "#ffffff",
  warning: "#9f6b12",
  danger: "#a6372e",
  success: "#176f63",
};

const darkColors = {
  background: "#151716",
  surface: "#202421",
  surfaceStrong: "#2b312d",
  text: "#f0f3ed",
  muted: "#aab3aa",
  border: "#3b423d",
  accent: "#59c6a9",
  accentSecondary: "#f07f90",
  accentSoft: "#2b312d",
  accentText: "#151716",
  warning: "#d0a848",
  danger: "#ff8a7a",
  success: "#59c6a9",
};

function createStyles(colors: typeof lightColors, viewportHeight = 844) {
  const commandModalHeight = Math.min(viewportHeight * 0.72, 620);

  return Object.assign(
    StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
      root: {
        flex: 1,
      },
      authLoadingScreen: {
        alignItems: "center",
        flex: 1,
        gap: 12,
        justifyContent: "center",
        padding: 24,
      },
      authEntryScreen: {
        flexGrow: 1,
        gap: 24,
        justifyContent: "space-between",
        padding: 24,
        paddingBottom: 28,
      },
      authBrandBlock: {
        alignItems: "center",
        gap: 10,
        paddingTop: Math.min(96, Math.max(48, viewportHeight * 0.1)),
      },
      authBrandMark: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 64,
        justifyContent: "center",
        width: 64,
      },
      authEntryTitle: {
        color: colors.text,
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 0,
        textAlign: "center",
      },
      authEntrySubtitle: {
        color: colors.muted,
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: 0,
        textAlign: "center",
      },
      authEntryBottom: {
        gap: 14,
        paddingBottom: 8,
      },
      authEntryLinkRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
        minHeight: 44,
      },
      authEntryTextButton: {
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 8,
      },
      authEntryTextButtonLabel: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "900",
      },
      authEntrySeparator: {
        color: colors.border,
        fontSize: 18,
        fontWeight: "800",
      },
      authGuestButton: {
        alignItems: "center",
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        minHeight: 52,
        paddingHorizontal: 16,
      },
      authGuestButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
      },
      authEntryPanel: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 14,
        padding: 16,
      },
      authEntryPanelHeader: {
        alignItems: "flex-start",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
      },
      authEntryFormTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 0,
      },
      authEntryFormCopy: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
      },
      authEntryBackButton: {
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 36,
        paddingHorizontal: 10,
      },
      authEntryBackButtonText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "900",
      },
      authPrivacyLink: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
      },
      authPrivacyText: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 18,
      },
      authPrivacyLinkText: {
        color: colors.accent,
        fontWeight: "900",
        textDecorationLine: "underline",
      },
      header: {
        alignItems: "center",
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        minHeight: 58,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      headerActions: {
        alignItems: "center",
        flexDirection: "row",
        flexShrink: 1,
        gap: 7,
      },
      headerIconButton: {
        alignItems: "center",
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        width: 44,
      },
      headerAvatar: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        height: 30,
        width: 30,
      },
      eyebrow: {
        color: colors.accentSecondary,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0,
        textTransform: "uppercase",
      },
      title: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0,
      },
      mockUser: {
        color: colors.muted,
        flexShrink: 1,
        fontSize: 12,
        fontWeight: "700",
        maxWidth: 120,
      },
      tabBar: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
      },
      tabButton: {
        alignItems: "center",
        borderRadius: 6,
        flex: 1,
        gap: 2,
        minHeight: 48,
        paddingHorizontal: 4,
        paddingVertical: 0,
      },
      tabButtonActive: {
        backgroundColor: colors.accentSoft,
      },
      tabLabel: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: "700",
        lineHeight: 13,
      },
      tabLabelActive: {
        color: colors.text,
      },
      content: {
        padding: 12,
        paddingBottom: 32,
      },
      contentWithSelectionSheet: {
        paddingBottom: 162,
      },
      section: {
        gap: 12,
      },
      sectionTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: "800",
        letterSpacing: 0,
      },
      readerChapterTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: "800",
        letterSpacing: 0,
        lineHeight: 24,
      },
      homeSegment: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 4,
        padding: 4,
      },
      homeTabButton: {
        alignItems: "center",
        borderColor: "transparent",
        borderRadius: 6,
        borderWidth: 1,
        flex: 1,
        flexDirection: "row",
        gap: 6,
        justifyContent: "center",
        minHeight: 44,
        minWidth: 0,
        outlineColor: "transparent",
        outlineStyle: "solid",
        outlineWidth: 0,
        paddingHorizontal: 8,
      },
      homeTabButtonActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
      },
      homeTabText: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: "800",
      },
      homeTabTextActive: {
        color: colors.text,
      },
      readerToolbar: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
      },
      readerPanel: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 2,
        padding: 14,
      },
      readerPanelToolbar: {
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        minHeight: 0,
        paddingBottom: 14,
      },
      readerTitleBlock: {
        alignItems: "flex-start",
        flex: 1,
        gap: 2,
      },
      readerToolbarMeta: {
        color: colors.muted,
        fontSize: 16,
        lineHeight: 24,
      },
      iconButton: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        borderRadius: 8,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        width: 44,
      },
      groupLabel: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: "700",
      },
      horizontalStrip: {
        marginHorizontal: -2,
      },
      pill: {
        alignItems: "center",
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 5,
        minHeight: 34,
        paddingHorizontal: 10,
      },
      pillActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
      },
      pillText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "800",
      },
      pillTextActive: {
        color: colors.text,
      },
      chip: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
        minHeight: 36,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      chipActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.accent,
      },
      chipText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "700",
      },
      chipTextActive: {
        color: colors.text,
      },
      actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      },
      readerActionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginVertical: 14,
        gap: 8,
      },
      actionButton: {
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 12,
      },
      actionButtonDisabled: {
        opacity: 0.48,
      },
      primaryActionButton: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        marginTop: 8,
      },
      modalActionButton: {
        alignSelf: "stretch",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        justifyContent: "center",
        marginTop: 0,
        minHeight: 44,
      },
      modalDangerActionButton: {
        backgroundColor: colors.surfaceStrong,
      },
      modalPrimaryActionButton: {
        marginTop: 0,
      },
      modalDangerActionText: {
        color: colors.danger,
      },
      modalTextActionButton: {
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 12,
      },
      modalTextPrimaryActionButton: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        marginTop: 18,
      },
      modalTextActionText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "700",
      },
      modalTextDangerActionText: {
        color: colors.danger,
      },
      modalTextPrimaryActionText: {
        color: "#fff",
      },
      readerActionButton: {
        alignSelf: "stretch",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        flexBasis: "30%",
        flexGrow: 1,
        gap: 4,
        justifyContent: "center",
        minWidth: 0,
        paddingHorizontal: 6,
      },
      readerActionButtonActive: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
      },
      selectionActionButton: {
        alignSelf: "stretch",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        flexBasis: "45%",
        flexGrow: 1,
        justifyContent: "center",
        minWidth: 0,
        paddingHorizontal: 6,
      },
      settingActionButton: {
        alignSelf: "stretch",
        justifyContent: "center",
      },
      panelActionButton: {
        alignSelf: "stretch",
        backgroundColor: colors.surfaceStrong,
        justifyContent: "center",
      },
      actionText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "800",
      },
      primaryActionText: {
        color: "#fff",
      },
      loader: {
        paddingVertical: 20,
      },
      emptyState: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      },
      errorText: {
        color: colors.danger,
        fontSize: 14,
        fontWeight: "700",
      },
      successText: {
        color: colors.success,
        fontSize: 13,
        fontWeight: "700",
      },
      metaText: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 19,
      },
      verseRow: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        minHeight: 56,
        padding: 10,
      },
      verseRowSelected: {
        borderColor: colors.accent,
      },
      verseRowCurrentReading: {
        borderLeftColor: colors.accent,
        borderLeftWidth: 4,
        paddingLeft: 7,
      },
      verseRowBatchSelected: {
        borderColor: colors.warning,
      },
      verseRowSpeaking: {
        borderColor: colors.accent,
        shadowColor: colors.accent,
        shadowOpacity: 0.14,
        shadowRadius: 10,
      },
      verseRowFocus: {
        paddingHorizontal: 12,
        paddingVertical: 12,
      },
      verseNumber: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: "900",
        paddingVertical: 2,
        textAlign: "center",
        width: 28,
      },
      verseNumberEmphasized: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 6,
        color: colors.accentSecondary,
      },
      verseTextBlock: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
      },
      verseText: {
        color: colors.text,
        fontWeight: "400",
      },
      badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
      },
      badge: {
        backgroundColor: colors.accentSoft,
        borderRadius: 7,
        color: colors.accent,
        fontSize: 11,
        fontWeight: "800",
        overflow: "hidden",
        paddingHorizontal: 7,
        paddingVertical: 3,
      },
      verseMarkers: {
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-start",
        width: 24,
      },
      selectionCheck: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 999,
        borderWidth: 1,
        height: 20,
        justifyContent: "center",
        width: 20,
      },
      selectionCheckActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
      },
      highlightMarker: {
        backgroundColor: colors.warning,
        borderRadius: 999,
        height: 7,
        width: 7,
      },
      selectedPanel: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      },
      verseActionPanel: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 12,
        marginTop: 6,
        paddingTop: 16,
      },
      selectedReference: {
        gap: 4,
      },
      quickActions: {
        alignItems: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      },
      compactIconButton: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        width: 44,
      },
      compactIconButtonDisabled: {
        opacity: 0.48,
      },
      panelHeading: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
      },
      formPanel: {
        backgroundColor: colors.surface,
        gap: 12,
      },
      searchPanel: {
        minHeight: 617,
      },
      formField: {
        gap: 6,
        minWidth: 0,
      },
      selectField: {
        flexBasis: "100%",
        flexGrow: 1,
      },
      formGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
      },
      selectFieldButton: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 46,
        minWidth: 0,
        paddingHorizontal: 12,
      },
      selectFieldValue: {
        alignItems: "center",
        flex: 1,
        flexDirection: "row",
        gap: 7,
        minWidth: 0,
      },
      selectFieldText: {
        color: colors.text,
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
      },
      searchSummary: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: "700",
      },
      settingsShell: {
        backgroundColor: colors.surface,
        gap: 12,
      },
      settingsMenuGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      },
      settingsMenuButton: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexBasis: "47%",
        flexDirection: "row",
        flexGrow: 1,
        gap: 7,
        justifyContent: "center",
        minHeight: 44,
        minWidth: 0,
        paddingHorizontal: 8,
      },
      settingsMenuButtonActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.accent,
      },
      settingsMenuText: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: "800",
      },
      settingsMenuTextActive: {
        color: colors.text,
      },
      settingsSection: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 10,
        paddingTop: 12,
      },
      settingsField: {
        gap: 8,
      },
      settingsFieldLabel: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: "700",
      },
      settingsSelectButton: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
        minHeight: 40,
        paddingHorizontal: 10,
      },
      settingsSelectValue: {
        color: colors.text,
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
      },
      settingsRangeField: {
        gap: 8,
        justifyContent: "space-between",
        minHeight: 72,
      },
      settingsValueRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
      },
      settingsValueStrong: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: "900",
      },
      settingsRangeTrack: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 999,
        borderWidth: 1,
        height: 8,
        justifyContent: "center",
        overflow: "visible",
      },
      settingsRangeFill: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: 6,
      },
      settingsRangeThumb: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: 16,
        marginLeft: -8,
        position: "absolute",
        width: 16,
      },
      settingsToggleRow: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderRadius: 6,
        flexDirection: "row",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 10,
      },
      settingsCheckBox: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 2,
        borderWidth: 1,
        height: 14,
        justifyContent: "center",
        width: 14,
      },
      settingsCheckBoxActive: {
        backgroundColor: "#0b7cff",
        borderColor: "#0b7cff",
      },
      settingsToggleText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "800",
      },
      ttsControls: {
        flexDirection: "row",
        gap: 8,
      },
      accountSummary: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        minHeight: 72,
        padding: 12,
      },
      accountAvatar: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: 52,
        width: 52,
      },
      accountTextBlock: {
        flex: 1,
        gap: 3,
        minWidth: 0,
      },
      accountName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "900",
      },
      statusBadge: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        color: colors.muted,
        fontSize: 12,
        fontWeight: "900",
        overflow: "hidden",
        paddingHorizontal: 9,
        paddingVertical: 5,
      },
      statusBadgeActive: {
        color: colors.accent,
      },
      accountSyncPanel: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
        padding: 12,
      },
      settingsActionGrid: {
        gap: 8,
      },
      authForm: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 10,
        paddingTop: 10,
      },
      settingsUtilityPanel: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      },
      homePanel: {
        minHeight: 250,
      },
      homeSurfacePanel: {
        backgroundColor: colors.surface,
      },
      continuePanel: {
        backgroundColor: colors.surfaceStrong,
      },
      homePanelHeading: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
      },
      continuePanelTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 0,
        lineHeight: 27,
      },
      homePanelBodyText: {
        color: colors.muted,
        fontSize: 15,
        lineHeight: 22,
      },
      homePlanPanel: {
        minHeight: 429,
      },
      homeStudyPanel: {
        minHeight: 184,
      },
      modalBackdrop: {
        backgroundColor: "rgba(0, 0, 0, 0.48)",
        bottom: 0,
        justifyContent: "flex-end",
        left: 0,
        paddingHorizontal: 12,
        paddingBottom: 82,
        position: Platform.OS === "web" ? ("fixed" as unknown as "absolute") : "absolute",
        right: 0,
        top: 0,
        zIndex: 40,
      },
      centerModalBackdrop: {
        justifyContent: "center",
        paddingBottom: 20,
        paddingHorizontal: 12,
      },
      chapterPickerSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 1,
        gap: 14,
        height: "72%",
        maxHeight: "72%",
        padding: 14,
      },
      chapterPickerHeader: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
      },
      chapterPickerBookField: {
        gap: 8,
      },
      chapterPickerBookTrigger: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 46,
        paddingHorizontal: 12,
      },
      chapterPickerBookValue: {
        color: colors.text,
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
      },
      chapterPickerBookMenu: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        maxHeight: 188,
        overflow: "hidden",
      },
      chapterPickerBookRow: {
        alignItems: "center",
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: "row",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 12,
      },
      chapterPickerBookRowActive: {
        backgroundColor: colors.surfaceStrong,
      },
      chapterPickerBookRowText: {
        color: colors.text,
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
      },
      noteModalSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 14,
        marginTop: 18,
        maxHeight: "82%",
        padding: 18,
        width: "100%",
      },
      privacyModalSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 14,
        maxHeight: "88%",
        padding: 18,
        width: "100%",
      },
      privacyModalBody: {
        maxHeight: Platform.OS === "web" ? 560 : 520,
      },
      privacyModalIntro: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
      },
      privacyModalSection: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 8,
        paddingTop: 14,
        marginBottom: 16,
      },
      privacyModalSectionTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "900",
      },
      privacyModalParagraph: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 20,
      },
      feedbackModalSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
        maxHeight: "88%",
        padding: 18,
        width: "100%",
      },
      feedbackVersePreview: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 7,
        padding: 12,
      },
      feedbackVerseText: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 21,
      },
      favoriteModalSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
        maxHeight: Platform.OS === "web" ? "calc(100dvh - 24px)" as unknown as "90%" : "90%",
        padding: 14,
        width: "100%",
      },
      favoriteModalTitleBlock: {
        flex: 1,
        gap: 3,
        minWidth: 0,
      },
      favoriteModalTitleText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "500",
        lineHeight: 23,
      },
      favoriteModalBody: {
        height: Platform.OS === "web" ? 556 : undefined,
        maxHeight: Platform.OS === "web" ? 590 : 478,
      },
      favoriteModalFieldLabel: {
        marginBottom: 8,
      },
      favoriteModalInput: {
        marginBottom: 12,
      },
      favoriteVersePreview: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 7,
        marginBottom: 12,
        padding: 12,
      },
      favoriteVerseReference: {
        color: colors.text,
        fontWeight: "900",
      },
      favoriteVersePreviewText: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 24,
      },
      favoriteCheckGrid: {
        gap: 8,
        marginBottom: 10,
      },
      favoriteCheckRow: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        minHeight: 42,
        paddingHorizontal: 10,
      },
      favoriteCheckRowActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
      },
      favoriteCheckBox: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 2,
        borderWidth: 1,
        height: 14,
        justifyContent: "center",
        width: 14,
      },
      favoriteCheckBoxActive: {
        backgroundColor: "#0b7cff",
        borderColor: "#0b7cff",
      },
      favoriteCheckName: {
        color: colors.text,
        flex: 1,
        fontSize: 13,
        fontWeight: "800",
      },
      favoriteCheckCount: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: "900",
      },
      newFavoriteListRow: {
        gap: 8,
        marginTop: 2,
      },
      newFavoriteListInput: {
        width: "100%",
      },
      modalHeading: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
      },
      modalTitleText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "500",
        lineHeight: 23,
      },
      noteModalTitleText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 23,
      },
      noteModalInput: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        color: colors.text,
        minHeight: 172,
        padding: 12,
        textAlignVertical: "top",
      },
      noteModalActions: {
        marginTop: 4,
      },
      modalActions: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: "column",
        gap: 8,
        justifyContent: "center",
        paddingTop: 14,
      },
      playerBar: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        bottom: 76,
        gap: 8,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        position: "absolute",
        right: 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        zIndex: 26,
      },
      playerStatusBlock: {
        gap: 2,
        minWidth: 0,
      },
      playerTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "900",
      },
      playerControls: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
      },
      playerIconButton: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        minWidth: 44,
      },
      liveDot: {
        alignSelf: "flex-start",
        backgroundColor: colors.accentSoft,
        borderRadius: 999,
        color: colors.accent,
        fontSize: 12,
        fontWeight: "900",
        overflow: "hidden",
        paddingHorizontal: 8,
        paddingVertical: 3,
      },
      chapterPickerGrid: {
        backgroundColor: colors.surface,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingBottom: 14,
      },
      chapterPickerButton: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: "transparent",
        borderRadius: 6,
        borderWidth: 1,
        flexBasis: "14.4%",
        flexDirection: "row",
        flexGrow: 0,
        gap: 4,
        justifyContent: "center",
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 6,
      },
      commandBackdrop: {
        backgroundColor: "rgba(0, 0, 0, 0.48)",
        bottom: 0,
        justifyContent: "flex-end",
        left: 0,
        paddingHorizontal: 12,
        paddingBottom: 82,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 35,
      },
      commandModal: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 1,
        gap: 14,
        height: Platform.OS === "web" ? commandModalHeight : undefined,
        maxHeight: Platform.OS === "web" ? commandModalHeight : "72%",
        padding: 14,
      },
      selectSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 1,
        gap: 14,
        maxHeight: "68%",
        padding: 14,
      },
      commandHeading: {
        alignItems: "flex-start",
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
      },
      commandList: {
        marginTop: 2,
      },
      commandItem: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
        marginBottom: 8,
        minHeight: 58,
        padding: 10,
      },
      commandItemDisabled: {
        opacity: 0.55,
      },
      selectOption: {
        alignItems: "center",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        minHeight: 48,
        paddingHorizontal: 12,
      },
      selectOptionActive: {
        borderColor: colors.accent,
      },
      selectionActionSheet: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        bottom: 76,
        gap: 12,
        left: 12,
        padding: 14,
        position: "absolute",
        right: 12,
        zIndex: 20,
      },
      selectionActionSheetEmpty: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
        paddingVertical: 8,
      },
      selectionSummary: {
        flex: 1,
        gap: 2,
        minWidth: 0,
      },
      selectionActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      },
      panelTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "800",
      },
      noteInput: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        color: colors.text,
        minHeight: 92,
        padding: 12,
        textAlignVertical: "top",
      },
      searchInput: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        color: colors.text,
        minHeight: 46,
        paddingHorizontal: 12,
      },
      favoriteListSelector: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
        minHeight: 48,
        paddingHorizontal: 12,
      },
      favoriteListSelectorText: {
        flex: 1,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        minWidth: 0,
      },
      favoriteListSelectorName: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: "900",
      },
      favoriteListCount: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: "900",
        textAlign: "center",
      },
      favoriteListDropdownMenu: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 8,
        overflow: "hidden",
      },
      favoriteListDropdownHead: {
        backgroundColor: colors.surfaceStrong,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      favoriteListDropdownRow: {
        alignItems: "center",
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
        minHeight: 44,
        paddingHorizontal: 12,
      },
      favoriteListDropdownRowActive: {
        backgroundColor: colors.surfaceStrong,
      },
      favoriteListDropdownName: {
        color: colors.text,
        flex: 1,
        fontSize: 14,
        fontWeight: "800",
      },
      favoriteListDropdownCount: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "900",
        minWidth: 44,
        textAlign: "right",
      },
      favoriteListTitleBlock: {
        gap: 4,
      },
      favoriteListButton: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        marginRight: 8,
        minHeight: 42,
        maxWidth: 190,
        paddingHorizontal: 12,
      },
      favoriteListButtonActive: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.accent,
      },
      favoriteListButtonText: {
        color: colors.text,
        flexShrink: 1,
        fontSize: 13,
        fontWeight: "800",
      },
      favoriteListButtonTextActive: {
        color: colors.accent,
      },
      favoriteListButtonCount: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: "900",
      },
      favoriteToolbar: {
        gap: 8,
      },
      favoriteSortTrigger: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 46,
        paddingHorizontal: 12,
      },
      favoriteSortLabel: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "800",
      },
      favoriteTagStrip: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
      },
      favoriteTagChip: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 7,
        borderWidth: 1,
        color: colors.text,
        fontSize: 11,
        fontWeight: "800",
        overflow: "hidden",
        paddingHorizontal: 8,
        paddingVertical: 4,
      },
      segmentRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      },
      searchResult: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        padding: 12,
      },
      quickAction: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 62,
        padding: 12,
      },
      resultText: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 23,
      },
      searchHighlight: {
        backgroundColor: colors.accentSoft,
        color: colors.accent,
        fontWeight: "900",
      },
      progressSummary: {
        gap: 14,
      },
      progressSummaryCard: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 8,
        gap: 6,
        minHeight: 88,
        padding: 14,
      },
      progressSummaryLabel: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
      },
      progressSummaryValue: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "900",
        lineHeight: 26,
      },
      progressBar: {
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        height: 12,
        overflow: "hidden",
      },
      progressFill: {
        backgroundColor: colors.accent,
        height: "100%",
      },
      progressMetricPanel: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        minHeight: 160,
        padding: 18,
      },
      progressMetricLabel: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: "700",
      },
      progressMetricValue: {
        color: colors.text,
        fontSize: 32,
        fontWeight: "900",
        letterSpacing: 0,
        lineHeight: 38,
        marginTop: 8,
      },
      progressMetricDetail: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 18,
      },
      metricProgressTrack: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 999,
        height: 9,
        overflow: "hidden",
        width: "100%",
      },
      metricProgressFill: {
        backgroundColor: colors.accent,
        height: "100%",
      },
      bookProgressList: {
        gap: 8,
        paddingTop: 8,
      },
      bookProgressRow: {
        alignItems: "stretch",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        minHeight: 82,
        paddingHorizontal: 12,
        paddingVertical: 10,
      },
      bookProgressName: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "800",
      },
      bookProgressTrack: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 999,
        flex: 1,
        height: 9,
        overflow: "hidden",
      },
      bookProgressPercent: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "900",
        textAlign: "left",
      },
      planOption: {
        alignItems: "flex-start",
        backgroundColor: colors.surfaceStrong,
        borderColor: colors.border,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
        justifyContent: "center",
        minHeight: 58,
        padding: 10,
      },
      planOptionGrid: {
        gap: 8,
        marginTop: 12,
      },
      planActionGrid: {
        gap: 8,
        marginTop: 12,
      },
      planRangeText: {
        color: colors.muted,
        fontSize: 15,
        lineHeight: 22,
        marginVertical: 2,
      },
      feedbackPanel: {
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 10,
        paddingTop: 12,
      },
      metricRow: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 46,
        paddingHorizontal: 12,
      },
      metricValue: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "900",
      },
      studyItem: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        gap: 5,
        padding: 12,
      },
      plainListButton: {
        backgroundColor: colors.surfaceStrong,
        borderRadius: 6,
        gap: 5,
        minHeight: 46,
        paddingHorizontal: 10,
        paddingVertical: 8,
      },
      emptyText: {
        color: colors.muted,
        fontSize: 14,
        paddingVertical: 12,
      },
    }),
    { tokens: colors },
  );
}

export default function App() {
  return <AppShell />;
}
