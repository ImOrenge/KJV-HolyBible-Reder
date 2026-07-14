import type { PersonalNote } from "@kjv/shared";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type PersonalNoteScreenColors = {
  accent: string;
  accentText: string;
  border: string;
  danger: string;
  muted: string;
  surface: string;
  surfaceStrong: string;
  text: string;
};

type Props = {
  colors: PersonalNoteScreenColors;
  formatUpdatedAt: (value: string) => string;
  notes: PersonalNote[];
  onBack?: () => void;
  onCreate: () => void;
  onOpen: (note: PersonalNote) => void;
  onQueryChange: (value: string) => void;
  query: string;
  totalCount: number;
};

export function PersonalNoteListScreen({
  colors,
  formatUpdatedAt,
  notes,
  onBack,
  onCreate,
  onOpen,
  onQueryChange,
  query,
  totalCount,
}: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="노트 목록 화면" style={styles.screen}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable accessibilityLabel="이전 화면" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
            <Text style={styles.icon}>‹</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PERSONAL NOTES</Text>
          <Text style={styles.title}>성경노트</Text>
        </View>
        <Pressable accessibilityLabel="새 노트" accessibilityRole="button" onPress={onCreate} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>새 노트</Text>
        </Pressable>
      </View>

      <View style={styles.searchBlock}>
        <Text style={styles.fieldLabel}>노트 검색</Text>
        <TextInput
          accessibilityLabel="노트 검색"
          onChangeText={onQueryChange}
          placeholder="제목, 본문, 태그 검색"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={query}
        />
        <Text style={styles.summary}>{notes.length}/{totalCount}개 노트</Text>
      </View>

      {notes.length ? (
        <View style={styles.list}>
          {notes.map((note) => (
            <Pressable
              accessibilityLabel={`노트 열기: ${note.title}`}
              accessibilityRole="button"
              key={note.id}
              onPress={() => onOpen(note)}
              style={styles.noteRow}
            >
              <View style={styles.noteHeading}>
                <Text numberOfLines={1} style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteDate}>{formatUpdatedAt(note.updatedAt)}</Text>
              </View>
              <Text numberOfLines={2} style={styles.noteBody}>{note.bodyText || note.bodyMarkdown || "본문 없음"}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View accessibilityLabel="노트 목록 빈 상태" style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{totalCount ? "검색 결과가 없습니다." : "저장한 성경노트가 없습니다."}</Text>
          <Text style={styles.emptyText}>
            {totalCount ? "검색어를 바꾸거나 지워 보세요." : "노트를 만들고 구절 링크와 태그를 함께 저장할 수 있습니다."}
          </Text>
          {!totalCount ? (
            <Pressable accessibilityLabel="첫 노트 만들기" accessibilityRole="button" onPress={onCreate} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>첫 노트 만들기</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: PersonalNoteScreenColors) {
  return StyleSheet.create({
    screen: { gap: 14 },
    header: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
    headerCopy: { flex: 1, minWidth: 0 },
    iconButton: { alignItems: "center", borderColor: colors.border, borderRadius: 7, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
    icon: { color: colors.text, fontSize: 26, fontWeight: "800", lineHeight: 28 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0 },
    title: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: 0, lineHeight: 26 },
    primaryButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
    primaryButtonText: { color: colors.accentText, fontSize: 14, fontWeight: "900", letterSpacing: 0 },
    searchBlock: { backgroundColor: colors.surfaceStrong, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 7, padding: 12 },
    fieldLabel: { color: colors.text, fontSize: 12, fontWeight: "800", letterSpacing: 0 },
    searchInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
    summary: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    list: { borderColor: colors.border, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
    noteRow: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, gap: 5, minHeight: 76, paddingHorizontal: 13, paddingVertical: 11 },
    noteHeading: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
    noteTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "800", letterSpacing: 0, lineHeight: 20 },
    noteDate: { color: colors.muted, fontSize: 11, lineHeight: 16 },
    noteBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    emptyState: { alignItems: "flex-start", backgroundColor: colors.surfaceStrong, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 8, padding: 16 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", letterSpacing: 0 },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: 7, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
    secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: "800", letterSpacing: 0 },
  });
}
