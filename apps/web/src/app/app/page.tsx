import { StudyAppEntry } from "@/components/study-app-entry";
import { toStudyUrlSearchParams, type StudyPageSearchParams } from "@/lib/study-route-search-params";
import { parseStudyUiRoute } from "@kjv/shared/study-ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AppPageProps = {
  searchParams?: Promise<StudyPageSearchParams>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const route = parseStudyUiRoute("/app", toStudyUrlSearchParams(await searchParams));
  if (route?.view === "community") redirect("/community");
  return <StudyAppEntry route={route ?? { view: "dashboard" }} />;
}
