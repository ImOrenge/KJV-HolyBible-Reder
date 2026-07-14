import {
  findReaderVerseAtLine,
  getAdjacentChapter,
  resolveReaderTargetVerse,
  selectReaderVerseRange,
  shouldAutoScrollReader,
  type ReadingProgress,
  type UserDataState,
  type Verse,
} from "@kjv/shared";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
} from "react-native";

type LoadStatus = "idle" | "loading" | "ready" | "error";
type BibleApiClient = ReturnType<typeof import("@kjv/shared").createBibleApiClient>;

type PendingReaderTarget = {
  scroll: boolean;
  select: boolean;
  useProgress: boolean;
  verseId: string | null;
};

type UseMobileReaderControllerOptions = {
  activeUserId: string;
  activeView: string;
  apiClient: BibleApiClient;
  progress: ReadingProgress | null;
  setUserData: Dispatch<SetStateAction<UserDataState>>;
};

function chapterKey(bookId: string, chapter: number) {
  return `${bookId}:${chapter}`;
}

function upsertRecentRead(state: UserDataState, userId: string, verse: Verse): UserDataState {
  const nextProgress: ReadingProgress = {
    userId,
    bookId: verse.bookId,
    chapter: verse.chapter,
    verse: verse.verse,
    scrollPosition: 0,
    lastReadAt: new Date().toISOString(),
  };

  return {
    ...state,
    progress: nextProgress,
    recentReads: [
      nextProgress,
      ...state.recentReads.filter((read) => read.bookId !== verse.bookId || read.chapter !== verse.chapter),
    ].slice(0, 10),
  };
}

export function useMobileReaderController({
  activeUserId,
  activeView,
  apiClient,
  progress,
  setUserData,
}: UseMobileReaderControllerOptions) {
  const [bookId, setBookId] = useState("gen");
  const [chapter, setChapter] = useState(1);
  const [chapterStatus, setChapterStatus] = useState<LoadStatus>("idle");
  const [chapterError, setChapterError] = useState("");
  const [chapterSource, setChapterSource] = useState("CrossWire KJV");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [currentReadingVerseId, setCurrentReadingVerseId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVerseIds, setSelectedVerseIds] = useState<string[]>([]);
  const [selectionAnchorVerseId, setSelectionAnchorVerseId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const bookIdRef = useRef(bookId);
  const chapterRef = useRef(chapter);
  const readerPanelOffsetRef = useRef(0);
  const versesRef = useRef(verses);
  const verseLayoutsRef = useRef(new Map<string, { height: number; y: number }>());
  const pendingTargetRef = useRef<PendingReaderTarget | null>(null);
  const progressRef = useRef(progress);
  const requestIdRef = useRef(0);
  const suppressScrollTrackingUntilRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    bookIdRef.current = bookId;
    chapterRef.current = chapter;
    versesRef.current = verses;
  }, [bookId, chapter, verses]);

  const scrollToVerse = useCallback((verseId: string, animated = true) => {
    const layout = verseLayoutsRef.current.get(verseId);
    if (!layout) return false;
    suppressScrollTrackingUntilRef.current = Date.now() + 700;
    scrollRef.current?.scrollTo({
      animated,
      y: Math.max(readerPanelOffsetRef.current + layout.y - 12, 0),
    });
    return true;
  }, []);

  const setPendingReaderVerse = useCallback((verseId: string | null, select = true, scroll = true, useProgress = false) => {
    pendingTargetRef.current = { scroll, select, useProgress, verseId };
  }, []);

  const openReaderLocation = useCallback((location: { bookId: string; chapter: number; verseId?: string | null }) => {
    const currentVerses = versesRef.current;
    const targetVerse = location.verseId ? currentVerses.find((verse) => verse.id === location.verseId) : currentVerses[0];
    if (location.bookId === bookIdRef.current && location.chapter === chapterRef.current && targetVerse) {
      setSelectedVerseId(location.verseId ? targetVerse.id : null);
      setCurrentReadingVerseId(targetVerse.id);
      setSelectedVerseIds([]);
      setSelectionAnchorVerseId(null);
      setIsSelectionMode(false);
      if (!scrollToVerse(targetVerse.id)) {
        setPendingReaderVerse(targetVerse.id, Boolean(location.verseId), true);
      }
      return;
    }

    setPendingReaderVerse(location.verseId ?? null, Boolean(location.verseId), true);
    setBookId(location.bookId);
    setChapter(location.chapter);
  }, [scrollToVerse, setPendingReaderVerse]);

  const loadChapter = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setChapterStatus("loading");
    setChapterError("");

    try {
      const response = await apiClient.fetchBibleChapter(bookId, chapter);
      if (requestId !== requestIdRef.current) return;
      verseLayoutsRef.current.clear();
      versesRef.current = response.verses;
      setVerses(response.verses);
      setChapterSource(response.source.version ? `${response.source.name} ${response.source.version}` : response.source.name);
      setChapterStatus("ready");

      const pendingTarget = pendingTargetRef.current;
      const targetVerse = resolveReaderTargetVerse(
        response.verses,
        pendingTarget?.verseId ?? null,
        pendingTarget && !pendingTarget.useProgress ? null : progressRef.current,
        bookId,
        chapter,
      );
      pendingTargetRef.current = targetVerse && pendingTarget?.scroll
        ? { ...pendingTarget, verseId: targetVerse.id }
        : null;
      setSelectedVerseId(pendingTarget?.select ? targetVerse?.id ?? null : null);
      setCurrentReadingVerseId(targetVerse?.id ?? null);
      setSelectedVerseIds([]);
      setSelectionAnchorVerseId(null);
      setIsSelectionMode(false);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setChapterStatus("error");
      setChapterError(error instanceof Error ? error.message : "본문을 불러오지 못했습니다.");
      versesRef.current = [];
      setVerses([]);
    }
  }, [apiClient, bookId, chapter]);

  useEffect(() => {
    void loadChapter();
  }, [loadChapter]);

  const recordReaderPanelLayout = useCallback((event: LayoutChangeEvent) => {
    readerPanelOffsetRef.current = event.nativeEvent.layout.y;
  }, []);

  const recordVerseLayout = useCallback((verseId: string, event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    verseLayoutsRef.current.set(verseId, { height, y });
    const pendingTarget = pendingTargetRef.current;
    if (pendingTarget?.verseId === verseId && scrollToVerse(verseId, false)) {
      pendingTargetRef.current = null;
    }
  }, [scrollToVerse]);

  const handleContentScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeView !== "reader" || isSelectionMode || !verses.length) return;
    if (Date.now() < suppressScrollTrackingUntilRef.current) return;

    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const readingLine = contentOffset.y - readerPanelOffsetRef.current + Math.min(layoutMeasurement.height * 0.45, 360);
    const nextVerse = findReaderVerseAtLine(verses, verseLayoutsRef.current, readingLine);
    if (nextVerse && nextVerse.id !== currentReadingVerseId) setCurrentReadingVerseId(nextVerse.id);
  }, [activeView, currentReadingVerseId, isSelectionMode, verses]);

  const clearVerseSelection = useCallback(() => {
    setSelectedVerseIds([]);
    setSelectionAnchorVerseId(null);
  }, []);

  const setReaderSelectionMode = useCallback((nextMode: boolean) => {
    setIsSelectionMode(nextMode);
    if (!nextMode) clearVerseSelection();
  }, [clearVerseSelection]);

  const selectVerseForBatch = useCallback((verse: Verse) => {
    setSelectedVerseId(verse.id);
    setCurrentReadingVerseId(verse.id);

    if (!selectionAnchorVerseId || !selectedVerseIds.length) {
      setSelectionAnchorVerseId(verse.id);
      setSelectedVerseIds([verse.id]);
      return;
    }

    const range = selectReaderVerseRange(verses, selectionAnchorVerseId, verse.id);
    setSelectedVerseIds(range.length > 1 ? range : (current) =>
      current.includes(verse.id) ? current.filter((verseId) => verseId !== verse.id) : [...current, verse.id],
    );
  }, [selectedVerseIds.length, selectionAnchorVerseId, verses]);

  const selectReaderVerse = useCallback((verse: Verse) => {
    if (isSelectionMode) {
      selectVerseForBatch(verse);
      return;
    }

    setSelectedVerseId(verse.id);
    setCurrentReadingVerseId(verse.id);
    setUserData((current) => upsertRecentRead(current, activeUserId, verse));
  }, [activeUserId, isSelectionMode, selectVerseForBatch, setUserData]);

  const focusReaderVerse = useCallback((verseId: string | null, scroll = false) => {
    setCurrentReadingVerseId(verseId);
    if (verseId && shouldAutoScrollReader(scroll, isSelectionMode)) scrollToVerse(verseId);
  }, [isSelectionMode, scrollToVerse]);

  const navigateChapter = useCallback((direction: -1 | 1) => {
    const adjacent = getAdjacentChapter(bookId, chapter, direction);
    if (!adjacent) return;
    setPendingReaderVerse(null, false, true);
    setBookId(adjacent.bookId);
    setChapter(adjacent.chapter);
  }, [bookId, chapter, setPendingReaderVerse]);

  const markChapterComplete = useCallback(() => {
    setUserData((current) => {
      const key = chapterKey(bookId, chapter);
      const exists = current.completedChapters.some((item) => chapterKey(item.bookId, item.chapter) === key);
      return {
        ...current,
        completedChapters: exists
          ? current.completedChapters.filter((item) => chapterKey(item.bookId, item.chapter) !== key)
          : [{ id: `completed-${Date.now()}`, userId: activeUserId, bookId, chapter, completedAt: new Date().toISOString() }, ...current.completedChapters],
      };
    });
  }, [activeUserId, bookId, chapter, setUserData]);

  return {
    bookId,
    chapter,
    chapterError,
    chapterSource,
    chapterStatus,
    clearVerseSelection,
    currentReadingVerseId,
    focusReaderVerse,
    handleContentScroll,
    isSelectionMode,
    loadChapter,
    markChapterComplete,
    navigateChapter,
    openReaderLocation,
    recordReaderPanelLayout,
    recordVerseLayout,
    scrollRef,
    selectionAnchorVerseId,
    selectedVerseId,
    selectedVerseIds,
    selectReaderVerse,
    selectVerseForBatch,
    setReaderSelectionMode,
    setSelectedVerseId,
    verses,
  };
}
