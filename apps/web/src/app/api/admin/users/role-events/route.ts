import { NextResponse } from "next/server";

import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminRoleEventRow = {
  action: "grant" | "revoke";
  actor_id: string | null;
  created_at: string;
  id: string;
  role: string;
  target_user_id: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !(await hasAnyEffectiveRole(supabase, user, ["admin"]))) {
    return NextResponse.json({ error: "역할 관리 권한이 없습니다." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("admin_role_events")
    .select("id,actor_id,target_user_id,role,action,created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AdminRoleEventRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
