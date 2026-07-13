import type { PersonalNoteDocument, PersonalNoteNode } from "./types";

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "listItem",
  "taskItem",
]);
const INLINE_TYPES = new Set(["text", "hardBreak", "verseReference", "noteReference"]);
const MARK_TYPES = new Set(["bold", "italic", "underline", "fontSize", "textColor", "highlight"]);
const FONT_SIZES = new Set(["sm", "md", "lg", "xl", "2xl"]);
const TEXT_COLORS = new Set(["ink", "slate", "crimson", "emerald", "blue", "violet"]);
const HIGHLIGHT_COLORS = new Set(["yellow", "mint", "sky", "rose", "lavender"]);
const TEXT_ALIGNS = new Set(["start", "center", "end", "justify"]);

export const PERSONAL_NOTE_DOCUMENT_VERSION = 1;
export const PERSONAL_NOTE_DOCUMENT_LIMITS = {
  maxDepth: 12,
  maxNodes: 4000,
  maxTextLength: 50000,
} as const;

export type PersonalNoteDocumentValidation = {
  valid: boolean;
  errors: string[];
  nodeCount: number;
  textLength: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function validateMarks(value: unknown, path: string, errors: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${path}.marks must be an array`);
    return;
  }

  for (const [index, mark] of value.entries()) {
    if (!isRecord(mark) || typeof mark.type !== "string" || !MARK_TYPES.has(mark.type)) {
      errors.push(`${path}.marks[${index}] is not supported`);
      continue;
    }
    const attrs = isRecord(mark.attrs) ? mark.attrs : {};
    if (mark.type === "fontSize" && !FONT_SIZES.has(String(attrs.value))) {
      errors.push(`${path}.marks[${index}] has an invalid font size`);
    }
    if (mark.type === "textColor" && !TEXT_COLORS.has(String(attrs.value))) {
      errors.push(`${path}.marks[${index}] has an invalid text color`);
    }
    if (mark.type === "highlight" && !HIGHLIGHT_COLORS.has(String(attrs.value ?? attrs.color))) {
      errors.push(`${path}.marks[${index}] has an invalid highlight color`);
    }
  }
}

function validateNode(
  value: unknown,
  path: string,
  depth: number,
  state: { nodeCount: number; textLength: number },
  errors: string[],
) {
  if (depth > PERSONAL_NOTE_DOCUMENT_LIMITS.maxDepth) {
    errors.push(`${path} exceeds the maximum nesting depth`);
    return;
  }
  if (!isRecord(value) || typeof value.type !== "string") {
    errors.push(`${path} must be a note node`);
    return;
  }

  state.nodeCount += 1;
  if (state.nodeCount > PERSONAL_NOTE_DOCUMENT_LIMITS.maxNodes) {
    errors.push("document contains too many nodes");
    return;
  }

  const { type } = value;
  if (!BLOCK_TYPES.has(type) && !INLINE_TYPES.has(type)) {
    errors.push(`${path}.type is not supported`);
    return;
  }

  const attrs = isRecord(value.attrs) ? value.attrs : {};
  if ((type === "paragraph" || type === "heading" || type === "blockquote") && attrs.textAlign !== undefined) {
    if (!TEXT_ALIGNS.has(String(attrs.textAlign))) errors.push(`${path}.attrs.textAlign is invalid`);
  }
  if (type === "heading" && !isInteger(attrs.level, 1, 3)) {
    errors.push(`${path}.attrs.level is invalid`);
  }
  if (type === "taskItem" && typeof attrs.checked !== "boolean") {
    errors.push(`${path}.attrs.checked must be boolean`);
  }

  if (type === "text") {
    if (typeof value.text !== "string") {
      errors.push(`${path}.text must be a string`);
    } else {
      state.textLength += value.text.length;
    }
    validateMarks(value.marks, path, errors);
  }

  if (type === "verseReference") {
    if (!/^[1-3]?[A-Z]{2,3}\.[1-9]\d{0,2}\.[1-9]\d{0,2}$/.test(String(attrs.verseKey ?? ""))) {
      errors.push(`${path}.attrs.verseKey is invalid`);
    }
    if (typeof attrs.bookId !== "string" || !isInteger(attrs.chapter, 1, 200) || !isInteger(attrs.verse, 1, 200)) {
      errors.push(`${path} has invalid verse attributes`);
    }
    if (typeof attrs.label !== "string" || attrs.label.length > 80) {
      errors.push(`${path}.attrs.label is invalid`);
    }
  }

  if (type === "noteReference") {
    if (typeof attrs.targetNoteId !== "string" || attrs.targetNoteId.length < 1 || attrs.targetNoteId.length > 120) {
      errors.push(`${path}.attrs.targetNoteId is invalid`);
    }
    if (typeof attrs.label !== "string" || attrs.label.length > 120) {
      errors.push(`${path}.attrs.label is invalid`);
    }
  }

  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) {
      errors.push(`${path}.content must be an array`);
    } else {
      for (const [index, child] of value.content.entries()) {
        validateNode(child, `${path}.content[${index}]`, depth + 1, state, errors);
      }
    }
  }
}

export function validatePersonalNoteDocument(value: unknown): PersonalNoteDocumentValidation {
  const errors: string[] = [];
  const state = { nodeCount: 0, textLength: 0 };
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) {
    return { valid: false, errors: ["document must be a doc node"], nodeCount: 0, textLength: 0 };
  }
  if (value.version !== undefined && value.version !== PERSONAL_NOTE_DOCUMENT_VERSION) {
    errors.push("document version is not supported");
  }
  for (const [index, node] of value.content.entries()) {
    validateNode(node, `content[${index}]`, 1, state, errors);
  }
  if (state.textLength > PERSONAL_NOTE_DOCUMENT_LIMITS.maxTextLength) {
    errors.push("document text is too long");
  }
  return { valid: errors.length === 0, errors, ...state };
}

export function createEmptyPersonalNoteDocument(): PersonalNoteDocument {
  return {
    type: "doc",
    version: PERSONAL_NOTE_DOCUMENT_VERSION,
    content: [{ type: "paragraph", content: [] }],
  };
}

function textNode(text: string): PersonalNoteNode {
  return { type: "text", text };
}

function parseInlineReferences(text: string): PersonalNoteNode[] {
  const nodes: PersonalNoteNode[] = [];
  const pattern = /#([0-9A-Za-z가-힣]+)\s+(\d{1,3}):(\d{1,3})/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(textNode(text.slice(lastIndex, index)));
    nodes.push(textNode(match[0]));
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(textNode(text.slice(lastIndex)));
  return nodes;
}

export function markdownLiteToPersonalNoteDocument(markdown: string): PersonalNoteDocument {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const content: PersonalNoteNode[] = [];
  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const task = /^- \[([ xX])\]\s+(.*)$/.exec(line);
    const bullet = /^-\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (heading) {
      content.push({ type: "heading", attrs: { level: heading[1].length }, content: parseInlineReferences(heading[2]) });
    } else if (task) {
      content.push({
        type: "taskList",
        content: [{ type: "taskItem", attrs: { checked: task[1].toLowerCase() === "x" }, content: [{ type: "paragraph", content: parseInlineReferences(task[2]) }] }],
      });
    } else if (bullet) {
      content.push({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: parseInlineReferences(bullet[1]) }] }] });
    } else if (quote) {
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: parseInlineReferences(quote[1]) }] });
    } else {
      content.push({ type: "paragraph", content: parseInlineReferences(line) });
    }
  }
  return { type: "doc", version: PERSONAL_NOTE_DOCUMENT_VERSION, content: content.length ? content : createEmptyPersonalNoteDocument().content };
}

function nodeText(node: PersonalNoteNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "verseReference") return `#${String(node.attrs?.label ?? "")}`;
  if (node.type === "noteReference") return `[[${String(node.attrs?.label ?? "노트")}]]`;
  const content = node.content?.map(nodeText) ?? [];
  if (node.type === "listItem" || node.type === "taskItem") return content.join(" ");
  return content.join("");
}

export function personalNoteDocumentToText(document: PersonalNoteDocument): string {
  return document.content.map(nodeText).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function blockToMarkdown(node: PersonalNoteNode): string {
  const text = node.content?.map(nodeText).join("") ?? nodeText(node);
  if (node.type === "heading") return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${text}`;
  if (node.type === "blockquote") return `> ${node.content?.map(blockToMarkdown).join("\n> ") ?? text}`;
  if (node.type === "bulletList") return (node.content ?? []).map((item) => `- ${nodeText(item)}`).join("\n");
  if (node.type === "orderedList") return (node.content ?? []).map((item, index) => `${index + 1}. ${nodeText(item)}`).join("\n");
  if (node.type === "taskList") return (node.content ?? []).map((item) => `- [${item.attrs?.checked ? "x" : " "}] ${nodeText(item)}`).join("\n");
  return text;
}

export function personalNoteDocumentToMarkdown(document: PersonalNoteDocument): string {
  return document.content.map(blockToMarkdown).join("\n").trim();
}

export function normalizePersonalNoteDocument(value: unknown, fallbackMarkdown = ""): PersonalNoteDocument {
  const validation = validatePersonalNoteDocument(value);
  if (validation.valid) return value as PersonalNoteDocument;
  return markdownLiteToPersonalNoteDocument(fallbackMarkdown);
}

export const builtInPersonalNoteTemplates = [
  {
    id: "observation-interpretation-application-prayer",
    name: "관찰 · 해석 · 적용 · 기도",
    description: "본문을 관찰하고 삶의 적용과 기도로 이어갑니다.",
    document: markdownLiteToPersonalNoteDocument("## 관찰\n\n## 해석\n\n## 적용\n\n## 기도\n"),
  },
  {
    id: "sermon-preparation",
    name: "설교 준비",
    description: "본문, 핵심 주제, 구조와 적용을 정리합니다.",
    document: markdownLiteToPersonalNoteDocument("## 본문\n\n## 핵심 주제\n\n## 구조\n\n## 적용\n\n## 참고 구절\n"),
  },
  {
    id: "hebrew-word-study",
    name: "히브리어 단어 연구",
    description: "표제어와 출현 구절, 문맥과 묵상을 기록합니다.",
    document: markdownLiteToPersonalNoteDocument("## 단어와 발음\n\n## 의미\n\n## 출현 구절\n\n## 문맥\n\n## 묵상\n"),
  },
] as const;
