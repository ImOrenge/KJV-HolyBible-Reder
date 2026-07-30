"use client";

import type { CommunityNotificationFilter } from "@kjv/shared/community";
import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const options: Array<{ key: CommunityNotificationFilter; label: string }> = [
  { key: "all", label: "모두" },
  { key: "follows", label: "팔로우" },
  { key: "replies", label: "답글" },
  { key: "mentions", label: "언급" },
  { key: "quotes", label: "인용 QT" },
  { key: "reposts", label: "리포스트" },
  { key: "likes", label: "좋아요" },
];

export function CommunityActivityFilter({ filter }: { filter: CommunityNotificationFilter }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.key === filter) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function closeOnPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="community-activity-filter" ref={rootRef}>
      <button aria-expanded={open} aria-haspopup="menu" className="community-activity-filter-trigger" onClick={() => setOpen((value) => !value)} type="button">
        {selected.label}<ChevronDown aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div aria-label="활동 필터" className="community-activity-filter-menu" role="menu">
          {options.map((option) => (
            <Link aria-current={filter === option.key ? "page" : undefined} href={option.key === "all" ? "/community/notifications" : `/community/notifications?filter=${option.key}`} key={option.key} onClick={() => setOpen(false)} role="menuitem">
              <span>{option.label}</span>{filter === option.key ? <Check aria-hidden="true" size={17} /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
