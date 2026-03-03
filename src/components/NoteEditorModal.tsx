import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { UI } from "../lib/i18n";
import { RichTextEditor } from "./RichTextEditor";

export type NoteEditorModalProps = {
  open: boolean;
  noteId: string | null;
  initialTitle: string;
  initialHtml: string;
  onCancel: () => void;
  onSave: (payload: { title: string; descriptionHtml: string }) => void;
  /** When true, overlay click and ESC do not close (e.g. during loading). */
  disableClose?: boolean;
};

function stop(e: React.MouseEvent | React.PointerEvent) {
  e.stopPropagation();
}

export function NoteEditorModal({
  open,
  noteId,
  initialTitle,
  initialHtml,
  onCancel,
  onSave,
  disableClose = false,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [descriptionHtml, setDescriptionHtml] = useState(initialHtml);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescriptionHtml(initialHtml || "");
    }
  }, [open, noteId, initialTitle, initialHtml]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (disableClose) return;
      onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, disableClose, onCancel]);

  const handleSave = () => {
    const safeHtml = DOMPurify.sanitize(descriptionHtml, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "span", "h2", "h3"],
      ALLOWED_ATTR: ["href", "target", "rel", "style"],
    });
    onSave({ title: title.trim() || "Sin título", descriptionHtml: safeHtml });
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableClose) return;
    if (e.target !== e.currentTarget) return;
    const selection = window.getSelection?.();
    if (selection?.toString().length) return;
    onCancel();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="w-full flex flex-col rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-2xl overflow-hidden"
        style={{
          width: "min(1000px, 92vw)",
          height: "min(720px, 88vh)",
          maxHeight: "88vh",
        }}
        onMouseDown={stop}
        onPointerDown={stop}
        onClick={stop}
      >
        <div className="shrink-0 flex items-center justify-between gap-4 px-5 pt-5 pb-2">
          <h2 className="text-base font-semibold tracking-wide text-gray-900">
            {UI.noteEditor.modalTitle}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={onCancel}
            disabled={disableClose}
          >
            {UI.modals.close}
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Título: compacto, una línea */}
          <div className="shrink-0 px-5 pb-2 text-sm text-gray-700">
            <label className="font-medium text-gray-700">{UI.noteEditor.titleLabel}</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={UI.noteEditor.titleLabel}
            />
          </div>

          {/* Descripción: ocupa el resto del espacio */}
          <div className="flex-1 min-h-0 flex flex-col px-5 pb-3">
            <label className="shrink-0 font-medium text-gray-700 text-sm mb-1">
              {UI.noteEditor.descriptionLabel}
            </label>
            <RichTextEditor
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder={UI.empty.notePlaceholder}
              minHeight={360}
              fillHeight
            />
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
            disabled={disableClose}
          >
            {UI.modals.enrich.cancel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
            onClick={handleSave}
          >
            {UI.modals.save}
          </button>
        </div>
      </div>
    </div>
  );
}
