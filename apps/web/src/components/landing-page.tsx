import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Highlighter,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { CoupangPartnersAd } from "@/components/coupang-partners-ad";
import { LandingDemoShowcase } from "@/components/landing-demo-showcase";
import { LandingRevealController } from "@/components/landing-reveal-controller";

type LandingPageProps = {
  isAuthenticated: boolean;
};

const proofMoments = [
  {
    detail: "마지막 위치와 통독률을 확인하고 바로 시작",
    label: "읽던 자리로",
    number: "01",
  },
  {
    detail: "하이라이트와 개인 노트로 생각을 연결",
    label: "읽으며 기록",
    number: "02",
  },
  {
    detail: "인용 보관함과 듣기로 필요한 말씀을 다시 활용",
    label: "다시 찾기",
    number: "03",
  },
];

const benefitCards = [
  {
    body: "마지막으로 읽던 장을 바로 열고 전체·구약·신약 통독률을 한눈에 확인합니다.",
    features: ["이어 읽기", "통독률"],
    icon: BookOpen,
    label: "읽기",
    title: "오늘 읽을 자리로 바로 돌아갑니다.",
  },
  {
    body: "마음에 남은 구절을 색으로 표시하고, 생각은 개인 노트로 연결해 정리합니다.",
    features: ["하이라이트", "개인 노트"],
    icon: Highlighter,
    label: "기록",
    title: "읽는 자리에서 표시하고 기록합니다.",
  },
  {
    body: "설교와 묵상에 다시 쓸 구절은 모아두고, 읽기 어려운 순간에는 음성으로 듣습니다.",
    features: ["인용 보관", "말씀 듣기"],
    icon: Bookmark,
    label: "다시 활용",
    title: "필요한 말씀을 다시 찾고 듣습니다.",
  },
];

const workflowSteps = [
  {
    label: "01",
    text: "홈에서 마지막 위치와 통독률을 확인하고 오늘 읽을 장을 엽니다.",
    title: "이어서 읽기",
  },
  {
    label: "02",
    text: "구절을 선택해 강조하고, 생각을 노트로 남기거나 인용 보관함에 모읍니다.",
    title: "표시하고 기록하기",
  },
  {
    label: "03",
    text: "저장한 말씀을 다시 열어 묵상과 글쓰기에 활용하고 필요하면 음성으로 듣습니다.",
    title: "다시 찾고 듣기",
  },
];

const faqItems = [
  {
    answer:
      "성경 읽기, 기본 듣기, 이어 읽기, 하이라이트와 인용 보관을 사용할 수 있습니다. 읽던 위치와 기록은 현재 브라우저에 저장됩니다.",
    question: "로그인 없이 무엇까지 할 수 있나요?",
  },
  {
    answer:
      "기록을 사용자별로 구분하고 개인 노트와 번역 의견처럼 인증이 필요한 기능을 사용할 수 있습니다. 읽기 위치·강조·인용 등 일부 기록은 아직 현재 브라우저에 저장됩니다.",
    question: "계정을 만들면 무엇이 달라지나요?",
  },
  {
    answer:
      "네. 같은 브라우저에서 계정으로 로그인하면 기존 게스트 기록을 계정 기록으로 가져올 수 있습니다. 브라우저 데이터를 먼저 삭제했거나 다른 기기에서 로그인한 경우에는 자동으로 가져올 수 없습니다.",
    question: "게스트 기록을 계정으로 가져올 수 있나요?",
  },
  {
    answer:
      "Android 앱은 Google Play 출시를 준비하고 있습니다. 스토어 등록이 완료되면 정확한 출시 안내와 다운로드 링크를 이 페이지에 연결합니다.",
    question: "Android 앱은 언제 받을 수 있나요?",
  },
  {
    answer:
      "브라우저의 음성 합성 기능을 사용합니다. 기기와 브라우저에 따라 제공되는 음성, 발음과 품질이 달라질 수 있습니다.",
    question: "말씀 듣기는 어떤 방식인가요?",
  },
  {
    answer:
      "영문 본문은 CrossWire Bible Society의 KJV SWORD 모듈을 기준으로 제공합니다. 자세한 출처와 배포 라이선스는 페이지 하단에서 확인할 수 있습니다.",
    question: "KJV 본문 출처는 어디인가요?",
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
  return isAuthenticated
    ? null
    : {
        href: "/auth/sign-up",
        label: "계정 만들기",
      };
}

function LandingActions({ isAuthenticated }: LandingPageProps) {
  const primary = getPrimaryAction(isAuthenticated);
  const secondary = getSecondaryAction(isAuthenticated);

  return (
    <div className="landing-actions" aria-label="랜딩 주요 동작">
      <a className="primary-button landing-primary-action" href={primary.href}>
        {primary.label}
        <ArrowRight aria-hidden="true" size={17} />
      </a>
      {secondary ? (
        <a className="secondary-button landing-secondary-action" href={secondary.href}>
          {secondary.label}
        </a>
      ) : null}
    </div>
  );
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const primary = getPrimaryAction(isAuthenticated);

  return (
    <div className="landing-page">
      <LandingRevealController />
      <header className="landing-header">
        <nav className="landing-nav landing-reveal" aria-label="랜딩 내비게이션" data-reveal>
          <Link className="landing-brand" href="/">
            <span>KJV</span>
            <strong>리더노트</strong>
          </Link>
          <div className="landing-nav-links">
            <a href="#preview">앱 데모</a>
            <a href="#account">기록 방식</a>
            <a href="#faq">자주 묻는 질문</a>
          </div>
          <div className="landing-nav-actions">
            {!isAuthenticated ? (
              <a className="landing-nav-login" href="/auth/login">
                로그인
              </a>
            ) : null}
            <a className="landing-nav-cta" href={primary.href}>
              {primary.label}
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-aurora" aria-hidden="true" />
          <div className="landing-hero-grid">
            <div className="landing-hero-content landing-reveal" data-reveal style={revealDelay("80ms")}>
              <div className="landing-hero-signals">
                <p className="eyebrow">KJV 성경앱 · 통독 기록 · 구절 보관</p>
                <p
                  aria-label="Google Play 출시 예정. 곧 Android 앱으로도 이용할 수 있습니다."
                  className="landing-release-notice"
                  role="note"
                >
                  <strong>Google Play 출시 예정</strong>
                  <span>곧 Android 앱으로도 이용할 수 있습니다.</span>
                </p>
              </div>
              <h1 id="landing-title">
                <span className="landing-title-product">KJV 리더노트</span>
                <span>
                  읽던 자리부터, <span className="landing-title-accent">마음에 남은 구절까지.</span>
                </span>
              </h1>
              <p className="landing-hero-lede">
                읽는 순간부터 다시 꺼내 쓰는 순간까지, 이어 읽기·표시·인용이 하나의 공부 흐름으로 남습니다.
              </p>
              <LandingActions isAuthenticated={isAuthenticated} />
              <p className="landing-action-note">설치 없이 웹에서 바로 시작 · 계정은 개인 기록이 필요할 때</p>
            </div>

            <div
              className="landing-hero-preview landing-reveal"
              data-reveal
              id="preview"
              style={revealDelay("180ms")}
            >
              <LandingDemoShowcase />
            </div>
          </div>
        </section>

        <section className="landing-proof-band landing-reveal" data-reveal aria-label="핵심 사용 경험">
          <div className="landing-proof-band-inner">
            {proofMoments.map((moment) => (
              <article key={moment.number}>
                <span>{moment.number}</span>
                <div>
                  <strong>{moment.label}</strong>
                  <p>{moment.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-benefits-section landing-reveal"
          data-reveal
          aria-labelledby="landing-benefits-title"
        >
          <div className="landing-section-copy landing-section-copy-wide">
            <p className="eyebrow">읽기와 기록</p>
            <h2 id="landing-benefits-title">매일 읽고, 표시하고, 다시 찾는 일에 집중했습니다.</h2>
          </div>
          <div className="landing-benefit-grid">
            {benefitCards.map(({ body, features, icon: Icon, label, title }, index) => (
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
                <ul className="landing-benefit-tags" aria-label={`${label} 기능`}>
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-account-section landing-reveal"
          data-reveal
          id="account"
          aria-labelledby="landing-account-title"
        >
          <div className="landing-section-copy landing-section-copy-wide">
            <p className="eyebrow">기록 방식</p>
            <h2 id="landing-account-title">로그인 없이 시작하고, 계정으로 기록을 구분하세요.</h2>
            <p>먼저 읽어본 뒤 필요할 때 계정을 만들 수 있습니다. 시작 전에 현재 저장 범위도 확인하세요.</p>
          </div>
          <div className="landing-account-grid">
            <article className="landing-account-card">
              <span>바로 읽기</span>
              <h3>로그인 없이</h3>
              <ul>
                <li>성경 읽기와 기본 듣기</li>
                <li>읽던 위치·강조·인용을 이 브라우저에 저장</li>
                <li>계정 없이 핵심 읽기 흐름 체험</li>
              </ul>
            </article>
            <article className="landing-account-card landing-account-card-emphasis">
              <span>개인 기록</span>
              <h3>계정으로</h3>
              <ul>
                <li>사용자별 공부 기록 구분</li>
                <li>개인 노트와 번역 의견 사용</li>
                <li>같은 브라우저의 게스트 기록 가져오기</li>
              </ul>
            </article>
          </div>
          <p className="landing-data-note">
            <ShieldCheck aria-hidden="true" size={19} />
            주요 읽기 기록은 현재 브라우저에 저장됩니다. 데이터를 지우거나 다른 기기를 쓰면 자동으로 이어지지
            않습니다.
          </p>
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
              <article
                className="landing-flow-step landing-reveal"
                data-reveal
                key={step.label}
                style={revealDelay(`${index * 80}ms`)}
              >
                <span>{step.label}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-faq-section landing-reveal"
          data-reveal
          id="faq"
          aria-labelledby="landing-faq-title"
        >
          <div className="landing-section-copy">
            <p className="eyebrow">자주 묻는 질문</p>
            <h2 id="landing-faq-title">시작하기 전에 필요한 답을 모았습니다.</h2>
            <p>로그인, 기록 저장, Android 출시와 본문 출처를 먼저 확인하세요.</p>
          </div>
          <div className="landing-faq-list">
            {faqItems.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <ChevronDown aria-hidden="true" size={20} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta landing-reveal" data-reveal aria-labelledby="landing-final-title">
          <p className="eyebrow">시작하기</p>
          <h2 id="landing-final-title">오늘 마음에 남은 말씀을 다음 공부까지 가져가세요.</h2>
          <p>읽던 위치, 표시한 구절, 다시 쓸 인용을 내 리더노트에 정리하고 바로 이어 읽으세요.</p>
          <LandingActions isAuthenticated={isAuthenticated} />
        </section>

        <CoupangPartnersAd />
      </main>

      <footer className="landing-footer" aria-label="성경 본문 출처 및 라이선스">
        <div className="landing-footer-inner">
          <nav className="landing-footer-links" aria-label="서비스 정책">
            {/* Full navigation unloads the landing-only AdSense runtime before entering the app. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/app/read/gen/1">성경 읽기</a>
            <a href="/privacy">개인정보 취급방침</a>
          </nav>
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
    </div>
  );
}
