import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getUserProfile } from "@/lib/onboarding-server";
import { createClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams?: Promise<{ edit?: string; next?: string }>;
};

function normalizeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params?.next);
  const editing = params?.edit === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/onboarding?next=${nextPath}`)}`);

  const profile = await getUserProfile(supabase, user.id);
  if (profile && !editing) redirect(nextPath);

  return <OnboardingForm email={user.email ?? ""} initialProfile={editing ? profile : null} nextPath={nextPath} />;
}
