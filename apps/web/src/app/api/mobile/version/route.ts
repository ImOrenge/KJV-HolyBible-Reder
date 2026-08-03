import { androidReleaseContract, type AndroidReleaseContract } from "@kjv/shared";
import { NextResponse } from "next/server";

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET() {
  const contract: AndroidReleaseContract = {
    ...androidReleaseContract,
    latestVersion: process.env.KJV_ANDROID_LATEST_VERSION?.trim() || androidReleaseContract.latestVersion,
    latestVersionCode: readPositiveInteger(
      process.env.KJV_ANDROID_LATEST_VERSION_CODE,
      androidReleaseContract.latestVersionCode,
    ),
    minimumSupportedVersion:
      process.env.KJV_ANDROID_MINIMUM_VERSION?.trim() || androidReleaseContract.minimumSupportedVersion,
    minimumSupportedVersionCode: readPositiveInteger(
      process.env.KJV_ANDROID_MINIMUM_VERSION_CODE,
      androidReleaseContract.minimumSupportedVersionCode,
    ),
  };

  return NextResponse.json(contract, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
