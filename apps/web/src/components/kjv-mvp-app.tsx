"use client";

import {
  BarChart3,
  Bookmark,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Command,
  Copy,
  Flag,
  Home,
  Highlighter,
  Keyboard,
  Layers,
  ListChecks,
  LogIn,
  LogOut,
  Moon,
  Pause,
  PanelRight,
  Play,
  RotateCcw,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  StickyNote,
  Square,
  Sun,
  Tags,
  Type,
  UserRound,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { type PointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cacheVerseList,
  fetchBibleChapter,
  fetchBibleVerse,
  normalizeVerseId,
  searchBibleVerses,
  searchHebrewDictionaryEntries,
} from "@/lib/bible-client";
import {
  getAdjacentChapter,
  getBook,
  getBooks,
  getChapterLabel,
  getChapters,
  getTotalChapterCount,
} from "@/lib/bible-repository";
import { APP_NAME } from "@/lib/brand";
import type { AppUser } from "@/lib/auth/app-user";
import {
  dismissDemoDataImport,
  importDemoUserData,
  shouldOfferDemoDataImport,
} from "@/lib/auth/local-user-data-migration";
import { TranslationFeedbackForm } from "@/components/feedback/translation-feedback-form";
import { HebrewDictionaryWorkspace } from "@/components/hebrew-dictionary-workspace";
import { PersonalNoteRichTextEditor } from "@/components/personal-note-rich-text-editor";
import { PersonalNoteCreationDialog } from "@/components/personal-note-creation-dialog";
import { ReaderHeader, type ReaderTranslationMode } from "@/components/reader-header";
import { ReaderVerseActions, type ReaderContextTab } from "@/components/reader-verse-actions";
import { ReaderVerseRow } from "@/components/reader-verse-row";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ContinueReadingPanel, ProgressMetricPanel } from "@/components/app-preview-panels";
import { CommunityHomePanel } from "@/components/community/community-home-panel";
import { recordCommunityReadingCompletion } from "@kjv/shared/community";
import {
  clearUserData,
  createInitialUserData,
  defaultFavoriteListId,
  loadUserData,
  saveUserData,
} from "@/lib/user-data-repository";
import type { BibleSource } from "@/lib/bible-api-types";
import {
  formatHebrewDictionaryReference,
  getHebrewOccurrencesForVerses,
  hebrewDictionaryThemes,
  searchHebrewDictionary,
  type HebrewDictionarySearchResponse,
  type HebrewDictionaryEntrySummary,
  type HebrewDictionarySort,
} from "@/lib/hebrew-dictionary";
import type { BibleSearchLanguage, BibleSearchSort } from "@/lib/korean-search";
import type {
  CompletedChapter,
  FavoriteList,
  Highlight,
  HighlightColor,
  ReadingProgress,
  Tag,
  TranslationLanguage,
  StudyNote,
  PersonalNote,
  PersonalNoteTag,
  PersonalNoteVerseLink,
  VerseTag,
  UserDataState,
  Verse,
  ReadingPlan,
  ReadingPlanTemplate,
} from "@/lib/types";
import {
  buildStudyUiDictionaryUrl,
  createStudyUiReaderRoute,
  getStudyUiReaderVerseNumber,
  markdownLiteToPersonalNoteDocument,
  normalizePersonalNoteDocument,
  personalNoteDocumentToMarkdown,
  personalNoteDocumentToText,
  type PersonalNoteDocument,
  type StudyUiCommunityRoute,
  type StudyUiDictionaryRoute,
  type StudyUiReaderRoute,
} from "@kjv/shared";

export type KjvMvpViewKey = "dashboard" | "community" | "reader" | "progress" | "highlights" | "favorites" | "notes" | "dictionary" | "search" | "settings";
type ViewKey = KjvMvpViewKey;
type KjvMvpAppProps = {
  activeView?: ViewKey;
  communityRoute?: StudyUiCommunityRoute;
  dictionaryRoute?: StudyUiDictionaryRoute;
  initialView?: ViewKey;
  navigationMode?: "legacy" | "shell";
  onReaderLocationChange?: (route: StudyUiReaderRoute) => void;
  onReaderNavigate?: (route: StudyUiReaderRoute) => void;
  onViewChange?: (view: ViewKey) => void;
  readerExperience?: "legacy" | "v2";
  readerRoute?: StudyUiReaderRoute;
  user: AppUser;
};
type MobileHomeTab = "today" | "progress" | "community" | "activity" | "study";
type SettingsSectionKey = "account" | "tts" | "text" | "view";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type TtsPlaybackState = "idle" | "playing" | "paused" | "error";
type TtsQueueMode = "chapter" | "selection" | "today-plan";
type FavoriteSortKey = "recent" | "bible" | "usage";
type NoteTarget =
  | { scope: "chapter"; bookId: string; chapter: number }
  | { scope: "verse"; bookId: string; chapter: number; verse: number; verseId: string };
type VerseNoteSummary = { id: string; title: string; excerpt: string; source: string; updatedAt: string };

const tabs: Array<{ key: ViewKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "dashboard", label: "홈", icon: Home },
  { key: "community", label: "커뮤니티", icon: Users },
  { key: "reader", label: "성경", icon: BookOpen },
  { key: "progress", label: "통독", icon: BarChart3 },
  { key: "highlights", label: "강조", icon: Highlighter },
  { key: "favorites", label: "인용", icon: Bookmark },
  { key: "notes", label: "노트", icon: StickyNote },
  { key: "dictionary", label: "사전", icon: BookOpen },
  { key: "search", label: "검색", icon: Search },
  { key: "settings", label: "설정", icon: Settings },
];

const mobileHomeTabs: Array<{ key: MobileHomeTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "today", label: "오늘", icon: CalendarDays },
  { key: "progress", label: "통독", icon: BarChart3 },
  { key: "community", label: "커뮤니티", icon: Users },
  { key: "activity", label: "활동", icon: Layers },
  { key: "study", label: "공부", icon: StickyNote },
];

const settingsSections: Array<{ key: SettingsSectionKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "account", label: "계정 설정", icon: LogIn },
  { key: "tts", label: "TTS", icon: Volume2 },
  { key: "text", label: "텍스트", icon: Type },
  { key: "view", label: "보기 모드", icon: BookOpen },
];

const mobileQuickMoveViews = new Set<ViewKey>(["progress", "highlights", "favorites", "notes", "dictionary", "search"]);
const viewKeys = new Set<ViewKey>(tabs.map((tab) => tab.key));
const mobileHomeTabKeys = new Set<MobileHomeTab>(mobileHomeTabs.map((tab) => tab.key));

function UserAvatar({ user }: { user: AppUser }) {
  return (
    <span className="user-avatar" aria-hidden="true">
      {user.avatarUrl ? (
        // Supabase public Storage URLs are dynamic and intentionally bypass Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={user.avatarUrl} />
      ) : (
        <UserRound size={18} />
      )}
    </span>
  );
}

const highlightOptions: Array<{ color: HighlightColor; label: string }> = [
  { color: "yellow", label: "중요" },
  { color: "blue", label: "묵상" },
  { color: "green", label: "약속" },
  { color: "red", label: "경고" },
  { color: "purple", label: "예언" },
];

type PlanChapter = {
  bookId: string;
  chapter: number;
};

type ReadingPlanOption = {
  template: ReadingPlanTemplate;
  name: string;
  description: string;
  scope: ReadingPlan["scope"];
  totalDays: number;
};

const readingPlanOptions: ReadingPlanOption[] = [
  {
    template: "one-year",
    name: "1년 통독",
    description: "하루 3-4장",
    scope: "whole-bible",
    totalDays: 365,
  },
  {
    template: "six-month",
    name: "6개월 통독",
    description: "하루 6-7장",
    scope: "whole-bible",
    totalDays: 180,
  },
  {
    template: "ninety-day",
    name: "90일 통독",
    description: "하루 13-14장",
    scope: "whole-bible",
    totalDays: 90,
  },
  {
    template: "new-testament-thirty-day",
    name: "신약 30일",
    description: "하루 8-9장",
    scope: "new-testament",
    totalDays: 30,
  },
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chapterKey(bookId: string, chapter: number) {
  return `${bookId}:${chapter}`;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(startDate: string, endDate: string) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((parseLocalDateKey(endDate).getTime() - parseLocalDateKey(startDate).getTime()) / dayMs);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatReference(verse: Verse) {
  const book = getBook(verse.bookId);
  return `${book?.nameKo ?? "성경"} ${verse.chapter}:${verse.verse}`;
}

function getVerseKey(verse: Verse) {
  return verse.verseKey ?? verse.id;
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  const merged = new Map<string, T>();
  for (const item of local) {
    merged.set(item.id, item);
  }
  for (const item of remote) {
    merged.set(item.id, item);
  }
  return [...merged.values()];
}

function getVerseDisplayText(verse: Verse, language: TranslationLanguage) {
  if (language === "ko" && verse.textKo) {
    return verse.textKo;
  }

  return verse.textEn ?? verse.text;
}

const SEARCH_HIGHLIGHT_SEPARATOR_PATTERN = /[\s.,;:!?'"“”‘’()[\]{}<>·ㆍ，。．…\-–—]/u;
const SEARCH_HIGHLIGHT_SPLIT_PATTERN = /[\s.,;:!?'"“”‘’()[\]{}<>·ㆍ，。．…\-–—]+/u;

function isSearchHighlightSeparator(value: string) {
  return SEARCH_HIGHLIGHT_SEPARATOR_PATTERN.test(value);
}

function compactSearchHighlightTerm(value: string) {
  return Array.from(value.normalize("NFKC"))
    .filter((char) => !isSearchHighlightSeparator(char))
    .join("");
}

function getSearchHighlightTerms(query: string) {
  const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/g, " ");
  const compactQuery = compactSearchHighlightTerm(normalizedQuery);

  if (compactQuery.length < 2) {
    return [];
  }

  const terms = [normalizedQuery, compactQuery, ...normalizedQuery.split(SEARCH_HIGHLIGHT_SPLIT_PATTERN)];
  const seen = new Set<string>();

  return terms
    .map((term) => term.trim())
    .filter((term) => compactSearchHighlightTerm(term).length >= 2)
    .filter((term) => {
      const key = compactSearchHighlightTerm(term).toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => compactSearchHighlightTerm(b).length - compactSearchHighlightTerm(a).length);
}

function collectSearchHighlightRanges(text: string, query: string) {
  const terms = getSearchHighlightTerms(query);
  const ranges: Array<{ start: number; end: number }> = [];
  const lowerText = text.normalize("NFKC").toLocaleLowerCase();

  for (const term of terms) {
    const lowerTerm = term.normalize("NFKC").toLocaleLowerCase();
    let start = lowerText.indexOf(lowerTerm);

    while (start !== -1) {
      ranges.push({ start, end: start + lowerTerm.length });
      start = lowerText.indexOf(lowerTerm, start + lowerTerm.length);
    }
  }

  const compactChars: Array<{ value: string; start: number; end: number }> = [];
  let offset = 0;

  for (const char of Array.from(text)) {
    const start = offset;
    const end = start + char.length;
    offset = end;

    if (!isSearchHighlightSeparator(char)) {
      compactChars.push({ value: char.normalize("NFKC").toLocaleLowerCase(), start, end });
    }
  }

  const compactText = compactChars.map((char) => char.value).join("");

  for (const term of terms) {
    const compactTerm = compactSearchHighlightTerm(term).toLocaleLowerCase();
    const compactLength = Array.from(compactTerm).length;
    let compactStart = compactText.indexOf(compactTerm);

    while (compactStart !== -1) {
      const compactEnd = compactStart + compactLength - 1;
      const firstChar = compactChars[compactStart];
      const lastChar = compactChars[compactEnd];

      if (firstChar && lastChar) {
        ranges.push({ start: firstChar.start, end: lastChar.end });
      }

      compactStart = compactText.indexOf(compactTerm, compactStart + compactLength);
    }
  }

  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<Array<{ start: number; end: number }>>((merged, range) => {
      const previous = merged.at(-1);
      if (!previous || range.start >= previous.end) {
        merged.push(range);
      }
      return merged;
    }, []);
}

function renderSearchHighlightedText(text: string, query: string): ReactNode {
  const ranges = collectSearchHighlightRanges(text, query);

  if (!ranges.length) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (cursor < range.start) {
      nodes.push(text.slice(cursor, range.start));
    }

    nodes.push(
      <mark className="search-hit-highlight" key={`${range.start}-${range.end}-${index}`}>
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function getVerseDisplaySource(verse: Verse, language: TranslationLanguage) {
  if (language === "ko") {
    return verse.textKo ? (verse.translationName ?? "KJV Reader Note") : "한국어 본문 없음";
  }

  return verse.sourceModuleVersion ? `${verse.translation} ${verse.sourceModuleVersion}` : verse.translation;
}

function copyTextForVerse(verse: Verse, language: TranslationLanguage) {
  return `${getVerseDisplayText(verse, language)}\n${formatReference(verse)}, ${getVerseDisplaySource(verse, language)}`;
}

function formatSource(source: BibleSource | null) {
  if (!source) {
    return "CrossWire KJV";
  }

  return source.version ? `${source.name} ${source.version}` : source.name;
}

function percent(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

function getPlanOption(template: ReadingPlanTemplate) {
  return readingPlanOptions.find((option) => option.template === template) ?? readingPlanOptions[0];
}

function buildPlanChapters(scope: ReadingPlan["scope"]): PlanChapter[] {
  const planBooks = scope === "new-testament" ? getBooks("new") : getBooks();
  return planBooks.flatMap((book) =>
    getChapters(book.id).map((chapter) => ({
      bookId: book.id,
      chapter,
    })),
  );
}

function getReadingPlanDay(plan: ReadingPlan, date = new Date()) {
  const chapters = buildPlanChapters(plan.scope);
  const elapsedDays = daysBetween(plan.startDate, getLocalDateKey(date));
  const dayNumber = Math.min(Math.max(elapsedDays + 1, 1), plan.totalDays);
  const startIndex = Math.floor(((dayNumber - 1) * chapters.length) / plan.totalDays);
  const endIndex = Math.min(chapters.length, Math.max(startIndex + 1, Math.floor((dayNumber * chapters.length) / plan.totalDays)));

  return {
    dayNumber,
    totalDays: plan.totalDays,
    chapters: chapters.slice(startIndex, endIndex),
  };
}

function formatPlanChapters(chapters: PlanChapter[]) {
  const groups: Array<{ bookId: string; start: number; end: number }> = [];

  for (const chapter of chapters) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === chapter.bookId && last.end + 1 === chapter.chapter) {
      last.end = chapter.chapter;
    } else {
      groups.push({ bookId: chapter.bookId, start: chapter.chapter, end: chapter.chapter });
    }
  }

  return groups
    .map((group) => {
      const book = getBook(group.bookId);
      const chapterLabel = group.start === group.end ? `${group.start}장` : `${group.start}-${group.end}장`;
      return `${book?.nameKo ?? "성경"} ${chapterLabel}`;
    })
    .join(", ");
}

function getScrollPosition() {
  return typeof window === "undefined" ? 0 : Math.round(window.scrollY);
}

function compareBibleLocation(left: { bookId: string; chapter: number; verse?: number }, right: { bookId: string; chapter: number; verse?: number }) {
  const leftBookOrder = getBook(left.bookId)?.order ?? 0;
  const rightBookOrder = getBook(right.bookId)?.order ?? 0;
  if (leftBookOrder !== rightBookOrder) {
    return leftBookOrder - rightBookOrder;
  }

  if (left.chapter !== right.chapter) {
    return left.chapter - right.chapter;
  }

  return (left.verse ?? 0) - (right.verse ?? 0);
}

export function KjvMvpApp({
  activeView: controlledActiveView,
  communityRoute,
  dictionaryRoute,
  initialView = "dashboard",
  navigationMode = "legacy",
  onReaderLocationChange,
  onReaderNavigate,
  onViewChange,
  readerExperience = "legacy",
  readerRoute,
  user,
}: KjvMvpAppProps) {
  const router = useRouter();
  const initialReaderRouteRef = useRef(readerRoute);
  const isReaderV2 = readerExperience === "v2";
  const readerRouteBookId = readerRoute?.bookId;
  const readerRouteChapter = readerRoute?.chapter;
  const readerRoutePanel = readerRoute?.panel;
  const readerRouteVerseNumber = getStudyUiReaderVerseNumber(readerRoute);
  const dictionaryRouteAlphabet = dictionaryRoute?.alphabet;
  const dictionaryRouteBookId = dictionaryRoute?.bookId;
  const dictionaryRouteEntryKey = dictionaryRoute?.entryKey;
  const dictionaryRouteQuery = dictionaryRoute?.query;
  const dictionaryRouteSort = dictionaryRoute?.sort;
  const dictionaryRouteThemeId = dictionaryRoute?.themeId;
  const hasDictionaryRoute = dictionaryRoute !== undefined;
  const books = useMemo(() => getBooks(), []);
  const oldBooks = useMemo(() => getBooks("old"), []);
  const newBooks = useMemo(() => getBooks("new"), []);
  const [mounted, setMounted] = useState(false);
  const [internalActiveView, setInternalActiveView] = useState<ViewKey>(initialView);
  const activeView = controlledActiveView ?? internalActiveView;
  const setActiveView = useCallback((view: ViewKey) => {
    if (controlledActiveView === undefined) setInternalActiveView(view);
    onViewChange?.(view);
  }, [controlledActiveView, onViewChange]);
  const [mobileHomeTab, setMobileHomeTab] = useState<MobileHomeTab>("today");
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionKey>("account");
  const [userData, setUserData] = useState<UserDataState>(() => createInitialUserData(user.id));
  const [currentBookId, setCurrentBookId] = useState<string>(readerRoute?.bookId ?? "gen");
  const [currentChapter, setCurrentChapter] = useState(readerRoute?.chapter ?? 1);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [currentReadingVerseId, setCurrentReadingVerseId] = useState<string | null>(null);
  const [readerContextTab, setReaderContextTab] = useState<ReaderContextTab>(() => {
    const panel = initialReaderRouteRef.current?.panel;
    return panel === "dictionary" ? "original" : panel === "links" || panel === "saved" ? panel : "note";
  });
  const [isReaderContextOpen, setIsReaderContextOpen] = useState(Boolean(readerRoute?.primaryVerseKey));
  const [isReaderNavigatorOpen, setIsReaderNavigatorOpen] = useState(true);
  const [isReaderFocusMode, setIsReaderFocusMode] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVerseIds, setSelectedVerseIds] = useState<string[]>([]);
  const [selectionAnchorVerseId, setSelectionAnchorVerseId] = useState<string | null>(null);
  const [highlightNote, setHighlightNote] = useState("");
  const [favoriteTitle, setFavoriteTitle] = useState("");
  const [favoriteMemo, setFavoriteMemo] = useState("");
  const [favoriteTagInput, setFavoriteTagInput] = useState("구원, 복음");
  const [favoriteTargetVerseIds, setFavoriteTargetVerseIds] = useState<string[]>([]);
  const [favoriteListSelection, setFavoriteListSelection] = useState<string[]>([defaultFavoriteListId]);
  const [newFavoriteListName, setNewFavoriteListName] = useState("");
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
  const [selectedFavoriteListId, setSelectedFavoriteListId] = useState(defaultFavoriteListId);
  const [isFavoriteListDropdownOpen, setIsFavoriteListDropdownOpen] = useState(false);
  const [pendingDeleteFavoriteListId, setPendingDeleteFavoriteListId] = useState<string | null>(null);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [favoriteSortKey, setFavoriteSortKey] = useState<FavoriteSortKey>("recent");
  const [highlightColorFilter, setHighlightColorFilter] = useState<"all" | HighlightColor>("all");
  const [highlightBookFilter, setHighlightBookFilter] = useState("all");
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [selectedPersonalNoteId, setSelectedPersonalNoteId] = useState<string | null>(null);
  const [personalNoteTitleDraft, setPersonalNoteTitleDraft] = useState("");
  const [personalNoteDocumentDraft, setPersonalNoteDocumentDraft] = useState<PersonalNoteDocument>(() => markdownLiteToPersonalNoteDocument(""));
  const [personalNoteTagDraft, setPersonalNoteTagDraft] = useState("");
  const [personalNoteSearchQuery, setPersonalNoteSearchQuery] = useState("");
  const [personalNoteBookFilter, setPersonalNoteBookFilter] = useState("all");
  const [personalNoteSaveStatus, setPersonalNoteSaveStatus] = useState("");
  const [personalNoteRemoteStatus, setPersonalNoteRemoteStatus] = useState("");
  const [personalNoteFocusMode, setPersonalNoteFocusMode] = useState(false);
  const [showArchivedPersonalNotes, setShowArchivedPersonalNotes] = useState(false);
  const [remotePersonalNoteMatches, setRemotePersonalNoteMatches] = useState<string[] | null>(null);
  const [personalNoteConflict, setPersonalNoteConflict] = useState<PersonalNote | null>(null);
  const [selectedVerseNoteReferences, setSelectedVerseNoteReferences] = useState<VerseNoteSummary[]>([]);
  const [personalTemplateName, setPersonalTemplateName] = useState("");
  const [pendingPersonalNoteVerses, setPendingPersonalNoteVerses] = useState<Verse[] | null>(null);
  const [isPersonalNoteInspectorOpen, setIsPersonalNoteInspectorOpen] = useState(true);
  const [personalNoteMobilePane, setPersonalNoteMobilePane] = useState<"list" | "editor">("list");
  const [dictionaryQuery, setDictionaryQuery] = useState(dictionaryRouteQuery ?? "");
  const [dictionaryAlphabet, setDictionaryAlphabet] = useState(dictionaryRouteAlphabet ?? "all");
  const [dictionaryTheme, setDictionaryTheme] = useState(dictionaryRouteThemeId ?? "all");
  const [dictionaryBookFilter, setDictionaryBookFilter] = useState(dictionaryRouteBookId ?? "all");
  const [dictionarySort, setDictionarySort] = useState<HebrewDictionarySort>(dictionaryRouteSort ?? "alphabetical");
  const [selectedHebrewEntryKey, setSelectedHebrewEntryKey] = useState<string | null>(dictionaryRouteEntryKey ?? null);
  const [dictionaryResult, setDictionaryResult] = useState<HebrewDictionarySearchResponse>(() => searchHebrewDictionary());
  const [dictionaryStatus, setDictionaryStatus] = useState<LoadStatus>("ready");
  const [dictionaryError, setDictionaryError] = useState("");
  const [feedbackTargetVerse, setFeedbackTargetVerse] = useState<Verse | null>(null);
  const [feedbackSelectedText, setFeedbackSelectedText] = useState("");
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChapterPickerOpen, setIsChapterPickerOpen] = useState(false);
  const [chapterPickerBookId, setChapterPickerBookId] = useState("gen");
  const [commandQuery, setCommandQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [showDemoImportPrompt, setShowDemoImportPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLanguage, setSearchLanguage] = useState<BibleSearchLanguage>("ko");
  const [searchSort, setSearchSort] = useState<BibleSearchSort>("canonical");
  const [searchTestament, setSearchTestament] = useState<"all" | "OT" | "NT">("all");
  const [searchBookFilter, setSearchBookFilter] = useState("all");
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchStatus, setSearchStatus] = useState<LoadStatus>("idle");
  const [searchError, setSearchError] = useState("");
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [chapterSource, setChapterSource] = useState<BibleSource | null>(null);
  const [chapterStatus, setChapterStatus] = useState<LoadStatus>("idle");
  const [chapterError, setChapterError] = useState("");
  const [targetVerseNumber, setTargetVerseNumber] = useState<number | null>(readerRouteVerseNumber ?? null);
  const [verseCache, setVerseCache] = useState<Record<string, Verse>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingVerseId, setSpeakingVerseId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsPlaybackState, setTtsPlaybackState] = useState<TtsPlaybackState>("idle");
  const [ttsStatus, setTtsStatus] = useState("대기");
  const [ttsQueueLabel, setTtsQueueLabel] = useState("대기");
  const speechQueueRef = useRef<Verse[]>([]);
  const speechIndexRef = useRef(0);
  const speechCancelRef = useRef(false);
  const speechQueueModeRef = useRef<TtsQueueMode>("selection");
  const speechRunIdRef = useRef(0);
  const verseElementsRef = useRef(new Map<string, HTMLButtonElement>());
  const chapterSwipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressVerseClickRef = useRef(false);
  const verseLongPressTimerRef = useRef<number | null>(null);
  const progressSaveTimerRef = useRef<number | null>(null);
  const autoCompleteTimerRef = useRef<number | null>(null);
  const autoCompleteTargetVerseIdRef = useRef<string | null>(null);
  const currentReadingVerseIdRef = useRef<string | null>(null);
  const readerLocationRef = useRef<{ activeView: ViewKey; bookId: string; chapter: number }>({
    activeView: "dashboard",
    bookId: "gen",
    chapter: 1,
  });
  const favoriteListSelectionRef = useRef<string[]>([defaultFavoriteListId]);
  const favoriteListsRef = useRef(userData.favoriteLists);
  const pendingVerseFetchesRef = useRef(new Set<string>());
  const personalNotesLoadedRef = useRef(false);

  const currentBook = getBook(currentBookId) ?? books[0];
  const currentBookChapters = getChapters(currentBook.id);
  const chapterNavigatorWindowStart = Math.max(0, Math.min(currentChapter - 6, currentBookChapters.length - 12));
  const chapterNavigatorChapters = isReaderV2 && currentBookChapters.length > 12
    ? currentBookChapters.slice(chapterNavigatorWindowStart, chapterNavigatorWindowStart + 12)
    : currentBookChapters;
  const chapterPickerBook = getBook(chapterPickerBookId) ?? currentBook;
  const isAuthenticated = user.isAuthenticated;
  const resolveVerseById = useCallback(
    (verseId: string | null) => {
      if (!verseId) {
        return null;
      }

      const normalizedId = normalizeVerseId(verseId);
      return (
        verseCache[normalizedId] ??
        verseCache[verseId] ??
        chapterVerses.find((verse) => verse.id === normalizedId || verse.id === verseId) ??
        null
      );
    },
    [chapterVerses, verseCache],
  );
  const selectedVerse = selectedVerseId ? resolveVerseById(selectedVerseId) : null;
  const readingLanguage = userData.settings.defaultTranslation;
  const showParallelTranslation = userData.settings.showParallelTranslation;
  const chapterLanguageLabel = showParallelTranslation ? "EN/KR" : readingLanguage === "ko" ? "KR" : "EN";
  const currentChapterHasKorean = chapterVerses.some((verse) => Boolean(verse.textKo));
  const selectedVerseIdSet = useMemo(() => new Set(selectedVerseIds), [selectedVerseIds]);
  const selectedVerses = useMemo(
    () => chapterVerses.filter((verse) => selectedVerseIdSet.has(verse.id)),
    [chapterVerses, selectedVerseIdSet],
  );
  const favoriteTargetVerses = useMemo(
    () => favoriteTargetVerseIds.map((verseId) => resolveVerseById(verseId)).filter((verse): verse is Verse => Boolean(verse)),
    [favoriteTargetVerseIds, resolveVerseById],
  );

  const completedKeys = useMemo(
    () => new Set(userData.completedChapters.map((chapter) => chapterKey(chapter.bookId, chapter.chapter))),
    [userData.completedChapters],
  );

  const clearAutoCompleteTimer = useCallback(() => {
    if (autoCompleteTimerRef.current) {
      window.clearTimeout(autoCompleteTimerRef.current);
      autoCompleteTimerRef.current = null;
    }
    autoCompleteTargetVerseIdRef.current = null;
  }, []);

  function setTrackedReadingVerseId(verseId: string | null) {
    currentReadingVerseIdRef.current = verseId;
    setCurrentReadingVerseId(verseId);
  }

  const isChapterCompleted = useCallback((bookId: string, chapter: number) => {
    return completedKeys.has(chapterKey(bookId, chapter));
  }, [completedKeys]);

  const markChapterCompleted = useCallback((bookId: string, chapter: number, announce = false, method?: "scroll" | "chapter_tts" | "today_plan_tts") => {
    if (completedKeys.has(chapterKey(bookId, chapter))) {
      return;
    }

    const key = chapterKey(bookId, chapter);
    const completed: CompletedChapter = {
      id: createId("completed"),
      userId: user.id,
      bookId,
      chapter,
      completedAt: new Date().toISOString(),
    };

    setUserData((current) => {
      if (current.completedChapters.some((item) => chapterKey(item.bookId, item.chapter) === key)) {
        return current;
      }

      return {
        ...current,
        completedChapters: [...current.completedChapters, completed],
      };
    });

    if (announce) {
      setCopyStatus(`${getChapterLabel(bookId, chapter)} 읽음 완료`);
    }
    if (method && user.isAuthenticated) {
      void recordCommunityReadingCompletion({ bookId, chapter, method }, {}).catch(() => undefined);
    }
  }, [completedKeys, user.id, user.isAuthenticated]);

  const isLastVerseInLoadedChapter = useCallback((verse: Verse) => {
    const lastVerse = chapterVerses.at(-1);
    return Boolean(lastVerse && verse.id === lastVerse.id && verse.bookId === currentBookId && verse.chapter === currentChapter);
  }, [chapterVerses, currentBookId, currentChapter]);

  const scheduleAutoCompleteForLastVerse = useCallback((verse: Verse) => {
    if (!isLastVerseInLoadedChapter(verse) || isChapterCompleted(verse.bookId, verse.chapter)) {
      clearAutoCompleteTimer();
      return;
    }

    if (autoCompleteTimerRef.current && autoCompleteTargetVerseIdRef.current === verse.id) {
      return;
    }

    clearAutoCompleteTimer();
    autoCompleteTargetVerseIdRef.current = verse.id;
    autoCompleteTimerRef.current = window.setTimeout(() => {
      autoCompleteTimerRef.current = null;
      autoCompleteTargetVerseIdRef.current = null;
      const readerLocation = readerLocationRef.current;
      if (
        readerLocation.activeView !== "reader" ||
        readerLocation.bookId !== verse.bookId ||
        readerLocation.chapter !== verse.chapter ||
        currentReadingVerseIdRef.current !== verse.id
      ) {
        return;
      }

      markChapterCompleted(verse.bookId, verse.chapter, true, "scroll");
    }, 2000);
  }, [clearAutoCompleteTimer, isChapterCompleted, isLastVerseInLoadedChapter, markChapterCompleted]);

  const isFinalQueuedVerseForChapter = useCallback((index: number) => {
    const verse = speechQueueRef.current[index];
    const nextVerse = speechQueueRef.current[index + 1];
    return Boolean(verse && (!nextVerse || nextVerse.bookId !== verse.bookId || nextVerse.chapter !== verse.chapter));
  }, []);

  const maybeCompleteChapterFromSpeech = useCallback((verse: Verse, index: number) => {
    const queueMode = speechQueueModeRef.current;
    if (queueMode === "selection" || !isFinalQueuedVerseForChapter(index)) {
      return;
    }

    markChapterCompleted(
      verse.bookId,
      verse.chapter,
      true,
      queueMode === "today-plan" ? "today_plan_tts" : "chapter_tts",
    );
  }, [isFinalQueuedVerseForChapter, markChapterCompleted]);

  const highlightsByVerse = useMemo(
    () => new Map(userData.highlights.map((highlight) => [highlight.verseId, highlight])),
    [userData.highlights],
  );
  const favoritesByVerse = useMemo(
    () => new Map(userData.favoriteVerses.map((favorite) => [favorite.verseId, favorite])),
    [userData.favoriteVerses],
  );
  const chapterNotes = useMemo(
    () => userData.studyNotes.filter((note) => note.scope === "chapter"),
    [userData.studyNotes],
  );
  const verseNotesByVerse = useMemo(
    () => new Map(userData.studyNotes.filter((note) => note.scope === "verse" && note.verseId).map((note) => [note.verseId as string, note])),
    [userData.studyNotes],
  );
  const selectedPersonalNote = useMemo(
    () => userData.personalNotes.find((note) => note.id === selectedPersonalNoteId) ?? userData.personalNotes.find((note) => note.status === (showArchivedPersonalNotes ? "archived" : "active")) ?? null,
    [selectedPersonalNoteId, showArchivedPersonalNotes, userData.personalNotes],
  );
  const personalNoteLinksByNote = useMemo(() => {
    const links = new Map<string, PersonalNoteVerseLink[]>();
    for (const link of userData.personalNoteVerseLinks) {
      links.set(link.noteId, [...(links.get(link.noteId) ?? []), link].sort((left, right) => left.linkOrder - right.linkOrder));
    }
    return links;
  }, [userData.personalNoteVerseLinks]);
  const personalNoteTagsByNote = useMemo(() => {
    const tags = new Map<string, PersonalNoteTag[]>();
    for (const tag of userData.personalNoteTags) {
      tags.set(tag.noteId, [...(tags.get(tag.noteId) ?? []), tag]);
    }
    return tags;
  }, [userData.personalNoteTags]);
  const selectedPersonalNoteRevisions = useMemo(
    () => userData.personalNoteRevisions.filter((revision) => revision.noteId === selectedPersonalNote?.id).sort((left, right) => right.revision - left.revision).slice(0, 12),
    [selectedPersonalNote?.id, userData.personalNoteRevisions],
  );
  const selectedPersonalNoteBacklinks = useMemo(
    () => userData.personalNoteLinks.filter((link) => link.targetNoteId === selectedPersonalNote?.id).map((link) => userData.personalNotes.find((note) => note.id === link.sourceNoteId)).filter((note): note is PersonalNote => Boolean(note)).slice(0, 20),
    [selectedPersonalNote?.id, userData.personalNoteLinks, userData.personalNotes],
  );
  const visiblePersonalNotes = useMemo(() => {
    const query = personalNoteSearchQuery.trim().toLocaleLowerCase("ko-KR");
    return userData.personalNotes
      .filter((note) => note.status === (showArchivedPersonalNotes ? "archived" : "active"))
      .filter((note) => remotePersonalNoteMatches === null || remotePersonalNoteMatches.includes(note.id))
      .filter((note) => {
        if (personalNoteBookFilter === "all") {
          return true;
        }
        return (personalNoteLinksByNote.get(note.id) ?? []).some((link) => link.bookId === personalNoteBookFilter);
      })
      .filter((note) => {
        if (!query) {
          return true;
        }
        const noteTags = (personalNoteTagsByNote.get(note.id) ?? [])
          .map((link) => userData.tags.find((tag) => tag.id === link.tagId)?.name ?? "")
          .join(" ");
        const links = (personalNoteLinksByNote.get(note.id) ?? [])
          .map((link) => `${getChapterLabel(link.bookId, link.chapter)} ${link.verse}절`)
          .join(" ");
        return `${note.title} ${note.bodyText} ${noteTags} ${links}`.toLocaleLowerCase("ko-KR").includes(query);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [personalNoteBookFilter, personalNoteLinksByNote, personalNoteSearchQuery, personalNoteTagsByNote, remotePersonalNoteMatches, showArchivedPersonalNotes, userData.personalNotes, userData.tags]);
  const chapterHebrewOccurrences = useMemo(() => getHebrewOccurrencesForVerses(chapterVerses), [chapterVerses]);
  const hebrewOccurrencesByVerse = useMemo(() => {
    const grouped = new Map<string, ReturnType<typeof getHebrewOccurrencesForVerses>>();
    for (const item of chapterHebrewOccurrences) {
      grouped.set(item.occurrence.verseKey, [...(grouped.get(item.occurrence.verseKey) ?? []), item]);
    }
    return grouped;
  }, [chapterHebrewOccurrences]);
  const selectedHebrewEntry = useMemo(
    () => dictionaryResult.entries.find((entry) => entry.normalizedKey === selectedHebrewEntryKey) ?? dictionaryResult.entries[0] ?? null,
    [dictionaryResult.entries, selectedHebrewEntryKey],
  );
  const currentChapterNote = useMemo(
    () => chapterNotes.find((note) => note.bookId === currentBookId && note.chapter === currentChapter) ?? null,
    [chapterNotes, currentBookId, currentChapter],
  );
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
  const filteredHighlights = useMemo(
    () =>
      userData.highlights
        .filter((highlight) => highlightColorFilter === "all" || highlight.color === highlightColorFilter)
        .filter((highlight) => highlightBookFilter === "all" || highlight.bookId === highlightBookFilter)
        .slice()
        .reverse(),
    [highlightBookFilter, highlightColorFilter, userData.highlights],
  );
  const visibleSelectedListFavorites = useMemo(() => {
    const query = favoriteSearchQuery.trim().toLocaleLowerCase("ko-KR");
    return selectedListFavorites
      .filter((favorite) => {
        if (!query) {
          return true;
        }

        const verse = resolveVerseById(favorite.verseId);
        const tagText = favorite.tagIds
          .map((tagId) => userData.tags.find((tag) => tag.id === tagId)?.name ?? "")
          .join(" ");
        const haystack = [
          favorite.title,
          favorite.memo,
          tagText,
          verse ? formatReference(verse) : "",
          verse ? getVerseDisplayText(verse, readingLanguage) : "",
        ]
          .join(" ")
          .toLocaleLowerCase("ko-KR");
        return haystack.includes(query);
      })
      .slice()
      .sort((left, right) => {
        if (favoriteSortKey === "usage") {
          return right.usageCount - left.usageCount || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }

        if (favoriteSortKey === "bible") {
          return compareBibleLocation(left, right);
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [favoriteSearchQuery, favoriteSortKey, readingLanguage, resolveVerseById, selectedListFavorites, userData.tags]);
  const searchBookOptions = useMemo(
    () =>
      books.filter((book) => {
        if (searchTestament === "OT") {
          return book.testament === "old";
        }
        if (searchTestament === "NT") {
          return book.testament === "new";
        }
        return true;
      }),
    [books, searchTestament],
  );

  const oldChapterTotal = useMemo(() => oldBooks.reduce((total, book) => total + book.chapterCount, 0), [oldBooks]);
  const newChapterTotal = useMemo(() => newBooks.reduce((total, book) => total + book.chapterCount, 0), [newBooks]);
  const totalChapters = useMemo(() => getTotalChapterCount(), []);
  const completedOld = userData.completedChapters.filter((chapter) => getBook(chapter.bookId)?.testament === "old").length;
  const completedNew = userData.completedChapters.filter((chapter) => getBook(chapter.bookId)?.testament === "new").length;
  const todayKey = getLocalDateKey();
  const completedToday = userData.completedChapters.filter((chapter) => chapter.completedAt.startsWith(todayKey)).length;
  const readingPlanDay = useMemo(
    () => (userData.activeReadingPlan ? getReadingPlanDay(userData.activeReadingPlan) : null),
    [userData.activeReadingPlan],
  );
  const readingPlanDayCompleted = readingPlanDay
    ? readingPlanDay.chapters.filter((chapter) => completedKeys.has(chapterKey(chapter.bookId, chapter.chapter))).length
    : 0;
  const readingPlanDayPercent = readingPlanDay ? percent(readingPlanDayCompleted, readingPlanDay.chapters.length) : 0;
  const readingPlanTargetChapter =
    readingPlanDay?.chapters.find((chapter) => !completedKeys.has(chapterKey(chapter.bookId, chapter.chapter))) ??
    readingPlanDay?.chapters[0] ??
    null;
  const isCurrentPlanChapter = Boolean(
    readingPlanDay?.chapters.some((chapter) => chapter.bookId === currentBookId && chapter.chapter === currentChapter),
  );
  const currentReadingVerse = currentReadingVerseId ? resolveVerseById(currentReadingVerseId) : null;
  const recentActivities = useMemo(() => {
    const items = [
      ...userData.recentReads.map((read) => ({
        id: `read-${read.bookId}-${read.chapter}-${read.lastReadAt}`,
        type: "읽기",
        label: `${getChapterLabel(read.bookId, read.chapter)} ${read.verse}절`,
        at: read.lastReadAt,
        bookId: read.bookId,
        chapter: read.chapter,
        verse: read.verse,
      })),
      ...userData.highlights.map((highlight) => ({
        id: `highlight-${highlight.id}`,
        type: "강조",
        label: `${getChapterLabel(highlight.bookId, highlight.chapter)} ${highlight.verse}절`,
        at: highlight.updatedAt,
        bookId: highlight.bookId,
        chapter: highlight.chapter,
        verse: highlight.verse,
      })),
      ...userData.favoriteVerses.map((favorite) => ({
        id: `favorite-${favorite.id}`,
        type: "인용",
        label: favorite.title,
        at: favorite.updatedAt,
        bookId: favorite.bookId,
        chapter: favorite.chapter,
        verse: favorite.verse,
      })),
      ...userData.studyNotes.map((note) => ({
        id: `note-${note.id}`,
        type: "노트",
        label: note.scope === "verse" && note.verse ? `${getChapterLabel(note.bookId, note.chapter)} ${note.verse}절` : getChapterLabel(note.bookId, note.chapter),
        at: note.updatedAt,
        bookId: note.bookId,
        chapter: note.chapter,
        verse: note.verse ?? 1,
      })),
      ...userData.personalNotes.map((note) => {
        const firstLink = personalNoteLinksByNote.get(note.id)?.[0];
        return {
          id: `personal-note-${note.id}`,
          type: "성경노트",
          label: note.title,
          at: note.updatedAt,
          bookId: firstLink?.bookId ?? "gen",
          chapter: firstLink?.chapter ?? 1,
          verse: firstLink?.verse ?? 1,
        };
      }),
    ];

    return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()).slice(0, 8);
  }, [personalNoteLinksByNote, userData.favoriteVerses, userData.highlights, userData.personalNotes, userData.recentReads, userData.studyNotes]);

  function rememberVerses(verses: Verse[]) {
    if (!verses.length) {
      return;
    }

    setVerseCache((current) => cacheVerseList(current, verses));
  }

  const updateProgress = useCallback((bookId: string, chapter: number, verse: number, scrollPosition = 0) => {
    const progress: ReadingProgress = {
      userId: user.id,
      bookId,
      chapter,
      verse,
      scrollPosition,
      lastReadAt: new Date().toISOString(),
    };

    setUserData((current) => ({
      ...current,
      progress,
      recentReads: [
        progress,
        ...current.recentReads.filter((read) => !(read.bookId === bookId && read.chapter === chapter)),
      ].slice(0, 6),
    }));
  }, [user.id]);

  const scheduleTrackedProgress = useCallback(
    (verse: Verse) => {
      setTrackedReadingVerseId(verse.id);
      scheduleAutoCompleteForLastVerse(verse);

      if (progressSaveTimerRef.current) {
        window.clearTimeout(progressSaveTimerRef.current);
      }

      progressSaveTimerRef.current = window.setTimeout(() => {
        updateProgress(verse.bookId, verse.chapter, verse.verse, getScrollPosition());
        progressSaveTimerRef.current = null;
      }, 600);
    },
    [scheduleAutoCompleteForLastVerse, updateProgress],
  );

  async function resolveOrFetchVerse(verseId: string) {
    const cached = resolveVerseById(verseId);
    if (cached) {
      return cached;
    }

    const response = await fetchBibleVerse(verseId);
    rememberVerses([response.verse]);
    return response.verse;
  }

  useEffect(() => {
    const devParams =
      process.env.NODE_ENV !== "production" && typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    let loaded = loadUserData(user.id);
    const devPlanTemplate = devParams?.get("plan") as ReadingPlanTemplate | null;
    if (devPlanTemplate && readingPlanOptions.some((option) => option.template === devPlanTemplate)) {
      const option = getPlanOption(devPlanTemplate);
      const now = new Date().toISOString();
      loaded = {
        ...loaded,
        activeReadingPlan: {
          id: `dev-${devPlanTemplate}`,
          userId: user.id,
          template: devPlanTemplate,
          name: option.name,
          scope: option.scope,
          startDate: getLocalDateKey(),
          totalDays: option.totalDays,
          createdAt: now,
          updatedAt: now,
        },
      };
    }

    const devView = devParams?.get("view") as ViewKey | null;
    const devHomeTab = devParams?.get("homeTab") as MobileHomeTab | null;
    const devBook = devParams?.get("book");
    const devChapter = Number(devParams?.get("chapter"));
    const devSelectMode = devParams?.get("selectMode") === "1";
    const requestedReaderRoute = initialReaderRouteRef.current;
    const initialBookId = devBook && getBook(devBook)
      ? devBook
      : requestedReaderRoute?.bookId ?? loaded.progress?.bookId ?? "gen";
    const initialChapter =
      Number.isFinite(devChapter) && getChapters(initialBookId).includes(devChapter)
        ? devChapter
        : requestedReaderRoute?.chapter ?? loaded.progress?.chapter ?? 1;
    setUserData(loaded);
    setShowDemoImportPrompt(user.isAuthenticated && shouldOfferDemoDataImport(user.id));
    if (devView && viewKeys.has(devView)) {
      setActiveView(devView);
    }
    if (devHomeTab && mobileHomeTabKeys.has(devHomeTab)) {
      setMobileHomeTab(devHomeTab);
      setActiveView("dashboard");
    }
    if (devSelectMode) {
      setIsSelectionMode(true);
    }
    if (devBook && getBook(devBook)) {
      setCurrentBookId(devBook);
      setCurrentChapter(initialChapter);
    }
    if (devParams?.get("command") === "1") {
      setIsCommandPaletteOpen(true);
    }
    if (devParams?.get("shortcuts") === "1") {
      setIsShortcutHelpOpen(true);
    }
    if (devParams?.get("note") === "chapter") {
      setNoteTarget({ scope: "chapter", bookId: initialBookId, chapter: initialChapter });
      setNoteDraft("");
    }
    if (requestedReaderRoute && !devBook) {
      setCurrentBookId(requestedReaderRoute.bookId);
      setCurrentChapter(requestedReaderRoute.chapter);
      setTargetVerseNumber(getStudyUiReaderVerseNumber(requestedReaderRoute) ?? 1);
    } else if (loaded.progress && !devBook) {
      setCurrentBookId(loaded.progress.bookId);
      setCurrentChapter(loaded.progress.chapter);
      setTargetVerseNumber(loaded.progress.verse);
    }
    setMounted(true);
  }, [setActiveView, user.id, user.isAuthenticated]);

  useEffect(() => {
    if (!mounted || !readerRouteBookId || !readerRouteChapter) return;

    const nextVerse = readerRouteVerseNumber ?? 1;
    if (readerRouteBookId !== currentBookId || readerRouteChapter !== currentChapter) {
      setCurrentBookId(readerRouteBookId);
      setCurrentChapter(readerRouteChapter);
      setSelectedVerseId(null);
      clearAutoCompleteTimer();
      setTrackedReadingVerseId(null);
      setSelectedVerseIds([]);
      setSelectionAnchorVerseId(null);
      setChapterVerses([]);
      setChapterSource(null);
      setChapterStatus("loading");
      setChapterError("");
      verseElementsRef.current.clear();
    }
    setTargetVerseNumber(nextVerse);
  }, [clearAutoCompleteTimer, currentBookId, currentChapter, mounted, readerRouteBookId, readerRouteChapter, readerRouteVerseNumber]);

  useEffect(() => {
    if (!isReaderV2 || !readerRoutePanel) return;
    setReaderContextTab(readerRoutePanel === "dictionary" ? "original" : readerRoutePanel);
    setIsReaderContextOpen(true);
  }, [isReaderV2, readerRoutePanel]);

  useEffect(() => {
    if (!hasDictionaryRoute) return;

    setDictionaryQuery(dictionaryRouteQuery ?? "");
    setDictionaryAlphabet(dictionaryRouteAlphabet ?? "all");
    setDictionaryTheme(dictionaryRouteThemeId ?? "all");
    setDictionaryBookFilter(dictionaryRouteBookId ?? "all");
    setDictionarySort(dictionaryRouteSort ?? "alphabetical");
    setSelectedHebrewEntryKey(dictionaryRouteEntryKey ?? null);
  }, [
    dictionaryRouteAlphabet,
    dictionaryRouteBookId,
    dictionaryRouteEntryKey,
    dictionaryRouteQuery,
    dictionaryRouteSort,
    dictionaryRouteThemeId,
    hasDictionaryRoute,
  ]);

  useEffect(() => () => {
    if (verseLongPressTimerRef.current !== null) {
      window.clearTimeout(verseLongPressTimerRef.current);
    }
  }, []);

  useEffect(() => {
    onReaderLocationChange?.(createStudyUiReaderRoute({ bookId: currentBookId, chapter: currentChapter }));
  }, [currentBookId, currentChapter, onReaderLocationChange]);

  useEffect(() => {
    let cancelled = false;

    async function loadChapter() {
      setChapterStatus("loading");
      setChapterError("");
      setSelectedVerseId(null);
      clearAutoCompleteTimer();
      currentReadingVerseIdRef.current = null;
      setCurrentReadingVerseId(null);
      setSelectedVerseIds([]);
      setSelectionAnchorVerseId(null);
      verseElementsRef.current.clear();

      try {
        const response = await fetchBibleChapter(currentBookId, currentChapter);
        if (cancelled) {
          return;
        }

        setChapterVerses(response.verses);
        setChapterSource(response.source);
        rememberVerses(response.verses);
        setChapterStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setChapterVerses([]);
        setChapterSource(null);
        setChapterStatus("error");
        setChapterError(error instanceof Error ? error.message : "본문을 불러오지 못했습니다.");
      }
    }

    loadChapter();

    return () => {
      cancelled = true;
    };
  }, [clearAutoCompleteTimer, currentBookId, currentChapter]);

  useEffect(() => {
    readerLocationRef.current = {
      activeView,
      bookId: currentBookId,
      chapter: currentChapter,
    };

    clearAutoCompleteTimer();
  }, [activeView, clearAutoCompleteTimer, currentBookId, currentChapter]);

  useEffect(() => {
    if (targetVerseNumber === null || !chapterVerses.length) {
      return;
    }

    const targetVerse = chapterVerses.find((verse) => verse.verse === targetVerseNumber) ?? chapterVerses[0];
    setSelectedVerseId(targetVerse.id);
    currentReadingVerseIdRef.current = targetVerse.id;
    setCurrentReadingVerseId(targetVerse.id);
    setTargetVerseNumber(null);
    window.setTimeout(() => {
      verseElementsRef.current.get(targetVerse.id)?.scrollIntoView({ block: "center" });
    }, 80);
  }, [chapterVerses, targetVerseNumber]);

  useEffect(() => {
    if (!mounted || activeView !== "reader" || !chapterVerses.length || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        const verseId = visibleEntry?.target.getAttribute("data-verse-id");
        const verse = verseId ? chapterVerses.find((item) => item.id === verseId) : null;
        if (verse) {
          scheduleTrackedProgress(verse);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -50% 0px",
        threshold: 0.05,
      },
    );

    for (const verse of chapterVerses) {
      const element = verseElementsRef.current.get(verse.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [activeView, chapterVerses, mounted, scheduleTrackedProgress]);

  useEffect(() => {
    if (!mounted || activeView !== "reader" || !chapterVerses.length) {
      return;
    }

    const lastVerse = chapterVerses.at(-1);
    if (!lastVerse) {
      return;
    }
    const trackedLastVerse = lastVerse;

    function trackLastVerseVisibility() {
      const element = verseElementsRef.current.get(trackedLastVerse.id);
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;

      if (visibleRatio >= 0.35) {
        scheduleTrackedProgress(trackedLastVerse);
        return;
      }

      if (currentReadingVerseIdRef.current === trackedLastVerse.id && autoCompleteTimerRef.current) {
        window.clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTimerRef.current = null;
        autoCompleteTargetVerseIdRef.current = null;
      }
    }

    trackLastVerseVisibility();
    const visibilityCheckTimer = window.setInterval(trackLastVerseVisibility, 500);
    window.addEventListener("scroll", trackLastVerseVisibility, { passive: true });
    window.addEventListener("resize", trackLastVerseVisibility);

    return () => {
      window.clearInterval(visibilityCheckTimer);
      window.removeEventListener("scroll", trackLastVerseVisibility);
      window.removeEventListener("resize", trackLastVerseVisibility);
    };
  }, [activeView, chapterVerses, mounted, scheduleTrackedProgress]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchStatus("idle");
      setSearchError("");
      return;
    }

    let cancelled = false;
    setSearchStatus("loading");
    setSearchError("");

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchBibleVerses(query, {
          lang: searchLanguage,
          sort: searchSort,
          testament: searchTestament,
          bookId: searchBookFilter,
          limit: 50,
        });
        if (cancelled) {
          return;
        }

        setSearchResults(response.verses);
        setSearchTotal(response.total ?? response.verses.length);
        rememberVerses(response.verses);
        setSearchStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSearchResults([]);
        setSearchTotal(0);
        setSearchStatus("error");
        setSearchError(error instanceof Error ? error.message : "검색에 실패했습니다.");
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchBookFilter, searchLanguage, searchQuery, searchSort, searchTestament]);

  useEffect(() => {
    let cancelled = false;
    setDictionaryStatus("loading");
    setDictionaryError("");

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchHebrewDictionaryEntries({
          q: dictionaryQuery,
          alphabet: dictionaryAlphabet,
          theme: dictionaryTheme,
          bookId: dictionaryBookFilter,
          sort: dictionarySort,
          limit: 50,
        });
        if (cancelled) {
          return;
        }

        setDictionaryResult(response);
        setDictionaryStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDictionaryResult(searchHebrewDictionary({
          q: dictionaryQuery,
          alphabet: dictionaryAlphabet,
          theme: dictionaryTheme,
          bookId: dictionaryBookFilter,
          sort: dictionarySort,
          limit: 50,
        }));
        setDictionaryStatus("error");
        setDictionaryError(error instanceof Error ? error.message : "사전 검색 API를 사용할 수 없어 로컬 데이터를 표시합니다.");
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dictionaryAlphabet, dictionaryBookFilter, dictionaryQuery, dictionarySort, dictionaryTheme]);

  useEffect(() => {
    if (dictionaryStatus === "loading" || !selectedHebrewEntryKey) return;
    if (dictionaryResult.entries.some((entry) => entry.normalizedKey === selectedHebrewEntryKey)) return;

    setSelectedHebrewEntryKey(dictionaryResult.entries[0]?.normalizedKey ?? null);
  }, [dictionaryResult.entries, dictionaryStatus, selectedHebrewEntryKey]);

  useEffect(() => {
    if (!mounted || navigationMode !== "shell" || activeView !== "dictionary") return;

    const timer = window.setTimeout(() => {
      const url = buildStudyUiDictionaryUrl({
        ...(dictionaryQuery.trim() ? { query: dictionaryQuery } : {}),
        ...(selectedHebrewEntryKey ? { entryKey: selectedHebrewEntryKey } : {}),
        ...(dictionaryAlphabet !== "all" ? { alphabet: dictionaryAlphabet } : {}),
        ...(dictionaryTheme !== "all" ? { themeId: dictionaryTheme } : {}),
        ...(dictionaryBookFilter !== "all" ? { bookId: dictionaryBookFilter } : {}),
        sort: dictionarySort,
      });
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== url) {
        router.replace(url, { scroll: false });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [
    activeView,
    dictionaryAlphabet,
    dictionaryBookFilter,
    dictionaryQuery,
    dictionarySort,
    dictionaryTheme,
    mounted,
    navigationMode,
    router,
    selectedHebrewEntryKey,
  ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const verseIds = new Set([
      ...userData.highlights.map((highlight) => highlight.verseId),
      ...userData.favoriteVerses.map((favorite) => favorite.verseId),
      ...userData.personalNoteVerseLinks.map((link) => link.verseKey),
    ]);
    const missingVerseIds = Array.from(verseIds)
      .map(normalizeVerseId)
      .filter((verseId) => !verseCache[verseId] && !pendingVerseFetchesRef.current.has(verseId))
      .slice(0, 24);

    for (const verseId of missingVerseIds) {
      pendingVerseFetchesRef.current.add(verseId);
      fetchBibleVerse(verseId)
        .then((response) => rememberVerses([response.verse]))
        .catch(() => undefined)
        .finally(() => pendingVerseFetchesRef.current.delete(verseId));
    }
  }, [mounted, userData.favoriteVerses, userData.highlights, userData.personalNoteVerseLinks, verseCache]);

  useEffect(() => {
    if (!mounted || showDemoImportPrompt) {
      return;
    }

    saveUserData(user.id, userData);
  }, [mounted, showDemoImportPrompt, user.id, userData]);

  useEffect(() => {
    if (!mounted || !user.isAuthenticated || personalNotesLoadedRef.current) {
      return;
    }

    personalNotesLoadedRef.current = true;
    let cancelled = false;
    setPersonalNoteRemoteStatus("서버 노트 불러오는 중");

    fetch("/api/me/notes", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "서버 노트를 불러오지 못했습니다.");
        }
        return payload as {
          notes?: PersonalNote[];
          tags?: Tag[];
          verseLinks?: PersonalNoteVerseLink[];
          noteTags?: PersonalNoteTag[];
          verseTags?: VerseTag[];
        };
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setUserData((current) => ({
          ...current,
          personalNotes: mergeById(payload.notes ?? [], current.personalNotes).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
          personalNoteVerseLinks: mergeById(payload.verseLinks ?? [], current.personalNoteVerseLinks),
          tags: mergeById(payload.tags ?? [], current.tags),
          personalNoteTags: [
            ...current.personalNoteTags.filter(
              (local) => !(payload.noteTags ?? []).some((remote) => remote.noteId === local.noteId && remote.tagId === local.tagId),
            ),
            ...(payload.noteTags ?? []),
          ],
          verseTags: mergeById(payload.verseTags ?? [], current.verseTags),
        }));
        setPersonalNoteRemoteStatus("서버 노트 동기화됨");
      })
      .catch((error) => {
        if (!cancelled) {
          setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "서버 노트 동기화 실패");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, user.isAuthenticated]);

  useEffect(() => {
    if (!selectedPersonalNote) {
      setPersonalNoteTitleDraft("");
      setPersonalNoteDocumentDraft(markdownLiteToPersonalNoteDocument(""));
      setPersonalNoteTagDraft("");
      return;
    }

    setPersonalNoteTitleDraft(selectedPersonalNote.title);
    setPersonalNoteDocumentDraft(normalizePersonalNoteDocument(selectedPersonalNote.bodyDocument, selectedPersonalNote.bodyMarkdown));
    setPersonalNoteTagDraft(
      (personalNoteTagsByNote.get(selectedPersonalNote.id) ?? [])
        .map((link) => userData.tags.find((tag) => tag.id === link.tagId)?.name)
        .filter((name): name is string => Boolean(name))
        .join(", "),
    );
  }, [personalNoteTagsByNote, selectedPersonalNote, userData.tags]);

  useEffect(() => {
    if (!user.isAuthenticated) {
      setRemotePersonalNoteMatches(null);
      return;
    }
    const query = personalNoteSearchQuery.trim();
    if (!query && personalNoteBookFilter === "all") {
      setRemotePersonalNoteMatches(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ status: showArchivedPersonalNotes ? "archived" : "active", limit: "50" });
      if (query) params.set("q", query);
      if (personalNoteBookFilter !== "all") params.set("bookId", personalNoteBookFilter);
      fetch(`/api/me/notes/search?${params}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("노트 검색 실패")))
        .then((payload) => setRemotePersonalNoteMatches(Array.isArray(payload.notes) ? payload.notes.map((note: PersonalNote) => note.id) : []))
        .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setRemotePersonalNoteMatches(null); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [personalNoteBookFilter, personalNoteSearchQuery, showArchivedPersonalNotes, user.isAuthenticated]);

  useEffect(() => {
    if (!user.isAuthenticated || !selectedVerse) {
      setSelectedVerseNoteReferences([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/me/verse-notes?verseKey=${encodeURIComponent(getVerseKey(selectedVerse))}&limit=10`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("역참조 조회 실패")))
      .then((payload) => setSelectedVerseNoteReferences(Array.isArray(payload.notes) ? payload.notes : []))
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setSelectedVerseNoteReferences([]); });
    return () => controller.abort();
  }, [selectedVerse, user.isAuthenticated]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [mounted]);

  useEffect(() => {
    favoriteListSelectionRef.current = favoriteListSelection;
  }, [favoriteListSelection]);

  useEffect(() => {
    favoriteListsRef.current = userData.favoriteLists;
  }, [userData.favoriteLists]);

  useEffect(() => {
    const existingHighlight = selectedVerse ? highlightsByVerse.get(selectedVerse.id) : null;
    const existingFavorite = selectedVerse ? favoritesByVerse.get(selectedVerse.id) : null;
    setHighlightNote(existingHighlight?.note ?? "");
    setFavoriteTitle(existingFavorite?.title ?? "");
    setFavoriteMemo(existingFavorite?.memo ?? "");
    if (existingFavorite) {
      const names = existingFavorite.tagIds
        .map((tagId) => userData.tags.find((tag) => tag.id === tagId)?.name)
        .filter(Boolean);
      setFavoriteTagInput(names.join(", "));
      const nextSelection = existingFavorite.listIds.length ? existingFavorite.listIds : [favoriteListsRef.current[0]?.id ?? defaultFavoriteListId];
      favoriteListSelectionRef.current = nextSelection;
      setFavoriteListSelection(nextSelection);
    } else {
      const nextSelection = [favoriteListsRef.current[0]?.id ?? defaultFavoriteListId];
      favoriteListSelectionRef.current = nextSelection;
      setFavoriteListSelection(nextSelection);
    }
  }, [favoritesByVerse, highlightsByVerse, selectedVerse, userData.tags]);

  useEffect(() => {
    if (!userData.favoriteLists.some((list) => list.id === selectedFavoriteListId)) {
      setSelectedFavoriteListId(userData.favoriteLists[0]?.id ?? defaultFavoriteListId);
    }
  }, [selectedFavoriteListId, userData.favoriteLists]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsShortcutHelpOpen(false);
        setNoteTarget(null);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }

      if (isTypingElement(event.target)) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setIsShortcutHelpOpen(true);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setActiveView("search");
        return;
      }

      if (activeView !== "reader") {
        return;
      }

      if (event.key === "j" || event.key === "n") {
        event.preventDefault();
        moveChapter(1);
      }

      if (event.key === "k" || event.key === "p") {
        event.preventDefault();
        moveChapter(-1);
      }

      if (event.key === " ") {
        event.preventDefault();
        if (isSpeaking && !isPaused) {
          pauseSpeech();
        } else if (isSpeaking && isPaused) {
          resumeSpeech();
        } else {
          playSpeechQueue(chapterVerses, 0, "현재 장", "chapter");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // Global shortcuts intentionally bind to the latest render state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, chapterVerses, currentBookId, currentChapter, isPaused, isSpeaking]);

  useEffect(() => {
    return () => {
      if (progressSaveTimerRef.current) {
        window.clearTimeout(progressSaveTimerRef.current);
      }
      if (autoCompleteTimerRef.current) {
        window.clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTargetVerseIdRef.current = null;
      }
    };
  }, []);

  async function logout() {
    stopSpeech();
    if (!user.isAuthenticated) {
      router.push("/auth/login?next=/app");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  function setVerseElement(verseId: string, element: HTMLButtonElement | null) {
    if (element) {
      verseElementsRef.current.set(verseId, element);
    } else {
      verseElementsRef.current.delete(verseId);
    }
  }

  function openChapter(bookId: string, chapter: number, verse = 1, view: ViewKey = "reader") {
    if (!getBook(bookId)) return;
    const chapterList = getChapters(bookId);
    const nextChapter = chapterList.includes(chapter) ? chapter : 1;
    setCurrentBookId(bookId);
    setCurrentChapter(nextChapter);
    setSelectedVerseId(null);
    clearAutoCompleteTimer();
    setTrackedReadingVerseId(null);
    setSelectedVerseIds([]);
    setSelectionAnchorVerseId(null);
    setChapterVerses([]);
    setChapterSource(null);
    setChapterStatus("loading");
    setChapterError("");
    setTargetVerseNumber(verse);
    if (view === "reader" && onReaderNavigate) {
      onReaderNavigate(createStudyUiReaderRoute({ bookId, chapter: nextChapter, verse }));
    } else {
      setActiveView(view);
    }
    verseElementsRef.current.clear();
    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    updateProgress(bookId, nextChapter, verse);
  }

  function openChapterPicker() {
    setChapterPickerBookId(currentBookId);
    setIsChapterPickerOpen(true);
  }

  function selectChapterFromPicker(chapter: number) {
    openChapter(chapterPickerBook.id, chapter);
    setIsChapterPickerOpen(false);
  }

  function selectVerse(verse: Verse) {
    setSelectedVerseId(verse.id);
    setTrackedReadingVerseId(verse.id);
    if (isReaderV2) {
      setReaderContextTab("note");
      setIsReaderContextOpen(true);
      setIsReaderFocusMode(false);
    }
    updateProgress(verse.bookId, verse.chapter, verse.verse, getScrollPosition());
  }

  function clearVerseSelection() {
    setSelectedVerseIds([]);
    setSelectionAnchorVerseId(null);
  }

  function setSelectionMode(nextMode: boolean) {
    setIsSelectionMode(nextMode);
    if (!nextMode) {
      clearVerseSelection();
    }
  }

  function selectVerseForBatch(verse: Verse) {
    setSelectedVerseId(verse.id);
    setTrackedReadingVerseId(verse.id);
    updateProgress(verse.bookId, verse.chapter, verse.verse, getScrollPosition());

    if (!selectionAnchorVerseId || !selectedVerseIds.length) {
      setSelectionAnchorVerseId(verse.id);
      setSelectedVerseIds([verse.id]);
      return;
    }

    const anchorIndex = chapterVerses.findIndex((item) => item.id === selectionAnchorVerseId);
    const targetIndex = chapterVerses.findIndex((item) => item.id === verse.id);
    if (anchorIndex >= 0 && targetIndex >= 0 && anchorIndex !== targetIndex) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      setSelectedVerseIds(chapterVerses.slice(start, end + 1).map((item) => item.id));
      return;
    }

    setSelectedVerseIds((current) =>
      current.includes(verse.id) ? current.filter((verseId) => verseId !== verse.id) : [...current, verse.id],
    );
  }

  function handleVerseClick(verse: Verse) {
    if (suppressVerseClickRef.current) {
      suppressVerseClickRef.current = false;
      return;
    }

    if (isSelectionMode) {
      selectVerseForBatch(verse);
      return;
    }

    selectVerse(verse);
  }

  function isMobileSwipeEnabled() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  }

  function handleVerseListPointerDown(event: PointerEvent<HTMLElement>) {
    if (!isMobileSwipeEnabled() || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    chapterSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };

    if (isReaderV2) {
      const verseId = (event.target as HTMLElement).closest<HTMLElement>("[data-verse-id]")?.dataset.verseId;
      const verse = verseId ? chapterVerses.find((item) => item.id === verseId) : null;
      if (verse) {
        clearVerseLongPressTimer();
        verseLongPressTimerRef.current = window.setTimeout(() => {
          verseLongPressTimerRef.current = null;
          chapterSwipeStartRef.current = null;
          suppressVerseClickRef.current = true;
          setSelectionMode(true);
          selectVerseForBatch(verse);
          setIsReaderContextOpen(false);
          window.navigator.vibrate?.(20);
          window.setTimeout(() => {
            suppressVerseClickRef.current = false;
          }, 300);
        }, 520);
      }
    }
  }

  function handleVerseListPointerUp(event: PointerEvent<HTMLElement>) {
    clearVerseLongPressTimer();
    const start = chapterSwipeStartRef.current;
    chapterSwipeStartRef.current = null;

    if (!start || start.pointerId !== event.pointerId || !isMobileSwipeEnabled()) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) >= 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;
    if (!isHorizontalSwipe) {
      return;
    }

    const direction = deltaX < 0 ? 1 : -1;
    if (!getAdjacentChapter(currentBookId, currentChapter, direction)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.getSelection()?.removeAllRanges();
    suppressVerseClickRef.current = true;
    window.setTimeout(() => {
      suppressVerseClickRef.current = false;
    }, 250);
    moveChapter(direction);
  }

  function handleVerseListPointerCancel(event: PointerEvent<HTMLElement>) {
    clearVerseLongPressTimer();
    if (chapterSwipeStartRef.current?.pointerId === event.pointerId) {
      chapterSwipeStartRef.current = null;
    }
  }

  function clearVerseLongPressTimer() {
    if (verseLongPressTimerRef.current !== null) {
      window.clearTimeout(verseLongPressTimerRef.current);
      verseLongPressTimerRef.current = null;
    }
  }

  function copySelectedVerses() {
    if (!selectedVerses.length) {
      setCopyStatus("선택된 구절이 없습니다.");
      return;
    }

    const text = selectedVerses.map((verse) => copyTextForVerse(verse, readingLanguage)).join("\n\n");
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyStatus(`${selectedVerses.length}개 구절 복사 완료`))
      .catch(() => setCopyStatus("선택 구절 복사 실패"));
  }

  function applyHighlightToSelected(color: HighlightColor) {
    if (!selectedVerses.length) {
      return;
    }

    const selectedIds = new Set(selectedVerses.map((verse) => verse.id));
    const now = new Date().toISOString();
    setUserData((current) => {
      const existingIds = new Set(current.highlights.filter((highlight) => selectedIds.has(highlight.verseId)).map((highlight) => highlight.verseId));
      const updatedHighlights = current.highlights.map((highlight) =>
        selectedIds.has(highlight.verseId)
          ? {
              ...highlight,
              color,
              updatedAt: now,
            }
          : highlight,
      );
      const additions = selectedVerses
        .filter((verse) => !existingIds.has(verse.id))
        .map((verse) => ({
          id: createId("highlight"),
          userId: user.id,
          verseId: verse.id,
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          color,
          note: "",
          createdAt: now,
          updatedAt: now,
        }));

      return {
        ...current,
        highlights: [...updatedHighlights, ...additions],
      };
    });
  }

  function openSelectedFavoriteModal() {
    if (!selectedVerses.length) {
      setCopyStatus("인용 저장할 구절을 선택하세요.");
      return;
    }

    setFavoriteTargetVerseIds(selectedVerses.map((verse) => verse.id));
    setFavoriteTitle("");
    setFavoriteMemo("");
    setFavoriteTagInput("구원, 복음");
    const nextSelection = [userData.favoriteLists[0]?.id ?? defaultFavoriteListId];
    favoriteListSelectionRef.current = nextSelection;
    setFavoriteListSelection(nextSelection);
    setNewFavoriteListName("");
    setIsFavoriteModalOpen(true);
  }

  function moveChapter(direction: -1 | 1) {
    const adjacent = getAdjacentChapter(currentBookId, currentChapter, direction);
    if (adjacent) {
      openChapter(adjacent.bookId, adjacent.chapter);
    }
  }

  function toggleCompleted(bookId = currentBookId, chapter = currentChapter) {
    const key = chapterKey(bookId, chapter);
    if (!isChapterCompleted(bookId, chapter)) {
      markChapterCompleted(bookId, chapter);
      return;
    }

    setUserData((current) => ({
      ...current,
      completedChapters: current.completedChapters.filter(
        (completed) => chapterKey(completed.bookId, completed.chapter) !== key,
      ),
    }));
  }

  function createReadingPlan(template: ReadingPlanTemplate) {
    const option = getPlanOption(template);
    const now = new Date().toISOString();
    const plan: ReadingPlan = {
      id: createId("reading-plan"),
      userId: user.id,
      template,
      name: option.name,
      scope: option.scope,
      startDate: getLocalDateKey(),
      totalDays: option.totalDays,
      createdAt: now,
      updatedAt: now,
    };

    setUserData((current) => ({
      ...current,
      activeReadingPlan: plan,
    }));
  }

  function clearReadingPlan() {
    setUserData((current) => ({
      ...current,
      activeReadingPlan: null,
    }));
  }

  function restartReadingPlan() {
    setUserData((current) => {
      if (!current.activeReadingPlan) {
        return current;
      }

      return {
        ...current,
        activeReadingPlan: {
          ...current.activeReadingPlan,
          startDate: getLocalDateKey(),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function openTodayReading() {
    if (!readingPlanTargetChapter) {
      return;
    }

    openChapter(readingPlanTargetChapter.bookId, readingPlanTargetChapter.chapter);
  }

  function completeTodayReading() {
    if (!readingPlanDay) {
      return;
    }

    setUserData((current) => {
      const existingKeys = new Set(
        current.completedChapters.map((chapter) => chapterKey(chapter.bookId, chapter.chapter)),
      );
      const now = new Date().toISOString();
      const additions = readingPlanDay.chapters
        .filter((chapter) => !existingKeys.has(chapterKey(chapter.bookId, chapter.chapter)))
        .map((chapter) => ({
          id: createId("completed"),
          userId: user.id,
          bookId: chapter.bookId,
          chapter: chapter.chapter,
          completedAt: now,
        }));

      if (!additions.length) {
        return current;
      }

      return {
        ...current,
        completedChapters: [...current.completedChapters, ...additions],
      };
    });
  }

  function applyHighlight(color: HighlightColor) {
    if (!selectedVerse) {
      return;
    }

    setUserData((current) => {
      const existing = current.highlights.find((highlight) => highlight.verseId === selectedVerse.id);
      const now = new Date().toISOString();
      if (existing) {
        return {
          ...current,
          highlights: current.highlights.map((highlight) =>
            highlight.id === existing.id
              ? {
                  ...highlight,
                  color,
                  note: highlightNote,
                  updatedAt: now,
                }
              : highlight,
          ),
        };
      }

      const highlight: Highlight = {
        id: createId("highlight"),
        userId: user.id,
        verseId: selectedVerse.id,
        bookId: selectedVerse.bookId,
        chapter: selectedVerse.chapter,
        verse: selectedVerse.verse,
        color,
        note: highlightNote,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        highlights: [...current.highlights, highlight],
      };
    });
  }

  function removeHighlight(verseId: string) {
    setUserData((current) => ({
      ...current,
      highlights: current.highlights.filter((highlight) => highlight.verseId !== verseId),
    }));
  }

  function findNoteForTarget(target: NoteTarget) {
    return userData.studyNotes.find((note) =>
      target.scope === "verse"
        ? note.scope === "verse" && note.verseId === target.verseId
        : note.scope === "chapter" && note.bookId === target.bookId && note.chapter === target.chapter,
    );
  }

  function openNoteModal(target: NoteTarget) {
    const existing = findNoteForTarget(target);
    setNoteTarget(target);
    setNoteDraft(existing?.note ?? "");
  }

  function getSelectedTextSnippet() {
    if (typeof window === "undefined") {
      return "";
    }

    return window.getSelection()?.toString().replace(/\s+/g, " ").trim().slice(0, 240) ?? "";
  }

  function openFeedbackModal() {
    if (!selectedVerse) {
      return;
    }

    if (!user.isAuthenticated) {
      setCopyStatus("번역 의견은 로그인 후 보낼 수 있습니다.");
      return;
    }

    setFeedbackTargetVerse(selectedVerse);
    setFeedbackSelectedText(getSelectedTextSnippet());
  }

  function saveStudyNote() {
    if (!noteTarget) {
      return;
    }

    const value = noteDraft.trim();
    const now = new Date().toISOString();
    setUserData((current) => {
      const existing = current.studyNotes.find((note) =>
        noteTarget.scope === "verse"
          ? note.scope === "verse" && note.verseId === noteTarget.verseId
          : note.scope === "chapter" && note.bookId === noteTarget.bookId && note.chapter === noteTarget.chapter,
      );

      if (!value) {
        return {
          ...current,
          studyNotes: existing ? current.studyNotes.filter((note) => note.id !== existing.id) : current.studyNotes,
        };
      }

      if (existing) {
        return {
          ...current,
          studyNotes: current.studyNotes.map((note) =>
            note.id === existing.id
              ? {
                  ...note,
                  note: value,
                  updatedAt: now,
                }
              : note,
          ),
        };
      }

      const note: StudyNote = {
        id: createId("note"),
        userId: user.id,
        scope: noteTarget.scope,
        bookId: noteTarget.bookId,
        chapter: noteTarget.chapter,
        verse: noteTarget.scope === "verse" ? noteTarget.verse : undefined,
        verseId: noteTarget.scope === "verse" ? noteTarget.verseId : undefined,
        note: value,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...current,
        studyNotes: [note, ...current.studyNotes],
      };
    });
    setNoteTarget(null);
    setNoteDraft("");
  }

  function deleteStudyNote() {
    if (!noteTarget) {
      return;
    }

    setUserData((current) => ({
      ...current,
      studyNotes: current.studyNotes.filter((note) =>
        noteTarget.scope === "verse"
          ? !(note.scope === "verse" && note.verseId === noteTarget.verseId)
          : !(note.scope === "chapter" && note.bookId === noteTarget.bookId && note.chapter === noteTarget.chapter),
      ),
    }));
    setNoteTarget(null);
    setNoteDraft("");
  }

  async function postPersonalNoteToServer(note: PersonalNote, links: PersonalNoteVerseLink[], tagNames: string[] = []) {
    if (!user.isAuthenticated) {
      return;
    }

    const response = await fetch("/api/me/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: note.id,
        title: note.title,
        bodyMarkdown: note.bodyMarkdown,
        bodyText: note.bodyText,
        bodyDocument: note.bodyDocument,
        revision: note.revision,
        tagNames,
        verseLinks: links.map((link) => ({
          id: link.id,
          verseKey: link.verseKey,
          bookId: link.bookId,
          chapter: link.chapter,
          verse: link.verse,
          selectedText: link.selectedText,
          source: link.source,
        })),
        noteLinks: userData.personalNoteLinks.filter((link) => link.sourceNoteId === note.id),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      if (response.status === 409 && payload?.current) setPersonalNoteConflict(payload.current as PersonalNote);
      throw new Error(payload?.error ?? "노트를 서버에 저장하지 못했습니다.");
    }
    return response.json();
  }

  async function patchPersonalNoteToServer(note: PersonalNote, links: PersonalNoteVerseLink[] = [], tagNames: string[] = []) {
    if (!user.isAuthenticated) {
      return;
    }

    const response = await fetch(`/api/me/notes/${encodeURIComponent(note.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note.title,
        bodyMarkdown: note.bodyMarkdown,
        bodyText: note.bodyText,
        bodyDocument: note.bodyDocument,
        revision: note.revision,
        pinned: note.pinned,
        status: note.status,
        tagNames,
        verseLinks: links.map((link) => ({
          id: link.id,
          verseKey: link.verseKey,
          bookId: link.bookId,
          chapter: link.chapter,
          verse: link.verse,
          selectedText: link.selectedText,
          source: link.source,
          linkOrder: link.linkOrder,
        })),
        noteLinks: userData.personalNoteLinks.filter((link) => link.sourceNoteId === note.id),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "노트를 서버에 저장하지 못했습니다.");
    }
    return response.json();
  }

  async function deletePersonalNoteFromServer(noteId: string) {
    if (!user.isAuthenticated) {
      return;
    }

    const response = await fetch(`/api/me/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "노트를 서버에서 삭제하지 못했습니다.");
    }
  }

  function getOrCreateTagIds(tagNames: string[], current: UserDataState, now: string) {
    const normalizedNames = Array.from(
      new Set(tagNames.map((name) => name.trim()).filter(Boolean).map((name) => name.slice(0, 32))),
    );
    const tags = [...current.tags];
    const tagIds: string[] = [];

    for (const name of normalizedNames) {
      const existing = tags.find((tag) => tag.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"));
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }

      const tag: Tag = {
        id: createId("tag"),
        userId: user.id,
        name,
        createdAt: now,
      };
      tags.push(tag);
      tagIds.push(tag.id);
    }

    return { tags, tagIds };
  }

  function createVerseLink(noteId: string, verse: Verse, index: number, now: string): PersonalNoteVerseLink {
    return {
      id: createId("note-link"),
      userId: user.id,
      noteId,
      verseKey: getVerseKey(verse),
      bookId: verse.bookId,
      chapter: verse.chapter,
      verse: verse.verse,
      linkOrder: (index + 1) * 10,
      source: "reader",
      createdAt: now,
    };
  }

  function createPersonalNoteFromVerses(
    verses: Verse[],
    body = "",
    initialDocument?: PersonalNoteDocument,
    titleHint?: string,
  ) {
    const now = new Date().toISOString();
    const firstVerse = verses[0];
    const title = firstVerse ? `${formatReference(firstVerse)} 노트` : titleHint || "새 성경노트";
    const bodyDocument = initialDocument
      ? normalizePersonalNoteDocument(initialDocument)
      : markdownLiteToPersonalNoteDocument(body);
    const bodyMarkdown = personalNoteDocumentToMarkdown(bodyDocument);
    const note: PersonalNote = {
      id: createId("personal-note"),
      userId: user.id,
      title,
      bodyMarkdown,
      bodyText: personalNoteDocumentToText(bodyDocument),
      bodyDocument,
      editorFormat: "rich-text-v1",
      status: "active",
      pinned: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
    };
    const links = verses.map((verse, index) => createVerseLink(note.id, verse, index, now));

    setUserData((current) => ({
      ...current,
      personalNotes: [note, ...current.personalNotes],
      personalNoteVerseLinks: [...links, ...current.personalNoteVerseLinks],
    }));
    setSelectedPersonalNoteId(note.id);
    setPersonalNoteMobilePane("editor");
    setActiveView("notes");
    setPersonalNoteSaveStatus("새 노트 생성됨");
    void postPersonalNoteToServer(note, links)
      .then((payload) => {
        const savedNote = payload?.note as PersonalNote | undefined;
        if (savedNote) setUserData((current) => ({ ...current, personalNotes: current.personalNotes.map((item) => item.id === savedNote.id ? { ...item, ...savedNote } : item) }));
        setPersonalNoteRemoteStatus("서버 저장됨");
      })
      .catch((error) => setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "서버 저장 실패"));
  }

  function createBlankPersonalNote() {
    setPendingPersonalNoteVerses([]);
  }

  function completePersonalNoteCreation(selection: { title: string; document?: PersonalNoteDocument }) {
    createPersonalNoteFromVerses(pendingPersonalNoteVerses ?? [], "", selection.document, selection.title);
    setPendingPersonalNoteVerses(null);
  }

  function savePersonalNote() {
    if (!selectedPersonalNote) {
      createBlankPersonalNote();
      return;
    }

    const title = personalNoteTitleDraft.trim() || "제목 없는 성경노트";
    const bodyDocument = personalNoteDocumentDraft;
    const bodyMarkdown = personalNoteDocumentToMarkdown(bodyDocument);
    const bodyText = personalNoteDocumentToText(bodyDocument);
    const tagNames = personalNoteTagDraft.split(",").map((name) => name.trim()).filter(Boolean);
    const now = new Date().toISOString();

    const updatedNote: PersonalNote = {
      ...selectedPersonalNote,
      title,
      bodyMarkdown,
      bodyText,
      bodyDocument,
      editorFormat: "rich-text-v1",
      updatedAt: now,
      lastSavedAt: now,
    };

    setUserData((current) => {
      const { tags, tagIds } = getOrCreateTagIds(tagNames, current, now);
      const noteTags: PersonalNoteTag[] = tagIds.map((tagId) => ({
        userId: user.id,
        noteId: selectedPersonalNote.id,
        tagId,
        createdAt: now,
      }));

      return {
        ...current,
        tags,
        personalNotes: current.personalNotes.map((note) =>
          note.id === selectedPersonalNote.id
            ? updatedNote
            : note,
        ),
        personalNoteTags: [
          ...current.personalNoteTags.filter((link) => link.noteId !== selectedPersonalNote.id),
          ...noteTags,
        ],
      };
    });
    setPersonalNoteSaveStatus("저장됨");
    void patchPersonalNoteToServer(updatedNote, personalNoteLinksByNote.get(updatedNote.id) ?? [], tagNames)
      .then((payload) => {
        const savedNote = payload?.note as PersonalNote | undefined;
        if (savedNote) {
          setUserData((current) => ({
            ...current,
            personalNotes: current.personalNotes.map((note) => note.id === savedNote.id ? { ...note, ...savedNote } : note),
            personalNoteRevisions: [{ id: createId("revision"), userId: user.id, noteId: savedNote.id, revision: savedNote.revision, title: savedNote.title, bodyDocument: savedNote.bodyDocument, bodyText: savedNote.bodyText, snapshotReason: "save", createdAt: savedNote.updatedAt }, ...current.personalNoteRevisions.filter((revision) => !(revision.noteId === savedNote.id && revision.revision === savedNote.revision))],
          }));
        }
        setPersonalNoteConflict(null);
        setPersonalNoteRemoteStatus("서버 저장됨");
      })
      .catch((error) => setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "서버 저장 실패"));
  }

  function deletePersonalNote(noteId: string) {
    setUserData((current) => ({
      ...current,
      personalNotes: current.personalNotes.map((note) => note.id === noteId ? { ...note, status: "archived", archivedAt: new Date().toISOString() } : note),
    }));
    setSelectedPersonalNoteId((current) => (current === noteId ? null : current));
    setPersonalNoteSaveStatus("보관함으로 이동됨");
    void deletePersonalNoteFromServer(noteId)
      .then(() => setPersonalNoteRemoteStatus("서버 보관됨"))
      .catch((error) => setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "서버 삭제 실패"));
  }

  function addSelectedVerseToNewPersonalNote() {
    const verses = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [];
    setPendingPersonalNoteVerses(verses);
  }

  function appendSelectedVersesToPersonalNote(noteId: string) {
    const verses = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [];
    if (!verses.length) {
      return;
    }

    const now = new Date().toISOString();
    let updatedLinksForServer: PersonalNoteVerseLink[] = [];
    const targetNote = userData.personalNotes.find((note) => note.id === noteId) ?? null;
    setUserData((current) => {
      const existingKeys = new Set(
        current.personalNoteVerseLinks.filter((link) => link.noteId === noteId).map((link) => link.verseKey),
      );
      const currentCount = current.personalNoteVerseLinks.filter((link) => link.noteId === noteId).length;
      const links = verses
        .filter((verse) => !existingKeys.has(getVerseKey(verse)))
        .map((verse, index) => createVerseLink(noteId, verse, currentCount + index, now));
      updatedLinksForServer = [...current.personalNoteVerseLinks.filter((link) => link.noteId === noteId), ...links];

      return {
        ...current,
        personalNoteVerseLinks: [...current.personalNoteVerseLinks, ...links],
        personalNotes: current.personalNotes.map((note) => note.id === noteId ? { ...note, updatedAt: now } : note),
      };
    });
    setSelectedPersonalNoteId(noteId);
    setActiveView("notes");
    setPersonalNoteSaveStatus("구절 연결됨");
    if (targetNote) {
      void patchPersonalNoteToServer({ ...targetNote, updatedAt: now }, updatedLinksForServer)
        .then(() => setPersonalNoteRemoteStatus("서버 연결됨"))
        .catch((error) => setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "서버 연결 실패"));
    }
  }

  function addInlineVerseReference(suggestion: { bookId: string; chapter: number; verse: number; verseKey: string; displayReference: string }) {
    if (!selectedPersonalNote) return;
    const now = new Date().toISOString();
    setUserData((current) => {
      if (current.personalNoteVerseLinks.some((link) => link.noteId === selectedPersonalNote.id && link.verseKey === suggestion.verseKey)) return current;
      const link: PersonalNoteVerseLink = {
        id: createId("note-link"),
        userId: user.id,
        noteId: selectedPersonalNote.id,
        verseKey: suggestion.verseKey,
        bookId: suggestion.bookId,
        chapter: suggestion.chapter,
        verse: suggestion.verse,
        source: "inline-tag",
        linkOrder: current.personalNoteVerseLinks.filter((item) => item.noteId === selectedPersonalNote.id).length * 10 + 10,
        createdAt: now,
      };
      return { ...current, personalNoteVerseLinks: [...current.personalNoteVerseLinks, link] };
    });
    setPersonalNoteSaveStatus("구절 태그 추가됨 · 저장 필요");
  }

  function addPersonalNoteReference(targetNoteId: string) {
    if (!selectedPersonalNote || targetNoteId === selectedPersonalNote.id) return;
    setUserData((current) => {
      if (current.personalNoteLinks.some((link) => link.sourceNoteId === selectedPersonalNote.id && link.targetNoteId === targetNoteId)) return current;
      return {
        ...current,
        personalNoteLinks: [{ userId: user.id, sourceNoteId: selectedPersonalNote.id, targetNoteId, createdAt: new Date().toISOString() }, ...current.personalNoteLinks],
      };
    });
    setPersonalNoteSaveStatus("노트 링크 추가됨 · 저장 필요");
  }

  function removePersonalNoteVerseLink(linkId: string) {
    setUserData((current) => ({ ...current, personalNoteVerseLinks: current.personalNoteVerseLinks.filter((link) => link.id !== linkId) }));
    setPersonalNoteSaveStatus("연결 구절 제거됨 · 저장 필요");
  }

  function useRemoteConflictVersion() {
    if (!personalNoteConflict) return;
    setUserData((current) => ({ ...current, personalNotes: current.personalNotes.map((note) => note.id === personalNoteConflict.id ? personalNoteConflict : note) }));
    setPersonalNoteDocumentDraft(normalizePersonalNoteDocument(personalNoteConflict.bodyDocument, personalNoteConflict.bodyMarkdown));
    setPersonalNoteTitleDraft(personalNoteConflict.title);
    setPersonalNoteConflict(null);
    setPersonalNoteRemoteStatus("최신 서버 버전을 불러왔습니다.");
  }

  function duplicateConflictDraft() {
    const body = personalNoteDocumentToMarkdown(personalNoteDocumentDraft);
    createPersonalNoteFromVerses([], body);
    setPersonalNoteTitleDraft(`${personalNoteTitleDraft || "성경노트"} (충돌 복사본)`);
    setPersonalNoteConflict(null);
  }

  async function restorePersonalNoteRevision(revision: number) {
    if (!selectedPersonalNote || !user.isAuthenticated) return;
    const response = await fetch(`/api/me/notes/${encodeURIComponent(selectedPersonalNote.id)}/revisions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.note) {
      setPersonalNoteRemoteStatus(payload?.error ?? "버전을 복원하지 못했습니다.");
      return;
    }
    const restored = payload.note as PersonalNote;
    setUserData((current) => ({ ...current, personalNotes: current.personalNotes.map((note) => note.id === restored.id ? { ...note, ...restored } : note) }));
    setPersonalNoteDocumentDraft(normalizePersonalNoteDocument(restored.bodyDocument, restored.bodyMarkdown));
    setPersonalNoteTitleDraft(restored.title);
    setPersonalNoteRemoteStatus(`버전 ${revision}을 새 버전으로 복원했습니다.`);
  }

  async function restoreArchivedPersonalNote(note: PersonalNote) {
    const activeNote = { ...note, status: "active" as const, archivedAt: undefined };
    setUserData((current) => ({ ...current, personalNotes: current.personalNotes.map((item) => item.id === note.id ? activeNote : item) }));
    await patchPersonalNoteToServer(activeNote, personalNoteLinksByNote.get(note.id) ?? []);
    setPersonalNoteRemoteStatus("노트를 복원했습니다.");
  }

  async function saveCurrentNoteAsTemplate() {
    if (!selectedPersonalNote || !user.isAuthenticated) return;
    const name = personalTemplateName.trim() || `${selectedPersonalNote.title} 템플릿`;
    const response = await fetch("/api/me/note-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: "내 성경노트에서 만든 템플릿", bodyDocument: personalNoteDocumentDraft }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setPersonalNoteRemoteStatus(payload?.error ?? "템플릿을 저장하지 못했습니다.");
      return;
    }
    const row = payload.template;
    setUserData((current) => ({ ...current, personalNoteTemplates: [{ id: row.client_id, userId: user.id, name: row.name, description: row.description, bodyDocument: row.body_document, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }, ...current.personalNoteTemplates] }));
    setPersonalTemplateName("");
    setPersonalNoteRemoteStatus("템플릿을 저장했습니다.");
  }

  async function exportPersonalNotes(format: "json" | "markdown") {
    if (!user.isAuthenticated) {
      setPersonalNoteRemoteStatus("내보내기는 로그인 후 사용할 수 있습니다.");
      return;
    }
    const response = await fetch("/api/me/notes/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setPersonalNoteRemoteStatus(payload?.error ?? "노트를 내보내지 못했습니다.");
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = format === "json" ? "kjv-reader-notes.json" : "kjv-reader-notes.zip";
    anchor.click();
    URL.revokeObjectURL(href);
    setPersonalNoteRemoteStatus("노트 내보내기가 완료되었습니다.");
  }

  function tagSelectedVerse() {
    const verse = selectedVerse;
    const tagName = window.prompt("구절 태그 이름", "묵상")?.trim();
    if (!verse || !tagName) {
      return;
    }

    const now = new Date().toISOString();
    setUserData((current) => {
      const { tags, tagIds } = getOrCreateTagIds([tagName], current, now);
      const tagId = tagIds[0];
      const alreadyExists = current.verseTags.some((tag) => tag.verseKey === getVerseKey(verse) && tag.tagId === tagId);
      const verseTag: VerseTag = {
        id: createId("verse-tag"),
        userId: user.id,
        verseKey: getVerseKey(verse),
        bookId: verse.bookId,
        chapter: verse.chapter,
        verse: verse.verse,
        tagId,
        createdAt: now,
      };

      return {
        ...current,
        tags,
        verseTags: alreadyExists ? current.verseTags : [verseTag, ...current.verseTags],
      };
    });
    setCopyStatus("구절 태그 추가됨");
    if (user.isAuthenticated) {
      void fetch("/api/me/verse-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: verse.bookId,
          chapter: verse.chapter,
          tagName,
          verse: verse.verse,
          verseKey: getVerseKey(verse),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error ?? "구절 태그 서버 저장 실패");
          }
          setPersonalNoteRemoteStatus("구절 태그 서버 저장됨");
        })
        .catch((error) => setPersonalNoteRemoteStatus(error instanceof Error ? error.message : "구절 태그 서버 저장 실패"));
    }
  }

  function addHebrewEntryToPersonalNote(entry: HebrewDictionaryEntrySummary) {
    const sample = entry.sampleVerses[0];
    const body = [
      `## ${entry.lemmaHe} (${entry.transliteration}, ${entry.pronunciationKo})`,
      `뜻: ${entry.glossKo} / ${entry.glossEn}`,
      `발음기호: ${entry.pronunciationSymbol}`,
      `문맥: ${entry.interpretationNoteKo}`,
      sample ? `예시: ${formatHebrewDictionaryReference(sample)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (selectedPersonalNote) {
      const current = personalNoteDocumentToMarkdown(personalNoteDocumentDraft);
      const next = `${current}${current.trim() ? "\n\n" : ""}${body}`;
      setPersonalNoteDocumentDraft(markdownLiteToPersonalNoteDocument(next));
      setActiveView("notes");
      return;
    }

    createPersonalNoteFromVerses([], body);
  }

  function createFavoriteList(name: string, now = new Date().toISOString()): FavoriteList {
    return {
      id: createId("favorite-list"),
      userId: user.id,
      name,
      createdAt: now,
      updatedAt: now,
    };
  }

  function toggleFavoriteListSelection(listId: string) {
    setFavoriteListSelection((current) => {
      const next = current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId];
      favoriteListSelectionRef.current = next;
      return next;
    });
  }

  function createFavoriteListFromModal() {
    const name = newFavoriteListName.trim();
    if (!name) {
      return;
    }

    const existing = userData.favoriteLists.find(
      (list) => list.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"),
    );
    if (existing) {
      setFavoriteListSelection((current) => {
        const next = current.includes(existing.id) ? current : [...current, existing.id];
        favoriteListSelectionRef.current = next;
        return next;
      });
      setNewFavoriteListName("");
      return;
    }

    const list = createFavoriteList(name);
    setUserData((current) => ({
      ...current,
      favoriteLists: [...current.favoriteLists, list],
    }));
    setFavoriteListSelection((current) => {
      const next = current.includes(list.id) ? current : [...current, list.id];
      favoriteListSelectionRef.current = next;
      return next;
    });
    setSelectedFavoriteListId(list.id);
    setNewFavoriteListName("");
  }

  function openFavoriteModal() {
    if (!selectedVerse) {
      return;
    }

    setFavoriteTargetVerseIds([selectedVerse.id]);
    const existing = favoritesByVerse.get(selectedVerse.id);
    setFavoriteTitle(existing?.title ?? "");
    setFavoriteMemo(existing?.memo ?? "");
    if (existing) {
      const names = existing.tagIds
        .map((tagId) => userData.tags.find((tag) => tag.id === tagId)?.name)
        .filter(Boolean);
      setFavoriteTagInput(names.join(", "));
      const nextSelection = existing.listIds.length ? existing.listIds : [userData.favoriteLists[0]?.id ?? defaultFavoriteListId];
      favoriteListSelectionRef.current = nextSelection;
      setFavoriteListSelection(nextSelection);
    } else {
      setFavoriteTagInput("구원, 복음");
      const nextSelection = [userData.favoriteLists[0]?.id ?? defaultFavoriteListId];
      favoriteListSelectionRef.current = nextSelection;
      setFavoriteListSelection(nextSelection);
    }
    setNewFavoriteListName("");
    setIsFavoriteModalOpen(true);
  }

  function saveFavorite() {
    const targetVerses = favoriteTargetVerses.length ? favoriteTargetVerses : selectedVerse ? [selectedVerse] : [];
    if (!targetVerses.length) {
      return;
    }

    const selectedListIds = favoriteListSelectionRef.current;
    if (!selectedListIds.length) {
      setCopyStatus("인용 목록을 1개 이상 선택하세요.");
      return;
    }

    const tagNames = favoriteTagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setUserData((current) => {
      const now = new Date().toISOString();
      const nextTags = [...current.tags];
      const validListIds = selectedListIds.filter((listId) =>
        current.favoriteLists.some((list) => list.id === listId),
      );
      const listIds = validListIds.length ? validListIds : [current.favoriteLists[0]?.id ?? defaultFavoriteListId];
      const tagIds = tagNames.map((name) => {
        const existing = nextTags.find((tag) => tag.name.toLocaleLowerCase("ko-KR") === name.toLocaleLowerCase("ko-KR"));
        if (existing) {
          return existing.id;
        }

        const tag: Tag = {
          id: createId("tag"),
          userId: user.id,
          name,
          createdAt: now,
        };
        nextTags.push(tag);
        return tag.id;
      });

      const targetIds = new Set(targetVerses.map((verse) => verse.id));
      const updatedFavorites = current.favoriteVerses.map((favorite) => {
        const verse = targetVerses.find((item) => item.id === favorite.verseId);
        if (!verse) {
          return favorite;
        }

        return {
          ...favorite,
          title: targetVerses.length === 1 && favoriteTitle ? favoriteTitle : formatReference(verse),
          memo: favoriteMemo,
          tagIds,
          listIds,
          updatedAt: now,
        };
      });
      const existingIds = new Set(current.favoriteVerses.filter((favorite) => targetIds.has(favorite.verseId)).map((favorite) => favorite.verseId));
      const additions = targetVerses
        .filter((verse) => !existingIds.has(verse.id))
        .map((verse) => ({
          id: createId("favorite"),
          userId: user.id,
          verseId: verse.id,
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          title: targetVerses.length === 1 && favoriteTitle ? favoriteTitle : formatReference(verse),
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
    setIsFavoriteModalOpen(false);
    setFavoriteTargetVerseIds([]);
  }

  function removeFavorite(favoriteId: string) {
    setUserData((current) => ({
      ...current,
      favoriteVerses: current.favoriteVerses.filter((favorite) => favorite.id !== favoriteId),
    }));
  }

  async function copyFavoriteList() {
    if (!selectedFavoriteList || !selectedListFavorites.length) {
      setCopyStatus("복사할 인용 구절이 없습니다.");
      return;
    }

    const verses = (
      await Promise.all(selectedListFavorites.map((favorite) => resolveOrFetchVerse(favorite.verseId).catch(() => null)))
    ).filter((verse): verse is Verse => Boolean(verse));

    if (!verses.length) {
      setCopyStatus("목록 구절을 불러오지 못했습니다.");
      return;
    }

    const chunks = verses.map((verse) => copyTextForVerse(verse, readingLanguage));
    const text = [`[${selectedFavoriteList.name}]`, ...chunks].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${selectedFavoriteList.name} 목록 복사 완료`);
      const copiedIds = new Set(selectedListFavorites.map((favorite) => favorite.id));
      setUserData((current) => ({
        ...current,
        favoriteVerses: current.favoriteVerses.map((favorite) =>
          copiedIds.has(favorite.id) ? { ...favorite, usageCount: favorite.usageCount + 1 } : favorite,
        ),
      }));
    } catch {
      setCopyStatus("목록 복사 실패");
    }
  }

  function requestDeleteFavoriteList(listId: string) {
    setPendingDeleteFavoriteListId(listId);
  }

  function confirmDeleteFavoriteList() {
    const listId = pendingDeleteFavoriteListId;
    if (!listId) {
      return;
    }

    const list = userData.favoriteLists.find((item) => item.id === listId);
    if (!list) {
      setPendingDeleteFavoriteListId(null);
      return;
    }

    setUserData((current) => {
      const remainingLists = current.favoriteLists.filter((item) => item.id !== listId);
      const now = new Date().toISOString();
      const nextLists = remainingLists.length
        ? remainingLists
        : [
            {
              id: defaultFavoriteListId,
              userId: user.id,
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
  }

  async function copyVerse(verse: Verse, language: TranslationLanguage = readingLanguage) {
    const text = copyTextForVerse(verse, language);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${formatReference(verse)} 복사 완료`);
    } catch {
      setCopyStatus("복사 실패");
    }

    setUserData((current) => ({
      ...current,
      favoriteVerses: current.favoriteVerses.map((favorite) =>
        favorite.verseId === verse.id ? { ...favorite, usageCount: favorite.usageCount + 1 } : favorite,
      ),
    }));
  }

  function updateSettings(nextSettings: Partial<UserDataState["settings"]>) {
    setUserData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...nextSettings,
      },
    }));
  }

  function speakAtIndex(index: number, runId = speechRunIdRef.current) {
    if (!("speechSynthesis" in window)) {
      setTtsStatus("미지원");
      setTtsPlaybackState("error");
      return;
    }

    if (runId !== speechRunIdRef.current) {
      return;
    }

    const queue = speechQueueRef.current;
    const verse = queue[index];
    if (!verse) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingVerseId(null);
      setTtsPlaybackState("idle");
      setTtsStatus("완료");
      return;
    }

    speechIndexRef.current = index;
    setSpeakingVerseId(verse.id);
    setSelectedVerseId(verse.id);
    setIsSpeaking(true);
    setIsPaused(false);
    setTtsPlaybackState("playing");
    setTtsStatus(formatReference(verse));
    if (userData.settings.ttsAutoScroll) {
      verseElementsRef.current.get(verse.id)?.scrollIntoView({ block: "center" });
    }

    const displayText = getVerseDisplayText(verse, readingLanguage);
    const utterance = new SpeechSynthesisUtterance(displayText);
    utterance.lang = readingLanguage === "ko" && verse.textKo ? "ko-KR" : "en-US";
    utterance.rate = userData.settings.ttsSpeed;
    const selectedVoice = voices.find((voice) => voice.name === userData.settings.ttsVoice);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (!speechCancelRef.current && runId === speechRunIdRef.current) {
        maybeCompleteChapterFromSpeech(verse, index);
        const nextIndex = index + 1;
        if (nextIndex < speechQueueRef.current.length) {
          speakAtIndex(nextIndex, runId);
        } else if (userData.settings.ttsRepeat) {
          speakAtIndex(0, runId);
        } else {
          speakAtIndex(nextIndex, runId);
        }
      }
    };
    utterance.onerror = () => {
      if (runId !== speechRunIdRef.current) {
        return;
      }
      setIsSpeaking(false);
      setTtsPlaybackState("error");
      setTtsStatus("오류");
    };

    window.speechSynthesis.speak(utterance);
  }

  function playSpeechQueue(verses: Verse[], startIndex = 0, label = "재생 목록", mode: TtsQueueMode = "selection") {
    if (!verses.length) {
      setTtsStatus("본문 없음");
      setTtsPlaybackState("error");
      return;
    }

    if (!("speechSynthesis" in window)) {
      setTtsStatus("미지원");
      setTtsPlaybackState("error");
      return;
    }

    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    speechCancelRef.current = true;
    window.speechSynthesis.cancel();
    speechCancelRef.current = false;
    speechQueueRef.current = verses;
    speechQueueModeRef.current = mode;
    setTtsQueueLabel(`${label} · ${verses.length}개`);
    speakAtIndex(startIndex, runId);
  }

  async function playTodayPlanQueue() {
    if (!readingPlanDay?.chapters.length) {
      setTtsStatus("오늘 분량 없음");
      return;
    }

    try {
      setTtsStatus("오늘 분량 불러오는 중");
      const responses = await Promise.all(
        readingPlanDay.chapters.map((chapter) => fetchBibleChapter(chapter.bookId, chapter.chapter)),
      );
      const verses = responses.flatMap((response) => response.verses);
      rememberVerses(verses);
      playSpeechQueue(verses, 0, "오늘 분량", "today-plan");
    } catch {
      setTtsStatus("오늘 분량 재생 실패");
      setTtsPlaybackState("error");
    }
  }

  function playSelectedVerseQueue() {
    const verses = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [];
    playSpeechQueue(verses, 0, selectedVerses.length ? "선택 구절" : "선택 구절", "selection");
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      speechRunIdRef.current += 1;
      speechCancelRef.current = true;
      window.speechSynthesis.cancel();
      speechCancelRef.current = false;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingVerseId(null);
    speechQueueModeRef.current = "selection";
    setTtsPlaybackState("idle");
    setTtsStatus("정지");
  }

  function pauseSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setTtsPlaybackState("paused");
      setTtsStatus("일시정지");
    }
  }

  function resumeSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setTtsPlaybackState("playing");
      setTtsStatus("재생 중");
    }
  }

  function moveSpeech(direction: -1 | 1) {
    if (!speechQueueRef.current.length) {
      return;
    }

    const nextIndex = Math.min(Math.max(speechIndexRef.current + direction, 0), speechQueueRef.current.length - 1);
    speechRunIdRef.current += 1;
    const runId = speechRunIdRef.current;
    speechCancelRef.current = true;
    window.speechSynthesis.cancel();
    speechCancelRef.current = false;
    speakAtIndex(nextIndex, runId);
  }

  function resetLocalData() {
    stopSpeech();
    clearUserData(user.id);
    setUserData(createInitialUserData(user.id));
    setCurrentBookId("gen");
    setCurrentChapter(1);
    setSelectedVerseId(null);
    clearAutoCompleteTimer();
    setTrackedReadingVerseId(null);
    clearVerseSelection();
    setIsSelectionMode(false);
  }

  function importDemoDataForCurrentUser() {
    if (!importDemoUserData(user.id)) {
      setShowDemoImportPrompt(false);
      setCopyStatus("가져올 로컬 데이터가 없습니다.");
      return;
    }

    const loaded = loadUserData(user.id);
    setUserData(loaded);
    setShowDemoImportPrompt(false);
    if (loaded.progress) {
      setCurrentBookId(loaded.progress.bookId);
      setCurrentChapter(loaded.progress.chapter);
      setTargetVerseNumber(loaded.progress.verse);
    }
    setCopyStatus("기존 로컬 데이터를 가져왔습니다.");
  }

  function dismissDemoImportForCurrentUser() {
    dismissDemoDataImport(user.id);
    setShowDemoImportPrompt(false);
  }

  function getFirstIncompleteChapter(bookId: string) {
    const chapters = getChapters(bookId);
    return chapters.find((chapter) => !completedKeys.has(chapterKey(bookId, chapter))) ?? chapters[0] ?? 1;
  }

  function openFirstIncompleteChapter(bookId: string) {
    openChapter(bookId, getFirstIncompleteChapter(bookId));
  }

  function openMobileHomeTab(tab: MobileHomeTab) {
    setMobileHomeTab(tab);
    setActiveView("dashboard");
  }

  function openCommandPalette() {
    setCommandQuery("");
    setIsCommandPaletteOpen(true);
  }

  function runCommand(action: () => void) {
    action();
    setIsCommandPaletteOpen(false);
    setCommandQuery("");
  }

  function isTypingElement(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }

    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable;
  }

  function renderReferenceItem(
    verse: Verse,
    actionLabel = "열기",
    displayLanguage: TranslationLanguage = readingLanguage,
    searchHighlightQuery = "",
  ) {
    const highlight = highlightsByVerse.get(verse.id);
    const favorite = favoritesByVerse.get(verse.id);
    const displayText = getVerseDisplayText(verse, displayLanguage);
    return (
      <div className="list-row" key={verse.id}>
        <div>
          <div className="row-title">{formatReference(verse)}</div>
          <p>{searchHighlightQuery ? renderSearchHighlightedText(displayText, searchHighlightQuery) : displayText}</p>
          <div className="row-meta">
            {highlight ? <span className={`chip chip-${highlight.color}`}>강조</span> : null}
            {favorite ? <span className="chip chip-ink">인용</span> : null}
            {displayLanguage === "ko" && !verse.textKo ? <span className="chip chip-ink">EN fallback</span> : null}
          </div>
        </div>
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => copyVerse(verse, displayLanguage)} aria-label="구절 복사">
            <Copy size={16} />
          </button>
          <button className="small-button" type="button" onClick={() => openChapter(verse.bookId, verse.chapter, verse.verse)}>
            {actionLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div className="loading-screen">Loading...</div>;
  }

  const selectedHighlight = selectedVerse ? highlightsByVerse.get(selectedVerse.id) : null;
  const selectedFavorite = selectedVerse ? favoritesByVerse.get(selectedVerse.id) : null;
  const selectedVerseHebrewItems = selectedVerse ? hebrewOccurrencesByVerse.get(getVerseKey(selectedVerse)) ?? [] : [];
  const shouldShowTtsOverlay = ttsPlaybackState === "playing" || ttsPlaybackState === "paused";
  const pendingDeleteFavoriteList = pendingDeleteFavoriteListId
    ? userData.favoriteLists.find((list) => list.id === pendingDeleteFavoriteListId) ?? null
    : null;
  const isCurrentChapterCompleted = completedKeys.has(chapterKey(currentBookId, currentChapter));
  const overallPercent = percent(userData.completedChapters.length, totalChapters);
  const oldPercent = percent(completedOld, oldChapterTotal);
  const newPercent = percent(completedNew, newChapterTotal);
  const noteTargetTitle = noteTarget
    ? noteTarget.scope === "verse"
      ? `${getChapterLabel(noteTarget.bookId, noteTarget.chapter)} ${noteTarget.verse}절 노트`
      : `${getChapterLabel(noteTarget.bookId, noteTarget.chapter)} 노트`
    : "";
  const searchDisplayLanguage: TranslationLanguage = searchLanguage === "en" ? "en" : "ko";
  const readerTranslationMode: ReaderTranslationMode = showParallelTranslation ? "parallel" : readingLanguage;
  const readerChapterSubtitle = `${currentBook.nameEn} · ${
    chapterStatus === "loading"
      ? "본문 불러오는 중"
      : chapterStatus === "error"
        ? "본문 오류"
        : `${chapterVerses.length} ${chapterLanguageLabel} 구절 · ${formatSource(chapterSource)}`
  }${(readingLanguage === "ko" || showParallelTranslation) && !currentChapterHasKorean ? " · 한국어 본문 없음" : ""}`;
  const readerCurrentLocation = `${
    currentReadingVerse ? `현재 위치 ${formatReference(currentReadingVerse)}` : "현재 위치 자동 추적 대기"
  }${isCurrentPlanChapter ? " · 오늘 분량" : ""}`;
  const commandItems = [
    {
      label: "이어 읽기",
      description: userData.progress ? getChapterLabel(userData.progress.bookId, userData.progress.chapter) : "창세기 1장",
      action: () =>
        userData.progress
          ? openChapter(userData.progress.bookId, userData.progress.chapter, userData.progress.verse)
          : openChapter("gen", 1),
    },
    {
      label: "오늘 통독 분량 열기",
      description: readingPlanDay ? formatPlanChapters(readingPlanDay.chapters) : "통독 플랜 없음",
      action: openTodayReading,
      disabled: !readingPlanDay,
    },
    { label: "홈 · 오늘", description: "이어 읽기와 오늘 분량", action: () => openMobileHomeTab("today") },
    { label: "홈 · 통독", description: "통독률과 권별 진행", action: () => openMobileHomeTab("progress") },
    { label: "홈 · 활동", description: "최근 읽기와 작업", action: () => openMobileHomeTab("activity") },
    { label: "홈 · 공부", description: "노트, 태그, 인용 요약", action: () => openMobileHomeTab("study") },
    { label: "성경 리더", description: "본문 읽기", action: () => setActiveView("reader") },
    { label: "장 선택", description: getChapterLabel(currentBookId, currentChapter), action: openChapterPicker },
    { label: "통독 진척도", description: "권별 진행률", action: () => setActiveView("progress") },
    { label: "강조 구절", description: "색상별 표시", action: () => setActiveView("highlights") },
    { label: "인용 보관함", description: "목록과 복사", action: () => setActiveView("favorites") },
    { label: "성경노트", description: "개별 노트와 구절 연결", action: () => setActiveView("notes") },
    { label: "히브리어 사전", description: "구약 원어 단어 검색", action: () => setActiveView("dictionary") },
    { label: "검색", description: "KJV 본문 검색", action: () => setActiveView("search") },
    { label: "설정", description: "읽기와 TTS", action: () => setActiveView("settings") },
    { label: "현재 장 노트", description: getChapterLabel(currentBookId, currentChapter), action: () => openNoteModal({ scope: "chapter", bookId: currentBookId, chapter: currentChapter }) },
  ].filter((command) => {
    const query = commandQuery.trim().toLocaleLowerCase("ko-KR");
    if (!query) {
      return true;
    }

    return `${command.label} ${command.description}`.toLocaleLowerCase("ko-KR").includes(query);
  });

  function renderReaderActions(position: "top" | "bottom") {
    return (
      <div className={`reader-actions reader-actions-${position}`}>
        <button
          className={isCurrentChapterCompleted ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => toggleCompleted()}
        >
          <CheckCircle2 size={16} />
          {isCurrentChapterCompleted ? "읽음 취소" : "읽음 완료"}
        </button>
        <div className="translation-segment" role="group" aria-label="액션 기준 언어">
          <button
            className={readingLanguage === "en" ? "translation-segment-button active" : "translation-segment-button"}
            type="button"
            onClick={() => updateSettings({ defaultTranslation: "en" })}
            aria-pressed={readingLanguage === "en"}
          >
            EN
          </button>
          <span className="translation-segment-divider" aria-hidden="true">
            |
          </span>
          <button
            className={readingLanguage === "ko" ? "translation-segment-button active" : "translation-segment-button"}
            type="button"
            onClick={() => updateSettings({ defaultTranslation: "ko" })}
            aria-pressed={readingLanguage === "ko"}
          >
            KR
          </button>
        </div>
        <button
          className={showParallelTranslation ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => updateSettings({ showParallelTranslation: !showParallelTranslation })}
          aria-pressed={showParallelTranslation}
        >
          동시보기
        </button>
        <button className="status-button" type="button" onClick={() => playSpeechQueue(chapterVerses, 0, "현재 장", "chapter")}>
          <Volume2 size={16} />
          읽기
        </button>
        <button
          className={isSelectionMode ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => setSelectionMode(!isSelectionMode)}
        >
          <ListChecks size={16} />
          {isSelectionMode ? `${selectedVerses.length}개 선택` : "다중 선택"}
        </button>
        <button
          className={currentChapterNote ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => openNoteModal({ scope: "chapter", bookId: currentBookId, chapter: currentChapter })}
        >
          <StickyNote size={16} />
          장 노트
        </button>
        {readingPlanDay ? (
          <button
            className={isCurrentPlanChapter ? "status-button complete" : "status-button"}
            type="button"
            onClick={openTodayReading}
          >
            <CalendarDays size={16} />
            오늘 분량
          </button>
        ) : null}
        {readingPlanDay ? (
          <button className="status-button" type="button" onClick={playTodayPlanQueue}>
            <Volume2 size={16} />
            오늘 읽기
          </button>
        ) : null}
      </div>
    );
  }

  function renderChapterPagination() {
    return (
      <nav className="reader-toolbar reader-toolbar-bottom" aria-label="하단 장 넘기기">
        <button className="icon-button" type="button" onClick={() => moveChapter(-1)} aria-label="이전 장">
          <SkipBack size={18} />
        </button>
        <button className="chapter-title-button" type="button" onClick={openChapterPicker} aria-label="장 선택 열기">
          <h2>
            {currentBook.nameKo} {currentChapter}장
          </h2>
          <p>
            {currentBook.nameEn} ·{" "}
            {chapterStatus === "loading"
              ? "본문 불러오는 중"
              : chapterStatus === "error"
                ? "본문 오류"
                : `${chapterVerses.length} ${chapterLanguageLabel} 구절 · ${formatSource(chapterSource)}`}
            {(readingLanguage === "ko" || showParallelTranslation) && !currentChapterHasKorean ? " · 한국어 본문 없음" : ""}
          </p>
          <p className="current-verse-line">
            {currentReadingVerse ? `현재 위치 ${formatReference(currentReadingVerse)}` : "현재 위치 자동 추적 대기"}
            {isCurrentPlanChapter ? " · 오늘 분량" : ""}
          </p>
        </button>
        <button className="icon-button" type="button" onClick={() => moveChapter(1)} aria-label="다음 장">
          <SkipForward size={18} />
        </button>
      </nav>
    );
  }

  return (
    <div className={`app-root theme-${userData.settings.theme}${shouldShowTtsOverlay ? " tts-overlay-open" : ""}${navigationMode === "shell" ? " shell-navigation" : ""}`}>
      {navigationMode === "legacy" ? <header className="app-header">
        <div>
          <div className="eyebrow">CrossWire KJV 기반</div>
          <h1>{APP_NAME}</h1>
        </div>
        <div className="header-actions">
          <div className="user-identity">
            <UserAvatar user={user} />
            <span className="mock-user">{user.displayName}</span>
          </div>
          <button className="icon-button header-utility-action" type="button" onClick={openCommandPalette} aria-label="명령 팔레트">
            <Command size={16} />
          </button>
          <button className="icon-button header-utility-action" type="button" onClick={() => setIsShortcutHelpOpen(true)} aria-label="단축키">
            <Keyboard size={16} />
          </button>
          {isAuthenticated ? (
            <button className="icon-text-button" type="button" onClick={logout}>
              <LogOut size={16} />
              로그아웃
            </button>
          ) : (
            <button className="icon-text-button" type="button" onClick={logout}>
              <LogIn size={16} />
              로그인
            </button>
          )}
        </div>
      </header> : null}

      {navigationMode === "legacy" ? <nav className="tabbar" aria-label="주요 화면">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={activeView === tab.key ? "tab active" : "tab"}
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav> : null}

      {showDemoImportPrompt ? (
        <section className="import-banner" aria-label="기존 로컬 데이터 가져오기">
          <div>
            <strong>기존 로컬 데이터가 있습니다.</strong>
            <p>이 계정으로 가져올 때만 현재 사용자 저장소에 복사됩니다.</p>
          </div>
          <div className="row-actions">
            <button className="secondary-button" type="button" onClick={dismissDemoImportForCurrentUser}>
              건너뛰기
            </button>
            <button className="primary-button modal-primary" type="button" onClick={importDemoDataForCurrentUser}>
              가져오기
            </button>
          </div>
        </section>
      ) : null}

      <main className="app-main">
        {activeView === "dashboard" ? (
          <section className="dashboard-shell" data-mobile-home-tab={mobileHomeTab}>
            <div className="mobile-home-tabs" aria-label="홈 세부 탭">
              {mobileHomeTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    className={mobileHomeTab === tab.key ? "mobile-home-tab active" : "mobile-home-tab"}
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      if (tab.key === "community") {
                        setActiveView("community");
                        return;
                      }
                      setMobileHomeTab(tab.key);
                    }}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="dashboard-grid">
            <ContinueReadingPanel
              className="home-section home-section-today"
              ctaLabel="이어 읽기"
              onOpen={() =>
                userData.progress
                  ? openChapter(userData.progress.bookId, userData.progress.chapter, userData.progress.verse)
                  : openChapter("gen", 1)
              }
              subtitle={
                userData.progress
                  ? `${userData.progress.verse}절 근처 · ${formatDate(userData.progress.lastReadAt)}`
                  : "CrossWire KJV 본문으로 첫 통독을 시작합니다."
              }
              title={userData.progress ? getChapterLabel(userData.progress.bookId, userData.progress.chapter) : "창세기 1장"}
            />

            <section className="panel reading-plan-panel home-section home-section-today">
              <div className="panel-heading">
                <span>오늘 통독 플랜</span>
                <CalendarDays size={18} />
              </div>
              {userData.activeReadingPlan && readingPlanDay ? (
                <>
                  <div className="plan-status-row">
                    <div>
                      <strong>{userData.activeReadingPlan.name}</strong>
                      <small>
                        {readingPlanDay.dayNumber}/{readingPlanDay.totalDays}일차
                      </small>
                    </div>
                    <span className="chip chip-ink">
                      {readingPlanDayCompleted}/{readingPlanDay.chapters.length}장
                    </span>
                  </div>
                  <p className="plan-range">{formatPlanChapters(readingPlanDay.chapters)}</p>
                  <div className="progress-track" aria-label="오늘 통독 완료율">
                    <div style={{ width: `${readingPlanDayPercent}%` }} />
                  </div>
                  <div className="plan-actions">
                    <button className="secondary-button" type="button" onClick={openTodayReading}>
                      <BookOpen size={16} />
                      오늘 분량 열기
                    </button>
                    <button className="secondary-button" type="button" onClick={completeTodayReading}>
                      <ListChecks size={16} />
                      오늘 완료
                    </button>
                    <button className="small-button" type="button" onClick={restartReadingPlan}>
                      다시 시작
                    </button>
                    <button className="small-button danger" type="button" onClick={clearReadingPlan}>
                      제거
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-text">목표 기간을 선택하면 오늘 읽을 장을 자동으로 계산합니다.</p>
                  <div className="plan-option-grid">
                    {readingPlanOptions.map((option) => (
                      <button
                        className="plan-option-button"
                        key={option.template}
                        type="button"
                        onClick={() => createReadingPlan(option.template)}
                      >
                        <strong>{option.name}</strong>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <ProgressMetricPanel
              className="home-section home-section-progress"
              label="전체 통독률"
              percent={overallPercent}
              value={`${overallPercent}%`}
            />
            <ProgressMetricPanel
              className="home-section home-section-progress"
              detail={`총 ${userData.completedChapters.length} / ${totalChapters}장`}
              label="오늘 읽은 장"
              value={`${completedToday}`}
            />
            <ProgressMetricPanel
              className="home-section home-section-progress"
              detail={`${completedOld}/${oldChapterTotal} · ${completedNew}/${newChapterTotal}`}
              label="구약 / 신약"
              value={`${oldPercent}% · ${newPercent}%`}
            />

            <section className="panel home-section home-section-progress">
              <div className="panel-heading">
                <span>최근 읽은 장</span>
                <BarChart3 size={18} />
              </div>
              <div className="compact-list">
                {userData.recentReads.length ? (
                  userData.recentReads.map((read) => (
                    <button
                      className="plain-list-button"
                      key={`${read.bookId}-${read.chapter}-${read.lastReadAt}`}
                      type="button"
                      onClick={() => openChapter(read.bookId, read.chapter, read.verse)}
                    >
                      <span>{getChapterLabel(read.bookId, read.chapter)}</span>
                      <small>
                        {read.verse}절 · {formatDate(read.lastReadAt)}
                      </small>
                    </button>
                  ))
                ) : (
                  <p className="empty-text">아직 읽기 기록이 없습니다.</p>
                )}
              </div>
            </section>

            <section className="panel home-section home-section-activity">
              <div className="panel-heading">
                <span>최근 활동</span>
                <Layers size={18} />
              </div>
              <div className="compact-list">
                {recentActivities.length ? (
                  recentActivities.slice(0, 5).map((activity) => (
                    <button
                      className="plain-list-button"
                      key={activity.id}
                      type="button"
                      onClick={() => openChapter(activity.bookId, activity.chapter, activity.verse)}
                    >
                      <span>{activity.type} · {activity.label}</span>
                      <small>{formatDate(activity.at)}</small>
                    </button>
                  ))
                ) : (
                  <p className="empty-text">아직 활동 기록이 없습니다.</p>
                )}
              </div>
            </section>

            <section className="panel home-section home-section-study">
              <div className="panel-heading">
                <span>최근 강조</span>
                <Highlighter size={18} />
              </div>
              <div className="compact-list">
                {userData.highlights.slice(-4).reverse().map((highlight) => {
                  const verse = resolveVerseById(highlight.verseId);
                  return verse ? renderReferenceItem(verse) : null;
                })}
                {!userData.highlights.length ? <p className="empty-text">강조한 구절이 없습니다.</p> : null}
              </div>
            </section>

            <section className="panel home-section home-section-study">
              <div className="panel-heading">
                <span>최근 인용 구절</span>
                <Bookmark size={18} />
              </div>
              <div className="compact-list">
                {userData.favoriteVerses.slice(0, 4).map((favorite) => {
                  const verse = resolveVerseById(favorite.verseId);
                  return verse ? renderReferenceItem(verse) : null;
                })}
                {!userData.favoriteVerses.length ? <p className="empty-text">저장한 인용 구절이 없습니다.</p> : null}
              </div>
            </section>

            <section className="panel home-section home-section-study">
              <div className="panel-heading">
                <span>노트와 태그</span>
                <StickyNote size={18} />
              </div>
              <div className="compact-list">
                {userData.studyNotes.slice(0, 4).map((note) => (
                  <button
                    className="plain-list-button"
                    key={note.id}
                    type="button"
                    onClick={() =>
                      openNoteModal(
                        note.scope === "verse" && note.verseId
                          ? {
                              scope: "verse",
                              bookId: note.bookId,
                              chapter: note.chapter,
                              verse: note.verse ?? 1,
                              verseId: note.verseId,
                            }
                          : { scope: "chapter", bookId: note.bookId, chapter: note.chapter },
                      )
                    }
                  >
                    <span>
                      {note.scope === "verse" && note.verse
                        ? `${getChapterLabel(note.bookId, note.chapter)} ${note.verse}절`
                        : getChapterLabel(note.bookId, note.chapter)}
                    </span>
                    <small>{formatDate(note.updatedAt)}</small>
                  </button>
                ))}
                {!userData.studyNotes.length ? <p className="empty-text">저장한 노트가 없습니다.</p> : null}
                {userData.tags.length ? (
                  <div className="tag-strip">
                    {userData.tags.map((tag) => (
                      <span className="tag-chip" key={tag.id}><Tags size={13} />{tag.name}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
            </div>
          </section>
        ) : null}

        {activeView === "community" ? (
          <CommunityHomePanel
            currentReference={
              currentReadingVerse
                ? { reference: formatReference(currentReadingVerse), verseKey: currentReadingVerse.verseKey ?? currentReadingVerse.id }
                : userData.progress
                  ? {
                      reference: `${getChapterLabel(userData.progress.bookId, userData.progress.chapter)} ${userData.progress.verse}절`,
                      verseKey: `${userData.progress.bookId.toUpperCase()}.${userData.progress.chapter}.${userData.progress.verse}`,
                    }
                  : null
            }
            initialTab={communityRoute?.tab}
            onLogin={() => router.push("/auth/login?next=%2Fapp%2Fcommunity")}
            onOpenReader={() => {
              if (userData.progress) openChapter(userData.progress.bookId, userData.progress.chapter, userData.progress.verse);
              else setActiveView("reader");
            }}
            user={user}
          />
        ) : null}

        {activeView === "reader" ? (
          <section
            className={isReaderV2 ? "reader-layout f-reader-screen" : "reader-layout"}
            data-context-open={isReaderContextOpen}
            data-focus-mode={isReaderFocusMode}
            data-navigator-open={isReaderNavigatorOpen}
          >
            <aside className={isReaderV2 ? "selector-panel f-reader-screen__navigator" : "selector-panel"}>
              <label>
                성경 권
                <select value={currentBookId} onChange={(event) => openChapter(event.target.value, 1)}>
                  <optgroup label="구약">
                    {oldBooks.map((book) => (
                      <option key={book.id} value={book.id}>{book.nameKo}</option>
                    ))}
                  </optgroup>
                  <optgroup label="신약">
                    {newBooks.map((book) => (
                      <option key={book.id} value={book.id}>{book.nameKo}</option>
                    ))}
                  </optgroup>
                </select>
              </label>

              {isReaderV2 && currentBookChapters.length > chapterNavigatorChapters.length ? (
                <div className="f-reader-navigator__summary">
                  <span>{chapterNavigatorChapters[0]}-{chapterNavigatorChapters[chapterNavigatorChapters.length - 1]}장</span>
                  <button type="button" onClick={openChapterPicker}>전체 {currentBookChapters.length}장</button>
                </div>
              ) : null}

              <div className="chapter-grid" aria-label="장 선택">
                {chapterNavigatorChapters.map((chapter) => (
                  <button
                    className={chapter === currentChapter ? "chapter-button active" : "chapter-button"}
                    key={chapter}
                    type="button"
                    onClick={() => openChapter(currentBook.id, chapter)}
                  >
                    <span>{chapter}</span>
                    {completedKeys.has(chapterKey(currentBook.id, chapter)) ? <CheckCircle2 size={12} /> : null}
                  </button>
                ))}
              </div>
            </aside>

            <section className={isReaderV2 ? "reader-panel f-reader-screen__scripture" : "reader-panel"}>
              {isReaderV2 ? (
                <ReaderHeader
                  contextOpen={isReaderContextOpen}
                  currentLocation={readerCurrentLocation}
                  focusMode={isReaderFocusMode}
                  hasSelectedVerse={Boolean(selectedVerse)}
                  navigatorOpen={isReaderNavigatorOpen}
                  onNextChapter={() => moveChapter(1)}
                  onOpenChapterPicker={openChapterPicker}
                  onPlayChapter={() => playSpeechQueue(chapterVerses, 0, "현재 장", "chapter")}
                  onPreviousChapter={() => moveChapter(-1)}
                  onSetTranslationMode={(mode) => {
                    if (mode === "parallel") {
                      updateSettings({ showParallelTranslation: true });
                      return;
                    }
                    updateSettings({ defaultTranslation: mode, showParallelTranslation: false });
                  }}
                  onToggleContext={() => setIsReaderContextOpen((current) => !current)}
                  onToggleFocusMode={() => setIsReaderFocusMode((current) => !current)}
                  onToggleNavigator={() => setIsReaderNavigatorOpen((current) => !current)}
                  overflowActions={(
                    <>
                      <button className="f-reader-header__menu-item" type="button" onClick={() => toggleCompleted()}>
                        <CheckCircle2 size={16} />
                        {isCurrentChapterCompleted ? "읽음 취소" : "읽음 완료"}
                      </button>
                      <button className="f-reader-header__menu-item" type="button" onClick={() => setSelectionMode(!isSelectionMode)}>
                        <ListChecks size={16} />
                        {isSelectionMode ? `${selectedVerses.length}개 선택` : "다중 선택"}
                      </button>
                      <button
                        className="f-reader-header__menu-item"
                        type="button"
                        onClick={() => openNoteModal({ scope: "chapter", bookId: currentBookId, chapter: currentChapter })}
                      >
                        <StickyNote size={16} />
                        장 노트
                      </button>
                      {readingPlanDay ? (
                        <button className="f-reader-header__menu-item" type="button" onClick={openTodayReading}>
                          <CalendarDays size={16} />
                          오늘 분량
                        </button>
                      ) : null}
                    </>
                  )}
                  subtitle={readerChapterSubtitle}
                  title={`${currentBook.nameKo} ${currentChapter}장`}
                  translationMode={readerTranslationMode}
                />
              ) : (
                <div className="reader-toolbar">
                <button className="icon-button" type="button" onClick={() => moveChapter(-1)} aria-label="이전 장">
                  <SkipBack size={18} />
                </button>
                <button className="chapter-title-button" type="button" onClick={openChapterPicker} aria-label="장 선택 열기">
                  <h2>
                    {currentBook.nameKo} {currentChapter}장
                  </h2>
                  <p>
                    {currentBook.nameEn} ·{" "}
                    {chapterStatus === "loading"
                      ? "본문 불러오는 중"
                      : chapterStatus === "error"
                        ? "본문 오류"
                        : `${chapterVerses.length} ${chapterLanguageLabel} 구절 · ${formatSource(chapterSource)}`}
                    {(readingLanguage === "ko" || showParallelTranslation) && !currentChapterHasKorean ? " · 한국어 본문 없음" : ""}
                  </p>
                  <p className="current-verse-line">
                    {currentReadingVerse ? `현재 위치 ${formatReference(currentReadingVerse)}` : "현재 위치 자동 추적 대기"}
                    {isCurrentPlanChapter ? " · 오늘 분량" : ""}
                  </p>
                </button>
                <button className="icon-button" type="button" onClick={() => moveChapter(1)} aria-label="다음 장">
                  <SkipForward size={18} />
                </button>
                </div>
              )}

              {!isReaderV2 ? renderReaderActions("top") : null}

              <article
                aria-label="성경 본문"
                className={`verse-list reader-swipe-zone mode-${userData.settings.readingMode}`}
                onPointerCancel={handleVerseListPointerCancel}
                onPointerDown={handleVerseListPointerDown}
                onPointerUp={handleVerseListPointerUp}
                style={{
                  fontSize: `${userData.settings.fontSize}px`,
                  lineHeight: userData.settings.lineHeight,
                }}
              >
                {chapterVerses.length ? (
                  chapterVerses.map((verse) => {
                    const highlight = highlightsByVerse.get(verse.id);
                    const favorite = favoritesByVerse.get(verse.id);
                    const note = verseNotesByVerse.get(verse.id);
                    const hebrewItems = hebrewOccurrencesByVerse.get(getVerseKey(verse)) ?? [];
                    const verseTags = userData.verseTags.filter((tag) => tag.verseKey === getVerseKey(verse));
                    return (
                      <ReaderVerseRow
                        batchSelected={selectedVerseIdSet.has(verse.id)}
                        currentReading={currentReadingVerseId === verse.id}
                        displayText={getVerseDisplayText(verse, readingLanguage)}
                        englishText={getVerseDisplayText(verse, "en")}
                        hasNote={Boolean(note)}
                        highlightColor={highlight?.color}
                        isFavorite={Boolean(favorite)}
                        isSelectionMode={isSelectionMode}
                        key={verse.id}
                        koreanText={verse.textKo}
                        onSelect={() => handleVerseClick(verse)}
                        originalWords={hebrewItems.map(({ occurrence, entry }) => ({
                          glossEn: entry.glossEn,
                          glossKo: entry.glossKo,
                          id: occurrence.id,
                          lemmaHe: entry.lemmaHe,
                          pronunciationKo: entry.pronunciationKo,
                          transliteration: entry.transliteration,
                        }))}
                        parallel={showParallelTranslation}
                        selected={selectedVerseId === verse.id}
                        setElement={(element) => setVerseElement(verse.id, element)}
                        speaking={speakingVerseId === verse.id}
                        tags={verseTags.flatMap((tag) => {
                          const tagItem = userData.tags.find((item) => item.id === tag.tagId);
                          return tagItem ? [{ id: tag.id, name: tagItem.name }] : [];
                        })}
                        verse={verse}
                      />
                    );
                  })
                ) : (
                  <div className="empty-chapter">
                    <strong>
                      {currentBook.nameKo} {currentChapter}장
                    </strong>
                    <span>
                      {chapterStatus === "loading"
                        ? "CrossWire KJV 본문을 불러오는 중입니다."
                        : chapterStatus === "error"
                          ? chapterError
                          : "이 장의 본문이 없습니다."}
                    </span>
                  </div>
                )}
              </article>

              {!isReaderV2 ? renderReaderActions("bottom") : null}

              {!isReaderV2 && selectedVerse ? (
                <section className="action-panel">
                  <div className="selected-reference">
                    <strong>{formatReference(selectedVerse)}</strong>
                    <span>{getVerseDisplaySource(selectedVerse, readingLanguage)}</span>
                  </div>
                  <div className="quick-actions">
                    <div className="highlight-action-group" aria-label="강조 선택">
                      {highlightOptions.map((option) => (
                        <button
                          className={`swatch-button swatch-${option.color}`}
                          key={option.color}
                          type="button"
                          onClick={() => applyHighlight(option.color)}
                          aria-label={`${option.label} 강조`}
                        >
                          {selectedHighlight?.color === option.color ? <CheckCircle2 size={14} /> : null}
                        </button>
                      ))}
                      <button className="icon-button" type="button" onClick={() => removeHighlight(selectedVerse.id)} aria-label="강조 해제">
                        <RotateCcw size={16} />
                      </button>
                    </div>
                    <button className="icon-button" type="button" onClick={() => copyVerse(selectedVerse)} aria-label="구절 복사">
                      <Copy size={16} />
                    </button>
                    <button className="icon-button" type="button" onClick={() => playSpeechQueue([selectedVerse], 0, "선택 구절", "selection")} aria-label="선택 구절 읽기">
                      <Volume2 size={16} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={addSelectedVerseToNewPersonalNote}
                      aria-label="새 성경노트"
                    >
                      <StickyNote size={16} />
                    </button>
                    <button className="icon-button" type="button" onClick={tagSelectedVerse} aria-label="구절 태그">
                      <Tags size={16} />
                    </button>
                    <button
                      className="small-button"
                      type="button"
                      onClick={() =>
                        openNoteModal({
                          scope: "verse",
                          bookId: selectedVerse.bookId,
                          chapter: selectedVerse.chapter,
                          verse: selectedVerse.verse,
                          verseId: selectedVerse.id,
                        })
                      }
                    >
                      절 노트
                    </button>
                    <button
                      className="icon-button"
                      disabled={!selectedVerse.textKo}
                      type="button"
                      onClick={openFeedbackModal}
                      aria-label="번역 의견"
                      title={
                        !selectedVerse.textKo
                          ? "승인된 한국어 번역이 없습니다."
                          : isAuthenticated
                            ? "번역 의견"
                            : "로그인 후 번역 의견을 보낼 수 있습니다."
                      }
                    >
                      <Flag size={16} />
                    </button>
                  </div>
                  <textarea
                    className="highlight-note-input"
                    value={highlightNote}
                    onChange={(event) => setHighlightNote(event.target.value)}
                    placeholder="강조 메모"
                    rows={2}
                  />
                  <button className="secondary-button" type="button" onClick={openFavoriteModal}>
                    <Bookmark size={16} />
                    {selectedFavorite ? "인용 구절 수정" : "인용 구절 저장"}
                  </button>
                  {selectedVerseNoteReferences.length ? (
                    <div className="verse-note-backlinks">
                      <strong>이 구절이 포함된 내 노트</strong>
                      {selectedVerseNoteReferences.map((note) => (
                        <button key={note.id} onClick={() => { setSelectedPersonalNoteId(note.id); setActiveView("notes"); }} type="button">
                          <span>{note.title}</span>
                          <small>{note.excerpt || "본문 없음"}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isSelectionMode ? (
                <section
                  className={`selection-action-sheet ${selectedVerses.length ? "has-selection" : "is-empty"}`}
                  aria-label="선택 구절 작업"
                >
                  <div>
                    <strong>{selectedVerses.length}개 선택</strong>
                    <span>{selectionAnchorVerseId ? "다음 절을 누르면 범위가 선택됩니다." : "첫 절을 선택하세요."}</span>
                  </div>
                  {selectedVerses.length ? (
                    <>
                      <div className="selection-actions">
                        <button className="secondary-button" type="button" onClick={copySelectedVerses}>
                          <Copy size={16} />
                          복사
                        </button>
                        <button className="secondary-button" type="button" onClick={openSelectedFavoriteModal}>
                          <Bookmark size={16} />
                          인용 저장
                        </button>
                        <button className="secondary-button" type="button" onClick={addSelectedVerseToNewPersonalNote}>
                          <StickyNote size={16} />
                          새 노트
                        </button>
                        <button className="secondary-button" type="button" onClick={playSelectedVerseQueue}>
                          <Volume2 size={16} />
                          읽기
                        </button>
                        <button className="small-button" type="button" onClick={clearVerseSelection}>
                          선택 해제
                        </button>
                      </div>
                      <div className="quick-actions selection-highlight-actions">
                        {highlightOptions.map((option) => (
                          <button
                            className={`swatch-button swatch-${option.color}`}
                            key={option.color}
                            type="button"
                            onClick={() => applyHighlightToSelected(option.color)}
                            aria-label={`선택 구절 ${option.label} 강조`}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <button className="secondary-button" type="button" onClick={clearVerseSelection}>
                      선택 모드 종료
                    </button>
                  )}
                </section>
              ) : null}

              {renderChapterPagination()}
            </section>
            {isReaderV2 && isReaderContextOpen ? (
              <ReaderVerseActions
                activeTab={readerContextTab}
                hasOriginalWords={Boolean(selectedVerseHebrewItems.length)}
                onClose={() => setIsReaderContextOpen(false)}
                onTabChange={setReaderContextTab}
                panels={{
                  note: selectedVerse ? (
                    <>
                      <div className="f-reader-context__actions">
                        <button className="secondary-button" type="button" onClick={addSelectedVerseToNewPersonalNote}>
                          <StickyNote size={16} />
                          새 성경노트
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openNoteModal({
                            scope: "verse",
                            bookId: selectedVerse.bookId,
                            chapter: selectedVerse.chapter,
                            verse: selectedVerse.verse,
                            verseId: selectedVerse.id,
                          })}
                        >
                          <StickyNote size={16} />
                          절 노트
                        </button>
                        <button className="secondary-button" type="button" onClick={tagSelectedVerse}>
                          <Tags size={16} />
                          구절 태그
                        </button>
                      </div>
                      <p className="f-reader-context__empty">선택한 구절을 새 노트에 연결하거나 짧은 절 노트를 기록합니다.</p>
                    </>
                  ) : null,
                  original: selectedVerse ? (
                    <div className="f-reader-context__word-list">
                      {selectedVerseHebrewItems.map(({ occurrence, entry }) => (
                        <button
                          className="f-reader-context__word"
                          key={occurrence.id}
                          onClick={() => {
                            setDictionaryQuery(entry.lemmaHe);
                            setSelectedHebrewEntryKey(entry.normalizedKey);
                            setActiveView("dictionary");
                          }}
                          type="button"
                        >
                          <strong dir="rtl">{entry.lemmaHe}</strong>
                          <span>{entry.transliteration} · {entry.pronunciationSymbol} · {entry.pronunciationKo}</span>
                          <small>{entry.glossKo} · {entry.glossEn}</small>
                        </button>
                      ))}
                    </div>
                  ) : null,
                  links: selectedVerse ? (
                    <>
                      {selectedVerseNoteReferences.length ? (
                        <div className="verse-note-backlinks">
                          <strong>이 구절이 포함된 내 노트</strong>
                          {selectedVerseNoteReferences.map((note) => (
                            <button key={note.id} onClick={() => { setSelectedPersonalNoteId(note.id); setActiveView("notes"); }} type="button">
                              <span>{note.title}</span>
                              <small>{note.excerpt || "본문 없음"}</small>
                            </button>
                          ))}
                        </div>
                      ) : <p className="f-reader-context__empty">이 구절과 연결된 노트가 없습니다.</p>}
                      <button
                        className="secondary-button"
                        disabled={!selectedVerse.textKo}
                        onClick={openFeedbackModal}
                        title={!selectedVerse.textKo ? "승인된 한국어 번역이 없습니다." : "번역 의견"}
                        type="button"
                      >
                        <Flag size={16} />
                        번역 의견
                      </button>
                    </>
                  ) : null,
                  saved: selectedVerse ? (
                    <>
                      <div className="highlight-action-group" aria-label="강조 선택">
                        {highlightOptions.map((option) => (
                          <button
                            aria-label={`${option.label} 강조`}
                            className={`swatch-button swatch-${option.color}`}
                            key={option.color}
                            onClick={() => applyHighlight(option.color)}
                            type="button"
                          >
                            {selectedHighlight?.color === option.color ? <CheckCircle2 size={14} /> : null}
                          </button>
                        ))}
                        <button className="icon-button" type="button" onClick={() => removeHighlight(selectedVerse.id)} aria-label="강조 해제">
                          <RotateCcw size={16} />
                        </button>
                      </div>
                      <div className="f-reader-context__actions">
                        <button className="secondary-button" type="button" onClick={() => copyVerse(selectedVerse)}>
                          <Copy size={16} />
                          복사
                        </button>
                        <button className="secondary-button" type="button" onClick={() => playSpeechQueue([selectedVerse], 0, "선택 구절", "selection")}>
                          <Volume2 size={16} />
                          읽기
                        </button>
                      </div>
                      <textarea
                        className="highlight-note-input"
                        value={highlightNote}
                        onChange={(event) => setHighlightNote(event.target.value)}
                        placeholder="강조 메모"
                        rows={2}
                      />
                      <button className="secondary-button" type="button" onClick={openFavoriteModal}>
                        <Bookmark size={16} />
                        {selectedFavorite ? "저장한 말씀 수정" : "저장한 말씀 추가"}
                      </button>
                    </>
                  ) : null,
                }}
                reference={selectedVerse ? formatReference(selectedVerse) : undefined}
                source={selectedVerse ? getVerseDisplaySource(selectedVerse, readingLanguage) : undefined}
              />
            ) : null}
          </section>
        ) : null}

        {activeView === "progress" ? (
          <section className="panel wide-panel">
            <div className="panel-heading">
              <span>통독 진척도</span>
              <strong>{overallPercent}%</strong>
            </div>
            <div className="progress-summary">
              <div><span>전체</span><strong>{userData.completedChapters.length}/{totalChapters}</strong></div>
              <div><span>구약</span><strong>{completedOld}/{oldChapterTotal}</strong></div>
              <div><span>신약</span><strong>{completedNew}/{newChapterTotal}</strong></div>
              <div><span>오늘</span><strong>{completedToday}</strong></div>
            </div>
            <div className="book-progress-list">
              {books.map((book) => {
                const completed = userData.completedChapters.filter((chapter) => chapter.bookId === book.id).length;
                const bookPercent = percent(completed, book.chapterCount);
                return (
                  <button className="book-progress-row" key={book.id} type="button" onClick={() => openFirstIncompleteChapter(book.id)}>
                    <span>{book.nameKo}</span>
                    <div className="mini-track"><div style={{ width: `${bookPercent}%` }} /></div>
                    <strong>{bookPercent}%</strong>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeView === "highlights" ? (
          <section className="panel wide-panel">
            <div className="panel-heading">
              <span>강조 구절</span>
              <Highlighter size={18} />
            </div>
            <div className="filter-row">
              <label>
                색상
                <select value={highlightColorFilter} onChange={(event) => setHighlightColorFilter(event.target.value as "all" | HighlightColor)}>
                  <option value="all">전체 색상</option>
                  {highlightOptions.map((option) => (
                    <option key={option.color} value={option.color}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                성경 권
                <select value={highlightBookFilter} onChange={(event) => setHighlightBookFilter(event.target.value)}>
                  <option value="all">전체 성경</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>{book.nameKo}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="list-stack">
              {filteredHighlights.length ? (
                filteredHighlights
                  .map((highlight) => {
                    const verse = resolveVerseById(highlight.verseId);
                    return verse ? (
                      <div className="list-row" key={highlight.id}>
                        <div>
                          <div className="row-title">{formatReference(verse)} <span className={`chip chip-${highlight.color}`}>{highlight.color}</span></div>
                          <p>{getVerseDisplayText(verse, readingLanguage)}</p>
                          {highlight.note ? <small>{highlight.note}</small> : null}
                        </div>
                        <div className="row-actions">
                          <button className="icon-button" type="button" onClick={() => copyVerse(verse)} aria-label="구절 복사">
                            <Copy size={16} />
                          </button>
                          <button className="small-button" type="button" onClick={() => openChapter(verse.bookId, verse.chapter, verse.verse)}>열기</button>
                          <button className="small-button danger" type="button" onClick={() => removeHighlight(verse.id)}>해제</button>
                        </div>
                      </div>
                    ) : null;
                  })
              ) : (
                <p className="empty-text">
                  {userData.highlights.length ? "선택한 필터에 맞는 강조 구절이 없습니다." : "강조한 구절이 없습니다."}
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeView === "favorites" ? (
          <section className="panel wide-panel">
            <div className="panel-heading">
              <span>인용 구절 보관함</span>
              <Bookmark size={18} />
            </div>
            <div className="favorite-list-layout">
              <div className="favorite-list-dropdown-table" aria-label="인용 목록 선택">
                <button
                  aria-expanded={isFavoriteListDropdownOpen}
                  className="favorite-list-dropdown-trigger"
                  type="button"
                  onClick={() => setIsFavoriteListDropdownOpen((current) => !current)}
                >
                  <span>목록</span>
                  <strong>{selectedFavoriteList?.name ?? "기본 목록"}</strong>
                  <em>{selectedListFavorites.length}</em>
                  <ChevronDown size={16} />
                </button>
                {isFavoriteListDropdownOpen ? (
                  <div className="favorite-list-dropdown-menu">
                    <div className="favorite-list-dropdown-head" aria-hidden="true">
                      <span>목록</span>
                      <span>구절</span>
                    </div>
                    {userData.favoriteLists.map((list) => (
                      <button
                        className={selectedFavoriteList?.id === list.id ? "favorite-list-dropdown-row active" : "favorite-list-dropdown-row"}
                        key={list.id}
                        type="button"
                        onClick={() => {
                          setSelectedFavoriteListId(list.id);
                          setIsFavoriteListDropdownOpen(false);
                        }}
                      >
                        <span>{list.name}</span>
                        <strong>{favoriteListCounts.get(list.id) ?? 0}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <aside className="favorite-list-sidebar" aria-label="인용 목록">
                <div className="sidebar-heading">목록</div>
                {userData.favoriteLists.map((list) => (
                  <button
                    className={selectedFavoriteList?.id === list.id ? "favorite-list-button active" : "favorite-list-button"}
                    key={list.id}
                    type="button"
                    onClick={() => setSelectedFavoriteListId(list.id)}
                  >
                    <span>{list.name}</span>
                    <strong>{favoriteListCounts.get(list.id) ?? 0}</strong>
                  </button>
                ))}
              </aside>
              <section className="favorite-list-content">
                <div className="favorite-list-toolbar">
                  <div>
                    <h2>{selectedFavoriteList?.name ?? "기본 목록"}</h2>
                    <p>{visibleSelectedListFavorites.length}/{selectedListFavorites.length}개 구절</p>
                  </div>
                  <div className="row-actions">
                    <button className="secondary-button" type="button" onClick={copyFavoriteList}>
                      <Copy size={16} />
                      목록 전체 복사
                    </button>
                    <button
                      className="secondary-button danger"
                      type="button"
                      onClick={() => selectedFavoriteList ? requestDeleteFavoriteList(selectedFavoriteList.id) : undefined}
                    >
                      <RotateCcw size={16} />
                      목록 삭제
                    </button>
                  </div>
                </div>
            <div className="filter-row">
              <label>
                목록 검색
                <input
                  value={favoriteSearchQuery}
                  onChange={(event) => setFavoriteSearchQuery(event.target.value)}
                  placeholder="제목, 본문, 태그 검색"
                />
              </label>
              <label>
                정렬
                <select value={favoriteSortKey} onChange={(event) => setFavoriteSortKey(event.target.value as FavoriteSortKey)}>
                  <option value="recent">최근 저장순</option>
                  <option value="bible">성경 순서</option>
                  <option value="usage">자주 사용순</option>
                </select>
              </label>
            </div>
            <div className="tag-strip">
              {userData.tags.map((tag) => (
                <span className="tag-chip" key={tag.id}><Tags size={13} />{tag.name}</span>
              ))}
            </div>
            <div className="list-stack">
              {visibleSelectedListFavorites.length ? (
                visibleSelectedListFavorites.map((favorite) => {
                  const verse = resolveVerseById(favorite.verseId);
                  if (!verse) {
                    return null;
                  }

                  return (
                    <div className="list-row" key={favorite.id}>
                      <div>
                        <div className="row-title">{favorite.title}</div>
                        <p>{getVerseDisplayText(verse, readingLanguage)}</p>
                        <div className="row-meta">
                          <span>{formatReference(verse)}</span>
                          <span>복사 {favorite.usageCount}회</span>
                          {favorite.tagIds.map((tagId) => {
                            const tag = userData.tags.find((item) => item.id === tagId);
                            return tag ? <span className="chip chip-ink" key={tag.id}>{tag.name}</span> : null;
                          })}
                        </div>
                        {favorite.memo ? <small>{favorite.memo}</small> : null}
                      </div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => copyVerse(verse)} aria-label="구절 복사">
                          <Copy size={16} />
                        </button>
                        <button className="small-button" type="button" onClick={() => openChapter(verse.bookId, verse.chapter, verse.verse)}>열기</button>
                        <button className="small-button danger" type="button" onClick={() => removeFavorite(favorite.id)}>삭제</button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="empty-text">
                  {selectedListFavorites.length ? "검색 조건에 맞는 구절이 없습니다." : "이 목록에 저장된 구절이 없습니다."}
                </p>
              )}
            </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeView === "notes" ? (
          <section className="panel wide-panel note-workspace-panel">
            <div className="panel-heading">
              <span>성경노트</span>
              <StickyNote size={18} />
            </div>
            <div className={[
              "note-workspace",
              personalNoteFocusMode ? "focus-mode" : "",
              selectedPersonalNote && isPersonalNoteInspectorOpen ? "has-inspector" : "",
              personalNoteMobilePane === "list" ? "mobile-list-mode" : "mobile-editor-mode",
            ].filter(Boolean).join(" ")}>
              <aside className="note-list-pane">
                <div className="filter-row">
                  <label>
                    노트 검색
                    <input
                      value={personalNoteSearchQuery}
                      onChange={(event) => setPersonalNoteSearchQuery(event.target.value)}
                      placeholder="제목, 본문, 태그"
                      type="search"
                    />
                  </label>
                  <label>
                    성경 권
                    <select value={personalNoteBookFilter} onChange={(event) => setPersonalNoteBookFilter(event.target.value)}>
                      <option value="all">전체 성경</option>
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>{book.nameKo}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {personalNoteRemoteStatus ? <p className="empty-text">{personalNoteRemoteStatus}</p> : null}
                <div className="note-list-actions">
                  <button className="primary-button modal-primary" type="button" onClick={createBlankPersonalNote}>
                    <StickyNote size={16} />
                    새 노트
                  </button>
                  <button className="small-button" data-active={showArchivedPersonalNotes || undefined} type="button" onClick={() => { setShowArchivedPersonalNotes((current) => !current); setSelectedPersonalNoteId(null); }}>
                    {showArchivedPersonalNotes ? "활성 노트" : "보관함"}
                  </button>
                </div>
                <div className="note-export-actions">
                  <button className="small-button" onClick={() => void exportPersonalNotes("json")} type="button">JSON</button>
                  <button className="small-button" onClick={() => void exportPersonalNotes("markdown")} type="button">Markdown ZIP</button>
                  <button className="small-button" onClick={() => window.print()} type="button">PDF/인쇄</button>
                </div>
                <div className="compact-list note-list">
                  {visiblePersonalNotes.map((note) => {
                    const links = personalNoteLinksByNote.get(note.id) ?? [];
                    return (
                      <button
                        className={selectedPersonalNote?.id === note.id ? "plain-list-button active" : "plain-list-button"}
                        key={note.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonalNoteId(note.id);
                          setPersonalNoteMobilePane("editor");
                        }}
                      >
                        <span>{note.title}</span>
                        <small>
                          {links.length ? `${formatHebrewDictionaryReference({ appBookId: links[0].bookId, chapter: links[0].chapter, verse: links[0].verse })} 외 ${Math.max(0, links.length - 1)}개` : "연결 구절 없음"}
                        </small>
                      </button>
                    );
                  })}
                  {!visiblePersonalNotes.length ? <p className="empty-text">저장한 성경노트가 없습니다.</p> : null}
                </div>
              </aside>
              <section className="note-editor-pane">
                {selectedPersonalNote ? (
                  <>
                    <button className="note-mobile-list-back" onClick={() => setPersonalNoteMobilePane("list")} type="button">
                      <ChevronLeft size={17} />
                      노트 목록
                    </button>
                    <div className="note-editor-head">
                      <label>
                        제목
                        <input value={personalNoteTitleDraft} onChange={(event) => setPersonalNoteTitleDraft(event.target.value)} />
                      </label>
                      <label>
                        태그
                        <input
                          value={personalNoteTagDraft}
                          onChange={(event) => setPersonalNoteTagDraft(event.target.value)}
                          placeholder="창조, 묵상"
                        />
                      </label>
                      <button
                        aria-label={isPersonalNoteInspectorOpen ? "노트 정보 닫기" : "노트 정보 열기"}
                        aria-pressed={isPersonalNoteInspectorOpen}
                        className="icon-button note-inspector-toggle"
                        onClick={() => setIsPersonalNoteInspectorOpen((current) => !current)}
                        title={isPersonalNoteInspectorOpen ? "노트 정보 닫기" : "노트 정보 열기"}
                        type="button"
                      >
                        <PanelRight size={18} />
                      </button>
                    </div>
                    <PersonalNoteRichTextEditor
                      focusMode={personalNoteFocusMode}
                      key={selectedPersonalNote.id}
                      linkedVerses={personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []}
                      noteId={selectedPersonalNote.id}
                      noteOptions={userData.personalNotes.filter((note) => note.status === "active").map((note) => ({ id: note.id, title: note.title }))}
                      value={personalNoteDocumentDraft}
                      onAddNoteLink={addPersonalNoteReference}
                      onAddVerseLink={addInlineVerseReference}
                      onChange={(document) => {
                        setPersonalNoteDocumentDraft(document);
                        setPersonalNoteSaveStatus("저장되지 않은 변경");
                      }}
                      onFocusModeChange={setPersonalNoteFocusMode}
                    />
                    {personalNoteFocusMode && (personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []).length ? (
                      <div className="note-focus-verses">
                        {(personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []).map((link) => {
                          const verse = resolveVerseById(link.verseKey);
                          return (
                            <details key={link.id}>
                              <summary>{formatHebrewDictionaryReference({ appBookId: link.bookId, chapter: link.chapter, verse: link.verse })}</summary>
                              <p>{verse?.textKo || "한국어 본문을 리더에서 불러오세요."}</p>
                              <p lang="en">{verse?.textEn || "Open this verse in the reader to load the English text."}</p>
                              <button className="small-button" onClick={() => openChapter(link.bookId, link.chapter, link.verse)} type="button">리더에서 열기</button>
                            </details>
                          );
                        })}
                      </div>
                    ) : null}
                    {personalNoteConflict ? (
                      <div className="note-conflict-banner" role="alert">
                        <strong>다른 기기에서 수정된 버전이 있습니다.</strong>
                        <span>서버 버전 {personalNoteConflict.revision} · {formatDate(personalNoteConflict.updatedAt)}</span>
                        <div>
                          <button className="secondary-button" onClick={useRemoteConflictVersion} type="button">최신 버전 사용</button>
                          <button className="secondary-button" onClick={duplicateConflictDraft} type="button">내 변경 복제</button>
                        </div>
                      </div>
                    ) : null}
                    <div className="modal-actions">
                      <span className="save-status">{personalNoteSaveStatus || (selectedPersonalNote.lastSavedAt ? `마지막 저장 ${formatDate(selectedPersonalNote.lastSavedAt)}` : "")}</span>
                      {selectedPersonalNote.status === "archived" ? (
                        <button className="secondary-button" type="button" onClick={() => void restoreArchivedPersonalNote(selectedPersonalNote)}>복원</button>
                      ) : (
                        <button className="secondary-button danger" type="button" onClick={() => deletePersonalNote(selectedPersonalNote.id)}>보관</button>
                      )}
                      <button className="primary-button modal-primary" type="button" onClick={savePersonalNote}>
                        저장
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-chapter">
                    <strong>노트를 선택하거나 새 노트를 만드세요.</strong>
                    <span>리더에서 선택 구절을 새 노트로 보낼 수도 있습니다.</span>
                  </div>
                )}
              </section>
              {selectedPersonalNote && isPersonalNoteInspectorOpen ? (
                <aside aria-label="노트 정보" className="note-inspector-pane">
                  <div className="note-inspector-heading">
                    <div>
                      <span className="eyebrow">노트 정보</span>
                      <strong>연결과 기록</strong>
                    </div>
                    <button aria-label="노트 정보 닫기" className="icon-button" onClick={() => setIsPersonalNoteInspectorOpen(false)} type="button">
                      <X size={17} />
                    </button>
                  </div>

                  <section className="note-inspector-section">
                    <div className="note-inspector-section__heading">
                      <strong>연결 구절</strong>
                      <span>{(personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []).length}</span>
                    </div>
                    <div className="linked-verse-strip">
                      {(personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []).map((link) => (
                        <span className="chip chip-ink note-link-chip" key={link.id}>
                          <button type="button" onClick={() => openChapter(link.bookId, link.chapter, link.verse)}>
                            {formatHebrewDictionaryReference({ appBookId: link.bookId, chapter: link.chapter, verse: link.verse })}
                          </button>
                          <button aria-label="연결 구절 제거" onClick={() => removePersonalNoteVerseLink(link.id)} title="연결 구절 제거" type="button"><X size={13} /></button>
                        </span>
                      ))}
                    </div>
                    {selectedVerse ? (
                      <button className="small-button" type="button" onClick={() => appendSelectedVersesToPersonalNote(selectedPersonalNote.id)}>
                        선택 구절 연결
                      </button>
                    ) : null}
                    {!(personalNoteLinksByNote.get(selectedPersonalNote.id) ?? []).length ? <small>본문에서 구절을 선택하거나 편집기에 #구절을 입력하세요.</small> : null}
                  </section>

                  <details className="note-inspector-section" open>
                    <summary>버전 기록 <span>{selectedPersonalNoteRevisions.length}</span></summary>
                    <div className="note-inspector-list">
                      {selectedPersonalNoteRevisions.length ? selectedPersonalNoteRevisions.map((revision) => (
                        <button className="plain-list-button" key={revision.id} onClick={() => void restorePersonalNoteRevision(revision.revision)} type="button">
                          <span>버전 {revision.revision}</span><small>{formatDate(revision.createdAt)} · {revision.snapshotReason}</small>
                        </button>
                      )) : <small>저장된 이전 버전이 없습니다.</small>}
                    </div>
                  </details>

                  <details className="note-inspector-section">
                    <summary>역링크 <span>{selectedPersonalNoteBacklinks.length}</span></summary>
                    <div className="note-inspector-list">
                      {selectedPersonalNoteBacklinks.length ? selectedPersonalNoteBacklinks.map((note) => (
                        <button className="plain-list-button" key={note.id} onClick={() => setSelectedPersonalNoteId(note.id)} type="button">
                          <span>{note.title}</span><small>{note.bodyText.slice(0, 90)}</small>
                        </button>
                      )) : <small>이 노트를 참조하는 노트가 없습니다.</small>}
                    </div>
                  </details>

                  <details className="note-inspector-section">
                    <summary>내 템플릿</summary>
                    <div className="note-template-create">
                      <input aria-label="새 템플릿 이름" onChange={(event) => setPersonalTemplateName(event.target.value)} placeholder="템플릿 이름" value={personalTemplateName} />
                      <button className="small-button" onClick={() => void saveCurrentNoteAsTemplate()} type="button">현재 노트 저장</button>
                    </div>
                    <small>저장한 템플릿은 다음 새 노트 생성 시 선택할 수 있습니다.</small>
                  </details>
                </aside>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeView === "dictionary" ? (
          <section className="panel wide-panel dictionary-workspace-panel">
            <div className="panel-heading">
              <span>히브리어 성경 사전</span>
              <BookOpen size={18} />
            </div>
            <HebrewDictionaryWorkspace
              alphabet={dictionaryAlphabet}
              bookId={dictionaryBookFilter}
              bookOptions={oldBooks.map((book) => ({ id: book.id, label: book.nameKo }))}
              error={dictionaryError}
              onAddToNote={addHebrewEntryToPersonalNote}
              onAlphabetChange={setDictionaryAlphabet}
              onBookChange={setDictionaryBookFilter}
              onOpenOccurrence={openChapter}
              onQueryChange={setDictionaryQuery}
              onSelectEntry={setSelectedHebrewEntryKey}
              onSortChange={setDictionarySort}
              onThemeChange={setDictionaryTheme}
              query={dictionaryQuery}
              result={dictionaryResult}
              selectedEntry={selectedHebrewEntry}
              selectedEntryKey={selectedHebrewEntryKey}
              sort={dictionarySort}
              status={dictionaryStatus}
              themeId={dictionaryTheme}
              themeOptions={hebrewDictionaryThemes.map((theme) => ({ id: theme.id, label: theme.titleKo }))}
            />
          </section>
        ) : null}

        {activeView === "search" ? (
          <section className="panel wide-panel">
            <div className="panel-heading">
              <span>본문 검색</span>
              <Search size={18} />
            </div>
            <div className="search-panel-controls">
              <label className="search-field">
                키워드
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={searchLanguage === "en" ? "예: grace, love, John" : "예: 믿음, 예수 그리스도, 성령"}
                  type="search"
                />
              </label>
              <div className="filter-row search-filter-row">
                <label>
                  언어
                  <select value={searchLanguage} onChange={(event) => setSearchLanguage(event.target.value as BibleSearchLanguage)}>
                    <option value="ko">한국어</option>
                    <option value="en">KJV 영어</option>
                    <option value="all">전체</option>
                  </select>
                </label>
                <label>
                  정렬
                  <select value={searchSort} onChange={(event) => setSearchSort(event.target.value as BibleSearchSort)}>
                    <option value="canonical">성경 순서</option>
                    <option value="relevance">관련도</option>
                  </select>
                </label>
                <label>
                  범위
                  <select
                    value={searchTestament}
                    onChange={(event) => {
                      setSearchTestament(event.target.value as "all" | "OT" | "NT");
                      setSearchBookFilter("all");
                    }}
                  >
                    <option value="all">전체</option>
                    <option value="OT">구약</option>
                    <option value="NT">신약</option>
                  </select>
                </label>
                <label>
                  성경 권
                  <select value={searchBookFilter} onChange={(event) => setSearchBookFilter(event.target.value)}>
                    <option value="all">전체 성경</option>
                    {searchBookOptions.map((book) => (
                      <option key={book.id} value={book.id}>{book.nameKo}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="search-summary" aria-live="polite">
              {searchStatus === "ready" && searchQuery.trim().length >= 2 ? `${searchResults.length}/${searchTotal}개 결과` : "2글자 이상 입력"}
            </div>
            <div className="list-stack">
              {searchResults.map((verse) => renderReferenceItem(verse, "열기", searchDisplayLanguage, searchQuery))}
              {searchStatus === "loading" ? <p className="empty-text">검색 중입니다.</p> : null}
              {searchStatus === "error" ? <p className="empty-text">{searchError}</p> : null}
              {searchStatus === "ready" && searchQuery.trim().length >= 2 && !searchResults.length ? (
                <p className="empty-text">검색 결과가 없습니다.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeView === "settings" ? (
          <section className="settings-grid">
            <div className="panel settings-shell">
              <div className="panel-heading">
                <span>설정</span>
                <Settings size={18} />
              </div>

              <div className="settings-menu" role="group" aria-label="설정 메뉴">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  const isActiveSection = activeSettingsSection === section.key;

                  return (
                    <button
                      aria-pressed={isActiveSection}
                      className={isActiveSection ? "settings-menu-button active" : "settings-menu-button"}
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSettingsSection(section.key)}
                    >
                      <Icon size={17} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="settings-section">
                {activeSettingsSection === "account" ? (
                  <>
                    <div className="panel-heading settings-section-heading">
                      <span>계정 설정</span>
                      {isAuthenticated ? <LogOut size={18} /> : <LogIn size={18} />}
                    </div>
                    <div className="settings-account-summary">
                      <div className="settings-account-identity">
                        <UserAvatar user={user} />
                        <div className="settings-account-copy">
                          <span className="eyebrow">현재 계정</span>
                          <strong>{user.displayName}</strong>
                          <small>{isAuthenticated ? user.email || "로그인 상태" : "비로그인 리더"}</small>
                        </div>
                      </div>
                      <span className={isAuthenticated ? "settings-status active" : "settings-status"}>
                        {isAuthenticated ? "로그인" : "비로그인"}
                      </span>
                    </div>
                    <div className="settings-action-grid">
                      <button className="secondary-button" type="button" onClick={logout}>
                        {isAuthenticated ? <LogOut size={16} /> : <LogIn size={16} />}
                        {isAuthenticated ? "로그아웃" : "로그인"}
                      </button>
                      <button className="secondary-button danger" type="button" onClick={resetLocalData}>
                        <RotateCcw size={16} />
                        로컬 데이터 초기화
                      </button>
                    </div>
                  </>
                ) : null}

                {activeSettingsSection === "tts" ? (
                  <>
                    <div className="panel-heading settings-section-heading">
                      <span>TTS 설정</span>
                      <Volume2 size={18} />
                    </div>
                    <label>
                      속도
                      <select
                        value={userData.settings.ttsSpeed}
                        onChange={(event) => updateSettings({ ttsSpeed: Number(event.target.value) })}
                      >
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1.0x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                      </select>
                    </label>
                    <label>
                      음성
                      <select value={userData.settings.ttsVoice} onChange={(event) => updateSettings({ ttsVoice: event.target.value })}>
                        <option value="">브라우저 기본</option>
                        {voices.map((voice) => (
                          <option key={voice.name} value={voice.name}>{voice.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="toggle-row">
                      <input
                        checked={userData.settings.ttsRepeat}
                        onChange={(event) => updateSettings({ ttsRepeat: event.target.checked })}
                        type="checkbox"
                      />
                      반복 재생
                    </label>
                    <label className="toggle-row">
                      <input
                        checked={userData.settings.ttsAutoScroll}
                        onChange={(event) => updateSettings({ ttsAutoScroll: event.target.checked })}
                        type="checkbox"
                      />
                      읽는 절로 자동 이동
                    </label>
                    <div className="tts-controls">
                      <button className="icon-button" type="button" onClick={() => playSpeechQueue(chapterVerses, 0, "현재 장", "chapter")} aria-label="재생">
                        <Play size={17} />
                      </button>
                      <button className="icon-button" type="button" onClick={isPaused ? resumeSpeech : pauseSpeech} aria-label="일시정지 또는 재개">
                        <Pause size={17} />
                      </button>
                      <button className="icon-button" type="button" onClick={stopSpeech} aria-label="정지">
                        <Square size={17} />
                      </button>
                    </div>
                    <p className="status-line">{ttsStatus}</p>
                  </>
                ) : null}

                {activeSettingsSection === "text" ? (
                  <>
                    <div className="panel-heading settings-section-heading">
                      <span>텍스트 설정</span>
                      <Type size={18} />
                    </div>
                    <label>
                      <span className="settings-value-row">
                        <span>글자 크기</span>
                        <strong>{userData.settings.fontSize}px</strong>
                      </span>
                      <input
                        max={26}
                        min={15}
                        type="range"
                        value={userData.settings.fontSize}
                        onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span className="settings-value-row">
                        <span>줄 간격</span>
                        <strong>{userData.settings.lineHeight.toFixed(2)}</strong>
                      </span>
                      <input
                        max={2.2}
                        min={1.35}
                        step={0.05}
                        type="range"
                        value={userData.settings.lineHeight}
                        onChange={(event) => updateSettings({ lineHeight: Number(event.target.value) })}
                      />
                    </label>
                  </>
                ) : null}

                {activeSettingsSection === "view" ? (
                  <>
                    <div className="panel-heading settings-section-heading">
                      <span>보기 모드</span>
                      <BookOpen size={18} />
                    </div>
                    <label>
                      읽기 모드
                      <select
                        value={userData.settings.readingMode}
                        onChange={(event) => updateSettings({ readingMode: event.target.value as UserDataState["settings"]["readingMode"] })}
                      >
                        <option value="normal">일반 보기</option>
                        <option value="verse-numbers">절 번호 강조</option>
                        <option value="focus">집중 읽기</option>
                      </select>
                    </label>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => updateSettings({ theme: userData.settings.theme === "dark" ? "light" : "dark" })}
                    >
                      {userData.settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                      {userData.settings.theme === "dark" ? "라이트 모드" : "다크 모드"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {navigationMode === "legacy" ? <nav className="mobile-bottom-nav" aria-label="모바일 주요 화면">
        <button
          className={activeView === "dashboard" ? "mobile-nav-item active" : "mobile-nav-item"}
          type="button"
          onClick={() => setActiveView("dashboard")}
        >
          <Home size={18} />
          <span>홈</span>
        </button>
        <button
          className={activeView === "reader" ? "mobile-nav-item active" : "mobile-nav-item"}
          type="button"
          onClick={() => setActiveView("reader")}
        >
          <BookOpen size={18} />
          <span>성경</span>
        </button>
        <button
          className={activeView === "favorites" ? "mobile-nav-item active" : "mobile-nav-item"}
          type="button"
          onClick={() => setActiveView("favorites")}
        >
          <Bookmark size={18} />
          <span>인용</span>
        </button>
        <button
          className={isCommandPaletteOpen || mobileQuickMoveViews.has(activeView) ? "mobile-nav-item active" : "mobile-nav-item"}
          type="button"
          onClick={openCommandPalette}
        >
          <Command size={18} />
          <span>빠른이동</span>
        </button>
        <button
          className={activeView === "settings" ? "mobile-nav-item active" : "mobile-nav-item"}
          type="button"
          onClick={() => setActiveView("settings")}
        >
          <Settings size={18} />
          <span>설정</span>
        </button>
      </nav> : null}

      {pendingPersonalNoteVerses ? (
        <PersonalNoteCreationDialog
          linkedVerseCount={pendingPersonalNoteVerses.length}
          onClose={() => setPendingPersonalNoteVerses(null)}
          onCreate={completePersonalNoteCreation}
          personalTemplates={userData.personalNoteTemplates}
        />
      ) : null}

      {isChapterPickerOpen ? (
        <div className="modal-backdrop chapter-picker-backdrop" role="presentation">
          <section aria-modal="true" className="chapter-picker-sheet" role="dialog" aria-labelledby="chapter-picker-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">성경 이동</div>
                <h2 id="chapter-picker-title">{chapterPickerBook.nameKo}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsChapterPickerOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <label className="chapter-picker-book-field">
              성경 권
              <select value={chapterPickerBook.id} onChange={(event) => setChapterPickerBookId(event.target.value)}>
                <optgroup label="구약">
                  {oldBooks.map((book) => (
                    <option key={book.id} value={book.id}>{book.nameKo}</option>
                  ))}
                </optgroup>
                <optgroup label="신약">
                  {newBooks.map((book) => (
                    <option key={book.id} value={book.id}>{book.nameKo}</option>
                  ))}
                </optgroup>
              </select>
            </label>

            <div className="chapter-picker-grid" aria-label={`${chapterPickerBook.nameKo} 장 선택`}>
              {getChapters(chapterPickerBook.id).map((chapter) => {
                const isActiveChapter = chapterPickerBook.id === currentBookId && chapter === currentChapter;
                const isCompletedChapter = completedKeys.has(chapterKey(chapterPickerBook.id, chapter));
                return (
                  <button
                    className={isActiveChapter ? "chapter-picker-button active" : "chapter-picker-button"}
                    key={chapter}
                    type="button"
                    onClick={() => selectChapterFromPicker(chapter)}
                  >
                    <span>{chapter}</span>
                    {isCompletedChapter ? <CheckCircle2 size={13} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {isFavoriteModalOpen && favoriteTargetVerses.length ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="favorite-modal" role="dialog" aria-labelledby="favorite-modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">인용 구절</div>
                <h2 id="favorite-modal-title">
                  {favoriteTargetVerses.length === 1 ? formatReference(favoriteTargetVerses[0]) : `${favoriteTargetVerses.length}개 구절`}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  setIsFavoriteModalOpen(false);
                  setFavoriteTargetVerseIds([]);
                }}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-verse">
              {favoriteTargetVerses.slice(0, 4).map((verse) => (
                <p key={verse.id}><strong>{formatReference(verse)}</strong> {getVerseDisplayText(verse, readingLanguage)}</p>
              ))}
              {favoriteTargetVerses.length > 4 ? <small>외 {favoriteTargetVerses.length - 4}개 구절</small> : null}
            </div>

            <div className="favorite-modal-grid">
              <label>
                인용 제목
                <input value={favoriteTitle} onChange={(event) => setFavoriteTitle(event.target.value)} placeholder="예: 구원 설명" />
              </label>
              <label>
                태그
                <input value={favoriteTagInput} onChange={(event) => setFavoriteTagInput(event.target.value)} placeholder="태그, 쉼표 구분" />
              </label>
              <label className="full-field">
                인용 메모
                <textarea
                  value={favoriteMemo}
                  onChange={(event) => setFavoriteMemo(event.target.value)}
                  placeholder="어디에 인용할지, 어떤 맥락인지 기록"
                  rows={3}
                />
              </label>
            </div>

            <div className="modal-section">
              <div className="sidebar-heading">저장할 목록</div>
              <div className="favorite-check-grid">
                {userData.favoriteLists.map((list) => (
                  <label className="check-row" key={list.id}>
                    <input
                      checked={favoriteListSelection.includes(list.id)}
                      onChange={() => toggleFavoriteListSelection(list.id)}
                      type="checkbox"
                    />
                    <span>{list.name}</span>
                    <small>{favoriteListCounts.get(list.id) ?? 0}</small>
                  </label>
                ))}
              </div>
            </div>

            <div className="new-list-row">
              <input
                value={newFavoriteListName}
                onChange={(event) => setNewFavoriteListName(event.target.value)}
                placeholder="새 목록 이름"
              />
              <button className="secondary-button" type="button" onClick={createFavoriteListFromModal}>
                <Bookmark size={16} />
                목록 생성
              </button>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setIsFavoriteModalOpen(false);
                  setFavoriteTargetVerseIds([]);
                }}
              >
                취소
              </button>
              <button className="primary-button modal-primary" type="button" onClick={saveFavorite}>
                <Bookmark size={16} />
                저장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {noteTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="confirm-modal" role="dialog" aria-labelledby="note-modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">성경 노트</div>
                <h2 id="note-modal-title">{noteTargetTitle}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setNoteTarget(null)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <textarea
              className="note-textarea"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="묵상, 관찰, 적용점을 기록"
              rows={6}
            />
            <div className="modal-actions">
              <button className="secondary-button danger" type="button" onClick={deleteStudyNote}>
                삭제
              </button>
              <button className="secondary-button" type="button" onClick={() => setNoteTarget(null)}>
                취소
              </button>
              <button className="primary-button modal-primary" type="button" onClick={saveStudyNote}>
                <StickyNote size={16} />
                저장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAuthenticated && feedbackTargetVerse ? (
        <TranslationFeedbackForm
          language={readingLanguage}
          onClose={() => setFeedbackTargetVerse(null)}
          onSubmitted={() => {
            setCopyStatus("번역 의견 접수 완료");
            setFeedbackTargetVerse(null);
          }}
          reference={formatReference(feedbackTargetVerse)}
          selectedText={feedbackSelectedText}
          verse={feedbackTargetVerse}
        />
      ) : null}

      {isShortcutHelpOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="confirm-modal" role="dialog" aria-labelledby="shortcut-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">단축키</div>
                <h2 id="shortcut-title">빠른 조작</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsShortcutHelpOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="shortcut-list">
              <span><kbd>/</kbd> 검색</span>
              <span><kbd>Ctrl</kbd> + <kbd>K</kbd> 명령 팔레트</span>
              <span><kbd>j</kbd>/<kbd>n</kbd> 다음 장</span>
              <span><kbd>k</kbd>/<kbd>p</kbd> 이전 장</span>
              <span><kbd>Space</kbd> TTS 재생/일시정지</span>
              <span><kbd>?</kbd> 단축키</span>
            </div>
          </section>
        </div>
      ) : null}

      {isCommandPaletteOpen ? (
        <div className="modal-backdrop command-backdrop" role="presentation">
          <section aria-modal="true" className="command-modal" role="dialog" aria-labelledby="command-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">명령</div>
                <h2 id="command-title">빠른 이동</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsCommandPaletteOpen(false)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="이동하거나 실행할 항목 검색"
            />
            <div className="command-list">
              {commandItems.map((command) => (
                <button
                  className="command-item"
                  disabled={command.disabled}
                  key={command.label}
                  type="button"
                  onClick={() => runCommand(command.action)}
                >
                  <strong>{command.label}</strong>
                  <small>{command.description}</small>
                </button>
              ))}
              {!commandItems.length ? <p className="empty-text">명령이 없습니다.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {pendingDeleteFavoriteList ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="confirm-modal" role="dialog" aria-labelledby="delete-list-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">목록 삭제</div>
                <h2 id="delete-list-title">{pendingDeleteFavoriteList.name}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setPendingDeleteFavoriteListId(null)} aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <p>
              이 목록을 삭제합니다. 이 목록에만 있는 구절은 함께 삭제하고, 다른 목록에도 들어간 구절은 다른 목록에 보존합니다.
            </p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setPendingDeleteFavoriteListId(null)}>
                취소
              </button>
              <button className="secondary-button danger" type="button" onClick={confirmDeleteFavoriteList}>
                목록 삭제 확인
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {shouldShowTtsOverlay ? (
        <footer className="player-bar">
          <div>
            <strong>TTS · {ttsPlaybackState}</strong>
            <span>{ttsQueueLabel} · {ttsStatus}</span>
          </div>
          <div className="tts-controls">
            <button className="icon-button" type="button" onClick={() => moveSpeech(-1)} aria-label="이전 구절">
              <SkipBack size={16} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() =>
                selectedVerses.length
                  ? playSelectedVerseQueue()
                  : playSpeechQueue(
                      selectedVerse ? [selectedVerse] : chapterVerses,
                      0,
                      selectedVerse ? "선택 구절" : "현재 장",
                      selectedVerse ? "selection" : "chapter",
                    )
              }
              aria-label="재생"
            >
              <Play size={16} />
            </button>
            <button className="icon-button" type="button" onClick={isPaused ? resumeSpeech : pauseSpeech} aria-label="일시정지 또는 재개">
              <Pause size={16} />
            </button>
            <button className="icon-button" type="button" onClick={stopSpeech} aria-label="정지">
              <Square size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => moveSpeech(1)} aria-label="다음 구절">
              <SkipForward size={16} />
            </button>
          </div>
          {copyStatus ? <span className="copy-status">{copyStatus}</span> : null}
          {isSpeaking ? <span className="live-dot">재생</span> : null}
        </footer>
      ) : null}
    </div>
  );
}

