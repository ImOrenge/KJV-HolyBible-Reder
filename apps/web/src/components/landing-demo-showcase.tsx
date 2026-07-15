"use client";

import type { CSSProperties, FocusEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Bookmark,
  BookOpen,
  Check,
  Headphones,
  Highlighter,
  Pause,
  Play,
  Sparkles,
  StickyNote,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import {
  ContinueReadingPanel,
  ProgressMetricPanel,
  ReaderPreviewPanel,
  type ReaderPreviewTool,
  type ReaderPreviewVerse,
} from "@/components/app-preview-panels";

const DEMO_DURATION_MS = 5200;

const demoScenes = [
  {
    description: "마지막 읽은 장과 통독률을 확인하고 바로 이어서 읽습니다.",
    icon: BookOpen,
    id: "continue",
    label: "이어 읽기",
  },
  {
    description: "마음에 남은 구절을 강조하고 생각을 개인 노트로 연결합니다.",
    icon: Highlighter,
    id: "record",
    label: "표시와 기록",
  },
  {
    description: "설교와 묵상에 다시 쓸 말씀을 주제별 인용 보관함에 모읍니다.",
    icon: Bookmark,
    id: "quote",
    label: "인용 보관",
  },
  {
    description: "현재 장이나 선택한 구절을 브라우저 음성으로 이어 듣습니다.",
    icon: Headphones,
    id: "listen",
    label: "말씀 듣기",
  },
] as const satisfies ReadonlyArray<{
  description: string;
  icon: LucideIcon;
  id: string;
  label: string;
}>;

type DemoSceneId = (typeof demoScenes)[number]["id"];

const demoVerses: ReaderPreviewVerse[] = [
  {
    number: 14,
    text: "Because thou hast done this, thou art cursed above all cattle...",
  },
  {
    favorite: true,
    highlighted: true,
    note: true,
    number: 15,
    text: "And I will put enmity between thee and the woman, and between thy seed and her seed.",
  },
  {
    number: 16,
    text: "It shall bruise thy head, and thou shalt bruise his heel.",
  },
];

const demoTools: ReaderPreviewTool[] = [
  { icon: "highlight", label: "강조" },
  { icon: "note", label: "메모" },
  { icon: "bookmark", label: "인용 저장" },
];

function ContinueScene() {
  return (
    <div className="landing-demo-dashboard">
      <ContinueReadingPanel
        className="landing-demo-continue"
        ctaLabel="창세기 3장 이어 읽기"
        headingElement="p"
        readonly
        subtitle="15절 근처 · 오늘 오전"
        title="마지막으로 읽던 자리"
      />
      <ProgressMetricPanel
        className="landing-demo-progress"
        detail="총 218 / 1,189장"
        label="전체 통독률"
        percent={18.4}
        value="18.4%"
      />
      <div className="landing-demo-today">
        <div>
          <span>오늘의 읽기</span>
          <strong>창세기 3–4장</strong>
        </div>
        <span className="landing-demo-status">
          <Check aria-hidden="true" size={14} /> 준비됨
        </span>
      </div>
    </div>
  );
}

function RecordScene() {
  return (
    <div className="landing-demo-record">
      <ReaderPreviewPanel
        bookLabel="Genesis"
        chapterLabel="창세기 3장"
        className="landing-demo-reader"
        headingElement="p"
        selectedVerseNumber={15}
        tools={demoTools}
        verses={demoVerses}
      />
      <div className="landing-demo-note">
        <span>
          <StickyNote aria-hidden="true" size={15} /> 구절 노트
        </span>
        <strong>약속의 시작</strong>
        <p>창세기 3:15를 복음의 약속이라는 주제로 다시 살펴보기.</p>
        <div>
          <span>복음</span>
          <span>약속</span>
        </div>
      </div>
    </div>
  );
}

function QuoteScene() {
  return (
    <div className="landing-demo-quote-library">
      <div className="landing-demo-library-head">
        <div>
          <span>인용 보관함</span>
          <strong>다시 꺼내 쓸 말씀</strong>
        </div>
        <span>12개 구절</span>
      </div>
      <div className="landing-demo-quote-list">
        <article className="is-active">
          <span>창세기 3:15</span>
          <p>And I will put enmity between thee and the woman...</p>
          <div>
            <span>복음</span>
            <span>약속</span>
          </div>
        </article>
        <article>
          <span>요한복음 3:16</span>
          <p>For God so loved the world, that he gave his only begotten Son...</p>
          <div>
            <span>사랑</span>
            <span>구원</span>
          </div>
        </article>
        <article>
          <span>로마서 8:28</span>
          <p>And we know that all things work together for good...</p>
          <div>
            <span>소망</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function ListenScene() {
  return (
    <div className="landing-demo-listen">
      <div className="landing-demo-now-playing">
        <div className="landing-demo-audio-icon">
          <Volume2 aria-hidden="true" size={24} />
        </div>
        <div>
          <span>현재 재생 중</span>
          <strong>창세기 3장 15절</strong>
          <p>선택한 구절부터 자연스럽게 이어 듣습니다.</p>
        </div>
      </div>
      <div className="landing-demo-wave" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} style={{ "--wave-index": index } as CSSProperties} />
        ))}
      </div>
      <div className="landing-demo-audio-progress">
        <div>
          <span />
        </div>
        <p>
          <span>00:24</span>
          <span>01:18</span>
        </p>
      </div>
      <div className="landing-demo-listen-options">
        <span>선택 구절</span>
        <span className="is-active">1.0×</span>
        <span>연속 재생</span>
      </div>
    </div>
  );
}

function DemoScene({ id }: { id: DemoSceneId }) {
  if (id === "continue") return <ContinueScene />;
  if (id === "record") return <RecordScene />;
  if (id === "quote") return <QuoteScene />;
  return <ListenScene />;
}

export function LandingDemoShowcase() {
  const demoRef = useRef<HTMLElement>(null);
  const instanceId = useId().replaceAll(":", "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const activeScene = demoScenes[activeIndex];
  const interactionPaused = isFocusPaused || isHoverPaused;
  const playbackEnabled = isPlaying && !interactionPaused;
  const effectivePlaying =
    hasHydrated &&
    isPlaying &&
    !isDocumentHidden &&
    !interactionPaused &&
    isInViewport &&
    !prefersReducedMotion;

  useEffect(() => setHasHydrated(true), []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentHidden(document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const element = demoRef.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.35, 0.65] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!effectivePlaying) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % demoScenes.length);
    }, DEMO_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, effectivePlaying]);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocusPaused(false);
    }
  };

  const selectScene = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (playbackEnabled) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setIsFocusPaused(false);
    setIsHoverPaused(false);
  };

  return (
    <section
      aria-label="KJV 리더노트 기능 데모"
      aria-roledescription="carousel"
      className="landing-demo"
      data-active-scene={activeScene.id}
      data-playing={effectivePlaying ? "true" : "false"}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      onBlurCapture={handleBlur}
      onFocusCapture={() => setIsFocusPaused(true)}
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      ref={demoRef}
      style={{ "--landing-demo-duration": `${DEMO_DURATION_MS}ms` } as CSSProperties}
    >
      <div className="landing-demo-glow" aria-hidden="true" />
      <div className="landing-demo-window">
        <div className="landing-demo-window-bar">
          <div aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>KJV 리더노트</strong>
          <span className="landing-demo-live">
            <span aria-hidden="true" /> LIVE DEMO
          </span>
        </div>

        <div className="landing-demo-stage">
          <div className="landing-demo-scene-copy">
            <span>
              <Sparkles aria-hidden="true" size={14} /> {String(activeIndex + 1).padStart(2, "0")}
            </span>
            <strong>{activeScene.label}</strong>
            <p>{activeScene.description}</p>
          </div>

          <div className="landing-demo-scene-stack">
            {demoScenes.map((scene, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  aria-hidden={!isActive}
                  className={`landing-demo-scene${isActive ? " is-active" : ""}`}
                  id={`${instanceId}-panel-${scene.id}`}
                  key={scene.id}
                >
                  <DemoScene id={scene.id} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="landing-demo-controls">
          <div aria-label="데모 장면 선택" className="landing-demo-tabs" role="group">
            {demoScenes.map((scene, index) => {
              const Icon = scene.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  aria-controls={`${instanceId}-panel-${scene.id}`}
                  aria-label={`${scene.label} 데모 보기`}
                  aria-pressed={isActive}
                  className={isActive ? "is-active" : ""}
                  key={scene.id}
                  onClick={() => selectScene(index)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={15} />
                  <span>{scene.label}</span>
                  {isActive && effectivePlaying ? (
                    <i aria-hidden="true" key={`${scene.id}-${activeIndex}`} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            aria-label={
              prefersReducedMotion
                ? "모션 감소 설정으로 데모 자동 전환이 꺼져 있습니다"
                : playbackEnabled
                  ? "데모 자동 전환 끄기"
                  : "데모 자동 전환 켜기"
            }
            className="landing-demo-playback"
            disabled={prefersReducedMotion}
            onClick={togglePlayback}
            title={prefersReducedMotion ? "기기의 모션 감소 설정에 따라 자동 전환이 꺼져 있습니다." : undefined}
            type="button"
          >
            {playbackEnabled && !prefersReducedMotion ? (
              <Pause aria-hidden="true" size={16} />
            ) : (
              <Play aria-hidden="true" size={16} />
            )}
            <span>
              {prefersReducedMotion ? "모션 최소화" : playbackEnabled ? "일시정지" : "자동 재생"}
            </span>
          </button>
        </div>
      </div>

      <p aria-live={effectivePlaying ? "off" : "polite"} className="sr-only">
        현재 데모 장면: {activeScene.label}. {activeScene.description}
      </p>
    </section>
  );
}
