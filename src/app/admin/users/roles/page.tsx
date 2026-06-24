import { notFound } from "next/navigation";

import { RoleAssignmentPanel } from "@/components/admin/role-assignment-panel";
import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";

export default async function RoleAssignmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await hasAnyEffectiveRole(supabase, user, ["admin"]))) {
    notFound();
  }

  return <RoleAssignmentPanel />;
}
