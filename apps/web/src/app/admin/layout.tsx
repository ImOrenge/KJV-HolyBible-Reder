import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canAccessAdmin, getEffectiveUserRoles } from "@/lib/auth/server-rbac";
import type { AppRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";

function hasRole(roles: AppRole[], role: AppRole) {
  return roles.includes(role);
}

export const metadata: Metadata = {
  title: "관리자",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!(await canAccessAdmin(supabase, user))) {
    notFound();
  }

  const roles = await getEffectiveUserRoles(supabase, user);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          KJV Educator
        </Link>
        <nav aria-label="관리자 메뉴">
          <Link href="/admin/translation-feedback">번역 피드백</Link>
          <Link href="/admin/translation-feedback/reports">피드백 리포트</Link>
          {hasRole(roles, "admin") ? <Link href="/admin/users/roles">역할 관리</Link> : null}
        </nav>
        <small>roles: {roles.join(", ")}</small>
      </aside>
      <div className="admin-main">{children}</div>
    </main>
  );
}
