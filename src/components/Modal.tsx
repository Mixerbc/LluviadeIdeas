import type { ReactNode } from "react";
import { useEffect } from "react";
import { UI } from "../lib/i18n";

export type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  /** When true, overlay click and ESC do not close the modal (e.g. during loading). */
  disableClose?: boolean;
};

function stop(e: React.MouseEvent | React.PointerEvent) {
  e.stopPropagation();
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  closeLabel,
  disableClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (disableClose) return;
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, disableClose, onClose]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableClose) return;
    if (e.target !== e.currentTarget) return;
    const selection = window.getSelection?.();
    if (selection?.toString().length) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 text-gray-800 shadow-2xl"
        onMouseDown={stop}
        onPointerDown={stop}
        onClick={stop}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold tracking-wide text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={onClose}
            disabled={disableClose}
          >
            {closeLabel ?? UI.modals.close}
          </button>
        </div>

        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
}
