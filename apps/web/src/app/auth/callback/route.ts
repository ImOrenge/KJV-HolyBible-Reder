import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function normalizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.includes("\\")) {
    return "/app";
  }

  return nextPath;
}

function getFailureUrl(request: NextRequest, nextPath: string, mode: string | null) {
  const destination = mode === "sign-up" ? "/auth/sign-up" : "/auth/login";
  const failureUrl = new URL(destination, request.url);
  failureUrl.searchParams.set("next", nextPath);
  failureUrl.searchParams.set("oauthError", "callback");
  return failureUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));
  const mode = requestUrl.searchParams.get("mode");

  if (!code || requestUrl.searchParams.has("error")) {
    return NextResponse.redirect(getFailureUrl(request, next, mode));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(getFailureUrl(request, next, mode));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
