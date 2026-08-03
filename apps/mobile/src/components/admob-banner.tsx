import { View } from "react-native";

export type AdMobBannerPlacement = "community" | "reader" | "today";

type AdMobBannerProps = {
  placement: AdMobBannerPlacement;
};

export function AdMobBanner(_props: AdMobBannerProps) {
  return <View accessible={false} />;
}
