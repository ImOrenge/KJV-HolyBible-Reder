import { APP_SLUG } from "./brand";
import type { MockUser } from "./types";

const authKey = `${APP_SLUG}:v0:mock-auth`;
const legacyAuthKey = "kjv-educator:v0:mock-auth";

export const demoUser: MockUser = {
  id: "demo-user",
  email: "demo@mock.local",
  displayName: "Demo Reader",
};

export function isMockAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  const currentAuth = window.localStorage.getItem(authKey);
  if (currentAuth !== null) {
    return currentAuth === "true";
  }

  const legacyAuth = window.localStorage.getItem(legacyAuthKey);
  if (legacyAuth !== null) {
    window.localStorage.setItem(authKey, legacyAuth);
    return legacyAuth === "true";
  }

  return false;
}

export function setMockAuthenticated(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = value ? "true" : "false";
  window.localStorage.setItem(authKey, serialized);
  window.localStorage.setItem(legacyAuthKey, serialized);
}
