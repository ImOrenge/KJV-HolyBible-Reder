import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, BookOpen, Bookmark, Headphones, Highlighter } from "lucide-react";
import Link from "next/link";
import {
  ContinueReadingPanel,
  ProgressMetricPanel,
  ReaderPreviewPanel,
  type ReaderPreviewTool,
  type ReaderPreviewVerse,
} from "@/components/app-preview-panels";
import { LandingRevealController } from "@/components/landing-reveal-controller";

type LandingPageProps = {
  isAuthenticated: boolean;
};

const proofChips = ["마지막 위치 기억", "통독 흐름 확인", "구절 하이라이트", "인용 구절 보관", "TTS 듣기"];

const previewVerses: ReaderPreviewVerse[] = [
  {
    number: 14,
    text: "Because thou hast done this, thou art cursed above all cattle...",
  },
  {
    favorite: true,
    highlighted: true,
    number: 15,
    text: "And I will put enmity between thee and the woman, and between thy seed and her seed.",
  },
  {
    note: true,
    number: 16,
    text: "It shall bruise thy head, and thou shalt bruise his heel.",
  },
];

const previewTools: ReaderPreviewTool[] = [
  { icon: "highlight", label: "강조" },
  { icon: "note", label: "메모" },
  { icon: "bookmark", label: "인용 저장" },
  { icon: "listen", label: "듣기" },
];

const benefitCards = [
  {
    body: "마지막으로 읽던 권, 장, 절을 기억해 다음 방문에서 바로 이어갑니다.",
    icon: BookOpen,
    label: "이어 읽기",
    title: "다시 시작할 곳을 찾느라 멈추지 않습니다.",
  },
  {
    body: "전체, 구약/신약, 권별 진행을 숫자와 화면 흐름으로 확인합니다.",
    icon: BarChart3,
    label: "통독률",
    title: "통독이 감이 아니라 기록으로 보입니다.",
  },
  {
    body: "중요한 구절을 색상과 메모로 표시해 다시 볼 수 있게 남깁니다.",
    icon: Highlighter,
    label: "하이라이트",
    title: "지나가면 잊히는 구절을 붙잡아 둡니다.",
  },
  {
    body: "설교, 묵상, 글쓰기, SNS에 자주 쓰는 구절을 읽는 자리에서 보관합니다.",
    icon: Bookmark,
    label: "인용 보관함",
    title: "다시 쓸 구절을 따로 찾지 않아도 됩니다.",
  },
  {
    body: "현재 장이나 선택 구절을 브라우저 음성으로 들을 수 있습니다.",
    icon: Headphones,
    label: "TTS",
    title: "읽기 어려운 시간에도 흐름을 이어갑니다.",
  },
];

const workflowSteps = [
  {
    label: "01",
    text: "홈에서 마지막 위치와 통독 흐름을 확인하고 바로 읽기 시작합니다.",
    title: "오늘 읽을 자리로 돌아가기",
  },
  {
    label: "02",
    text: "구절을 선택해 강조, 메모, 인용 보관을 같은 화면에서 처리합니다.",
    title: "읽다가 붙잡은 구절 남기기",
  },
  {
    label: "03",
    text: "현재 장 또는 선택 구절을 TTS로 들으며 읽은 내용을 복습합니다.",
    title: "다시 들으며 흐름 확인하기",
  },
  {
    label: "04",
    text: "저장된 위치와 기록을 기준으로 다음 방문에서 같은 흐름을 이어갑니다.",
    title: "다음 공부로 이어가기",
  },
];

function revealDelay(delay: string): CSSProperties {
  return { "--reveal-delay": delay } as CSSProperties;
}

function getPrimaryAction(isAuthenticated: boolean) {
  return {
    href: isAuthenticated ? "/app" : "/auth/login?next=/app",
    label: isAuthenticated ? "내 리더노트 열기" : "내 리더노트 시작하기",
  };
}

function getSecondaryAction(isAuthenticated: boolean) {
  return {
    href: isAuthenticated ? "/app" : "/auth/sign-up",
    label: isAuthenticated ? "앱으로 이동" : "계정 만들기",
  };
}

function LandingActions({ isAuthenticated }: LandingPageProps) {
  const primary = getPrimaryAction(isAuthenticated);
  const secondary = getSecondaryAction(isAuthenticated);

  return (
    <div className="landing-actions" aria-label="랜딩 주요 동작">
      <Link className="primary-button landing-primary-action" href={primary.href}>
        {primary.label}
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
      <Link className="secondary-button landing-secondary-action" href={secondary.href}>
        {secondary.label}
      </Link>
    </div>
  );
}

function LandingAppFrame() {
  return (
    <div className="landing-app-frame" aria-label="KJV 리더노트 앱 화면 미리보기">
      <div className="landing-app-frame-topbar">
        <strong>KJV 리더노트</strong>
        <div>
          <span>홈</span>
          <span>성경</span>
          <span>인용</span>
        </div>
      </div>
      <div className="landing-app-frame-grid">
        <ContinueReadingPanel
          className="landing-frame-continue"
          ctaLabel="이어 읽기"
          readonly
          subtitle="15절 근처 · 오늘 오전"
          title="창세기 3장"
        />
        <ProgressMetricPanel
          className="landing-frame-metric"
          detail="총 218 / 1,189장"
          label="전체 통독률"
          percent={18.4}
          value="18.4%"
        />
        <ReaderPreviewPanel
          bookLabel="Genesis"
          chapterLabel="창세기 3장"
          className="landing-frame-reader"
          selectedVerseNumber={15}
          tools={previewTools}
          verses={previewVerses}
        />
      </div>
    </div>
  );
}

function LandingAppFlowPreview() {
  return (
    <div className="landing-product-flow" aria-label="홈, 리더, 인용 흐름 미리보기">
      <div className="landing-product-home">
        <ContinueReadingPanel
          ctaLabel="이어 읽기"
          readonly
          subtitle="오늘 다시 시작할 자리"
          title="창세기 3장 15절 근처"
        />
        <ProgressMetricPanel label="이번 주 읽기" percent={64} value="64%" detail="플랜 기준 7개 중 4개 완료" />
      </div>
      <ReaderPreviewPanel
        bookLabel="Genesis"
        chapterLabel="창세기 3장"
        className="landing-product-reader"
        selectedVerseNumber={15}
        tools={previewTools}
        verses={previewVerses}
      />
      <div className="landing-product-quote">
        <div className="panel-heading">
          <span>인용 보관함</span>
          <Bookmark aria-hidden="true" size={18} />
        </div>
        <strong>구원 설명</strong>
        <p>창세기 3:15 · 설교 준비와 묵상 글에 다시 쓸 구절을 한곳에 남깁니다.</p>
        <div className="tag-strip" aria-hidden="true">
          <span className="tag-chip">복음</span>
          <span className="tag-chip">약속</span>
          <span className="tag-chip">인용</span>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const primary = getPrimaryAction(isAuthenticated);

  return (
    <main className="landing-page">
      <LandingRevealController />
      <section className="landing-hero" aria-labelledby="landing-title">
        <nav className="landing-nav landing-reveal" aria-label="랜딩 내비게이션" data-reveal>
          <Link className="landing-brand" href="/">
            <span>KJV</span>
            <strong>리더노트</strong>
          </Link>
          <div className="landing-nav-links">
            <a href="#why">문제</a>
            <a href="#preview">앱 화면</a>
            <a href="#flow">공부 흐름</a>
          </div>
          <Link className="landing-nav-cta" href={primary.href}>
            {primary.label}
          </Link>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-content landing-reveal" data-reveal style={revealDelay("80ms")}>
            <p className="eyebrow">KJV 성경 통독과 구절 기록</p>
            <h1 id="landing-title">KJV 리더노트</h1>
            <p className="landing-hero-punch">
              읽던 자리로 돌아오고,
              <br />
              붙잡은 구절은 남겨두세요.
            </p>
            <p className="landing-hero-copy">
              매일의 성경 통독, 강조한 구절, 다시 꺼내 쓸 인용 구절을 하나의 개인 공부 흐름으로 이어주는
              KJV 성경 리더입니다.
            </p>
            <LandingActions isAuthenticated={isAuthenticated} />
            <ul className="landing-proof-list" aria-label="핵심 기능">
              {proofChips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          </div>

          <div className="landing-hero-preview landing-reveal" data-reveal style={revealDelay("180ms")}>
            <LandingAppFrame />
          </div>
        </div>
      </section>

      <section className="landing-problem-band landing-reveal" data-reveal id="why" aria-labelledby="landing-problem-title">
        <div>
          <p className="eyebrow">문제</p>
          <h2 id="landing-problem-title">성경을 읽다 보면 기록은 금방 흩어집니다.</h2>
        </div>
        <p>
          어디까지 읽었는지, 어떤 구절을 붙잡았는지, 다시 쓰려던 말씀이 어디 있었는지. KJV 리더노트는
          이 흐름을 한곳에 남깁니다.
        </p>
      </section>

      <section
        className="landing-section landing-preview-section landing-reveal"
        data-reveal
        id="preview"
        aria-labelledby="landing-preview-title"
      >
        <div className="landing-section-copy">
          <p className="eyebrow">실제 앱 UI</p>
          <h2 id="landing-preview-title">홈에서 읽기로, 읽기에서 인용 보관으로 이어집니다.</h2>
          <p>
            홈에서는 오늘 다시 시작할 자리가 보이고, 리더에서는 읽는 중 바로 표시하고 저장할 수 있습니다.
            나중에 필요한 구절은 인용 보관함에서 다시 꺼냅니다.
          </p>
        </div>
        <LandingAppFlowPreview />
      </section>

      <section className="landing-section landing-reveal" data-reveal aria-labelledby="landing-benefits-title">
        <div className="landing-section-copy landing-section-copy-wide">
          <p className="eyebrow">핵심 이점</p>
          <h2 id="landing-benefits-title">성경 공부의 흐름을 끊지 않도록 필요한 기능만 한곳에 모았습니다.</h2>
        </div>
        <div className="landing-benefit-grid">
          {benefitCards.map(({ body, icon: Icon, label, title }, index) => (
            <article
              className="landing-benefit-card landing-reveal"
              data-reveal
              key={title}
              style={revealDelay(`${index * 70}ms`)}
            >
              <div className="landing-benefit-icon">
                <Icon aria-hidden="true" size={20} />
              </div>
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-section landing-flow-section landing-reveal"
        data-reveal
        id="flow"
        aria-labelledby="landing-flow-title"
      >
        <div className="landing-section-copy">
          <p className="eyebrow">공부 흐름</p>
          <h2 id="landing-flow-title">오늘의 읽기가 다음 공부로 이어집니다.</h2>
          <p>
            오늘 읽을 자리로 돌아가고, 읽다가 붙잡은 구절을 남기고, 필요할 때 다시 듣고, 다음 방문에서
            같은 흐름을 이어갑니다.
          </p>
        </div>
        <div className="landing-flow-list">
          {workflowSteps.map((step, index) => (
            <article className="landing-flow-step landing-reveal" data-reveal key={step.label} style={revealDelay(`${index * 80}ms`)}>
              <span>{step.label}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta landing-reveal" data-reveal aria-labelledby="landing-final-title">
        <p className="eyebrow">시작하기</p>
        <h2 id="landing-final-title">오늘 읽은 말씀이 흩어지지 않게.</h2>
        <p>읽던 자리와 붙잡은 구절을 내 리더노트에 남기고, 다음 공부를 같은 자리에서 이어가세요.</p>
        <LandingActions isAuthenticated={isAuthenticated} />
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(() => {
  const elements = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!elements.length) return;
  const reveal = () => {
    const triggerY = window.innerHeight * 0.92;
    elements.forEach((element) => {
      if (element.classList.contains("is-visible")) return;
      if (element.getBoundingClientRect().top <= triggerY) {
        element.classList.add("is-visible");
      }
    });
  };
  reveal();
  window.addEventListener("scroll", reveal, { passive: true });
})();
          `,
        }}
      />
    </main>
  );
}
