"use client";

import type { CommunitySearchType } from "@kjv/shared/community";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const filters: Array<{ key: CommunitySearchType; label: string }> = [
  { key: "all", label: "전체" },
  { key: "posts", label: "QT" },
  { key: "users", label: "사람" },
  { key: "verses", label: "구절" },
  { key: "tags", label: "태그" },
];

type CommunitySearchFormProps = { initialQuery: string; type: CommunitySearchType };

export function CommunitySearchForm({ initialQuery, type }: CommunitySearchFormProps) {
  const [query, setQuery] = useState(initialQuery);

  function filterHref(nextType: CommunitySearchType) {
    const params = new URLSearchParams();
    if (initialQuery) params.set("q", initialQuery);
    if (nextType !== "all") params.set("type", nextType);
    const search = params.toString();
    return search ? `/community/search?${search}` : "/community/search";
  }

  return (
    <section className="community-search-surface" aria-label="QT 커뮤니티 검색">
      <form action="/community/search" className="community-search-box" method="get" role="search">
        <Search aria-hidden="true" size={20} />
        <label className="community-sr-only" htmlFor="community-search-input">QT 커뮤니티 검색</label>
        <input
          autoComplete="off"
          id="community-search-input"
          name="q"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="QT, 사람, 구절, 태그 검색"
          value={query}
        />
        <input name="type" type="hidden" value={type} />
        {query ? <button aria-label="검색어 지우기" className="community-icon-button" onClick={() => setQuery("")} type="button"><X aria-hidden="true" size={18} /></button> : null}
        <button aria-label="검색" className="community-icon-button" type="submit"><SlidersHorizontal aria-hidden="true" size={19} /></button>
      </form>
      <nav aria-label="검색 범위" className="community-search-filters">
        {filters.map((filter) => (
          <Link aria-current={type === filter.key ? "page" : undefined} href={filterHref(filter.key)} key={filter.key}>{filter.label}</Link>
        ))}
      </nav>
    </section>
  );
}
