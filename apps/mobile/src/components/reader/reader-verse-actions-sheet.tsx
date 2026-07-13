import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileReaderAction, MobileReaderColors } from "./reader-types";

type ReaderVerseActionsSheetProps = {
  actions: MobileReaderAction[];
  bottomOffset: number;
  colors: MobileReaderColors;
  guidance?: string;
  onClose: () => void;
  source?: string;
  status?: string;
  title: string;
};

const collapsedOffset = 96;

export function ReaderVerseActionsSheet({
  actions,
  bottomOffset,
  colors,
  guidance,
  onClose,
  source,
  status,
  title,
}: ReaderVerseActionsSheetProps) {
  const styles = useMemo(() => createStyles(colors, bottomOffset), [bottomOffset, colors]);
  const translateY = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(true);

  const snapTo = useCallback((nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    Animated.spring(translateY, {
      damping: 20,
      mass: 0.8,
      stiffness: 220,
      toValue: nextExpanded ? 0 : collapsedOffset,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          const base = expanded ? 0 : collapsedOffset;
          translateY.setValue(Math.max(0, Math.min(collapsedOffset, base + gesture.dy)));
        },
        onPanResponderRelease: (_, gesture) => snapTo(gesture.dy < -36 ? true : gesture.dy > 36 ? false : expanded),
        onPanResponderTerminate: () => snapTo(expanded),
      }),
    [expanded, snapTo, translateY],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      style={styles.keyboardLayer}
    >
      <Animated.View
        accessibilityLabel="선택 구절 작업"
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable
          accessibilityLabel={expanded ? "선택 구절 작업 접기" : "선택 구절 작업 펼치기"}
          onPress={() => snapTo(!expanded)}
          style={styles.dragTarget}
        >
          <View style={styles.dragHandle} />
        </Pressable>
        <View style={styles.headingRow}>
          <View style={styles.summary}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            {source ? <Text numberOfLines={1} style={styles.source}>{source}</Text> : null}
            {guidance ? <Text numberOfLines={2} style={styles.guidance}>{guidance}</Text> : null}
            {status ? <Text numberOfLines={1} style={styles.status}>{status}</Text> : null}
          </View>
          <Pressable accessibilityLabel="선택 구절 작업 닫기" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              disabled={action.disabled}
              key={action.label}
              onPress={action.onPress}
              style={[styles.action, action.disabled ? styles.actionDisabled : null]}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text numberOfLines={1} style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: MobileReaderColors, bottomOffset: number) {
  return StyleSheet.create({
    keyboardLayer: {
      bottom: bottomOffset,
      left: 0,
      position: "absolute",
      pointerEvents: "box-none",
      right: 0,
      zIndex: 30,
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      maxHeight: 360,
      paddingBottom: 14,
      paddingHorizontal: 14,
      shadowColor: "#000000",
      shadowOffset: { height: -3, width: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      width: "94%",
    },
    dragTarget: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 30,
    },
    dragHandle: {
      backgroundColor: colors.border,
      borderRadius: 2,
      height: 4,
      width: 44,
    },
    headingRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
    },
    summary: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0,
      lineHeight: 21,
    },
    source: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0,
      lineHeight: 17,
    },
    guidance: {
      color: colors.muted,
      fontSize: 12,
      letterSpacing: 0,
      lineHeight: 17,
    },
    status: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0,
      lineHeight: 17,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: colors.surfaceStrong,
      borderRadius: 7,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    closeLabel: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 24,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    action: {
      alignItems: "center",
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderRadius: 7,
      borderWidth: 1,
      flexBasis: "30%",
      flexDirection: "row",
      flexGrow: 1,
      gap: 6,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 92,
      paddingHorizontal: 9,
    },
    actionDisabled: {
      opacity: 0.45,
    },
    actionIcon: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "900",
    },
    actionLabel: {
      color: colors.text,
      flexShrink: 1,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0,
    },
  });
}
