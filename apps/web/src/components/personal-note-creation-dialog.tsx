"use client";

import { FilePlus2, LayoutTemplate, X } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  builtInPersonalNoteTemplates,
  type PersonalNoteDocument,
  type PersonalNoteTemplate,
} from "@kjv/shared";

type PersonalNoteCreationSelection = {
  title: string;
  document?: PersonalNoteDocument;
};

type PersonalNoteCreationDialogProps = {
  linkedVerseCount: number;
  personalTemplates: PersonalNoteTemplate[];
  onClose: () => void;
  onCreate: (selection: PersonalNoteCreationSelection) => void;
};

export function PersonalNoteCreationDialog({ linkedVerseCount, personalTemplates, onClose, onCreate }: PersonalNoteCreationDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  const activePersonalTemplates = personalTemplates.filter((template) => template.status === "active").slice(0, 12);

  return (
    <div className="modal-backdrop f-note-create-dialog__backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-describedby="personal-note-create-description"
        aria-labelledby="personal-note-create-title"
        aria-modal="true"
        className="f-note-create-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">새 성경노트</div>
            <h2 id="personal-note-create-title">작성 방식을 선택하세요</h2>
          </div>
          <button aria-label="새 노트 창 닫기" className="icon-button" onClick={onClose} ref={closeButtonRef} type="button">
            <X size={18} />
          </button>
        </div>

        <p className="f-note-create-dialog__description" id="personal-note-create-description">
          {linkedVerseCount ? `선택한 구절 ${linkedVerseCount}개가 새 노트에 연결됩니다.` : "빈 노트나 공부 목적에 맞는 템플릿으로 시작할 수 있습니다."}
        </p>

        <div className="f-note-create-dialog__section">
          <strong>기본</strong>
          <button className="f-note-create-dialog__option" onClick={() => onCreate({ title: "새 성경노트" })} type="button">
            <FilePlus2 size={19} />
            <span><b>빈 노트</b><small>제목과 본문을 처음부터 작성합니다.</small></span>
          </button>
        </div>

        <div className="f-note-create-dialog__section">
          <strong>공부 템플릿</strong>
          <div className="f-note-create-dialog__options">
            {builtInPersonalNoteTemplates.map((template) => (
              <button className="f-note-create-dialog__option" key={template.id} onClick={() => onCreate({ title: template.name, document: template.document })} type="button">
                <LayoutTemplate size={19} />
                <span><b>{template.name}</b><small>{template.description}</small></span>
              </button>
            ))}
          </div>
        </div>

        {activePersonalTemplates.length ? (
          <div className="f-note-create-dialog__section">
            <strong>내 템플릿</strong>
            <div className="f-note-create-dialog__options">
              {activePersonalTemplates.map((template) => (
                <button className="f-note-create-dialog__option" key={template.id} onClick={() => onCreate({ title: template.name, document: template.bodyDocument })} type="button">
                  <LayoutTemplate size={19} />
                  <span><b>{template.name}</b><small>{template.description || "저장한 개인 템플릿"}</small></span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
