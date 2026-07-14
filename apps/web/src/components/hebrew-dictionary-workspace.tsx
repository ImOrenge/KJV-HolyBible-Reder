"use client";

import { ArrowLeft, BookOpenText, RotateCcw, Search, SlidersHorizontal, StickyNote, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  formatHebrewDictionaryReference,
  type HebrewDictionaryEntrySummary,
  type HebrewDictionarySearchResponse,
  type HebrewDictionarySort,
} from "@/lib/hebrew-dictionary";

type FilterOption = { id: string; label: string };

type HebrewDictionaryWorkspaceProps = {
  alphabet: string;
  bookId: string;
  bookOptions: FilterOption[];
  error: string;
  query: string;
  result: HebrewDictionarySearchResponse;
  selectedEntry: HebrewDictionaryEntrySummary | null;
  selectedEntryKey: string | null;
  sort: HebrewDictionarySort;
  status: "idle" | "loading" | "ready" | "error";
  themeId: string;
  themeOptions: FilterOption[];
  onAddToNote: (entry: HebrewDictionaryEntrySummary) => void;
  onAlphabetChange: (value: string) => void;
  onBookChange: (value: string) => void;
  onOpenOccurrence: (bookId: string, chapter: number, verse: number) => void;
  onQueryChange: (value: string) => void;
  onSelectEntry: (normalizedKey: string | null) => void;
  onSortChange: (value: HebrewDictionarySort) => void;
  onThemeChange: (value: string) => void;
};

const alphabetOptions = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function HebrewDictionaryWorkspace(props: HebrewDictionaryWorkspaceProps) {
  const [mobilePane, setMobilePane] = useState<"list" | "detail">(props.selectedEntryKey ? "detail" : "list");
  const activeFilterCount = Number(props.alphabet !== "all") + Number(props.themeId !== "all") + Number(props.bookId !== "all");
  const selectedTheme = props.themeOptions.find((option) => option.id === props.themeId);
  const selectedBook = props.bookOptions.find((option) => option.id === props.bookId);

  useEffect(() => {
    setMobilePane(props.selectedEntryKey ? "detail" : "list");
  }, [props.selectedEntryKey]);

  const resetFilters = () => {
    props.onAlphabetChange("all");
    props.onThemeChange("all");
    props.onBookChange("all");
  };

  return (
    <div className="f-hebrew-dictionary" data-mobile-pane={mobilePane}>
      <section aria-label="히브리어 단어 목록" className="f-hebrew-dictionary__list-pane">
        <div className="f-hebrew-dictionary__controls">
          <label className="f-hebrew-dictionary__search">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">히브리어 사전 검색</span>
            <input
              onChange={(event) => props.onQueryChange(event.target.value)}
              placeholder="히브리어, 발음, 한영 의미, 스트롱 번호"
              type="search"
              value={props.query}
            />
          </label>

          {activeFilterCount ? (
            <div aria-label="적용된 사전 필터" className="f-hebrew-dictionary__active-filters">
              {props.alphabet !== "all" ? (
                <button aria-label={`알파벳 ${props.alphabet} 필터 해제`} onClick={() => props.onAlphabetChange("all")} type="button">
                  알파벳 {props.alphabet}<X aria-hidden="true" size={13} />
                </button>
              ) : null}
              {selectedTheme ? (
                <button aria-label={`${selectedTheme.label} 테마 필터 해제`} onClick={() => props.onThemeChange("all")} type="button">
                  {selectedTheme.label}<X aria-hidden="true" size={13} />
                </button>
              ) : null}
              {selectedBook ? (
                <button aria-label={`${selectedBook.label} 권 필터 해제`} onClick={() => props.onBookChange("all")} type="button">
                  {selectedBook.label}<X aria-hidden="true" size={13} />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="f-hebrew-dictionary__filter-bar">
            <details className="f-hebrew-dictionary__filter-menu">
              <summary>
                <SlidersHorizontal aria-hidden="true" size={16} />
                필터
                {activeFilterCount ? <span>{activeFilterCount}</span> : null}
              </summary>
              <div className="f-hebrew-dictionary__filter-popover">
                <label>
                  알파벳
                  <select onChange={(event) => props.onAlphabetChange(event.target.value)} value={props.alphabet}>
                    <option value="all">전체 알파벳</option>
                    {alphabetOptions.map((letter) => <option key={letter} value={letter}>{letter}</option>)}
                  </select>
                </label>
                <label>
                  테마
                  <select onChange={(event) => props.onThemeChange(event.target.value)} value={props.themeId}>
                    <option value="all">전체 테마</option>
                    {props.themeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  성경 권
                  <select onChange={(event) => props.onBookChange(event.target.value)} value={props.bookId}>
                    <option value="all">전체 구약</option>
                    {props.bookOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <button className="small-button" disabled={!activeFilterCount} onClick={resetFilters} type="button">
                  <RotateCcw aria-hidden="true" size={15} />
                  필터 초기화
                </button>
              </div>
            </details>

            <label className="f-hebrew-dictionary__sort">
              <span className="sr-only">사전 정렬</span>
              <select onChange={(event) => props.onSortChange(event.target.value as HebrewDictionarySort)} value={props.sort}>
                <option value="alphabetical">알파벳순</option>
                <option value="canonical">성경 출현순</option>
                <option value="theme">테마 추천순</option>
              </select>
            </label>
          </div>
        </div>

        <div aria-live="polite" className="f-hebrew-dictionary__summary" role="status">
          {props.status === "loading" ? "사전 검색 중" : `${props.result.total}개 단어`}
          {props.status === "error" ? ` · ${props.error}` : ""}
        </div>

        <div className="f-hebrew-dictionary__results">
          {props.result.entries.map((entry) => {
            const occurrence = entry.sampleVerses[0];
            const active = props.selectedEntry?.normalizedKey === entry.normalizedKey;
            return (
              <button
                aria-pressed={active}
                className="f-hebrew-dictionary__result"
                data-active={active || undefined}
                key={entry.id}
                onClick={() => {
                  props.onSelectEntry(entry.normalizedKey);
                  setMobilePane("detail");
                }}
                type="button"
              >
                <span className="f-hebrew-dictionary__result-heading">
                  <strong dir="rtl">{entry.lemmaHe}</strong>
                  <small>{entry.strongNumber}</small>
                </span>
                <span>{entry.transliteration} · {entry.pronunciationSymbol} · {entry.pronunciationKo}</span>
                <b>{entry.glossKo} <small>{entry.glossEn}</small></b>
                {occurrence ? (
                  <span className="f-hebrew-dictionary__occurrence-preview">
                    <mark dir="rtl">{occurrence.surfaceHe}</mark>
                    <small>{formatHebrewDictionaryReference(occurrence)} · {occurrence.phraseKo ?? occurrence.koMatchText ?? occurrence.phraseEn ?? occurrence.kjvMatchText}</small>
                  </span>
                ) : <small>등록된 예시 구절이 없습니다.</small>}
              </button>
            );
          })}
          {!props.result.entries.length ? (
            <div className="f-hebrew-dictionary__empty">
              <BookOpenText aria-hidden="true" size={22} />
              <strong>일치하는 단어가 없습니다.</strong>
              <span>검색어나 적용된 필터를 조정하세요.</span>
            </div>
          ) : null}
        </div>
      </section>

      <aside aria-label="히브리어 단어 상세" className="f-hebrew-dictionary__detail-pane">
        <button
          className="f-hebrew-dictionary__back"
          onClick={() => {
            props.onSelectEntry(null);
            setMobilePane("list");
          }}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          단어 목록
        </button>
        {props.selectedEntry ? (
          <>
            <header className="f-hebrew-dictionary__detail-heading">
              <div>
                <strong dir="rtl">{props.selectedEntry.lemmaHe}</strong>
                <span>{props.selectedEntry.transliteration} · {props.selectedEntry.pronunciationSymbol} · {props.selectedEntry.pronunciationKo}</span>
              </div>
              <small>{props.selectedEntry.strongNumber}</small>
            </header>

            <section className="f-hebrew-dictionary__detail-section">
              <span className="eyebrow">의미</span>
              <strong>{props.selectedEntry.glossKo}</strong>
              <p lang="en">{props.selectedEntry.glossEn}</p>
              <p>{props.selectedEntry.definitionKo}</p>
              <p lang="en">{props.selectedEntry.definitionEn}</p>
            </section>

            <section className="f-hebrew-dictionary__detail-section">
              <span className="eyebrow">문맥</span>
              <p>{props.selectedEntry.interpretationNoteKo}</p>
              <div className="f-hebrew-dictionary__themes">
                {props.selectedEntry.themeIds.map((themeId) => {
                  const theme = props.themeOptions.find((option) => option.id === themeId);
                  return <span key={themeId}>{theme?.label ?? themeId}</span>;
                })}
              </div>
            </section>

            <section className="f-hebrew-dictionary__detail-section">
              <div className="f-hebrew-dictionary__section-heading">
                <span className="eyebrow">출현 예시</span>
                <small>{props.selectedEntry.sampleVerses.length}</small>
              </div>
              <div className="f-hebrew-dictionary__verse-list">
                {props.selectedEntry.sampleVerses.map((occurrence) => (
                  <button key={occurrence.id} onClick={() => props.onOpenOccurrence(occurrence.appBookId, occurrence.chapter, occurrence.verse)} type="button">
                    <span>
                      <b>{formatHebrewDictionaryReference(occurrence)}</b>
                      <mark dir="rtl">{occurrence.surfaceHe}</mark>
                    </span>
                    <small>{occurrence.phraseKo ?? occurrence.koMatchText}</small>
                    <small lang="en">{occurrence.phraseEn ?? occurrence.kjvMatchText}</small>
                  </button>
                ))}
              </div>
            </section>

            <footer className="f-hebrew-dictionary__detail-footer">
              <small>{props.selectedEntry.sourceName} · {props.selectedEntry.sourceLicense}</small>
              <button className="primary-button" onClick={() => { if (props.selectedEntry) props.onAddToNote(props.selectedEntry); }} type="button">
                <StickyNote aria-hidden="true" size={16} />
                내 노트에 추가
              </button>
            </footer>
          </>
        ) : (
          <div className="f-hebrew-dictionary__empty">
            <BookOpenText aria-hidden="true" size={22} />
            <strong>단어를 선택하세요.</strong>
            <span>목록에서 단어를 열면 의미와 출현 구절을 확인할 수 있습니다.</span>
          </div>
        )}
      </aside>
    </div>
  );
}
