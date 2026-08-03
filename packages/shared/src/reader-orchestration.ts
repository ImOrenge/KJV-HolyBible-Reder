import type { ReadingProgress, Verse } from "./types";

export type ReaderVerseLayout = {
  height: number;
  y: number;
};

export type ReaderSpeechQueueItem = {
  id?: string;
  label: string;
  text: string;
};

export function resolveReaderTargetVerse(
  verses: Verse[],
  requestedVerseId: string | null,
  progress: ReadingProgress | null,
  bookId: string,
  chapter: number,
) {
  if (!verses.length) return null;

  const requested = requestedVerseId ? verses.find((verse) => verse.id === requestedVerseId) : null;
  if (requested) return requested;

  if (progress?.bookId === bookId && progress.chapter === chapter) {
    return verses.find((verse) => verse.verse === progress.verse) ?? verses[0];
  }

  return verses[0];
}

export function selectReaderVerseRange(verses: Verse[], anchorVerseId: string, targetVerseId: string) {
  const anchorIndex = verses.findIndex((verse) => verse.id === anchorVerseId);
  const targetIndex = verses.findIndex((verse) => verse.id === targetVerseId);
  if (anchorIndex < 0 || targetIndex < 0) return [];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return verses.slice(start, end + 1).map((verse) => verse.id);
}

export function findReaderVerseAtLine(
  verses: Verse[],
  layouts: ReadonlyMap<string, ReaderVerseLayout>,
  readingLine: number,
) {
  if (!verses.length) return null;

  return (
    verses.find((verse) => {
      const layout = layouts.get(verse.id);
      return layout ? layout.y <= readingLine && layout.y + layout.height >= readingLine : false;
    }) ??
    verses.find((verse) => {
      const layout = layouts.get(verse.id);
      return layout ? layout.y + layout.height >= readingLine : false;
    }) ??
    verses[verses.length - 1]
  );
}

export function shouldAutoScrollReader(ttsAutoScroll: boolean, isSelectionMode: boolean) {
  return ttsAutoScroll && !isSelectionMode;
}

export function createReaderSpeechQueue(
  verses: Verse[],
  getLabel: (verse: Verse) => string,
  getText: (verse: Verse) => string,
) {
  return verses
    .map<ReaderSpeechQueueItem>((verse) => ({
      id: verse.id,
      label: getLabel(verse),
      text: getText(verse),
    }))
    .filter((item) => item.text.trim().length > 0);
}

export function getReaderSpeechStartIndex(queue: readonly ReaderSpeechQueueItem[], verseId: string | null) {
  if (!verseId) return 0;

  const selectedIndex = queue.findIndex((item) => item.id === verseId);
  return selectedIndex >= 0 ? selectedIndex : 0;
}

export function getReaderSpeechIndex(queueLength: number, currentIndex: number, direction: -1 | 1) {
  if (queueLength <= 0) return -1;
  return Math.min(Math.max(currentIndex + direction, 0), queueLength - 1);
}
