import type { PersonalNote, PersonalNoteDocument, PersonalNoteVerseLink } from "@kjv/shared";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PersonalNoteRichTextEditor } from "../personal-note-rich-text-editor";
import type { PersonalNoteScreenColors } from "./personal-note-list-screen";

type Props = {
  colors: PersonalNoteScreenColors;
  document: PersonalNoteDocument;
  formatUpdatedAt: (value: string) => string;
  links: PersonalNoteVerseLink[];
  note: PersonalNote;
  onAddVerseReference: (suggestion: { bookId: string; chapter: number; verse: number; verseKey: string }) => void;
  onBack: () => void;
  onChangeDocument: (document: PersonalNoteDocument) => void;
  onChangeTags: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onDelete: () => void;
  onOpenLinkedVerse: (link: PersonalNoteVerseLink) => void;
  onSave: () => void;
  referenceLabel: (link: PersonalNoteVerseLink) => string;
  saveStatus?: string;
  saveStatusTone?: "neutral" | "saving" | "success" | "error";
  tags: string;
  title: string;
};

export function PersonalNoteEditorScreen({
  colors,
  document,
  formatUpdatedAt,
  links,
  note,
  onAddVerseReference,
  onBack,
  onChangeDocument,
  onChangeTags,
  onChangeTitle,
  onDelete,
  onOpenLinkedVerse,
  onSave,
  referenceLabel,
  saveStatus,
  saveStatusTone = "neutral",
  tags,
  title,
}: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const saveStatusStyle = saveStatusTone === "error"
    ? styles.saveMetaError
    : saveStatusTone === "success"
      ? styles.saveMetaSuccess
      : saveStatusTone === "saving"
        ? styles.saveMetaSaving
        : null;

  return (
    <View accessibilityLabel="노트 편집 화면" style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="노트 편집기 이전 화면" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
          <Text style={styles.icon}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>편집기</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>{note.title}</Text>
          <Text
            accessibilityLabel={`노트 저장 상태: ${saveStatus || "저장됨"}`}
            accessibilityLiveRegion="polite"
            style={[styles.saveMeta, saveStatusStyle]}
          >
            {saveStatus || `마지막 저장 ${formatUpdatedAt(note.lastSavedAt ?? note.updatedAt)}`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>제목</Text>
        <TextInput
          accessibilityLabel="노트 제목"
          onChangeText={onChangeTitle}
          placeholder="노트 제목"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={title}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>본문</Text>
        <PersonalNoteRichTextEditor
          key={note.id}
          document={document}
          onAddVerseReference={onAddVerseReference}
          onChange={onChangeDocument}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>태그</Text>
        <TextInput
          accessibilityLabel="노트 태그"
          onChangeText={onChangeTags}
          placeholder="태그, 쉼표 구분"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={tags}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>연결 구절</Text>
        {links.length ? (
          <View style={styles.linkList}>
            {links.map((link) => (
              <Pressable
                accessibilityLabel={`연결 구절 열기: ${referenceLabel(link)}`}
                accessibilityRole="button"
                key={link.id}
                onPress={() => onOpenLinkedVerse(link)}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>{referenceLabel(link)}</Text>
                <Text style={styles.linkArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>연결된 구절이 없습니다. 리더에서 구절을 선택해 새 노트를 만들 수 있습니다.</Text>
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>노트 삭제</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: PersonalNoteScreenColors) {
  return StyleSheet.create({
    screen: { gap: 16 },
    header: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingBottom: 12 },
    iconButton: { alignItems: "center", borderColor: colors.border, borderRadius: 7, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
    icon: { color: colors.text, fontSize: 26, fontWeight: "800", lineHeight: 28 },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0 },
    headerTitle: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 0, lineHeight: 22 },
    saveMeta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
    saveMetaError: { color: colors.danger, fontWeight: "800" },
    saveMetaSaving: { color: colors.muted, fontWeight: "800" },
    saveMetaSuccess: { color: colors.accent, fontWeight: "800" },
    saveButton: { alignItems: "center", backgroundColor: colors.accent, borderRadius: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: 15 },
    saveButtonText: { color: colors.accentText, fontSize: 14, fontWeight: "900", letterSpacing: 0 },
    field: { gap: 7 },
    fieldLabel: { color: colors.text, fontSize: 12, fontWeight: "800", letterSpacing: 0 },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
    linkList: { borderColor: colors.border, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
    linkButton: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 46, paddingHorizontal: 12 },
    linkText: { color: colors.text, fontSize: 14, fontWeight: "700", letterSpacing: 0 },
    linkArrow: { color: colors.muted, fontSize: 20, fontWeight: "800" },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    deleteButton: { alignItems: "center", borderColor: colors.danger, borderRadius: 7, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
    deleteButtonText: { color: colors.danger, fontSize: 14, fontWeight: "800", letterSpacing: 0 },
  });
}
