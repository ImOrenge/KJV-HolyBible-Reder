import type { LayoutChangeEvent } from "react-native";

export type MobileReaderTranslationMode = "en" | "ko" | "parallel";

export type MobileReaderColors = {
  accent: string;
  accentSecondary: string;
  accentSoft: string;
  accentText: string;
  border: string;
  muted: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  warning: string;
};

export type MobileReaderAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
};

export type MobileReaderVerseLayoutHandler = (event: LayoutChangeEvent) => void;
