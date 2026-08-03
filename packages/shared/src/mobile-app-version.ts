export type AndroidReleaseContract = {
  platform: "android";
  latestVersion: string;
  latestVersionCode: number;
  minimumSupportedVersion: string;
  minimumSupportedVersionCode: number;
  storeUrl: string;
};

export type AndroidVersionClassification = "current" | "update-available" | "update-required";

export const androidReleaseContract: AndroidReleaseContract = {
  platform: "android",
  latestVersion: "0.9.3",
  latestVersionCode: 13,
  minimumSupportedVersion: "0.7.1",
  minimumSupportedVersionCode: 7,
  storeUrl: "https://play.google.com/store/apps/details?id=com.kjvreader",
};

export function classifyAndroidVersion(
  installedVersionCode: number,
  release: AndroidReleaseContract,
): AndroidVersionClassification {
  if (installedVersionCode < release.minimumSupportedVersionCode) {
    return "update-required";
  }
  if (installedVersionCode < release.latestVersionCode) {
    return "update-available";
  }
  return "current";
}
