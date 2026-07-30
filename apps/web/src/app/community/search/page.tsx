import type { CommunitySearchType } from "@kjv/shared/community";
import type { Metadata } from "next";
import Link from "next/link";

import { CommunityPostCard } from "@/components/community-social/community-post-card";
import { CommunityProfileResultRow } from "@/components/community-social/community-profile-result-row";
import { CommunitySearchForm } from "@/components/community-social/community-search-form";
import { getCommunitySuggestedProfiles, getCommunityV2Auth, searchCommunity } from "@/lib/community-v2-server";

export const metadata: Metadata = { robots: { follow: true, index: false }, title: "QT 커뮤니티 검색" };

type CommunitySearchPageProps = { searchParams?: Promise<{ q?: string; type?: string }> };
const searchTypes: CommunitySearchType[] = ["all", "posts", "users", "verses", "tags"];

function normalizeSearchType(value?: string): CommunitySearchType {
  return searchTypes.includes(value as CommunitySearchType) ? value as CommunitySearchType : "all";
}

export default async function CommunitySearchPage({ searchParams }: CommunitySearchPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim().slice(0, 100) ?? "";
  const type = normalizeSearchType(params?.type);
  const auth = await getCommunityV2Auth();
  const [results, suggestions] = await Promise.all([
    query.length >= 2 ? searchCommunity(auth.service, query, type, auth.user?.id ?? null) : Promise.resolve(null),
    !query ? getCommunitySuggestedProfiles(auth.service, auth.user?.id ?? null) : Promise.resolve([]),
  ]);
  const returnHref = `/community/search${query ? `?q=${encodeURIComponent(query)}&type=${type}` : ""}`;
  const hasResults = Boolean(results && (results.posts.length || results.profiles.length || results.tags.length || results.verses.length));

  return (
    <main className="community-page-grid community-page-single">
      <div className="community-main-column community-search-column">
        <h1 className="community-sr-only">QT 커뮤니티 검색</h1>
        <CommunitySearchForm initialQuery={query} key={`${type}:${query}`} type={type} />

        {!query ? (
          <section className="community-search-section" aria-labelledby="community-suggested-title">
            <div className="community-search-section-heading"><h2 id="community-suggested-title">팔로우 추천</h2><span>공개 QT 활동을 기준으로 표시합니다.</span></div>
            {suggestions.length
              ? suggestions.map((profile) => <CommunityProfileResultRow key={profile.userId} profile={profile} returnHref={returnHref} signedIn={Boolean(auth.user)} />)
              : <div className="community-empty">추천할 공개 프로필이 아직 없습니다.</div>}
          </section>
        ) : query.length < 2 ? <div className="community-empty">검색어를 두 글자 이상 입력해 주세요.</div> : null}

        {results?.profiles.length ? (
          <section className="community-search-section" aria-labelledby="community-people-title">
            <div className="community-search-section-heading"><h2 id="community-people-title">사람</h2></div>
            {results.profiles.map((profile) => <CommunityProfileResultRow key={profile.userId} profile={profile} returnHref={returnHref} signedIn={Boolean(auth.user)} />)}
          </section>
        ) : null}

        {results?.verses.length ? (
          <section className="community-search-section community-search-link-results" aria-labelledby="community-verses-title">
            <div className="community-search-section-heading"><h2 id="community-verses-title">성경 구절</h2></div>
            {results.verses.map((verse) => <Link href={`/community/verse/${verse.verseKey}`} key={verse.verseKey}><strong>{verse.reference}</strong><span>연결된 공개 QT {verse.postCount}개</span></Link>)}
          </section>
        ) : null}

        {results?.tags.length ? (
          <section className="community-search-section community-search-link-results" aria-labelledby="community-tags-title">
            <div className="community-search-section-heading"><h2 id="community-tags-title">해시태그</h2></div>
            {results.tags.map((tag) => <Link href={`/community/hashtag/${encodeURIComponent(tag.tag)}`} key={tag.tag}><strong>#{tag.tag}</strong><span>공개 QT {tag.postCount}개</span></Link>)}
          </section>
        ) : null}

        {results?.posts.length ? <section aria-label="QT 검색 결과" className="community-search-post-results">{results.posts.map((post) => <CommunityPostCard key={post.id} post={post} signedIn={Boolean(auth.user)} />)}</section> : null}

        {results && !hasResults ? <div className="community-empty">“{results.query}”에 대한 공개 검색 결과가 없습니다.</div> : null}
      </div>
    </main>
  );
}
