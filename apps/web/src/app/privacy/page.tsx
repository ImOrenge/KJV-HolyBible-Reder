import type { Metadata } from "next";
import Link from "next/link";
import {
  privacyPolicyIntro,
  privacyPolicySections,
  privacyPolicyTitle,
  privacyPolicyUpdatedAt,
} from "@kjv/shared/privacy-policy";

export const metadata: Metadata = {
  title: privacyPolicyTitle,
  description: "KJV 리더노트의 개인정보 수집, 이용, 보관, 삭제 기준을 안내합니다.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-document" aria-labelledby="privacy-title">
        <Link className="privacy-back-link" href="/">
          KJV 리더노트로 돌아가기
        </Link>
        <header className="privacy-header">
          <p className="eyebrow">Privacy</p>
          <h1 id="privacy-title">{privacyPolicyTitle}</h1>
          <p>{privacyPolicyIntro}</p>
          <span>시행일: {privacyPolicyUpdatedAt}</span>
        </header>
        <div className="privacy-section-list">
          {privacyPolicySections.map((section) => (
            <section className="privacy-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
