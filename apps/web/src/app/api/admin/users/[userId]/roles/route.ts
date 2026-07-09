import { NextResponse } from "next/server";

import { isAppRole } from "@/lib/auth/rbac";
import { hasAnyEffectiveRole } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !(await hasAnyEffectiveRole(supabase, user, ["admin"]))) {
    return NextResponse.json({ error: "역할 관리 권한이 없습니다." }, { status: 403 });
  }

  const { userId } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const role = payload?.role;
  const enabled = payload?.enabled;

  if (!isAppRole(role) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "역할 요청이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: roles, error: roleError } = await supabase.rpc("set_user_app_role", {
    p_enabled: enabled,
    p_role: role,
    p_target_user_id: userId,
  });

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 400 });
  }

  return NextResponse.json({ roles: Array.isArray(roles) ? roles.filter(isAppRole) : [] });
}
