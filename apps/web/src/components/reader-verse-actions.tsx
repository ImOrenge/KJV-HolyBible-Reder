"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type ReaderContextTab = "note" | "original" | "links" | "saved";

type ReaderVerseActionsProps = {
  activeTab: ReaderContextTab;
  hasOriginalWords: boolean;
  onClose: () => void;
  onTabChange: (tab: ReaderContextTab) => void;
  panels: Record<ReaderContextTab, ReactNode>;
  reference?: string;
  source?: string;
};

const contextTabs: Array<{ key: ReaderContextTab; label: string }> = [
  { key: "note", label: "노트" },
  { key: "original", label: "원어" },
  { key: "links", label: "연결" },
  { key: "saved", label: "저장" },
];

export function ReaderVerseActions({
  activeTab,
  hasOriginalWords,
  onClose,
  onTabChange,
  panels,
  reference,
  source,
}: ReaderVerseActionsProps) {
  const availableTabs = contextTabs.filter((tab) => tab.key !== "original" || hasOriginalWords);
  const effectiveTab = activeTab === "original" && !hasOriginalWords ? "note" : activeTab;

  return (
    <aside className="f-reader-context" aria-label="선택 구절 공부 패널" data-state={reference ? "selected" : "empty"}>
      <div className="f-reader-context__heading">
        <div>
          <strong>{reference ?? "구절을 선택하세요"}</strong>
          <span>{source ?? "본문을 누르면 노트, 원어, 연결, 저장 작업을 시작할 수 있습니다."}</span>
        </div>
        <button className="icon-button" onClick={onClose} type="button" aria-label="공부 패널 닫기">
          <X size={17} />
        </button>
      </div>
      {reference ? (
        <>
          <div className="f-reader-context__tabs" role="tablist" aria-label="구절 공부 작업">
            {availableTabs.map((tab) => (
              <button
                aria-selected={effectiveTab === tab.key}
                className={effectiveTab === tab.key ? "is-active" : ""}
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="f-reader-context__panel" role="tabpanel">{panels[effectiveTab]}</div>
        </>
      ) : null}
    </aside>
  );
}
