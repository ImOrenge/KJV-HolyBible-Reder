"use client";

import {
  BarChart3,
  Bookmark,
  BookOpen,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Command,
  Highlighter,
  Home,
  Library,
  LogIn,
  LogOut,
  Search,
  Settings,
  StickyNote,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AppUser } from "@/lib/auth/app-user";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildStudyUiPersonalNoteUrl,
  buildStudyUiTargetUrl,
  getStudyUiAreaForView,
  type StudyUiArea,
  type StudyUiPersonalNoteRoute,
  type StudyUiReaderRoute,
  type StudyUiRouteState,
  type StudyUiWebViewKey,
} from "@kjv/shared/study-ui";

import { KjvMvpApp } from "./kjv-mvp-app";

type StudyAppShellProps = {
  initialRoute: StudyUiRouteState;
  readerV2?: boolean;
  user: AppUser;
};

type ShellNavItem = {
  icon: LucideIcon;
  label: string;
  view: StudyUiWebViewKey;
};

const sidebarSections: Array<{ label: string; items: ShellNavItem[] }> = [
  { label: "오늘", items: [{ icon: Home, label: "오늘", view: "dashboard" }] },
  {
    label: "읽기",
    items: [
      { icon: BookOpen, label: "성경", view: "reader" },
      { icon: Search, label: "본문 검색", view: "search" },
    ],
  },
  {
    label: "공부",
    items: [
      { icon: StickyNote, label: "노트", view: "notes" },
      { icon: BookOpenText, label: "히브리어 사전", view: "dictionary" },
    ],
  },
  {
    label: "보관함",
    items: [
      { icon: Highlighter, label: "하이라이트", view: "highlights" },
      { icon: Bookmark, label: "저장한 말씀", view: "favorites" },
    ],
  },
  { label: "통독", items: [{ icon: BarChart3, label: "통독 현황", view: "progress" }] },
];

const mobileNavigation: Array<{ area: StudyUiArea; icon: LucideIcon; label: string; view: StudyUiWebViewKey }> = [
  { area: "today", icon: Home, label: "오늘", view: "dashboard" },
  { area: "read", icon: BookOpen, label: "성경", view: "reader" },
  { area: "study", icon: StickyNote, label: "공부", view: "notes" },
  { area: "library", icon: Library, label: "보관함", view: "favorites" },
  { area: "settings", icon: Settings, label: "설정", view: "settings" },
];

const viewLabels: Record<StudyUiWebViewKey, string> = {
  dashboard: "오늘",
  community: "QT 커뮤니티",
  reader: "성경",
  progress: "통독 현황",
  highlights: "하이라이트",
  favorites: "저장한 말씀",
  notes: "노트",
  dictionary: "히브리어 사전",
  search: "본문 검색",
  settings: "설정",
};

const commandItems = sidebarSections.flatMap((section) => section.items).concat({ icon: Settings, label: "설정", view: "settings" });

export function StudyAppShell({ initialRoute, readerV2 = false, user }: StudyAppShellProps) {
  const router = useRouter();
  const commandDialogRef = useRef<HTMLDialogElement>(null);
  const initialReaderBookId = initialRoute.reader?.bookId;
  const initialReaderChapter = initialRoute.reader?.chapter;
  const initialReaderVerseKey = initialRoute.reader?.primaryVerseKey;
  const initialReaderPanel = initialRoute.reader?.panel;
  const initialReaderWord = initialRoute.reader?.word;
  const [activeView, setActiveView] = useState<StudyUiWebViewKey>(initialRoute.view);
  const [readerRoute, setReaderRoute] = useState<StudyUiReaderRoute | undefined>(initialRoute.reader);
  const readerRouteRef = useRef(readerRoute);
  const [commandQuery, setCommandQuery] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSessionActionPending, setIsSessionActionPending] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const activeArea = getStudyUiAreaForView(activeView);

  useEffect(() => {
    setActiveView(initialRoute.view);
    if (initialReaderBookId && initialReaderChapter) {
      setReaderRoute({
        bookId: initialReaderBookId,
        chapter: initialReaderChapter,
        ...(initialReaderVerseKey ? { primaryVerseKey: initialReaderVerseKey } : {}),
        ...(initialReaderPanel ? { panel: initialReaderPanel } : {}),
        ...(initialReaderWord ? { word: initialReaderWord } : {}),
      });
    }
  }, [initialReaderBookId, initialReaderChapter, initialReaderPanel, initialReaderVerseKey, initialReaderWord, initialRoute.view]);

  useEffect(() => {
    readerRouteRef.current = readerRoute;
  }, [readerRoute]);

  useEffect(() => {
    const dialog = commandDialogRef.current;
    if (!dialog) return;
    if (isCommandOpen && !dialog.open) dialog.showModal();
    if (!isCommandOpen && dialog.open) dialog.close();
  }, [isCommandOpen]);

  const navigate = useCallback((view: StudyUiWebViewKey) => {
    setIsCommandOpen(false);
    setCommandQuery("");
    if (view === "community") {
      router.push("/community");
      return;
    }
    setActiveView(view);
    router.push(buildStudyUiTargetUrl(view, view === "reader" ? readerRouteRef.current : undefined), { scroll: false });
  }, [router]);

  const rememberReaderLocation = useCallback((route: StudyUiReaderRoute) => {
    setReaderRoute((current) => current?.bookId === route.bookId && current.chapter === route.chapter ? current : route);
  }, []);

  const navigateReader = useCallback((route: StudyUiReaderRoute) => {
    setReaderRoute(route);
    setActiveView("reader");
    setIsCommandOpen(false);
    setCommandQuery("");
    router.push(buildStudyUiTargetUrl("reader", route), { scroll: false });
  }, [router]);

  const navigatePersonalNote = useCallback((route: StudyUiPersonalNoteRoute = {}) => {
    setActiveView("notes");
    setIsCommandOpen(false);
    setCommandQuery("");
    router.push(buildStudyUiPersonalNoteUrl(route), { scroll: false });
  }, [router]);

  const handleSessionAction = useCallback(async () => {
    if (!user.isAuthenticated) {
      router.push("/auth/login?next=/app");
      return;
    }

    setIsSessionActionPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/auth/login");
      router.refresh();
    } finally {
      setIsSessionActionPending(false);
    }
  }, [router, user.isAuthenticated]);

  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLocaleLowerCase("ko-KR");
    if (!query) return commandItems;
    return commandItems.filter((item) => item.label.toLocaleLowerCase("ko-KR").includes(query));
  }, [commandQuery]);

  return (
    <div className="f-study-shell" data-active-view={activeView} data-sidebar-collapsed={isSidebarCollapsed}>
      <aside className="f-study-shell__sidebar" aria-label="주요 탐색">
        <div className="f-study-shell__brand-row">
          <button className="f-study-shell__brand" type="button" onClick={() => navigate("dashboard")} aria-label="KJV 리더노트 오늘 화면">
            <BookOpen aria-hidden="true" size={21} />
            <span>KJV 리더노트</span>
          </button>
          <button
            aria-label={isSidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            className="f-study-shell__icon-button f-study-shell__collapse"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            title={isSidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            type="button"
          >
            {isSidebarCollapsed ? <ChevronRight aria-hidden="true" size={18} /> : <ChevronLeft aria-hidden="true" size={18} />}
          </button>
        </div>

        <nav className="f-study-shell__navigation">
          {sidebarSections.map((section) => (
            <section className="f-study-shell__nav-section" key={section.label} aria-label={section.label}>
              <span className="f-study-shell__section-label">{section.label}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    aria-current={activeView === item.view ? "page" : undefined}
                    className={activeView === item.view ? "f-study-shell__nav-item is-active" : "f-study-shell__nav-item"}
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    title={item.label}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="f-study-shell__bottom-actions">
          <Link
            className="f-study-shell__nav-item f-study-shell__community-link"
            href="/community"
            title="QT 커뮤니티"
          >
            <Users aria-hidden="true" size={18} />
            <span>QT 커뮤니티</span>
          </Link>
          <button
            aria-current={activeView === "settings" ? "page" : undefined}
            className={activeView === "settings" ? "f-study-shell__nav-item is-active" : "f-study-shell__nav-item"}
            onClick={() => navigate("settings")}
            title="설정"
            type="button"
          >
            <Settings aria-hidden="true" size={18} />
            <span>설정</span>
          </button>
          <button
            className="f-study-shell__nav-item f-study-shell__session-action"
            disabled={isSessionActionPending}
            onClick={handleSessionAction}
            title={user.isAuthenticated ? "로그아웃" : "로그인"}
            type="button"
          >
            {user.isAuthenticated ? <LogOut aria-hidden="true" size={18} /> : <LogIn aria-hidden="true" size={18} />}
            <span>{isSessionActionPending ? "로그아웃 중" : user.isAuthenticated ? "로그아웃" : "로그인"}</span>
          </button>
        </div>
      </aside>

      <div className="f-study-shell__workspace">
        <header className="f-study-shell__topbar">
          <div className="f-study-shell__screen-heading">
            <span className="f-study-shell__mobile-brand">KJV 리더노트</span>
            <strong>{viewLabels[activeView]}</strong>
          </div>
          <div className="f-study-shell__topbar-actions">
            <button className="f-study-shell__icon-button" onClick={() => navigate("search")} title="본문 검색" type="button" aria-label="본문 검색">
              <Search aria-hidden="true" size={18} />
            </button>
            <button className="f-study-shell__icon-button" onClick={() => setIsCommandOpen(true)} title="명령 검색" type="button" aria-label="명령 검색">
              <Command aria-hidden="true" size={18} />
            </button>
            <button className="f-study-shell__account" onClick={() => navigate("settings")} type="button">
              <span className="f-study-shell__avatar" aria-hidden="true">
                {user.avatarUrl ? <Image alt="" height={30} src={user.avatarUrl} unoptimized width={30} /> : <UserRound size={17} />}
              </span>
              <span>{user.displayName}</span>
            </button>
          </div>
        </header>

        <div className="f-study-shell__content">
          <KjvMvpApp
            activeView={activeView}
            dictionaryRoute={activeView === "dictionary" ? initialRoute.dictionary ?? {} : undefined}
            navigationMode="shell"
            onPersonalNoteNavigate={navigatePersonalNote}
            onReaderLocationChange={rememberReaderLocation}
            onReaderNavigate={navigateReader}
            onViewChange={navigate}
            readerExperience={readerV2 ? "v2" : "legacy"}
            personalNoteRoute={activeView === "notes" ? initialRoute.personalNote ?? {} : undefined}
            readerRoute={activeView === "reader" ? readerRoute : undefined}
            user={user}
          />
        </div>
      </div>

      <nav className="f-study-shell__mobile-nav" aria-label="모바일 주요 화면">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = activeArea === item.area;
          return (
            <button aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} key={item.area} onClick={() => navigate(item.view)} type="button">
              <Icon aria-hidden="true" size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <dialog
        className="f-study-shell__command-dialog"
        onCancel={(event) => { event.preventDefault(); setIsCommandOpen(false); }}
        onClose={() => setIsCommandOpen(false)}
        ref={commandDialogRef}
      >
        <div className="f-study-shell__command-panel">
          <div className="f-study-shell__command-heading">
            <div>
              <span>명령</span>
              <strong>화면 바로가기</strong>
            </div>
            <button className="f-study-shell__icon-button" onClick={() => setIsCommandOpen(false)} type="button" aria-label="명령 검색 닫기">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <label className="f-study-shell__command-input">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">이동할 화면 검색</span>
            <input autoFocus onChange={(event) => setCommandQuery(event.target.value)} placeholder="노트, 사전, 통독..." value={commandQuery} />
          </label>
          <div className="f-study-shell__command-results">
            {filteredCommands.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.view} onClick={() => navigate(item.view)} type="button">
                  <Icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {!filteredCommands.length ? <p>일치하는 화면이 없습니다.</p> : null}
          </div>
        </div>
      </dialog>
    </div>
  );
}
