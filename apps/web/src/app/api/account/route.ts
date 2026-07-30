import { NextResponse } from "next/server";

import { deleteCommunityUserData } from "@/lib/community-account-deletion";
import { deleteUserAvatar } from "@/lib/onboarding-server";
import { createBearerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getBearerAccessToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function DELETE(request: Request) {
  const accessToken = getBearerAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const bearerClient = createBearerClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await bearerClient.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  await bearerClient.auth.signOut({ scope: "global" }).catch(() => undefined);

  try {
    const serviceClient = createServiceRoleClient();
    await deleteCommunityUserData(serviceClient, user.id);
    await deleteUserAvatar(serviceClient, user.id);
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
