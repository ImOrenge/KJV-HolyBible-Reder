import { redirect } from "next/navigation";

import { signInWithEmail } from "@/app/auth/actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function normalizeNextPath(nextPath: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params?.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  return <EmailAuthForm action={signInWithEmail} mode="login" next={nextPath} />;
}
