import { useEffect, useRef, useState } from "react";
import { useUiStore } from "../store/uiStore";
import { UI } from "../lib/i18n";
import { NOTE_PASTELS } from "../lib/theme";

export type ContextMenuProps = {
  viewportWidth: number;
  viewportHeight: number;
  /** Cuando true, deshabilita Enriquecer y Desglosar (evitar solicitudes duplicadas). */
  geminiBusy?: boolean;
  onCreateNoteAt?: (worldX: number, worldY: number) => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
  onEditNote?: (noteId: string) => void;
  onImproveNote?: (noteId: string) => void;
  onSplitIdeas?: (noteId: string) => void;
  onResetBoard?: () => void;
  onDuplicateNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onChangeNoteColor?: (noteId: string, color: string) => void;
  onStartMerge?: (noteId: string) => void;
};

export function ContextMenu({
  viewportWidth,
  viewportHeight,
  geminiBusy = false,
  onCreateNoteAt,
  onExportJson,
  onImportJson,
  onEditNote,
  onImproveNote,
  onSplitIdeas,
  onResetBoard,
  onDuplicateNote,
  onDeleteNote,
  onChangeNoteColor,
  onStartMerge,
}: ContextMenuProps) {
  const contextMenu = useUiStore((state) => state.contextMenu);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  // Clamp menu position within viewport whenever it opens or viewport changes.
  useEffect(() => {
    if (!contextMenu.isOpen) return;

    const menuEl = menuRef.current;
    const rawX = contextMenu.x;
    const rawY = contextMenu.y;

    if (!menuEl) {
      // Fallback before first measurement.
      const clampedLeft = Math.min(
        Math.max(0, rawX),
        Math.max(0, viewportWidth - 200),
      );
      const clampedTop = Math.min(
        Math.max(0, rawY),
        Math.max(0, viewportHeight - 200),
      );
      setPosition({ left: clampedLeft, top: clampedTop });
      return;
    }

    const rect = menuEl.getBoundingClientRect();
    const menuWidth = rect.width || 200;
    const menuHeight = rect.height || 200;

    const clampedLeft = Math.min(
      Math.max(0, rawX),
      Math.max(0, viewportWidth - menuWidth),
    );
    const clampedTop = Math.min(
      Math.max(0, rawY),
      Math.max(0, viewportHeight - menuHeight),
    );

    setPosition({ left: clampedLeft, top: clampedTop });
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y, viewportWidth, viewportHeight]);

  // Close on click outside and on Escape.
  useEffect(() => {
    if (!contextMenu.isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const menuEl = menuRef.current;
      if (!menuEl) return;
      if (menuEl.contains(event.target as Node)) return;
      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("contextmenu", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("contextmenu", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen || !contextMenu.target) {
    return null;
  }

  const isBoardTarget = contextMenu.target === "board";
  const isNoteTarget = contextMenu.target === "note";

  const handleCreateNoteHere = () => {
    if (isBoardTarget && onCreateNoteAt && contextMenu.worldX != null && contextMenu.worldY != null) {
      onCreateNoteAt(contextMenu.worldX, contextMenu.worldY);
    }
    closeContextMenu();
  };

  const handleExportJson = () => {
    if (onExportJson) {
      onExportJson();
    }
    closeContextMenu();
  };

  const handleImportJson = () => {
    if (onImportJson) {
      onImportJson();
    }
    closeContextMenu();
  };

  const handleDuplicateNote = () => {
    if (isNoteTarget && contextMenu.noteId && onDuplicateNote) {
      onDuplicateNote(contextMenu.noteId);
    }
    closeContextMenu();
  };

  const handleDeleteNote = () => {
    if (isNoteTarget && contextMenu.noteId && onDeleteNote) {
      onDeleteNote(contextMenu.noteId);
    }
    closeContextMenu();
  };

  const handleChangeColor = (color: string) => {
    if (isNoteTarget && contextMenu.noteId && onChangeNoteColor) {
      onChangeNoteColor(contextMenu.noteId, color);
    }
    closeContextMenu();
  };

  const handleImproveNote = () => {
    if (isNoteTarget && contextMenu.noteId && onImproveNote) {
      onImproveNote(contextMenu.noteId);
    }
    closeContextMenu();
  };

  const handleSplitIdeas = () => {
    if (isNoteTarget && contextMenu.noteId && onSplitIdeas) {
      onSplitIdeas(contextMenu.noteId);
    }
    closeContextMenu();
  };

  const handleStartMerge = () => {
    if (isNoteTarget && contextMenu.noteId && onStartMerge) {
      onStartMerge(contextMenu.noteId);
    }
    closeContextMenu();
  };

  const handleEditNote = () => {
    if (isNoteTarget && contextMenu.noteId && onEditNote) {
      onEditNote(contextMenu.noteId);
    }
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-44 rounded-xl border border-gray-200 bg-white px-1.5 py-2 text-sm text-gray-800 shadow-lg"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {isBoardTarget && (
        <div className="space-y-0.5">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleCreateNoteHere}
          >
            {UI.contextMenu.board.createNoteHere}
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleExportJson}
          >
            {UI.contextMenu.board.exportJson}
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleImportJson}
          >
            {UI.contextMenu.board.importJson}
          </button>
          {import.meta.env.DEV && onResetBoard && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100"
                onClick={() => onResetBoard()}
              >
                {UI.contextMenu.board.resetBoard}
              </button>
            </>
          )}
        </div>
      )}

      {isNoteTarget && (
        <div className="space-y-0.5">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleEditNote}
          >
            {UI.contextMenu.note.edit}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleImproveNote}
            disabled={geminiBusy}
          >
            {UI.contextMenu.note.enrichWithAI}
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSplitIdeas}
            disabled={geminiBusy}
          >
            {UI.contextMenu.note.splitIdeas}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleDuplicateNote}
          >
            {UI.contextMenu.note.duplicate}
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50"
            onClick={handleDeleteNote}
          >
            {UI.contextMenu.note.delete}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <div className="px-2.5 py-1 pb-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {UI.contextMenu.note.color}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {NOTE_PASTELS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-5 w-5 rounded-md border border-gray-200 shadow-sm transition hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => handleChangeColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={handleStartMerge}
          >
            {UI.contextMenu.note.startMerge}
          </button>
        </div>
      )}
    </div>
  );
}
