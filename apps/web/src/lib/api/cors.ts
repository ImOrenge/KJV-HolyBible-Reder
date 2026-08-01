import { NextResponse } from "next/server";

const publicApiCorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  Vary: "Origin",
};

export const publicContentCacheHeaders = {
  "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
};

export function jsonWithCors(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...publicApiCorsHeaders,
      ...init?.headers,
    },
  });
}

export function optionsWithCors() {
  return new Response(null, {
    headers: publicApiCorsHeaders,
    status: 204,
  });
}
