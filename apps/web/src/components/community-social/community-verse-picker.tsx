"use client";

import { bibleBookCodes } from "@kjv/shared";
import { Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type UIEvent } from "react";

type BookSuggestion = {
  bookId: string;
  displayReference: string;
  displayText: string;
  kind: "book";
  queryValue?: string;
};

type VerseSuggestion = {
  bookId: string;
  chapter: number;
  displayReference: string;
  displayText: string;
  isInputMatch?: boolean;
  kind: "verse";
  verse: number;
  verseKey: string;
};

type ReferenceSuggestion = BookSuggestion | VerseSuggestion;

type SuggestionPayload = {
  context?: { chapter: number | null; chapterCount: number; displayName: string; scope: "book" | "chapter" };
  error?: string;
  nextOffset?: number | null;
  suggestions?: ReferenceSuggestion[];
};

type CommunityVersePickerProps = {
  inputVisible: boolean;
  onChange: (verseKeys: string[]) => void;
  verseKeys: string[];
};

const LISTBOX_ID = "community-verse-picker-options";
const ALL_BOOK_SUGGESTIONS: BookSuggestion[] = bibleBookCodes.map((book) => ({
  bookId: book.appBookId,
  displayReference: book.shortNameKo,
  displayText: `${book.nameKo} · ${book.nameEn} · ${book.chapterCount}장`,
  kind: "book",
  queryValue: book.nameKo,
}));

function formatVerseKey(verseKey: string) {
  const [bookCode = "", chapter = "", verse = ""] = verseKey.split(".");
  const book = bibleBookCodes.find((candidate) => candidate.verseKeyCode === bookCode);
  return `${book?.shortNameKo ?? bookCode} ${chapter}:${verse}`;
}

export function CommunityVersePicker({ inputVisible, onChange, verseKeys }: CommunityVersePickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ReferenceSuggestion[]>([]);
  const [context, setContext] = useState<SuggestionPayload["context"]>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const lastBookNameRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const resolvedQueryRef = useRef("");
  const selected = useMemo(() => new Set(verseKeys), [verseKeys]);
  const showingAllBooks = !context && suggestions.length === ALL_BOOK_SUGGESTIONS.length && suggestions.every((suggestion) => suggestion.kind === "book");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!inputVisible || !normalizedQuery) {
      const inputFocused = inputVisible && typeof document !== "undefined" && document.activeElement?.id === "community-verse-picker-input";
      setSuggestions(inputFocused ? ALL_BOOK_SUGGESTIONS : []);
      setContext(undefined);
      setNextOffset(null);
      setOpen(inputFocused);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const requestQuery = /^\d{1,3}(?::\d{0,3})?$/.test(normalizedQuery) && lastBookNameRef.current
      ? `${lastBookNameRef.current} ${normalizedQuery}`
      : normalizedQuery;
    resolvedQueryRef.current = requestQuery;
    const timer = window.setTimeout(() => {
      setSuggestions([]);
      setContext(undefined);
      setNextOffset(null);
      setOpen(true);
      setStatus("loading");
      fetch(`/api/bible/reference-suggestions?q=${encodeURIComponent(requestQuery)}&mode=chapter-table&limit=200`, { signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json().catch(() => null) as SuggestionPayload | null;
          if (!response.ok) throw new Error(payload?.error ?? "구절 목록을 불러오지 못했습니다.");
          return payload;
        })
        .then((payload) => {
          const nextSuggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
          setSuggestions(nextSuggestions);
          setContext(payload?.context);
          setNextOffset(typeof payload?.nextOffset === "number" ? payload.nextOffset : null);
          if (payload?.context?.displayName) lastBookNameRef.current = payload.context.displayName;
          setActiveIndex(0);
          setOpen(nextSuggestions.length > 0);
          setStatus("idle");
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setSuggestions([]);
          setContext(undefined);
          setNextOffset(null);
          setOpen(true);
          setStatus("error");
        });
    }, 140);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputVisible, query]);

  useEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  async function loadMoreSuggestions() {
    if (nextOffset === null || loadingMoreRef.current || !resolvedQueryRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/bible/reference-suggestions?q=${encodeURIComponent(resolvedQueryRef.current)}&mode=chapter-table&limit=200&offset=${nextOffset}`);
      const payload = await response.json().catch(() => null) as SuggestionPayload | null;
      if (!response.ok) throw new Error(payload?.error ?? "다음 구절을 불러오지 못했습니다.");
      const incoming = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
      setSuggestions((current) => {
        const existing = new Set(current.map((suggestion) => suggestion.kind === "verse" ? suggestion.verseKey : `book:${suggestion.bookId}`));
        return [...current, ...incoming.filter((suggestion) => !existing.has(suggestion.kind === "verse" ? suggestion.verseKey : `book:${suggestion.bookId}`))];
      });
      setNextOffset(typeof payload?.nextOffset === "number" ? payload.nextOffset : null);
    } catch {
      setStatus("error");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  function handleDropdownScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) void loadMoreSuggestions();
  }

  function selectSuggestion(suggestion: ReferenceSuggestion) {
    if (suggestion.kind === "book") {
      setQuery(`${suggestion.queryValue ?? suggestion.displayReference} `);
      return;
    }
    if (selected.has(suggestion.verseKey)) {
      onChange(verseKeys.filter((verseKey) => verseKey !== suggestion.verseKey));
      return;
    }
    if (verseKeys.length >= 10) return;
    onChange([...verseKeys, suggestion.verseKey]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + delta + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) selectSuggestion(suggestion);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  return (
    <div className="community-verse-picker" onBlur={handleBlur}>
      {inputVisible ? (
        <div className="community-verse-picker-input-wrap">
          <label htmlFor="community-verse-picker-input">연결 구절</label>
          <input
            aria-activedescendant={open && suggestions[activeIndex] ? `community-verse-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-controls={LISTBOX_ID}
            aria-expanded={open}
            autoComplete="off"
            id="community-verse-picker-input"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (!query.trim()) {
                setSuggestions(ALL_BOOK_SUGGESTIONS);
                setContext(undefined);
                setNextOffset(null);
                setActiveIndex(0);
                setOpen(true);
                return;
              }
              if (suggestions.length || status === "error") setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="창세기 또는 GEN 2:1"
            role="combobox"
            value={query}
          />
          <small>책 이름만 입력하면 1:1부터 마지막 장까지 열립니다. 책을 찾은 뒤에는 2:1처럼 입력해 해당 장만 볼 수 있습니다.</small>
        </div>
      ) : null}

      {open ? (
        <div aria-label="성경 구절 후보" aria-multiselectable="true" className="community-verse-picker-dropdown" id={LISTBOX_ID} onScroll={handleDropdownScroll} role="listbox">
          <div className="community-verse-picker-table-head" role="presentation">
            <strong>{showingAllBooks ? "성경 66권" : context ? context.scope === "book" ? `${context.displayName} 전체 ${context.chapterCount}장` : `${context.displayName} ${context.chapter}장` : "성경 책 선택"}</strong>
            <span>{showingAllBooks ? "구약 39권 · 신약 27권" : status === "loading" ? "불러오는 중…" : suggestions.length ? `${suggestions.length}개 구절${nextOffset !== null ? " · 계속 불러오기" : ""}` : "후보 없음"}</span>
          </div>
          {status === "error" ? <p aria-live="polite" className="community-verse-picker-empty">구절 목록을 불러오지 못했습니다.</p> : null}
          {status !== "error" && !suggestions.length ? <p className="community-verse-picker-empty">책 이름이나 약어를 확인해 주세요.</p> : null}
          {suggestions.map((suggestion, index) => {
            const isVerse = suggestion.kind === "verse";
            const isSelected = isVerse && selected.has(suggestion.verseKey);
            return (
              <button
                aria-selected={isSelected}
                className="community-verse-picker-option"
                data-active={index === activeIndex || undefined}
                data-input-match={isVerse && suggestion.isInputMatch || undefined}
                id={`community-verse-option-${index}`}
                key={isVerse ? suggestion.verseKey : suggestion.bookId}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                ref={index === activeIndex ? activeOptionRef : undefined}
                role="option"
                type="button"
              >
                <span className="community-verse-picker-reference">{suggestion.displayReference}{isVerse && suggestion.isInputMatch ? <em>입력한 절</em> : null}</span>
                <span className="community-verse-picker-preview">{suggestion.displayText}</span>
                <span className="community-verse-picker-select-state">{isSelected ? <><Check aria-hidden="true" size={16} />선택됨</> : <><Plus aria-hidden="true" size={16} />{isVerse ? "추가" : "열기"}</>}</span>
              </button>
            );
          })}
          {nextOffset !== null ? <button className="community-verse-picker-more" disabled={loadingMore} onClick={() => void loadMoreSuggestions()} type="button">{loadingMore ? "다음 구절 불러오는 중…" : "다음 구절 더 보기"}</button> : null}
        </div>
      ) : null}

      {verseKeys.length ? (
        <div aria-label="선택한 구절" className="community-composer-chips">
          {verseKeys.map((verseKey) => (
            <span key={verseKey}>{formatVerseKey(verseKey)}<button aria-label={`${formatVerseKey(verseKey)} 제거`} onClick={() => onChange(verseKeys.filter((key) => key !== verseKey))} type="button"><X aria-hidden="true" size={14} /></button></span>
          ))}
        </div>
      ) : null}
      {verseKeys.length >= 10 ? <p className="community-verse-picker-limit">구절은 최대 10개까지 연결할 수 있습니다.</p> : null}
    </div>
  );
}
