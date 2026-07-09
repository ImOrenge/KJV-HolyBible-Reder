"use client";

import { useEffect } from "react";

export function LandingRevealController() {
  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (!revealElements.length) {
      return;
    }

    const revealIfInView = () => {
      const triggerY = window.innerHeight * 0.92;

      revealElements.forEach((element) => {
        if (element.classList.contains("is-visible")) {
          return;
        }

        if (element.getBoundingClientRect().top <= triggerY) {
          element.classList.add("is-visible");
        }
      });
    };

    const supportsIntersectionObserver = typeof IntersectionObserver !== "undefined";

    if (!supportsIntersectionObserver) {
      revealIfInView();
      window.addEventListener("scroll", revealIfInView, { passive: true });

      return () => window.removeEventListener("scroll", revealIfInView);
    }

    const markVisible = (element: Element) => {
      element.classList.add("is-visible");
      observer.unobserve(element);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markVisible(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    revealElements.forEach((element) => observer.observe(element));
    requestAnimationFrame(revealIfInView);
    window.addEventListener("scroll", revealIfInView, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", revealIfInView);
    };
  }, []);

  return <span aria-hidden="true" data-landing-reveal-controller hidden />;
}
