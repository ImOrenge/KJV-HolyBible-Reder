import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileReaderColors, MobileReaderTranslationMode } from "./reader-types";

type ReaderHeaderProps = {
  chapterComplete: boolean;
  colors: MobileReaderColors;
  currentLocation: string;
  hasChapterNote: boolean;
  onMarkChapterComplete: () => void;
  onNextChapter: () => void;
  onOpenChapterNote: () => void;
  onOpenChapterPicker: () => void;
  onPlayChapter: () => void;
  onPreviousChapter: () => void;
  onSetTranslationMode: (mode: MobileReaderTranslationMode) => void;
  onToggleSelectionMode: () => void;
  selectionCount: number;
  selectionMode: boolean;
  subtitle: string;
  title: string;
  translationMode: MobileReaderTranslationMode;
};

const modes: Array<{ label: string; value: MobileReaderTranslationMode }> = [
  { label: "EN", value: "en" },
  { label: "KR", value: "ko" },
  { label: "동시", value: "parallel" },
];

export function ReaderHeader({
  chapterComplete,
  colors,
  currentLocation,
  hasChapterNote,
  onMarkChapterComplete,
  onNextChapter,
  onOpenChapterNote,
  onOpenChapterPicker,
  onPlayChapter,
  onPreviousChapter,
  onSetTranslationMode,
  onToggleSelectionMode,
  selectionCount,
  selectionMode,
  subtitle,
  title,
  translationMode,
}: ReaderHeaderProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="성경 읽기 도구" style={styles.root}>
      <View style={styles.chapterRow}>
        <Pressable accessibilityLabel="이전 장" onPress={onPreviousChapter} style={styles.iconButton}>
          <Text style={styles.icon}>‹</Text>
        </Pressable>
        <Pressable accessibilityLabel="장 선택 열기" onPress={onOpenChapterPicker} style={styles.titleButton}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          <Text numberOfLines={1} style={styles.location}>{currentLocation}</Text>
        </Pressable>
        <Pressable accessibilityLabel="다음 장" onPress={onNextChapter} style={styles.iconButton}>
          <Text style={styles.icon}>›</Text>
        </Pressable>
      </View>

      <View style={styles.toolRow}>
        <View accessibilityLabel="본문 언어" style={styles.segment}>
          {modes.map((mode) => {
            const active = mode.value === translationMode;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={mode.value}
                onPress={() => onSetTranslationMode(mode.value)}
                style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
              >
                <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <HeaderTool accessibilityLabel="현재 장 읽기" icon="▶" onPress={onPlayChapter} styles={styles} />
        <HeaderTool
          accessibilityLabel={selectionMode ? `다중 선택 종료, ${selectionCount}개 선택됨` : "다중 선택"}
          active={selectionMode}
          icon={selectionMode ? String(selectionCount) : "☑"}
          onPress={onToggleSelectionMode}
          styles={styles}
        />
        <HeaderTool accessibilityLabel="장 노트" active={hasChapterNote} icon="▤" onPress={onOpenChapterNote} styles={styles} />
        <HeaderTool
          accessibilityLabel={chapterComplete ? "읽음 완료 취소" : "읽음 완료"}
          active={chapterComplete}
          icon="✓"
          onPress={onMarkChapterComplete}
          styles={styles}
        />
      </View>
    </View>
  );
}

function HeaderTool({
  accessibilityLabel,
  active = false,
  icon,
  onPress,
  styles,
}: {
  accessibilityLabel: string;
  active?: boolean;
  icon: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.toolButton, active ? styles.toolButtonActive : null]}
    >
      <Text style={[styles.toolIcon, active ? styles.toolIconActive : null]}>{icon}</Text>
    </Pressable>
  );
}

function createStyles(colors: MobileReaderColors) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      gap: 10,
      paddingBottom: 12,
    },
    chapterRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    icon: {
      color: colors.text,
      fontSize: 25,
      fontWeight: "700",
      lineHeight: 27,
    },
    titleButton: {
      flex: 1,
      justifyContent: "center",
      minHeight: 48,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 0,
      lineHeight: 22,
      textAlign: "center",
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0,
      lineHeight: 17,
      textAlign: "center",
    },
    location: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0,
      lineHeight: 15,
      textAlign: "center",
    },
    toolRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    segment: {
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderRadius: 7,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      minWidth: 0,
      padding: 3,
    },
    segmentButton: {
      alignItems: "center",
      borderRadius: 5,
      flex: 1,
      justifyContent: "center",
      minHeight: 34,
      minWidth: 0,
      paddingHorizontal: 4,
    },
    segmentButtonActive: {
      backgroundColor: colors.surface,
      borderColor: colors.accent,
      borderWidth: 1,
    },
    segmentLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0,
    },
    segmentLabelActive: {
      color: colors.accent,
    },
    toolButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 7,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    toolButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toolIcon: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 0,
    },
    toolIconActive: {
      color: colors.accentText,
    },
  });
}
