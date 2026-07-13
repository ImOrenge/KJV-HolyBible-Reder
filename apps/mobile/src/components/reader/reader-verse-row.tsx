import type { Verse } from "@kjv/shared";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileReaderColors, MobileReaderVerseLayoutHandler } from "./reader-types";

type ReaderVerseRowProps = {
  batchSelected: boolean;
  colors: MobileReaderColors;
  currentReading: boolean;
  englishText?: string;
  favorited: boolean;
  fontSize: number;
  hasNote: boolean;
  highlighted: boolean;
  lineHeight: number;
  numberEmphasized: boolean;
  onLayout: MobileReaderVerseLayoutHandler;
  onLongPress: () => void;
  onPress: () => void;
  parallel: boolean;
  primaryText: string;
  readingMode: "focus" | "normal" | "verse-numbers";
  selected: boolean;
  selectionMode: boolean;
  speaking: boolean;
  verse: Verse;
};

export function ReaderVerseRow({
  batchSelected,
  colors,
  currentReading,
  englishText,
  favorited,
  fontSize,
  hasNote,
  highlighted,
  lineHeight,
  numberEmphasized,
  onLayout,
  onLongPress,
  onPress,
  parallel,
  primaryText,
  readingMode,
  selected,
  selectionMode,
  speaking,
  verse,
}: ReaderVerseRowProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={`${verse.chapter}장 ${verse.verse}절`}
      accessibilityState={{ selected: selected || batchSelected }}
      delayLongPress={520}
      onLayout={onLayout}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.root,
        readingMode === "focus" ? styles.focus : null,
        speaking ? styles.speaking : null,
        currentReading ? styles.currentReading : null,
        selected ? styles.selected : null,
        batchSelected ? styles.batchSelected : null,
      ]}
    >
      <Text style={[styles.number, numberEmphasized ? styles.numberEmphasized : null]}>{verse.verse}</Text>
      <View style={styles.textBlock}>
        <Text style={[styles.primaryText, { fontSize, lineHeight }]}>{primaryText}</Text>
        {parallel && englishText && englishText !== primaryText ? (
          <Text style={[styles.parallelText, { fontSize: Math.max(14, fontSize - 2), lineHeight: Math.max(21, lineHeight - 3) }]}>
            {englishText}
          </Text>
        ) : null}
      </View>
      <View style={styles.markers}>
        {selectionMode ? (
          <View style={[styles.selectionCheck, batchSelected ? styles.selectionCheckActive : null]}>
            {batchSelected ? <Text style={styles.selectionCheckLabel}>✓</Text> : null}
          </View>
        ) : null}
        {hasNote ? <Text accessibilityLabel="노트 있음" style={styles.markerIcon}>▤</Text> : null}
        {favorited ? <Text accessibilityLabel="저장한 말씀" style={styles.markerIcon}>▯</Text> : null}
        {highlighted && !hasNote && !favorited ? <View accessibilityLabel="강조됨" style={styles.highlightMarker} /> : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: MobileReaderColors) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.surface,
      borderColor: "transparent",
      borderRadius: 6,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      minHeight: 58,
      paddingHorizontal: 8,
      paddingVertical: 11,
    },
    focus: {
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    speaking: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    currentReading: {
      borderLeftColor: colors.accent,
      borderLeftWidth: 4,
      paddingLeft: 5,
    },
    selected: {
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.accent,
    },
    batchSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accentSecondary,
    },
    number: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0,
      lineHeight: 22,
      textAlign: "center",
      width: 26,
    },
    numberEmphasized: {
      backgroundColor: colors.surfaceStrong,
      borderRadius: 5,
      color: colors.accentSecondary,
    },
    textBlock: {
      flex: 1,
      gap: 7,
      minWidth: 0,
      paddingRight: 5,
    },
    primaryText: {
      color: colors.text,
      fontWeight: "400",
      letterSpacing: 0,
    },
    parallelText: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      color: colors.muted,
      fontWeight: "400",
      letterSpacing: 0,
      paddingTop: 7,
    },
    markers: {
      alignItems: "center",
      gap: 6,
      width: 22,
    },
    selectionCheck: {
      alignItems: "center",
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    selectionCheckActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    selectionCheckLabel: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: "900",
    },
    markerIcon: {
      color: colors.warning,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 18,
    },
    highlightMarker: {
      backgroundColor: colors.warning,
      borderRadius: 4,
      height: 7,
      width: 7,
    },
  });
}
