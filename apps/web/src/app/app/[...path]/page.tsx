import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseStudyUiRoute } from "@kjv/shared/study-ui";

import { StudyAppEntry } from "@/components/study-app-entry";
import type { BibleChapterResponse } from "@/lib/bible-api-types";
import { getPublicBibleChapter } from "@/lib/public-bible-server";
import { absoluteUrl } from "@/lib/site-url";
import { toStudyUrlSearchParams, type StudyPageSearchParams } from "@/lib/study-route-search-params";

export const dynamic = "force-dynamic";

type StudyRoutePageProps = {
  params: Promise<{ path: string[] }>;
  searchParams?: Promise<StudyPageSearchParams>;
};

async function resolveStudyRoute({ params, searchParams }: StudyRoutePageProps) {
  const { path } = await params;
  const pathname = `/app/${path.join("/")}`;
  return {
    path,
    route: parseStudyUiRoute(pathname, toStudyUrlSearchParams(await searchParams)),
  };
}

async function resolveReaderChapter(bookId: string, chapter: number): Promise<BibleChapterResponse | null> {
  try {
    return await getPublicBibleChapter(bookId, chapter);
  } catch {
    return null;
  }
}

function chapterDescription(chapter: BibleChapterResponse) {
  const firstVerse = chapter.verses[0];
  const excerpt = firstVerse?.textKo || firstVerse?.textEn || firstVerse?.text || "KJV 성경 본문을 읽어보세요.";
  return `${chapter.book.nameKo} ${chapter.book.chapter}장 KJV 성경. ${excerpt}`.slice(0, 160);
}

export async function generateMetadata(props: StudyRoutePageProps): Promise<Metadata> {
  const { route } = await resolveStudyRoute(props);
  if (route?.view !== "reader" || !route.reader) {
    return { robots: { follow: true, index: false } };
  }

  const chapter = await resolveReaderChapter(route.reader.bookId, route.reader.chapter);
  if (!chapter?.verses.length) {
    return { robots: { follow: true, index: false } };
  }

  const canonicalPath = `/app/read/${chapter.book.id}/${chapter.book.chapter}`;
  const title = `${chapter.book.nameKo} ${chapter.book.chapter}장 KJV 성경`;
  const description = chapterDescription(chapter);
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: "article",
      url: absoluteUrl(canonicalPath),
    },
    robots: {
      follow: true,
      index: true,
      googleBot: {
        follow: true,
        index: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function StudyRoutePage(props: StudyRoutePageProps) {
  const { path, route } = await resolveStudyRoute(props);
  if (path[0] === "community") redirect("/community");
  if (!route) notFound();
  const initialChapter = route.view === "reader" && route.reader
    ? await resolveReaderChapter(route.reader.bookId, route.reader.chapter)
    : null;
  if (route.view === "reader" && route.reader && !initialChapter) notFound();
  return <StudyAppEntry initialChapter={initialChapter ?? undefined} route={route} />;
}
