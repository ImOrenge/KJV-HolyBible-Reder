import Constants, { AppOwnership } from "expo-constants";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { AdMobBannerPlacement } from "./admob-banner";

type AdMobBannerProps = {
  placement: AdMobBannerPlacement;
};

const productionBannerUnitId = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  default: undefined,
});

type GoogleMobileAdsModule = typeof import("react-native-google-mobile-ads");

let initializationPromise: Promise<GoogleMobileAdsModule> | null = null;

function initializeMobileAds() {
  initializationPromise ??= import("react-native-google-mobile-ads").then(async (module) => {
    await module.default().initialize();
    return module;
  });
  return initializationPromise;
}

export function AdMobBanner({ placement }: AdMobBannerProps) {
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);

  useEffect(() => {
    if (Constants.appOwnership === AppOwnership.Expo) return;

    let active = true;
    void initializeMobileAds()
      .then((module) => {
        if (active) setAdsModule(module);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  if (!adsModule) return null;

  const unitId = __DEV__ ? adsModule.TestIds.BANNER : productionBannerUnitId;
  if (!unitId) return null;

  const NativeBannerAd = adsModule.BannerAd;

  return (
    <View accessibilityLabel={`${placement} 광고`} style={styles.slot}>
      <Text style={styles.label}>광고</Text>
      <NativeBannerAd
        onAdFailedToLoad={() => undefined}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        size={adsModule.BannerAdSize.LARGE_BANNER}
        unitId={unitId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    gap: 4,
    marginHorizontal: 12,
    marginVertical: 16,
    minHeight: 104,
  },
  label: {
    color: "#7f8794",
    fontSize: 10,
  },
});
