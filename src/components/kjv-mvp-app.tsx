"use client";

import {
  BarChart3,
  Bookmark,
  BookOpen,
  CalendarDays,
  CheckCircle2,
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
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cacheVerseList,
  fetchBibleChapter,
  fetchBibleVerse,
  normalizeVerseId,
  searchBibleVerses,
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
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ContinueReadingPanel, ProgressMetricPanel } from "@/components/app-preview-panels";
import {
  clearUserData,
  createInitialUserData,
  defaultFavoriteListId,
  loadUserData,
  saveUserData,
} from "@/lib/user-data-repository";
import type { BibleSource } from "@/lib/bible-api-types";
import type {
  CompletedChapter,
  FavoriteList,
  Highlight,
  HighlightColor,
  ReadingProgress,
  Tag,
  TranslationLanguage,
  StudyNote,
  UserDataState,
  Verse,
  ReadingPlan,
  ReadingPlanTemplate,
} from "@/lib/types";

type ViewKey = "dashboard" | "reader" | "progress" | "highlights" | "favorites" | "search" | "settings";
type MobileHomeTab = "today" | "progress" | "activity" | "study";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type TtsPlaybackState = "idle" | "playing" | "paused" | "error";
type FavoriteSortKey = "recent" | "bible" | "usage";
type NoteTarget =
  | { scope: "chapter"; bookId: string; chapter: number }
  | { scope: "verse"; bookId: string; chapter: number; verse: number; verseId: string };

const tabs: Array<{ key: ViewKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "dashboard", label: "홈", icon: Home },
  { key: "reader", label: "성경", icon: BookOpen },
  { key: "progress", label: "통독", icon: BarChart3 },
  { key: "highlights", label: "강조", icon: Highlighter },
  { key: "favorites", label: "인용", icon: Bookmark },
  { key: "search", label: "검색", icon: Search },
  { key: "settings", label: "설정", icon: Settings },
];

const mobileHomeTabs: Array<{ key: MobileHomeTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "today", label: "오늘", icon: CalendarDays },
  { key: "progress", label: "통독", icon: BarChart3 },
  { key: "activity", label: "활동", icon: Layers },
  { key: "study", label: "공부", icon: StickyNote },
];

const mobileQuickMoveViews = new Set<ViewKey>(["progress", "highlights", "search", "settings"]);
const viewKeys = new Set<ViewKey>(tabs.map((tab) => tab.key));
const mobileHomeTabKeys = new Set<MobileHomeTab>(mobileHomeTabs.map((tab) => tab.key));

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

function getVerseDisplayText(verse: Verse, language: TranslationLanguage) {
  if (language === "ko" && verse.textKo) {
    return verse.textKo;
  }

  return verse.textEn ?? verse.text;
}

function getVerseDisplaySource(verse: Verse, language: TranslationLanguage) {
  if (language === "ko") {
    return verse.textKo ? (verse.translationName ?? "KJV Korean Study Translation") : "한국어 본문 없음";
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

export function KjvMvpApp({ user }: { user: AppUser }) {
  const router = useRouter();
  const books = useMemo(() => getBooks(), []);
  const oldBooks = useMemo(() => getBooks("old"), []);
  const newBooks = useMemo(() => getBooks("new"), []);
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mobileHomeTab, setMobileHomeTab] = useState<MobileHomeTab>("today");
  const [userData, setUserData] = useState<UserDataState>(() => createInitialUserData(user.id));
  const [currentBookId, setCurrentBookId] = useState("gen");
  const [currentChapter, setCurrentChapter] = useState(1);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [currentReadingVerseId, setCurrentReadingVerseId] = useState<string | null>(null);
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
  const [pendingDeleteFavoriteListId, setPendingDeleteFavoriteListId] = useState<string | null>(null);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [favoriteSortKey, setFavoriteSortKey] = useState<FavoriteSortKey>("recent");
  const [highlightColorFilter, setHighlightColorFilter] = useState<"all" | HighlightColor>("all");
  const [highlightBookFilter, setHighlightBookFilter] = useState("all");
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [feedbackTargetVerse, setFeedbackTargetVerse] = useState<Verse | null>(null);
  const [feedbackSelectedText, setFeedbackSelectedText] = useState("");
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [showDemoImportPrompt, setShowDemoImportPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searchStatus, setSearchStatus] = useState<LoadStatus>("idle");
  const [searchError, setSearchError] = useState("");
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [chapterSource, setChapterSource] = useState<BibleSource | null>(null);
  const [chapterStatus, setChapterStatus] = useState<LoadStatus>("idle");
  const [chapterError, setChapterError] = useState("");
  const [targetVerseNumber, setTargetVerseNumber] = useState<number | null>(null);
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
  const verseElementsRef = useRef(new Map<string, HTMLButtonElement>());
  const progressSaveTimerRef = useRef<number | null>(null);
  const favoriteListSelectionRef = useRef<string[]>([defaultFavoriteListId]);
  const favoriteListsRef = useRef(userData.favoriteLists);
  const pendingVerseFetchesRef = useRef(new Set<string>());

  const currentBook = getBook(currentBookId) ?? books[0];
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
    ];

    return items.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()).slice(0, 8);
  }, [userData.favoriteVerses, userData.highlights, userData.recentReads, userData.studyNotes]);

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
      setCurrentReadingVerseId(verse.id);

      if (progressSaveTimerRef.current) {
        window.clearTimeout(progressSaveTimerRef.current);
      }

      progressSaveTimerRef.current = window.setTimeout(() => {
        updateProgress(verse.bookId, verse.chapter, verse.verse, getScrollPosition());
        progressSaveTimerRef.current = null;
      }, 600);
    },
    [updateProgress],
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
    const initialBookId = devBook && getBook(devBook) ? devBook : loaded.progress?.bookId ?? "gen";
    const initialChapter =
      Number.isFinite(devChapter) && getChapters(initialBookId).includes(devChapter)
        ? devChapter
        : loaded.progress?.chapter ?? 1;
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
    if (loaded.progress && !devBook) {
      setCurrentBookId(loaded.progress.bookId);
      setCurrentChapter(loaded.progress.chapter);
      setTargetVerseNumber(loaded.progress.verse);
    }
    setMounted(true);
  }, [user.id, user.isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    async function loadChapter() {
      setChapterStatus("loading");
      setChapterError("");
      setSelectedVerseId(null);
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
  }, [currentBookId, currentChapter]);

  useEffect(() => {
    if (targetVerseNumber === null || !chapterVerses.length) {
      return;
    }

    const targetVerse = chapterVerses.find((verse) => verse.verse === targetVerseNumber) ?? chapterVerses[0];
    setSelectedVerseId(targetVerse.id);
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
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchStatus("idle");
      setSearchError("");
      return;
    }

    let cancelled = false;
    setSearchStatus("loading");
    setSearchError("");

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchBibleVerses(query);
        if (cancelled) {
          return;
        }

        setSearchResults(response.verses);
        rememberVerses(response.verses);
        setSearchStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSearchResults([]);
        setSearchStatus("error");
        setSearchError(error instanceof Error ? error.message : "검색에 실패했습니다.");
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const verseIds = new Set([
      ...userData.highlights.map((highlight) => highlight.verseId),
      ...userData.favoriteVerses.map((favorite) => favorite.verseId),
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
  }, [mounted, userData.favoriteVerses, userData.highlights, verseCache]);

  useEffect(() => {
    if (!mounted || showDemoImportPrompt) {
      return;
    }

    saveUserData(user.id, userData);
  }, [mounted, showDemoImportPrompt, user.id, userData]);

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
          playSpeechQueue(chapterVerses, 0, "현재 장");
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
    const chapterList = getChapters(bookId);
    const nextChapter = chapterList.includes(chapter) ? chapter : 1;
    setCurrentBookId(bookId);
    setCurrentChapter(nextChapter);
    setSelectedVerseId(null);
    setCurrentReadingVerseId(null);
    setTargetVerseNumber(verse);
    setActiveView(view);
    updateProgress(bookId, nextChapter, verse);
  }

  function selectVerse(verse: Verse) {
    setSelectedVerseId(verse.id);
    setCurrentReadingVerseId(verse.id);
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
    setCurrentReadingVerseId(verse.id);
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
    if (isSelectionMode) {
      selectVerseForBatch(verse);
      return;
    }

    selectVerse(verse);
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
    setUserData((current) => {
      if (current.completedChapters.some((completed) => chapterKey(completed.bookId, completed.chapter) === key)) {
        return {
          ...current,
          completedChapters: current.completedChapters.filter(
            (completed) => chapterKey(completed.bookId, completed.chapter) !== key,
          ),
        };
      }

      const completed: CompletedChapter = {
        id: createId("completed"),
        userId: user.id,
        bookId,
        chapter,
        completedAt: new Date().toISOString(),
      };

      return {
        ...current,
        completedChapters: [...current.completedChapters, completed],
      };
    });
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

  async function copyVerse(verse: Verse) {
    const text = copyTextForVerse(verse, readingLanguage);
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

  function speakAtIndex(index: number) {
    if (!("speechSynthesis" in window)) {
      setTtsStatus("미지원");
      setTtsPlaybackState("error");
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
      if (!speechCancelRef.current) {
        const nextIndex = index + 1;
        if (nextIndex < speechQueueRef.current.length) {
          speakAtIndex(nextIndex);
        } else if (userData.settings.ttsRepeat) {
          speakAtIndex(0);
        } else {
          speakAtIndex(nextIndex);
        }
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setTtsPlaybackState("error");
      setTtsStatus("오류");
    };

    window.speechSynthesis.speak(utterance);
  }

  function playSpeechQueue(verses: Verse[], startIndex = 0, label = "재생 목록") {
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

    speechCancelRef.current = true;
    window.speechSynthesis.cancel();
    speechCancelRef.current = false;
    speechQueueRef.current = verses;
    setTtsQueueLabel(`${label} · ${verses.length}개`);
    speakAtIndex(startIndex);
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
      playSpeechQueue(verses, 0, "오늘 분량");
    } catch {
      setTtsStatus("오늘 분량 재생 실패");
      setTtsPlaybackState("error");
    }
  }

  function playSelectedVerseQueue() {
    const verses = selectedVerses.length ? selectedVerses : selectedVerse ? [selectedVerse] : [];
    playSpeechQueue(verses, 0, selectedVerses.length ? "선택 구절" : "선택 구절");
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      speechCancelRef.current = true;
      window.speechSynthesis.cancel();
      speechCancelRef.current = false;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingVerseId(null);
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
    speechCancelRef.current = true;
    window.speechSynthesis.cancel();
    speechCancelRef.current = false;
    speakAtIndex(nextIndex);
  }

  function resetLocalData() {
    stopSpeech();
    clearUserData(user.id);
    setUserData(createInitialUserData(user.id));
    setCurrentBookId("gen");
    setCurrentChapter(1);
    setSelectedVerseId(null);
    setCurrentReadingVerseId(null);
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

  function renderReferenceItem(verse: Verse, actionLabel = "열기") {
    const highlight = highlightsByVerse.get(verse.id);
    const favorite = favoritesByVerse.get(verse.id);
    return (
      <div className="list-row" key={verse.id}>
        <div>
          <div className="row-title">{formatReference(verse)}</div>
          <p>{getVerseDisplayText(verse, readingLanguage)}</p>
          <div className="row-meta">
            {highlight ? <span className={`chip chip-${highlight.color}`}>강조</span> : null}
            {favorite ? <span className="chip chip-ink">인용</span> : null}
            {readingLanguage === "ko" && !verse.textKo ? <span className="chip chip-ink">EN fallback</span> : null}
          </div>
        </div>
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={() => copyVerse(verse)} aria-label="구절 복사">
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
    { label: "통독 진척도", description: "권별 진행률", action: () => setActiveView("progress") },
    { label: "강조 구절", description: "색상별 표시", action: () => setActiveView("highlights") },
    { label: "인용 보관함", description: "목록과 복사", action: () => setActiveView("favorites") },
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
        <button
          className={readingLanguage === "en" ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => updateSettings({ defaultTranslation: "en" })}
        >
          EN
        </button>
        <button
          className={readingLanguage === "ko" ? "status-button complete" : "status-button"}
          type="button"
          onClick={() => updateSettings({ defaultTranslation: "ko" })}
        >
          KR
        </button>
        <button className="status-button" type="button" onClick={() => playSpeechQueue(chapterVerses, 0, "현재 장")}>
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

  return (
    <div className={`app-root theme-${userData.settings.theme}${shouldShowTtsOverlay ? " tts-overlay-open" : ""}`}>
      <header className="app-header">
        <div>
          <div className="eyebrow">CrossWire KJV 기반</div>
          <h1>{APP_NAME}</h1>
        </div>
        <div className="header-actions">
          <span className="mock-user">{user.displayName}</span>
          <button className="icon-button" type="button" onClick={openCommandPalette} aria-label="명령 팔레트">
            <Command size={16} />
          </button>
          <button className="icon-button" type="button" onClick={() => setIsShortcutHelpOpen(true)} aria-label="단축키">
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
      </header>

      <nav className="tabbar" aria-label="주요 화면">
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
      </nav>

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
                    onClick={() => setMobileHomeTab(tab.key)}
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

        {activeView === "reader" ? (
          <section className="reader-layout">
            <aside className="selector-panel">
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

              <div className="chapter-grid" aria-label="장 선택">
                {getChapters(currentBook.id).map((chapter) => (
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

            <section className="reader-panel">
              <div className="reader-toolbar">
                <button className="icon-button" type="button" onClick={() => moveChapter(-1)} aria-label="이전 장">
                  <SkipBack size={18} />
                </button>
                <div>
                  <h2>
                    {currentBook.nameKo} {currentChapter}장
                  </h2>
                  <p>
                    {currentBook.nameEn} ·{" "}
                    {chapterStatus === "loading"
                      ? "본문 불러오는 중"
                      : chapterStatus === "error"
                        ? "본문 오류"
                        : `${chapterVerses.length} ${readingLanguage === "ko" ? "KR" : "EN"} 구절 · ${formatSource(chapterSource)}`}
                    {readingLanguage === "ko" && !currentChapterHasKorean ? " · 한국어 본문 없음" : ""}
                  </p>
                  <p className="current-verse-line">
                    {currentReadingVerse ? `현재 위치 ${formatReference(currentReadingVerse)}` : "현재 위치 자동 추적 대기"}
                    {isCurrentPlanChapter ? " · 오늘 분량" : ""}
                  </p>
                </div>
                <button className="icon-button" type="button" onClick={() => moveChapter(1)} aria-label="다음 장">
                  <SkipForward size={18} />
                </button>
              </div>

              {renderReaderActions("top")}

              <article
                className={`verse-list mode-${userData.settings.readingMode}`}
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
                    return (
                      <button
                        className={[
                          "verse-row",
                          selectedVerseId === verse.id ? "selected" : "",
                          selectedVerseIdSet.has(verse.id) ? "batch-selected" : "",
                          currentReadingVerseId === verse.id ? "current-reading" : "",
                          speakingVerseId === verse.id ? "speaking" : "",
                          highlight ? `highlight-${highlight.color}` : "",
                        ].join(" ")}
                        data-verse-id={verse.id}
                        key={verse.id}
                        ref={(element) => setVerseElement(verse.id, element)}
                        type="button"
                        onClick={() => handleVerseClick(verse)}
                      >
                        <span className="verse-number">{verse.verse}</span>
                        <span>{getVerseDisplayText(verse, readingLanguage)}</span>
                        <span className="verse-markers">
                          {isSelectionMode ? (
                            <span className={selectedVerseIdSet.has(verse.id) ? "selection-check active" : "selection-check"}>
                              {selectedVerseIdSet.has(verse.id) ? <CheckCircle2 size={15} /> : null}
                            </span>
                          ) : null}
                          {note ? <StickyNote className="verse-icon" size={15} /> : null}
                          {favorite ? <Bookmark className="verse-icon" size={16} /> : null}
                        </span>
                      </button>
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

              {renderReaderActions("bottom")}

              {selectedVerse ? (
                <section className="action-panel">
                  <div className="selected-reference">
                    <strong>{formatReference(selectedVerse)}</strong>
                    <span>{getVerseDisplaySource(selectedVerse, readingLanguage)}</span>
                  </div>
                  <div className="quick-actions">
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
                    <button className="icon-button" type="button" onClick={() => copyVerse(selectedVerse)} aria-label="구절 복사">
                      <Copy size={16} />
                    </button>
                    <button className="icon-button" type="button" onClick={() => playSpeechQueue([selectedVerse], 0, "선택 구절")} aria-label="선택 구절 읽기">
                      <Volume2 size={16} />
                    </button>
                    <button
                      className="icon-button"
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
                      aria-label="구절 노트"
                    >
                      <StickyNote size={16} />
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
                    value={highlightNote}
                    onChange={(event) => setHighlightNote(event.target.value)}
                    placeholder="강조 메모"
                    rows={2}
                  />
                  <button className="secondary-button" type="button" onClick={openFavoriteModal}>
                    <Bookmark size={16} />
                    {selectedFavorite ? "인용 구절 수정" : "인용 구절 저장"}
                  </button>
                </section>
              ) : null}

              {isSelectionMode ? (
                <section className="selection-action-sheet" aria-label="선택 구절 작업">
                  <div>
                    <strong>{selectedVerses.length}개 선택</strong>
                    <span>{selectionAnchorVerseId ? "다음 절을 누르면 범위가 선택됩니다." : "첫 절을 선택하세요."}</span>
                  </div>
                  <div className="selection-actions">
                    <button className="secondary-button" type="button" onClick={copySelectedVerses}>
                      <Copy size={16} />
                      복사
                    </button>
                    <button className="secondary-button" type="button" onClick={openSelectedFavoriteModal}>
                      <Bookmark size={16} />
                      인용 저장
                    </button>
                    <button className="secondary-button" type="button" onClick={playSelectedVerseQueue}>
                      <Volume2 size={16} />
                      읽기
                    </button>
                    <button className="small-button" type="button" onClick={clearVerseSelection}>
                      선택 해제
                    </button>
                  </div>
                  <div className="quick-actions">
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
                </section>
              ) : null}
            </section>
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

        {activeView === "search" ? (
          <section className="panel wide-panel">
            <div className="panel-heading">
              <span>KJV 검색</span>
              <Search size={18} />
            </div>
            <div className="search-row">
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="예: grace, love, John" />
            </div>
            <div className="list-stack">
              {searchResults.map((verse) => renderReferenceItem(verse))}
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
            <div className="panel">
              <div className="panel-heading">
                <span>읽기 설정</span>
                <Type size={18} />
              </div>
              <label>
                글자 크기
                <input
                  max={26}
                  min={15}
                  type="range"
                  value={userData.settings.fontSize}
                  onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })}
                />
              </label>
              <label>
                줄 간격
                <input
                  max={2.2}
                  min={1.35}
                  step={0.05}
                  type="range"
                  value={userData.settings.lineHeight}
                  onChange={(event) => updateSettings({ lineHeight: Number(event.target.value) })}
                />
              </label>
              <label>
                보기 모드
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
            </div>

            <div className="panel">
              <div className="panel-heading">
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
                <button className="icon-button" type="button" onClick={() => playSpeechQueue(chapterVerses, 0, "현재 장")} aria-label="재생">
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
            </div>

            <div className="panel">
              <div className="panel-heading">
                <span>로컬 데이터</span>
                <RotateCcw size={18} />
              </div>
              <p className="empty-text">localStorage 기반 v0 상태입니다.</p>
              <button className="secondary-button danger" type="button" onClick={resetLocalData}>
                <RotateCcw size={16} />
                초기화
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <nav className="mobile-bottom-nav" aria-label="모바일 주요 화면">
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
      </nav>

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
              onClick={() => (selectedVerses.length ? playSelectedVerseQueue() : playSpeechQueue(selectedVerse ? [selectedVerse] : chapterVerses, 0, selectedVerse ? "선택 구절" : "현재 장"))}
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

