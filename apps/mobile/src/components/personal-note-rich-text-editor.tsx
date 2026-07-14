import {
  builtInPersonalNoteTemplates,
  createVerseKey,
  formatShortBibleReference,
  parseVerseReferenceQuery,
  personalNoteDocumentToText,
  type PersonalNoteDocument,
  type PersonalNoteDocumentMark,
  type PersonalNoteNode,
} from "@kjv/shared";
import { RichText, TenTapStartKit, useBridgeState, useEditorBridge, useEditorContent } from "@10play/tentap-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const textColors = [
  ["ink", "#17202a"],
  ["crimson", "#a52a2a"],
  ["emerald", "#177245"],
  ["blue", "#1f5f99"],
  ["violet", "#6b4fa1"],
] as const;
const highlightColors = [
  ["yellow", "#fff1a8"],
  ["mint", "#bdebd4"],
  ["sky", "#c7e7ff"],
  ["rose", "#ffd0d8"],
  ["lavender", "#e3d6ff"],
] as const;

const textColorToCss = Object.fromEntries(textColors);
const highlightToCss = Object.fromEntries(highlightColors);
const cssToTextColor = Object.fromEntries(textColors.map(([token, css]) => [css, token]));
const cssToHighlight = Object.fromEntries(highlightColors.map(([token, css]) => [css, token]));

const mobileEditorBridges = (() => {
  const mainExtensionNames = new Set(TenTapStartKit.flatMap((bridge) => {
    const extension = bridge.tiptapExtension;
    return (Array.isArray(extension) ? extension : [extension]).filter(Boolean).map((item) => item!.name);
  }));
  const dependencyNames = new Set<string>();
  return TenTapStartKit.map((bridge) => {
    const clone = bridge.clone();
    clone.tiptapExtensionDeps = clone.tiptapExtensionDeps?.filter((extension) => {
      if (mainExtensionNames.has(extension.name) || dependencyNames.has(extension.name)) return false;
      dependencyNames.add(extension.name);
      return true;
    });
    return clone;
  });
})();

type EditorJsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: EditorJsonNode[];
  text?: string;
};

function toEditorNode(node: PersonalNoteNode): EditorJsonNode {
  if (node.type === "verseReference") return { type: "text", text: `#${String(node.attrs?.label ?? "")}` };
  if (node.type === "noteReference") return { type: "text", text: `[[${String(node.attrs?.label ?? "노트")}]]` };

  const marks: NonNullable<EditorJsonNode["marks"]> | undefined = node.marks?.flatMap((mark): NonNullable<EditorJsonNode["marks"]> => {
    if (mark.type === "textColor") {
      const color = textColorToCss[String(mark.attrs?.value)];
      return color ? [{ type: "textStyle", attrs: { color } }] : [];
    }
    if (mark.type === "highlight") {
      const color = highlightToCss[String(mark.attrs?.value)];
      return color ? [{ type: "highlight", attrs: { color } }] : [];
    }
    if (mark.type === "fontSize") return [];
    return [{ type: mark.type, attrs: mark.attrs }];
  });
  return {
    type: node.type,
    ...(node.attrs ? { attrs: node.attrs } : {}),
    ...(marks?.length ? { marks } : {}),
    ...(node.content ? { content: node.content.map(toEditorNode) } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
  };
}

function toEditorDocument(document: PersonalNoteDocument) {
  return { type: "doc", content: document.content.map(toEditorNode) };
}

function fromEditorNode(node: EditorJsonNode): PersonalNoteNode | null {
  const supportedNodes = new Set(["paragraph", "heading", "blockquote", "bulletList", "orderedList", "taskList", "listItem", "taskItem", "text", "hardBreak"]);
  if (!node.type || !supportedNodes.has(node.type)) return null;
  const marks: PersonalNoteDocumentMark[] | undefined = node.marks?.flatMap((mark): PersonalNoteDocumentMark[] => {
    if (mark.type === "textStyle") {
      const value = cssToTextColor[String(mark.attrs?.color).toLowerCase()];
      return value ? [{ type: "textColor", attrs: { value } }] : [];
    }
    if (mark.type === "highlight") {
      const value = cssToHighlight[String(mark.attrs?.color).toLowerCase()];
      return value ? [{ type: "highlight", attrs: { value } }] : [];
    }
    if (mark.type === "bold" || mark.type === "italic" || mark.type === "underline") return [{ type: mark.type }];
    return [];
  });
  const content = node.content?.map(fromEditorNode).filter((item): item is PersonalNoteNode => Boolean(item));
  const attrs = node.attrs ? { ...node.attrs } : undefined;
  if (attrs?.textAlign === "left") attrs.textAlign = "start";
  if (attrs?.textAlign === "right") attrs.textAlign = "end";
  return {
    type: node.type,
    ...(attrs ? { attrs } : {}),
    ...(marks?.length ? { marks } : {}),
    ...(content ? { content } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
  };
}

function fromEditorDocument(value: object): PersonalNoteDocument {
  const root = value as EditorJsonNode;
  const content = root.content?.map(fromEditorNode).filter((item): item is PersonalNoteNode => Boolean(item)) ?? [];
  return { type: "doc", version: 1, content: content.length ? content : [{ type: "paragraph", content: [] }] };
}

function replaceTrailingReference(document: PersonalNoteDocument, trigger: string, replacement: string) {
  const clone = JSON.parse(JSON.stringify(document)) as PersonalNoteDocument;
  let replaced = false;
  const visit = (nodes: PersonalNoteNode[]) => {
    for (let index = nodes.length - 1; index >= 0 && !replaced; index -= 1) {
      const node = nodes[index];
      if (node.content) visit(node.content);
      if (!replaced && node.type === "text" && node.text?.endsWith(trigger)) {
        node.text = `${node.text.slice(0, -trigger.length)}${replacement} `;
        replaced = true;
      }
    }
  };
  visit(clone.content);
  return clone;
}

type MobileTextSize = "sm" | "md" | "lg";
type MobileTextAlign = "start" | "center" | "end" | "justify";

function applyDocumentStyle(document: PersonalNoteDocument, size: MobileTextSize, textAlign: MobileTextAlign) {
  const clone = JSON.parse(JSON.stringify(document)) as PersonalNoteDocument;
  const visit = (nodes: PersonalNoteNode[]) => {
    for (const node of nodes) {
      if (node.type === "paragraph" || node.type === "heading" || node.type === "blockquote") {
        node.attrs = { ...node.attrs, textAlign };
      }
      if (node.type === "text") {
        const marks = (node.marks ?? []).filter((mark) => mark.type !== "fontSize");
        node.marks = size === "md" ? marks : [...marks, { type: "fontSize", attrs: { value: size } }];
      }
      if (node.content) visit(node.content);
    }
  };
  visit(clone.content);
  return clone;
}

type PreservedReference = { type: "verseReference" | "noteReference"; attrs: Record<string, unknown> };

function collectReferenceNodes(document: PersonalNoteDocument) {
  const references: PreservedReference[] = [];
  const visit = (nodes: PersonalNoteNode[]) => {
    for (const node of nodes) {
      if ((node.type === "verseReference" || node.type === "noteReference") && node.attrs) references.push({ type: node.type, attrs: { ...node.attrs } });
      if (node.content) visit(node.content);
    }
  };
  visit(document.content);
  return references;
}

function restoreReferenceNodes(document: PersonalNoteDocument, references: PreservedReference[]) {
  if (!references.length) return document;
  const labels = references.map((reference) => ({
    reference,
    token: reference.type === "verseReference" ? `#${String(reference.attrs.label ?? "")}` : `[[${String(reference.attrs.label ?? "")}]]`,
  })).filter((item) => item.token.length > 2).sort((left, right) => right.token.length - left.token.length);
  const transform = (nodes: PersonalNoteNode[]): PersonalNoteNode[] => nodes.flatMap((node) => {
    if (node.type !== "text" || !node.text) {
      return [{ ...node, ...(node.content ? { content: transform(node.content) } : {}) }];
    }
    const result: PersonalNoteNode[] = [];
    let cursor = 0;
    while (cursor < node.text.length) {
      const matches = labels.map((item) => ({ item, index: node.text!.indexOf(item.token, cursor) })).filter((match) => match.index >= 0).sort((left, right) => left.index - right.index);
      const match = matches[0];
      if (!match) break;
      if (match.index > cursor) result.push({ ...node, text: node.text.slice(cursor, match.index) });
      result.push({ type: match.item.reference.type, attrs: { ...match.item.reference.attrs } });
      cursor = match.index + match.item.token.length;
    }
    if (cursor < node.text.length) result.push({ ...node, text: node.text.slice(cursor) });
    return result.length ? result : [node];
  });
  return { ...document, content: transform(document.content) };
}

type Props = {
  document: PersonalNoteDocument;
  onChange: (document: PersonalNoteDocument) => void;
  onAddVerseReference?: (suggestion: { bookId: string; chapter: number; verse: number; verseKey: string; displayReference: string }) => void;
};

export function PersonalNoteRichTextEditor({ document, onAddVerseReference, onChange }: Props) {
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
  const [textSize, setTextSize] = useState<MobileTextSize>("md");
  const [textAlign, setTextAlign] = useState<MobileTextAlign>(() => {
    const value = document.content.find((node) => node.attrs?.textAlign)?.attrs?.textAlign;
    return value === "center" || value === "end" || value === "justify" ? value : "start";
  });
  const initialDocument = useMemo(() => toEditorDocument(document), []);
  const editor = useEditorBridge({
    bridgeExtensions: mobileEditorBridges,
    initialContent: initialDocument,
    autofocus: false,
    avoidIosKeyboard: true,
    dynamicHeight: false,
    theme: {
      webview: { backgroundColor: "#ffffff" },
      webviewContainer: { backgroundColor: "#ffffff" },
    },
  });
  const editorState = useBridgeState(editor);
  const editorJson = useEditorContent(editor, { type: "json", debounceInterval: 180 });
  const lastEmitted = useRef(JSON.stringify(document));
  const preservedReferences = useRef(collectReferenceNodes(document));

  useEffect(() => {
    if (!editorJson) return;
    const next = applyDocumentStyle(restoreReferenceNodes(fromEditorDocument(editorJson), preservedReferences.current), textSize, textAlign);
    const serialized = JSON.stringify(next);
    if (serialized === lastEmitted.current) return;
    lastEmitted.current = serialized;
    onChange(next);
  }, [editorJson, onChange, textAlign, textSize]);

  useEffect(() => {
    if (!editorState.isReady) return;
    const alignCss = textAlign === "start" ? "left" : textAlign === "end" ? "right" : textAlign;
    const sizeCss = textSize === "sm" ? "14px" : textSize === "lg" ? "19px" : "16px";
    editor.injectCSS(`.ProseMirror { font-size: ${sizeCss} !important; text-align: ${alignCss} !important; }`, "personal-note-document-style");
  }, [editor, editorState.isReady, textAlign, textSize]);

  const plainText = editorJson ? personalNoteDocumentToText(fromEditorDocument(editorJson)) : personalNoteDocumentToText(document);
  const triggerMatch = /(?:^|\s)#([^#\n]{0,40})$/.exec(plainText);
  const trigger = triggerMatch ? `#${triggerMatch[1]}` : null;
  const parsed = triggerMatch ? parseVerseReferenceQuery(triggerMatch[1]) : null;
  const suggestions = parsed?.bookCandidates.slice(0, 6).map((book) => {
    const chapter = parsed.chapter;
    const verse = parsed.verse;
    return {
      kind: chapter && verse ? "verse" as const : "book" as const,
      book,
      chapter,
      verse,
      label: chapter && verse ? formatShortBibleReference(book, chapter, verse) : book.shortNameKo,
      verseKey: chapter && verse ? createVerseKey(book, chapter, verse) : null,
    };
  }) ?? [];

  const applyReference = (suggestion: (typeof suggestions)[number]) => {
    if (!trigger) return;
    const next = applyDocumentStyle(replaceTrailingReference(editorJson ? fromEditorDocument(editorJson) : document, trigger, `#${suggestion.label}`), textSize, textAlign);
    lastEmitted.current = JSON.stringify(next);
    editor.setContent(toEditorDocument(next) as never);
    onChange(next);
    if (suggestion.kind === "verse" && suggestion.verseKey && suggestion.chapter && suggestion.verse) {
      preservedReferences.current = [
        ...preservedReferences.current.filter((reference) => reference.type !== "verseReference" || reference.attrs.verseKey !== suggestion.verseKey),
        { type: "verseReference", attrs: { verseKey: suggestion.verseKey, bookId: suggestion.book.appBookId, chapter: suggestion.chapter, verse: suggestion.verse, label: suggestion.label } },
      ];
      const canonical = applyDocumentStyle(restoreReferenceNodes(next, preservedReferences.current), textSize, textAlign);
      lastEmitted.current = JSON.stringify(canonical);
      onChange(canonical);
      onAddVerseReference?.({
        bookId: suggestion.book.appBookId,
        chapter: suggestion.chapter,
        verse: suggestion.verse,
        verseKey: suggestion.verseKey,
        displayReference: suggestion.label,
      });
    }
    editor.focus("end");
  };

  const applyTemplate = (templateDocument: PersonalNoteDocument) => {
    preservedReferences.current = collectReferenceNodes(templateDocument);
    const next = applyDocumentStyle(templateDocument, textSize, textAlign);
    lastEmitted.current = JSON.stringify(next);
    editor.setContent(toEditorDocument(next) as never);
    onChange(next);
  };

  return (
    <View style={[styles.root, advancedToolsOpen ? styles.rootAdvanced : null]}>
      <View style={styles.editorFrame}>
        <RichText editor={editor} style={styles.editor} />
      </View>
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((item) => (
            <Pressable key={item.verseKey ?? item.book.appBookId} onPress={() => applyReference(item)} style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>{item.label}</Text>
              <Text style={styles.suggestionMeta}>{item.book.nameKo} · {item.book.nameEn}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.toolbarDock}
      >
        {advancedToolsOpen ? (
          <ScrollView
            accessibilityLabel="노트 고급 서식 도구"
            accessibilityRole="toolbar"
            contentContainerStyle={styles.advancedToolbar}
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <Tool accessibilityLabel="제목 1" active={editorState.headingLevel === 1} disabled={!editorState.isReady} label="H1" onPress={() => editor.toggleHeading(1)} />
            <Tool accessibilityLabel="제목 2" active={editorState.headingLevel === 2} disabled={!editorState.isReady} label="H2" onPress={() => editor.toggleHeading(2)} />
            <Tool accessibilityLabel="글머리 기호 목록" active={editorState.isBulletListActive} disabled={!editorState.isReady} label="•" onPress={() => editor.toggleBulletList()} />
            <Tool accessibilityLabel="번호 목록" active={editorState.isOrderedListActive} disabled={!editorState.isReady} label="1." onPress={() => editor.toggleOrderedList()} />
            <Tool accessibilityLabel="체크 목록" active={editorState.isTaskListActive} disabled={!editorState.isReady} label="☑" onPress={() => editor.toggleTaskList()} />
            <Tool accessibilityLabel="인용" active={editorState.isBlockquoteActive} disabled={!editorState.isReady} label="❝" onPress={() => editor.toggleBlockquote()} />
            <View style={styles.toolDivider} />
            <Tool accessibilityLabel="본문 글자 작게" active={textSize === "sm"} label="가-" onPress={() => setTextSize("sm")} />
            <Tool accessibilityLabel="본문 글자 기본" active={textSize === "md"} label="가" onPress={() => setTextSize("md")} />
            <Tool accessibilityLabel="본문 글자 크게" active={textSize === "lg"} label="가+" onPress={() => setTextSize("lg")} />
            <Tool accessibilityLabel="본문 시작 정렬" active={textAlign === "start"} label="≡←" onPress={() => setTextAlign("start")} />
            <Tool accessibilityLabel="본문 가운데 정렬" active={textAlign === "center"} label="≡↔" onPress={() => setTextAlign("center")} />
            <Tool accessibilityLabel="본문 끝 정렬" active={textAlign === "end"} label="→≡" onPress={() => setTextAlign("end")} />
            <Tool accessibilityLabel="본문 양쪽 정렬" active={textAlign === "justify"} label="☰" onPress={() => setTextAlign("justify")} />
            <View style={styles.toolDivider} />
            {textColors.map(([token, color]) => <ColorTool key={`text-${token}`} color={color} label={`글자색 ${token}`} onPress={() => editor.setColor(color)} />)}
            <View style={styles.toolDivider} />
            {highlightColors.map(([token, color]) => <ColorTool key={`highlight-${token}`} color={color} label={`형광색 ${token}`} onPress={() => editor.setHighlight(color)} />)}
            <View style={styles.toolDivider} />
            {builtInPersonalNoteTemplates.map((template) => (
              <Pressable accessibilityLabel={`노트 템플릿 ${template.name}`} accessibilityRole="button" key={template.id} onPress={() => applyTemplate(template.document)} style={styles.templateButton}>
                <Text style={styles.templateText}>{template.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <ScrollView
          accessibilityLabel="노트 기본 서식 도구"
          accessibilityRole="toolbar"
          contentContainerStyle={styles.primaryToolbar}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
        >
          <Tool accessibilityLabel="실행 취소" disabled={!editorState.canUndo} label="↶" onPress={() => editor.undo()} />
          <Tool accessibilityLabel="다시 실행" disabled={!editorState.canRedo} label="↷" onPress={() => editor.redo()} />
          <Tool accessibilityLabel="굵게" active={editorState.isBoldActive} disabled={!editorState.canToggleBold} label="B" onPress={() => editor.toggleBold()} textStyle={styles.bold} />
          <Tool accessibilityLabel="기울임" active={editorState.isItalicActive} disabled={!editorState.canToggleItalic} label="I" onPress={() => editor.toggleItalic()} textStyle={styles.italic} />
          <Tool accessibilityLabel="밑줄" active={editorState.isUnderlineActive} disabled={!editorState.canToggleUnderline} label="U" onPress={() => editor.toggleUnderline()} textStyle={styles.underline} />
          <ColorTool color={highlightToCss.yellow} label="노란색 형광" onPress={() => editor.setHighlight(highlightToCss.yellow)} />
          <Tool accessibilityLabel={advancedToolsOpen ? "노트 고급 서식 닫기" : "노트 서식 더보기"} active={advancedToolsOpen} label="•••" onPress={() => setAdvancedToolsOpen((open) => !open)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Tool({ accessibilityLabel, active = false, disabled = false, label, onPress, textStyle }: { accessibilityLabel?: string; active?: boolean; disabled?: boolean; label: string; onPress: () => void; textStyle?: object }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, active ? styles.toolActive : null, disabled ? styles.toolDisabled : null]}
    >
      <Text style={[styles.toolText, active ? styles.toolTextActive : null, textStyle]}>{label}</Text>
    </Pressable>
  );
}

function ColorTool({ color, label, onPress }: { color: string; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.colorTool, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#fff", borderColor: "#d9d5cc", borderRadius: 8, borderWidth: 1, overflow: "hidden", paddingBottom: 50, position: "relative" },
  rootAdvanced: { paddingBottom: 100 },
  toolbarDock: { backgroundColor: "#fff", bottom: 0, left: 0, position: "absolute", right: 0, width: "100%" },
  primaryToolbar: { alignItems: "center", borderTopColor: "#d9d5cc", borderTopWidth: 1, gap: 6, minHeight: 50, paddingHorizontal: 8 },
  advancedToolbar: { alignItems: "center", backgroundColor: "#f8f6f1", borderTopColor: "#ebe7df", borderTopWidth: 1, gap: 6, minHeight: 50, paddingHorizontal: 8 },
  tool: { alignItems: "center", backgroundColor: "#fff", borderColor: "#d8d3c9", borderRadius: 6, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  toolActive: { backgroundColor: "#e8f2ee", borderColor: "#176f63" },
  toolDisabled: { opacity: 0.4 },
  toolText: { color: "#292d32", fontSize: 15 },
  toolTextActive: { color: "#176f63" },
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  underline: { textDecorationLine: "underline" },
  toolDivider: { backgroundColor: "#d8d3c9", height: 24, marginHorizontal: 2, width: 1 },
  colorTool: { borderColor: "#8f8a80", borderRadius: 5, borderWidth: 1, height: 44, width: 44 },
  editorFrame: { height: 280, backgroundColor: "#fff" },
  editor: { flex: 1, backgroundColor: "#fff" },
  suggestions: { borderTopWidth: 1, borderTopColor: "#e6e0d7", backgroundColor: "#fff" },
  suggestion: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0ece5" },
  suggestionTitle: { color: "#252a2f", fontSize: 15, fontWeight: "700" },
  suggestionMeta: { color: "#6d6a64", fontSize: 12, marginTop: 2 },
  templateButton: { alignItems: "center", backgroundColor: "#fff", borderColor: "#d8d3c9", borderRadius: 6, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 10 },
  templateText: { color: "#3a3e42", fontSize: 12, fontWeight: "600" },
});
