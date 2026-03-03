import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import DOMPurify from "dompurify";
import { useUiStore } from "../store/uiStore";
import type { Note } from "../store/notesStore";
import { normalizeNote } from "../store/notesStore";
import { UI } from "../lib/i18n";
import { getNoteColors, NOTE_TEXT_COLOR } from "../lib/theme";

const NOTE_DESCRIPTION_ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "span", "h2", "h3",
];
const NOTE_DESCRIPTION_ALLOWED_ATTR = ["href", "target", "rel"];

function sanitizeNoteHtml(html: string): string {
  if (typeof DOMPurify === "undefined") return html.replace(/<[^>]+>/g, "");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: NOTE_DESCRIPTION_ALLOWED_TAGS,
    ALLOWED_ATTR: NOTE_DESCRIPTION_ALLOWED_ATTR,
  });
}

export type NoteCardProps = {
  note: Note;
  onOpenContextMenu: (
    noteId: string,
    event: MouseEvent<HTMLDivElement>,
  ) => void;
  onChangeRect: (noteId: string, x: number, y: number, w: number, h: number) => void;
  onNoteClick?: (noteId: string) => void;
  onSelectNote?: (noteId: string) => void;
  onOpenEditor: (noteId: string) => void;
  editorNoteId: string | null;
  zIndex?: number;
};

export function NoteCard({
  note,
  onOpenContextMenu,
  onChangeRect,
  onNoteClick,
  onSelectNote,
  onOpenEditor,
  editorNoteId,
  zIndex = 0,
}: NoteCardProps) {
  const mergeMode = useUiStore((state) => state.mergeMode);
  const selectedNoteId = useUiStore((state) => state.selectedNoteId);

  const normalized = normalizeNote(note);
  const isSelected = selectedNoteId === note.id;
  const isEditorOpen = editorNoteId === note.id;
  const { bg, border } = getNoteColors(note.color);
  const safeHtml = sanitizeNoteHtml(normalized.descriptionHtml);

  const handleWrapperContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenContextMenu(note.id, event);
  };

  const handleWrapperClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (mergeMode.active && note.id !== mergeMode.fromNoteId && onNoteClick) {
      event.preventDefault();
      onNoteClick(note.id);
      return;
    }
    if (!mergeMode.active && onSelectNote) {
      event.preventDefault();
      onSelectNote(note.id);
    }
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onOpenEditor(note.id);
  };

  const isMergeTarget =
    mergeMode.active && note.id !== mergeMode.fromNoteId;

  const inner = (
    <div
      className={`rounded-2xl border-2 px-4 py-[14px] text-[15px] leading-[1.45] h-full box-border flex flex-col transition-all duration-150 ${
          isSelected ? "ring-2 ring-blue-400 shadow-md scale-[1.02]" : "hover:shadow-md"
        }`}
        style={{
          borderColor: isMergeTarget ? "rgba(59, 130, 246, 0.6)" : border,
          backgroundColor: bg,
          color: NOTE_TEXT_COLOR,
          boxShadow: isMergeTarget ? undefined : `0 2px 8px ${border}20`,
        }}
        onContextMenu={handleWrapperContextMenu}
        onClick={handleWrapperClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isMergeTarget && (
          <div className="mb-2 text-[10px] font-medium text-blue-600 shrink-0">
            {UI.mergeTargetHint}
          </div>
        )}
        <div className="min-h-0 flex-1 w-full overflow-hidden flex flex-col">
          <div className="noteTitle font-bold shrink-0 mb-1 break-words line-clamp-1" style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
            {normalized.title || "Sin título"}
          </div>
          <div
            className="noteBody note-card-description text-[14px] leading-[1.4] overflow-hidden break-words text-gray-700"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 8,
              WebkitBoxOrient: "vertical",
            }}
            dangerouslySetInnerHTML={{ __html: safeHtml || "" }}
          />
        </div>
      </div>
  );

  return (
    <Rnd
      size={{ width: note.w, height: note.h }}
      position={{ x: note.x, y: note.y }}
      onDragStop={(_e, d) => {
        onChangeRect(note.id, d.x, d.y, note.w, note.h);
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const w = parseInt(ref.style.width ?? String(note.w), 10);
        const h = parseInt(ref.style.height ?? String(note.h), 10);
        onChangeRect(note.id, position.x, position.y, w, h);
      }}
      disableDragging={isEditorOpen}
      enableResizing={!isEditorOpen}
      enableUserSelectHack={false}
      style={{ zIndex }}
    >
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {inner}
      </motion.div>
    </Rnd>
  );
}
