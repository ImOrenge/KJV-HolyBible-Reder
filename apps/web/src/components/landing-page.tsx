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

const proofChips = ["마지막 위치 기억", "통독률 확인", "구절 하이라이트", "인용 보관", "말씀 듣기"];

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
    body: "마지막으로 읽던 권, 장, 절을 기억해 다음 방문에서 바로 시작합니다.",
    icon: BookOpen,
    label: "이어 읽기",
    title: "마지막으로 읽은 장에서 바로 시작합니다.",
  },
  {
    body: "전체, 구약/신약, 권별 진행을 숫자와 화면에서 확인합니다.",
    icon: BarChart3,
    label: "통독률",
    title: "통독률을 숫자로 확인합니다.",
  },
  {
    body: "중요한 구절을 색상과 메모로 표시해 다시 볼 수 있게 정리합니다.",
    icon: Highlighter,
    label: "하이라이트",
    title: "중요한 구절은 표시와 메모로 남깁니다.",
  },
  {
    body: "설교, 묵상, 글쓰기, SNS에 자주 쓰는 구절을 읽는 자리에서 보관합니다.",
    icon: Bookmark,
    label: "인용 보관함",
    title: "다시 인용할 말씀을 따로 모아둡니다.",
  },
  {
    body: "현재 장이나 선택 구절을 브라우저 음성으로 들을 수 있습니다.",
    icon: Headphones,
    label: "말씀 듣기",
    title: "읽기 어려운 순간에는 듣기로 따라갑니다.",
  },
];

const workflowSteps = [
  {
    label: "01",
    text: "홈에서 마지막 위치와 통독률을 확인하고 바로 읽기 시작합니다.",
    title: "마지막 위치에서 시작",
  },
  {
    label: "02",
    text: "구절을 선택해 강조, 메모, 인용 보관을 같은 화면에서 처리합니다.",
    title: "구절 표시와 메모",
  },
  {
    label: "03",
    text: "현재 장 또는 선택 구절을 브라우저 음성으로 들으며 내용을 복습합니다.",
    title: "선택한 말씀 듣기",
  },
  {
    label: "04",
    text: "저장된 위치와 기록을 기준으로 다음 방문에서 같은 장을 다시 엽니다.",
    title: "기록에서 다시 열기",
  },
];

function revealDelay(delay: string): CSSProperties {
  return { "--reveal-delay": delay } as CSSProperties;
}

function getPrimaryAction(isAuthenticated: boolean) {
  return {
    href: "/app",
    label: isAuthenticated ? "내 리더노트 열기" : "로그인 없이 읽기",
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
            <a href="#why">왜 필요한가</a>
            <a href="#preview">앱 화면</a>
            <a href="#flow">사용 흐름</a>
          </div>
          <Link className="landing-nav-cta" href={primary.href}>
            {primary.label}
          </Link>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-content landing-reveal" data-reveal style={revealDelay("80ms")}>
            <p className="eyebrow">KJV 성경앱 · 통독 기록 · 구절 보관</p>
            <h1 id="landing-title">KJV 성경을 읽고 기록하는 성경앱</h1>
            <p className="landing-hero-punch">KJV 리더노트에서 읽던 자리와 마음에 남은 구절을 이어가세요.</p>
            <p className="landing-hero-copy">
              KJV 리더노트는 KJV 성경 읽기, 통독 기록, 하이라이트, 메모, 인용 보관을 한 화면으로 이어주는
              개인 성경앱입니다. 성경 읽기는 로그인 없이 시작하고, 계정은 기록을 이어갈 때 사용합니다.
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
          <p className="eyebrow">왜 필요한가</p>
          <h2 id="landing-problem-title">읽은 위치와 다시 보고 싶은 말씀은 따로 두면 금방 잊힙니다.</h2>
        </div>
        <p>
          어디까지 읽었는지, 어떤 구절을 표시했는지, 다시 인용하려던 말씀이 어디 있었는지. KJV
          리더노트는 읽기와 기록을 같은 자리에서 정리합니다.
        </p>
      </section>

      <section
        className="landing-section landing-preview-section landing-reveal"
        data-reveal
        id="preview"
        aria-labelledby="landing-preview-title"
      >
        <div className="landing-section-copy">
          <p className="eyebrow">앱 화면</p>
          <h2 id="landing-preview-title">홈에서 바로 읽고, 읽는 자리에서 바로 보관합니다.</h2>
          <p>
            마지막 위치는 홈에서 확인하고, 리더에서는 구절을 표시하거나 메모합니다. 다시 쓸 말씀은 인용
            보관함에서 바로 꺼냅니다.
          </p>
        </div>
        <LandingAppFlowPreview />
      </section>

      <section className="landing-section landing-reveal" data-reveal aria-labelledby="landing-benefits-title">
        <div className="landing-section-copy landing-section-copy-wide">
          <p className="eyebrow">읽기와 기록</p>
          <h2 id="landing-benefits-title">매일 읽고, 표시하고, 다시 찾는 일에 집중했습니다.</h2>
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
          <p className="eyebrow">사용 흐름</p>
          <h2 id="landing-flow-title">오늘의 읽기가 내일의 기록이 됩니다.</h2>
          <p>
            마지막 위치에서 시작하고, 읽는 중 표시한 말씀을 보관하고, 필요할 때 다시 듣거나 인용합니다.
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
        <h2 id="landing-final-title">오늘 마음에 남은 말씀을 다음 공부까지 가져가세요.</h2>
        <p>읽던 위치, 표시한 구절, 다시 쓸 인용을 내 리더노트에 정리하고 바로 이어 읽으세요.</p>
        <LandingActions isAuthenticated={isAuthenticated} />
      </section>
      <footer className="landing-footer" aria-label="성경 본문 출처 및 라이선스">
        <div className="landing-footer-inner">
          <p>
            성경 본문 출처: CrossWire Bible Society{" "}
            <a href="https://crosswire.org/sword/modules/ModInfo.jsp?modName=KJV" target="_blank" rel="noreferrer">
              KJV SWORD module 3.1
            </a>
            . Distribution License:{" "}
            <a href="https://www.crosswire.org/sword/about/license.jsp" target="_blank" rel="noreferrer">
              GPL
            </a>
            .
          </p>
          <p>KJV 본문 권리와 지역별 배포 조건은 공개 출시 범위에 맞춰 재검토합니다.</p>
        </div>
      </footer>
    </main>
  );
}
