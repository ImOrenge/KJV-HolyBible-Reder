import { notFound, redirect } from "next/navigation";
import { parseStudyUiRoute } from "@kjv/shared/study-ui";

import { StudyAppEntry } from "@/components/study-app-entry";
import { toStudyUrlSearchParams, type StudyPageSearchParams } from "@/lib/study-route-search-params";

export const dynamic = "force-dynamic";

type StudyRoutePageProps = {
  params: Promise<{ path: string[] }>;
  searchParams?: Promise<StudyPageSearchParams>;
};

export default async function StudyRoutePage({ params, searchParams }: StudyRoutePageProps) {
  const { path } = await params;
  if (path[0] === "community") redirect("/community");
  const pathname = `/app/${path.join("/")}`;
  const route = parseStudyUiRoute(pathname, toStudyUrlSearchParams(await searchParams));
  if (!route) notFound();
  return <StudyAppEntry route={route} />;
}
