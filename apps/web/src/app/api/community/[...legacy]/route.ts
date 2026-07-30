import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const retirementHeaders = {
  Deprecation: "true",
  Link: '</api/community/v2>; rel="successor-version"',
  Sunset: "Thu, 23 Jul 2026 00:00:00 GMT",
} as const;

function retiredCommunityResponse() {
  return NextResponse.json(
    {
      code: "LEGACY_COMMUNITY_RETIRED",
      error: "기존 커뮤니티 채널은 종료되었습니다. QT 나눔 커뮤니티를 이용해 주세요.",
      successor: "/api/community/v2",
    },
    { headers: retirementHeaders, status: 410 },
  );
}

export const DELETE = retiredCommunityResponse;
export const GET = retiredCommunityResponse;
export const PATCH = retiredCommunityResponse;
export const POST = retiredCommunityResponse;
export const PUT = retiredCommunityResponse;

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      ...retirementHeaders,
      Allow: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    },
    status: 204,
  });
}
