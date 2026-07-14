import {
  canPopMobileStudyRoute,
  createMobileStudyNavigationState,
  createMobileStudyRoute,
  getActiveMobileStudyRoute,
  popMobileStudyRoute,
  pushMobileStudyRoute,
  replaceMobileStudyRoute,
  selectMobileStudyTab,
  type MobileStudyRouteInput,
  type StudyUiArea,
  type StudyUiMobileViewKey,
} from "@kjv/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Platform } from "react-native";

export function useMobileStudyNavigation() {
  const [navigationState, setNavigationState] = useState(createMobileStudyNavigationState);
  const activeRoute = useMemo(() => getActiveMobileStudyRoute(navigationState), [navigationState]);
  const canGoBack = canPopMobileStudyRoute(navigationState);

  const setActiveView = useCallback((view: StudyUiMobileViewKey) => {
    setNavigationState((current) => replaceMobileStudyRoute(current, createMobileStudyRoute({ view })));
  }, []);

  const pushStudyRoute = useCallback((input: MobileStudyRouteInput) => {
    setNavigationState((current) => pushMobileStudyRoute(current, createMobileStudyRoute(input)));
  }, []);

  const replaceStudyRoute = useCallback((input: MobileStudyRouteInput) => {
    setNavigationState((current) => replaceMobileStudyRoute(current, createMobileStudyRoute(input)));
  }, []);

  const selectStudyTab = useCallback((area: StudyUiArea) => {
    setNavigationState((current) => selectMobileStudyTab(current, area));
  }, []);

  const goBack = useCallback(() => {
    if (!canGoBack) return false;
    setNavigationState((current) => popMobileStudyRoute(current));
    return true;
  }, [canGoBack]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  return {
    activeRoute,
    activeView: activeRoute.view,
    canGoBack,
    goBack,
    navigationDepth: navigationState.routes.length,
    pushStudyRoute,
    replaceStudyRoute,
    selectStudyTab,
    setActiveView,
  };
}
