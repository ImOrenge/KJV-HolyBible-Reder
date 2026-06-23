import { APP_SLUG } from "@/lib/brand";

const currentStoragePrefix = `${APP_SLUG}:v0:user-data`;
const legacyStoragePrefix = "kjv-educator:v0:user-data";
const demoUserId = "demo-user";
const importFlagPrefix = `${APP_SLUG}:v0:demo-data-imported`;

function getStoredUserData(userId: string) {
  const current = window.localStorage.getItem(`${currentStoragePrefix}:${userId}`);
  const legacy = window.localStorage.getItem(`${legacyStoragePrefix}:${userId}`);

  return current ?? legacy;
}

function setStoredUserData(userId: string, value: string) {
  window.localStorage.setItem(`${currentStoragePrefix}:${userId}`, value);
  window.localStorage.setItem(`${legacyStoragePrefix}:${userId}`, value);
}

function getImportFlagKey(userId: string) {
  return `${importFlagPrefix}:${userId}`;
}

export function hasDemoUserData() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(getStoredUserData(demoUserId));
}

export function shouldOfferDemoDataImport(userId: string) {
  if (typeof window === "undefined" || userId === demoUserId) {
    return false;
  }

  return hasDemoUserData() && !getStoredUserData(userId) && !window.localStorage.getItem(getImportFlagKey(userId));
}

export function importDemoUserData(userId: string) {
  if (typeof window === "undefined" || userId === demoUserId) {
    return false;
  }

  const demoData = getStoredUserData(demoUserId);
  if (!demoData) {
    return false;
  }

  setStoredUserData(userId, demoData);
  window.localStorage.setItem(getImportFlagKey(userId), new Date().toISOString());
  return true;
}

export function dismissDemoDataImport(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getImportFlagKey(userId), new Date().toISOString());
}
