"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

const COUPANG_SCRIPT_ID = "coupang-partners-ad-script";
const COUPANG_SCRIPT_SRC = "https://ads-partners.coupang.com/g.js";

type CoupangPartnersOptions = {
  container: HTMLElement;
  height: number;
  id: number;
  template: string;
  trackingCode: string;
  tsource: string;
  width: number;
};

type CoupangPartnersApi = {
  G: new (options: CoupangPartnersOptions) => unknown;
};

declare global {
  interface Window {
    PartnersCoupang?: CoupangPartnersApi;
  }
}

let coupangScriptPromise: Promise<CoupangPartnersApi> | null = null;

type CoupangPartnersAdProps = {
  placement?: CoupangPartnersAdPlacement;
};

type CoupangPartnersAdPlacement = "community" | "landing" | "reader" | "today";

type CoupangPartnersAdConfig = Pick<
  CoupangPartnersOptions,
  "height" | "id" | "template" | "trackingCode" | "tsource" | "width"
>;

type HorizontalAdSize = "desktop" | "mobile" | "tablet";

const COUPANG_HORIZONTAL_CONFIGS: Record<HorizontalAdSize, CoupangPartnersAdConfig> = {
  desktop: {
    height: 90,
    id: 1013062,
    template: "carousel",
    trackingCode: "AF8218124",
    tsource: "",
    width: 970,
  },
  mobile: {
    height: 100,
    id: 1013062,
    template: "carousel",
    trackingCode: "AF8218124",
    tsource: "",
    width: 320,
  },
  tablet: {
    height: 140,
    id: 1013062,
    template: "carousel",
    trackingCode: "AF8218124",
    tsource: "",
    width: 680,
  },
};

const COUPANG_VERTICAL_CONFIGS: Record<"community" | "reader", CoupangPartnersAdConfig> = {
  community: {
    height: 600,
    id: 1013062,
    template: "carousel",
    trackingCode: "AF8218124",
    tsource: "",
    width: 300,
  },
  reader: {
    height: 400,
    id: 1013062,
    template: "carousel",
    trackingCode: "AF8218124",
    tsource: "",
    width: 240,
  },
};

function getHorizontalAdSize(viewportWidth: number): HorizontalAdSize {
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1200) return "tablet";
  return "desktop";
}

function loadCoupangScript() {
  if (window.PartnersCoupang) return Promise.resolve(window.PartnersCoupang);
  if (coupangScriptPromise) return coupangScriptPromise;

  coupangScriptPromise = new Promise<CoupangPartnersApi>((resolve, reject) => {
    const existingScript = document.getElementById(COUPANG_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      if (window.PartnersCoupang) resolve(window.PartnersCoupang);
      else reject(new Error("Coupang Partners runtime did not initialize."));
    };

    const handleError = () => {
      coupangScriptPromise = null;
      reject(new Error("Failed to load the Coupang Partners runtime."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.async = true;
      script.id = COUPANG_SCRIPT_ID;
      script.src = COUPANG_SCRIPT_SRC;
      document.head.appendChild(script);
    }
  });

  return coupangScriptPromise;
}

export function CoupangPartnersAd({ placement = "landing" }: CoupangPartnersAdProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isHorizontal = placement === "landing" || placement === "today";
  const [horizontalSize, setHorizontalSize] = useState<HorizontalAdSize | null>(null);
  const config = isHorizontal
    ? COUPANG_HORIZONTAL_CONFIGS[horizontalSize ?? "desktop"]
    : COUPANG_VERTICAL_CONFIGS[placement === "community" ? "community" : "reader"];

  useEffect(() => {
    if (!isHorizontal) return;

    const updateHorizontalSize = () => setHorizontalSize(getHorizontalAdSize(window.innerWidth));
    updateHorizontalSize();
    window.addEventListener("resize", updateHorizontalSize);

    return () => window.removeEventListener("resize", updateHorizontalSize);
  }, [isHorizontal]);

  useEffect(() => {
    if (isHorizontal && horizontalSize === null) return;

    const adContainer = adContainerRef.current;
    const viewport = viewportRef.current;
    if (!adContainer || !viewport) return;

    let cancelled = false;
    const resizeObserver = new ResizeObserver(() => {
      const scale = Math.min(1, viewport.clientWidth / config.width);
      viewport.style.setProperty("--coupang-ad-scale", String(scale));
      viewport.style.setProperty("--coupang-ad-height", `${config.height * scale}px`);
    });

    resizeObserver.observe(viewport);

    void loadCoupangScript()
      .then((PartnersCoupang) => {
        if (cancelled) return;

        adContainer.replaceChildren();
        new PartnersCoupang.G({
          container: adContainer,
          ...config,
        });
      })
      .catch(() => {
        if (!cancelled) viewport.hidden = true;
      });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      adContainer.replaceChildren();
    };
  }, [config, horizontalSize, isHorizontal]);

  const frameStyle = {
    "--coupang-ad-native-height": `${config.height}px`,
    "--coupang-ad-native-width": `${config.width}px`,
  } as CSSProperties;

  return (
    <div
      aria-label="쿠팡 파트너스 상품 광고"
      className={`coupang-partners-ad coupang-partners-ad--${placement}${placement === "landing" ? " landing-reveal" : ""}`}
      data-reveal={placement === "landing" ? true : undefined}
      role="complementary"
    >
      <div className="coupang-partners-ad__viewport" ref={viewportRef} style={frameStyle}>
        <div className="coupang-partners-ad__stage" ref={adContainerRef} />
      </div>
      <p>이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
    </div>
  );
}
