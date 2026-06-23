import { BarChart3, BookOpen, Bookmark, Highlighter, StickyNote, Volume2 } from "lucide-react";

export type ContinueReadingPanelProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onOpen?: () => void;
  readonly?: boolean;
  className?: string;
};

export function ContinueReadingPanel({
  title,
  subtitle,
  ctaLabel,
  onOpen,
  readonly = false,
  className = "",
}: ContinueReadingPanelProps) {
  const ctaContent = (
    <>
      <BookOpen aria-hidden="true" size={18} />
      {ctaLabel}
    </>
  );

  return (
    <div className={`panel primary-panel continue-reading-panel ${className}`.trim()}>
      <div className="panel-heading">
        <span>이어 읽기</span>
        <BookOpen aria-hidden="true" size={20} />
      </div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {readonly ? (
        <div className="primary-button continue-reading-cta is-readonly">{ctaContent}</div>
      ) : (
        <button className="primary-button continue-reading-cta" type="button" onClick={onOpen}>
          {ctaContent}
        </button>
      )}
    </div>
  );
}

export type ProgressMetricPanelProps = {
  label: string;
  value: string;
  detail?: string;
  percent?: number;
  className?: string;
};

export function ProgressMetricPanel({ label, value, detail, percent, className = "" }: ProgressMetricPanelProps) {
  const safePercent = typeof percent === "number" ? Math.min(100, Math.max(0, percent)) : null;

  return (
    <div className={`metric-panel progress-metric-panel ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {safePercent !== null ? (
        <div className="progress-track" aria-hidden="true">
          <div style={{ width: `${safePercent}%` }} />
        </div>
      ) : null}
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export type ReaderPreviewVerse = {
  number: number;
  text: string;
  highlighted?: boolean;
  favorite?: boolean;
  note?: boolean;
};

export type ReaderPreviewTool = {
  label: string;
  icon: "highlight" | "note" | "bookmark" | "listen" | "progress";
};

const previewToolIcons = {
  bookmark: Bookmark,
  highlight: Highlighter,
  listen: Volume2,
  note: StickyNote,
  progress: BarChart3,
};

export type ReaderPreviewPanelProps = {
  bookLabel: string;
  chapterLabel: string;
  verses: ReaderPreviewVerse[];
  selectedVerseNumber?: number;
  tools: ReaderPreviewTool[];
  className?: string;
};

export function ReaderPreviewPanel({
  bookLabel,
  chapterLabel,
  verses,
  selectedVerseNumber,
  tools,
  className = "",
}: ReaderPreviewPanelProps) {
  return (
    <section className={`reader-panel reader-preview-panel ${className}`.trim()} aria-label={`${bookLabel} ${chapterLabel} 미리보기`}>
      <div className="reader-toolbar reader-preview-toolbar">
        <div />
        <div>
          <h2>{chapterLabel}</h2>
          <p>{bookLabel}</p>
        </div>
        <div />
      </div>

      <div className="verse-list mode-annotated reader-preview-list">
        {verses.map((verse) => {
          const classNames = [
            "verse-row",
            verse.highlighted ? "highlight-yellow" : "",
            verse.number === selectedVerseNumber ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={classNames} key={verse.number}>
              <span className="verse-number">{verse.number}</span>
              <span>{verse.text}</span>
              <span className="verse-markers" aria-hidden="true">
                {verse.favorite ? <Bookmark className="verse-icon" size={15} /> : null}
                {verse.note ? <StickyNote className="verse-icon" size={15} /> : null}
              </span>
            </article>
          );
        })}
      </div>

      <div className="action-panel reader-preview-tools">
        {tools.map((tool) => {
          const Icon = previewToolIcons[tool.icon];

          return (
            <span className="icon-text-button" key={tool.label}>
              <Icon aria-hidden="true" size={16} />
              {tool.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
