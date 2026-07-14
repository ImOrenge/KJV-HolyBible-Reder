import { redirect } from "next/navigation";

import { signInWithEmail } from "@/app/auth/actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    oauthError?: string;
  }>;
};

function normalizeNextPath(nextPath: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.includes("\\")) {
    return "/app";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params?.next);
  const supabaseAvailable = hasSupabasePublicConfig({ includeServerFallback: true });
  const user = supabaseAvailable
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  if (user) {
    redirect(nextPath);
  }

  return (
    <EmailAuthForm
      action={signInWithEmail}
      mode="login"
      next={nextPath}
      oauthError={params?.oauthError ? "Google 로그인을 완료하지 못했습니다. 다시 시도하세요." : undefined}
      supabaseAvailable={supabaseAvailable}
    />
  );
}
