"use client";

import { Mark, mergeAttributes, Node } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Eraser,
  Highlighter,
  Italic,
  List,
  ListChecks,
  Maximize2,
  Minimize2,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import {
  PERSONAL_NOTE_DOCUMENT_VERSION,
  builtInPersonalNoteTemplates,
  findVerseReferenceTrigger,
  type PersonalNoteDocument,
  type PersonalNoteVerseLink,
} from "@kjv/shared";

type ReferenceSuggestion = {
  kind: "book" | "verse";
  bookId: string;
  chapter?: number;
  verse?: number;
  verseKey?: string;
  displayReference: string;
  displayText?: string;
};

type NoteOption = { id: string; title: string };

type PersonalNoteRichTextEditorProps = {
  noteId: string;
  value: PersonalNoteDocument;
  linkedVerses: PersonalNoteVerseLink[];
  noteOptions: NoteOption[];
  focusMode: boolean;
  onChange: (document: PersonalNoteDocument) => void;
  onAddVerseLink: (suggestion: Required<Pick<ReferenceSuggestion, "bookId" | "chapter" | "verse" | "verseKey" | "displayReference">>) => void;
  onAddNoteLink: (targetNoteId: string) => void;
  onFocusModeChange: (value: boolean) => void;
};

const FONT_SIZES = ["sm", "md", "lg", "xl", "2xl"] as const;
const TEXT_COLORS = ["ink", "slate", "crimson", "emerald", "blue", "violet"] as const;
const HIGHLIGHT_COLORS = ["yellow", "mint", "sky", "rose", "lavender"] as const;

function tokenMark(name: string, attribute: string) {
  return Mark.create({
    name,
    addAttributes() {
      return {
        value: {
          default: null,
          parseHTML: (element) => element.getAttribute(attribute),
          renderHTML: (attributes) => attributes.value ? { [attribute]: attributes.value } : {},
        },
      };
    },
    parseHTML() {
      return [{ tag: `span[${attribute}]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["span", mergeAttributes(HTMLAttributes), 0];
    },
  });
}

const FontSizeMark = tokenMark("fontSize", "data-note-size");
const TextColorMark = tokenMark("textColor", "data-note-color");

const VerseReferenceNode = Node.create({
  name: "verseReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      verseKey: { default: "" },
      bookId: { default: "" },
      chapter: { default: 1 },
      verse: { default: 1 },
      label: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-verse-reference]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-verse-reference": node.attrs.verseKey, class: "f-personal-note-editor__reference" }), `#${node.attrs.label}`];
  },
});

const NoteReferenceNode = Node.create({
  name: "noteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { targetNoteId: { default: "" }, label: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-note-reference]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-note-reference": node.attrs.targetNoteId, class: "f-personal-note-editor__reference f-personal-note-editor__reference--note" }), `[[${node.attrs.label}]]`];
  },
});

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} className="f-personal-note-editor__tool" data-active={active || undefined} disabled={disabled} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

export function PersonalNoteRichTextEditor(props: PersonalNoteRichTextEditorProps) {
  const { onAddNoteLink, onAddVerseLink } = props;
  const [referenceQuery, setReferenceQuery] = useState<{ from: number; to: number; query: string } | null>(null);
  const [referenceSuggestions, setReferenceSuggestions] = useState<ReferenceSuggestion[]>([]);
  const [noteQuery, setNoteQuery] = useState<{ from: number; to: number; query: string } | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const lastEmittedDocument = useRef(JSON.stringify(props.value));
  const referenceSuggestionsRef = useRef<ReferenceSuggestion[]>([]);
  const noteSuggestionsRef = useRef<NoteOption[]>([]);
  const activeSuggestionRef = useRef(0);
  const selectReferenceRef = useRef<(suggestion: ReferenceSuggestion) => void>(() => undefined);
  const selectNoteRef = useRef<(note: NoteOption) => void>(() => undefined);

  const inspectTrigger = useCallback((editor: NonNullable<ReturnType<typeof useEditor>>) => {
    const { $from } = editor.state.selection;
    const before = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
    const reference = findVerseReferenceTrigger(before, before.length);
    if (reference) {
      setReferenceQuery({ from: $from.pos - (before.length - reference.start), to: $from.pos, query: reference.query });
      setNoteQuery(null);
      return;
    }
    const noteMatch = /\[\[([^\]\n]{0,80})$/.exec(before);
    setReferenceQuery(null);
    setReferenceSuggestions([]);
    setNoteQuery(noteMatch ? { from: $from.pos - noteMatch[0].length, to: $from.pos, query: noteMatch[1] } : null);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["start", "center", "end", "justify"], defaultAlignment: "start" }),
      Highlight.configure({ multicolor: true }),
      FontSizeMark,
      TextColorMark,
      VerseReferenceNode,
      NoteReferenceNode,
    ],
    content: props.value,
    editorProps: {
      attributes: { class: "f-personal-note-editor__content", "aria-label": "성경노트 본문" },
      handleKeyDown: (_view, event) => {
        const references = referenceSuggestionsRef.current;
        const notes = noteSuggestionsRef.current;
        const count = references.length + notes.length;
        if (!count) return false;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next = (activeSuggestionRef.current + delta + count) % count;
          activeSuggestionRef.current = next;
          setActiveSuggestion(next);
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setReferenceQuery(null);
          setReferenceSuggestions([]);
          setNoteQuery(null);
          return true;
        }
        if (event.key !== "Enter") return false;
        event.preventDefault();
        const reference = references[activeSuggestionRef.current];
        if (reference) selectReferenceRef.current(reference);
        else {
          const note = notes[activeSuggestionRef.current - references.length];
          if (note) selectNoteRef.current(note);
        }
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const document: PersonalNoteDocument = { ...(current.getJSON() as PersonalNoteDocument), version: PERSONAL_NOTE_DOCUMENT_VERSION };
      lastEmittedDocument.current = JSON.stringify(document);
      props.onChange(document);
      inspectTrigger(current);
    },
    onSelectionUpdate: ({ editor: current }) => inspectTrigger(current),
  });

  useEffect(() => {
    if (!editor) return;
    const serialized = JSON.stringify(props.value);
    if (serialized === lastEmittedDocument.current) return;
    lastEmittedDocument.current = serialized;
    editor.commands.setContent(props.value, { emitUpdate: false });
    setReferenceQuery(null);
    setNoteQuery(null);
  }, [editor, props.noteId, props.value]);

  useEffect(() => {
    if (!referenceQuery?.query.trim()) {
      setReferenceSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/bible/reference-suggestions?q=${encodeURIComponent(`#${referenceQuery.query}`)}&limit=8`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("구절 후보를 불러오지 못했습니다.")))
        .then((payload) => {
          setReferenceSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
          setActiveSuggestion(0);
        })
        .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setReferenceSuggestions([]); });
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [referenceQuery]);

  const noteSuggestions = useMemo(() => {
    if (!noteQuery) return [];
    const query = noteQuery.query.trim().toLocaleLowerCase("ko-KR");
    return props.noteOptions.filter((note) => note.id !== props.noteId && (!query || note.title.toLocaleLowerCase("ko-KR").includes(query))).slice(0, 8);
  }, [noteQuery, props.noteId, props.noteOptions]);
  const selectReference = useCallback((suggestion: ReferenceSuggestion) => {
    if (!editor || !referenceQuery) return;
    if (suggestion.kind === "book") {
      editor.commands.insertContentAt({ from: referenceQuery.from, to: referenceQuery.to }, `#${suggestion.displayReference} `);
      editor.commands.focus();
      return;
    }
    if (!suggestion.verseKey || !suggestion.chapter || !suggestion.verse) return;
    editor.commands.insertContentAt({ from: referenceQuery.from, to: referenceQuery.to }, { type: "verseReference", attrs: { verseKey: suggestion.verseKey, bookId: suggestion.bookId, chapter: suggestion.chapter, verse: suggestion.verse, label: suggestion.displayReference } });
    onAddVerseLink({ ...suggestion, verseKey: suggestion.verseKey, chapter: suggestion.chapter, verse: suggestion.verse });
    setReferenceQuery(null);
    setReferenceSuggestions([]);
    editor.commands.focus();
  }, [editor, onAddVerseLink, referenceQuery]);

  const selectNote = useCallback((note: NoteOption) => {
    if (!editor || !noteQuery) return;
    editor.commands.insertContentAt({ from: noteQuery.from, to: noteQuery.to }, { type: "noteReference", attrs: { targetNoteId: note.id, label: note.title } });
    onAddNoteLink(note.id);
    setNoteQuery(null);
    editor.commands.focus();
  }, [editor, noteQuery, onAddNoteLink]);

  useEffect(() => {
    referenceSuggestionsRef.current = referenceSuggestions;
    noteSuggestionsRef.current = noteSuggestions;
    activeSuggestionRef.current = activeSuggestion;
    selectReferenceRef.current = selectReference;
    selectNoteRef.current = selectNote;
  }, [activeSuggestion, noteSuggestions, referenceSuggestions, selectNote, selectReference]);

  if (!editor) return <div className="f-personal-note-editor__loading">편집기를 준비하고 있습니다.</div>;

  const clearFormatting = () => editor.chain().focus().unsetAllMarks().clearNodes().run();
  const suggestionCount = referenceSuggestions.length + noteSuggestions.length;
  const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!suggestionCount) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestionCount);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current - 1 + suggestionCount) % suggestionCount);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setReferenceQuery(null);
      setReferenceSuggestions([]);
      setNoteQuery(null);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const reference = referenceSuggestions[activeSuggestion];
    if (reference) {
      selectReference(reference);
      return;
    }
    const note = noteSuggestions[activeSuggestion - referenceSuggestions.length];
    if (note) selectNote(note);
  };

  return (
    <div className="f-personal-note-editor" data-focus-mode={props.focusMode || undefined} onKeyDown={handleSuggestionKeyDown}>
      <div aria-label="노트 편집 도구" className="f-personal-note-editor__toolbar" role="toolbar">
        <div className="f-personal-note-editor__tool-group">
          <ToolbarButton disabled={!editor.can().undo()} label="실행 취소" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></ToolbarButton>
          <ToolbarButton disabled={!editor.can().redo()} label="다시 실행" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></ToolbarButton>
          <ToolbarButton label="서식 지우기" onClick={clearFormatting}><RemoveFormatting size={17} /></ToolbarButton>
        </div>
        <div className="f-personal-note-editor__tool-group">
          <ToolbarButton active={editor.isActive("bold")} label="굵게" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} label="기울임" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} label="밑줄" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></ToolbarButton>
          <select aria-label="글자 크기" className="f-personal-note-editor__select" defaultValue="md" onChange={(event) => editor.chain().focus().setMark("fontSize", { value: event.target.value }).run()}>
            {FONT_SIZES.map((size) => <option key={size} value={size}>{size === "sm" ? "작게" : size === "md" ? "기본" : size === "lg" ? "크게" : size === "xl" ? "아주 크게" : "제목"}</option>)}
          </select>
        </div>
        <details className="f-personal-note-editor__palette">
          <summary aria-label="글자색" title="글자색"><Palette size={17} /></summary>
          <div className="f-personal-note-editor__swatches">
            {TEXT_COLORS.map((color) => <button aria-label={`글자색 ${color}`} data-color={color} key={color} onClick={() => editor.chain().focus().setMark("textColor", { value: color }).run()} title={color} type="button" />)}
          </div>
        </details>
        <details className="f-personal-note-editor__palette">
          <summary aria-label="형광색" title="형광색"><Highlighter size={17} /></summary>
          <div className="f-personal-note-editor__swatches">
            {HIGHLIGHT_COLORS.map((color) => <button aria-label={`형광색 ${color}`} data-highlight={color} key={color} onClick={() => editor.chain().focus().setHighlight({ color }).run()} title={color} type="button" />)}
          </div>
        </details>
        <div className="f-personal-note-editor__tool-group">
          <ToolbarButton active={editor.isActive({ textAlign: "start" })} label="시작 정렬" onClick={() => editor.chain().focus().setTextAlign("start").run()}><AlignLeft size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "center" })} label="가운데 정렬" onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "end" })} label="끝 정렬" onClick={() => editor.chain().focus().setTextAlign("end").run()}><AlignRight size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "justify" })} label="양쪽 정렬" onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={17} /></ToolbarButton>
        </div>
        <div className="f-personal-note-editor__tool-group">
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} label="제목" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><BookOpen size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} label="인용" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} label="목록" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
          <ToolbarButton active={editor.isActive("taskList")} label="체크리스트" onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={17} /></ToolbarButton>
        </div>
        <ToolbarButton label={props.focusMode ? "집중 모드 종료" : "집중 모드"} onClick={() => props.onFocusModeChange(!props.focusMode)}>{props.focusMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</ToolbarButton>
      </div>

      <div className="f-personal-note-editor__template-row">
        <Eraser size={15} />
        <span>템플릿</span>
        {builtInPersonalNoteTemplates.map((template) => <button key={template.id} onClick={() => editor.commands.setContent(template.document)} title={template.description} type="button">{template.name}</button>)}
      </div>

      <EditorContent editor={editor} />

      {(referenceSuggestions.length > 0 || noteSuggestions.length > 0) ? (
        <div aria-label="참조 후보" className="f-personal-note-editor__suggestions" role="listbox">
          {referenceSuggestions.map((suggestion, index) => (
            <button aria-selected={index === activeSuggestion} key={`${suggestion.kind}:${suggestion.verseKey ?? suggestion.bookId}:${index}`} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => selectReference(suggestion)} role="option" type="button">
              <strong>{suggestion.displayReference}</strong>
              {suggestion.displayText ? <span>{suggestion.displayText}</span> : null}
            </button>
          ))}
          {noteSuggestions.map((note, index) => <button aria-selected={referenceSuggestions.length + index === activeSuggestion} key={note.id} onMouseEnter={() => setActiveSuggestion(referenceSuggestions.length + index)} onClick={() => selectNote(note)} role="option" type="button"><strong>[[{note.title}]]</strong><span>노트 연결</span></button>)}
        </div>
      ) : null}
    </div>
  );
}
