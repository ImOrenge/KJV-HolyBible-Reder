import { classifyAndroidVersion, type AndroidReleaseContract, type AndroidVersionClassification } from "@kjv/shared";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type InstalledAndroidVersion = {
  apiLevel: string;
  buildVersion: number;
  version: string;
};

export type AndroidVersionCheck = {
  classification: AndroidVersionClassification;
  release: AndroidReleaseContract;
};

export function getInstalledAndroidVersion(): InstalledAndroidVersion | null {
  if (Platform.OS !== "android" || Constants.expoVersion) {
    return null;
  }

  const configuredVersionCode = Constants.expoConfig?.android?.versionCode;
  const buildVersion = Number.parseInt(
    Application.nativeBuildVersion ?? String(configuredVersionCode ?? "0"),
    10,
  );

  return {
    apiLevel: String(Platform.Version),
    buildVersion: Number.isInteger(buildVersion) && buildVersion > 0 ? buildVersion : 0,
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "알 수 없음",
  };
}

export async function checkAndroidVersion(
  apiBaseUrl: string,
  installed: InstalledAndroidVersion,
  signal?: AbortSignal,
): Promise<AndroidVersionCheck> {
  const baseUrl = apiBaseUrl.replace(/\/$/u, "");
  const response = await fetch(`${baseUrl}/api/mobile/version`, { signal });
  if (!response.ok) {
    throw new Error(`android-version-check-${response.status}`);
  }

  const release = await response.json() as AndroidReleaseContract;
  if (
    release.platform !== "android"
    || !Number.isInteger(release.latestVersionCode)
    || !Number.isInteger(release.minimumSupportedVersionCode)
    || typeof release.storeUrl !== "string"
  ) {
    throw new Error("android-version-contract-invalid");
  }

  return {
    classification: classifyAndroidVersion(installed.buildVersion, release),
    release,
  };
}
