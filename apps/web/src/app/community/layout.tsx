import type { Metadata } from "next";
import { Bell, BookOpenText, Home, LogIn, Search, SquarePen, UserRound } from "lucide-react";
import Link from "next/link";

import { getCommunityV2Auth, getOwnCommunityProfile } from "@/lib/community-v2-server";
import "./community-social.css";

export const metadata: Metadata = {
  alternates: { canonical: "/community" },
  description: "성경 구절을 중심으로 QT를 나누고, 팔로우·좋아요·리포스트로 묵상을 이어 가는 공개 커뮤니티입니다.",
  openGraph: {
    description: "성경 구절을 중심으로 이어지는 공개 QT 나눔",
    title: "QT 커뮤니티",
    type: "website",
    url: "/community",
  },
  title: "QT 커뮤니티",
};

export const dynamic = "force-dynamic";

export default async function CommunityLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await getCommunityV2Auth();
  const profile = auth.user ? await getOwnCommunityProfile(auth.service, auth.user).catch(() => null) : null;
  const profileHref = profile?.handle ? `/community/u/${profile.handle}` : "/community/settings";
  const composeHref = auth.user ? "/community?compose=1" : "/auth/login?next=%2Fcommunity%3Fcompose%3D1";
  return (
    <div className="community-site">
      <aside className="community-rail">
        <Link aria-label="QT 커뮤니티 홈" className="community-brand" href="/community">
          <span className="community-brand-mark"><BookOpenText aria-hidden="true" size={23} /></span>
          <span>QT 나눔</span>
        </Link>
        <nav aria-label="커뮤니티 메뉴" className="community-rail-nav">
          <Link className="community-rail-link" href="/community"><Home aria-hidden="true" size={22} /><span>홈</span></Link>
          <Link className="community-rail-link" href="/community/search"><Search aria-hidden="true" size={22} /><span>검색</span></Link>
          <Link className="community-rail-link" href={composeHref}><SquarePen aria-hidden="true" size={22} /><span>새로운 QT</span></Link>
          {auth.user ? <Link className="community-rail-link" href="/community/notifications"><Bell aria-hidden="true" size={22} /><span>알림</span></Link> : null}
          {auth.user ? <Link className="community-rail-link" href={profileHref}><UserRound aria-hidden="true" size={22} /><span>프로필</span></Link> : null}
        </nav>
        <div className="community-rail-bottom">
          <Link className="community-rail-link" href="/app"><BookOpenText aria-hidden="true" size={22} /><span>성경 읽기</span></Link>
          {!auth.user ? <Link className="community-rail-link" href="/auth/login?next=/community"><LogIn aria-hidden="true" size={22} /><span>로그인</span></Link> : null}
        </div>
      </aside>
      <header className="community-mobile-topbar">
        <Link className="community-brand" href="/community"><span className="community-brand-mark"><BookOpenText aria-hidden="true" size={20} /></span><span>QT 나눔</span></Link>
        <nav aria-label="모바일 커뮤니티 메뉴" className="community-nav">
          <Link aria-label="검색" className="community-icon-button" href="/community/search"><Search aria-hidden="true" size={21} /></Link>
          <Link aria-label={auth.user ? "프로필" : "로그인"} className="community-icon-button" href={auth.user ? profileHref : "/auth/login?next=/community"}>{auth.user ? <UserRound aria-hidden="true" size={21} /> : <LogIn aria-hidden="true" size={21} />}</Link>
        </nav>
      </header>
      <div className="community-shell-content">{children}</div>
      <nav aria-label="모바일 하단 커뮤니티 메뉴" className="community-mobile-bottom">
        <Link aria-label="홈" href="/community"><Home aria-hidden="true" size={23} /></Link>
        <Link aria-label="검색" href="/community/search"><Search aria-hidden="true" size={23} /></Link>
        <Link aria-label="새로운 QT" className="community-mobile-compose" href={composeHref}><SquarePen aria-hidden="true" size={23} /></Link>
        {auth.user ? <Link aria-label="알림" href="/community/notifications"><Bell aria-hidden="true" size={23} /></Link> : <Link aria-label="성경 읽기" href="/app"><BookOpenText aria-hidden="true" size={23} /></Link>}
        <Link aria-label={auth.user ? "프로필" : "로그인"} href={auth.user ? profileHref : "/auth/login?next=/community"}>{auth.user ? <UserRound aria-hidden="true" size={23} /> : <LogIn aria-hidden="true" size={23} />}</Link>
      </nav>
    </div>
  );
}
