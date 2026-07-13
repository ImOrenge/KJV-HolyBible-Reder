"use client";

import { Bookmark, CheckCircle2, StickyNote } from "lucide-react";

import type { HighlightColor, Verse } from "@/lib/types";

export type ReaderOriginalWord = {
  glossEn: string;
  glossKo: string;
  id: string;
  lemmaHe: string;
  pronunciationKo: string;
  transliteration: string;
};

type ReaderVerseRowProps = {
  batchSelected: boolean;
  currentReading: boolean;
  displayText: string;
  englishText: string;
  hasNote: boolean;
  highlightColor?: HighlightColor;
  isFavorite: boolean;
  isSelectionMode: boolean;
  koreanText?: string | null;
  onSelect: () => void;
  originalWords: ReaderOriginalWord[];
  parallel: boolean;
  selected: boolean;
  setElement: (element: HTMLButtonElement | null) => void;
  speaking: boolean;
  tags: Array<{ id: string; name: string }>;
  verse: Verse;
};

export function ReaderVerseRow({
  batchSelected,
  currentReading,
  displayText,
  englishText,
  hasNote,
  highlightColor,
  isFavorite,
  isSelectionMode,
  koreanText,
  onSelect,
  originalWords,
  parallel,
  selected,
  setElement,
  speaking,
  tags,
  verse,
}: ReaderVerseRowProps) {
  return (
    <button
      aria-pressed={selected || batchSelected}
      className={[
        "verse-row",
        "f-reader-verse",
        selected ? "selected" : "",
        batchSelected ? "batch-selected" : "",
        currentReading ? "current-reading" : "",
        speaking ? "speaking" : "",
        parallel ? "parallel-translation" : "",
        highlightColor ? `highlight-${highlightColor}` : "",
      ].join(" ")}
      data-verse-id={verse.id}
      ref={setElement}
      type="button"
      onClick={onSelect}
    >
      <span className="verse-number">{verse.verse}</span>
      {parallel ? (
        <span className="verse-text-split">
          <span className={koreanText ? "verse-translation-pane" : "verse-translation-pane missing"}>
            <small>KR</small>
            <span>{koreanText ?? "한국어 본문 없음"}</span>
          </span>
          <span className="verse-translation-pane">
            <small>EN</small>
            <span>{englishText}</span>
          </span>
        </span>
      ) : (
        <span>{displayText}</span>
      )}
      {originalWords.length || tags.length ? (
        <span className="verse-study-strip">
          {originalWords.length ? <span className="verse-original-count">원어 {originalWords.length}개</span> : null}
          {originalWords.slice(0, 3).map((word) => (
            <span className="hebrew-word-chip" dir="rtl" key={word.id} title={`${word.pronunciationKo} · ${word.glossEn}`}>
              {word.lemmaHe}
              <b dir="ltr">{word.transliteration}</b>
              <em dir="ltr">{word.glossKo}</em>
            </span>
          ))}
          {tags.map((tag) => <span className="chip chip-ink" key={tag.id}>{tag.name}</span>)}
        </span>
      ) : null}
      <span className="verse-markers">
        {isSelectionMode ? (
          <span className={batchSelected ? "selection-check active" : "selection-check"}>
            {batchSelected ? <CheckCircle2 size={15} /> : null}
          </span>
        ) : null}
        {hasNote ? <StickyNote className="verse-icon" size={15} /> : null}
        {isFavorite ? <Bookmark className="verse-icon" size={16} /> : null}
      </span>
    </button>
  );
}
