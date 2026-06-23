import { redirect } from "next/navigation";

import { KjvMvpApp } from "@/components/kjv-mvp-app";
import { toAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/app");
  }

  return <KjvMvpApp user={toAppUser(user)} />;
}
