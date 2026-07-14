"use client";

import {
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";

export type ReaderTranslationMode = "en" | "ko" | "parallel";

type ReaderHeaderProps = {
  contextOpen: boolean;
  currentLocation: string;
  focusMode: boolean;
  hasSelectedVerse: boolean;
  navigatorOpen: boolean;
  onNextChapter: () => void;
  onOpenChapterPicker: () => void;
  onPlayChapter: () => void;
  onPreviousChapter: () => void;
  onSetTranslationMode: (mode: ReaderTranslationMode) => void;
  onToggleContext: () => void;
  onToggleFocusMode: () => void;
  onToggleNavigator: () => void;
  overflowActions: ReactNode;
  subtitle: string;
  title: string;
  translationMode: ReaderTranslationMode;
};

export function ReaderHeader({
  contextOpen,
  currentLocation,
  focusMode,
  hasSelectedVerse,
  navigatorOpen,
  onNextChapter,
  onOpenChapterPicker,
  onPlayChapter,
  onPreviousChapter,
  onSetTranslationMode,
  onToggleContext,
  onToggleFocusMode,
  onToggleNavigator,
  overflowActions,
  subtitle,
  title,
  translationMode,
}: ReaderHeaderProps) {
  return (
    <header className="f-reader-header">
      <div className="f-reader-header__primary">
        <button
          aria-label={navigatorOpen ? "장 탐색기 닫기" : "장 탐색기 열기"}
          className="icon-button f-reader-header__pane-toggle"
          onClick={onToggleNavigator}
          title={navigatorOpen ? "장 탐색기 닫기" : "장 탐색기 열기"}
          type="button"
        >
          {navigatorOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <nav className="reader-toolbar f-reader-header__chapter" aria-label="장 이동">
          <button className="icon-button" type="button" onClick={onPreviousChapter} aria-label="이전 장">
            <SkipBack size={18} />
          </button>
          <button className="chapter-title-button" type="button" onClick={onOpenChapterPicker} aria-label="장 선택 열기">
            <h2>{title}</h2>
            <p>{subtitle}</p>
            <p className="current-verse-line">{currentLocation}</p>
          </button>
          <button className="icon-button" type="button" onClick={onNextChapter} aria-label="다음 장">
            <SkipForward size={18} />
          </button>
        </nav>
        <button
          aria-label={contextOpen ? "공부 패널 닫기" : "공부 패널 열기"}
          className="icon-button f-reader-header__pane-toggle"
          disabled={!hasSelectedVerse && !contextOpen}
          onClick={onToggleContext}
          title={contextOpen ? "공부 패널 닫기" : "공부 패널 열기"}
          type="button"
        >
          {contextOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>

      <div className="f-reader-header__tools">
        <div className="translation-segment f-reader-header__translation" role="group" aria-label="본문 언어">
          {(["en", "ko", "parallel"] as const).map((mode) => (
            <button
              aria-pressed={translationMode === mode}
              className={translationMode === mode ? "translation-segment-button active" : "translation-segment-button"}
              key={mode}
              onClick={() => onSetTranslationMode(mode)}
              type="button"
            >
              {mode === "en" ? "EN" : mode === "ko" ? "KR" : "동시"}
            </button>
          ))}
        </div>
        <button aria-label="현재 장 읽기" className="status-button f-reader-header__play" onClick={onPlayChapter} type="button">
          <Volume2 size={16} />
          <span>읽기</span>
        </button>
        <button
          aria-label={focusMode ? "집중 읽기 종료" : "집중 읽기"}
          aria-pressed={focusMode}
          className={focusMode ? "icon-button is-active" : "icon-button"}
          onClick={onToggleFocusMode}
          title={focusMode ? "집중 읽기 종료" : "집중 읽기"}
          type="button"
        >
          {focusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        <details className="f-reader-header__overflow">
          <summary aria-label="Reader 추가 작업" className="icon-button" title="Reader 추가 작업">
            <MoreHorizontal size={18} />
          </summary>
          <div className="f-reader-header__overflow-menu">{overflowActions}</div>
        </details>
      </div>
    </header>
  );
}
