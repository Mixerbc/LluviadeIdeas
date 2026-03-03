import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type DropdownProps = {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  /** Clase del contenedor (wrapper con position relative). */
  className?: string;
  /** Alineación del menú respecto al trigger: bottom-end = debajo, a la derecha. */
  align?: "bottom-end" | "bottom-start";
  /** Desplazamiento del panel desde el trigger: [x, y] en px. Default [12, 6]. */
  offset?: [number, number];
};

const DEFAULT_OFFSET: [number, number] = [12, 6];
const EDGE_PADDING = 8;

export function Dropdown({
  open,
  onClose,
  trigger,
  children,
  className = "",
  align = "bottom-end",
  offset = DEFAULT_OFFSET,
}: DropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(offset[0]);
  const [translateY] = useState(offset[1]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const container = containerRef.current;
      const panel = panelRef.current;
      if (!container || !panel) return;
      if (container.contains(target) || panel.contains(target)) return;
      const selection = window.getSelection?.();
      if (selection?.toString().length) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, [open, onClose]);

  // Ajustar posición si el dropdown se sale por la derecha
  useEffect(() => {
    if (!open || !containerRef.current || typeof window === "undefined") return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxRight = window.innerWidth - EDGE_PADDING;
    const panelRightWithOffset = containerRect.right + offset[0];
    if (panelRightWithOffset > maxRight) {
      setTranslateX(offset[0] - (panelRightWithOffset - maxRight));
    } else {
      setTranslateX(offset[0]);
    }
  }, [open, offset]);

  const positionClass =
    align === "bottom-end"
      ? "right-0 top-full"
      : "left-0 top-full";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {trigger}
      {open && (
        <div
          ref={panelRef}
          className={`absolute z-[100] min-w-[140px] rounded-xl border border-[#E5E7EB] bg-white py-2 shadow-[0_10px_25px_rgba(0,0,0,0.10)] ${positionClass}`}
          style={{
            transform: `translate(${translateX}px, ${translateY}px)`,
            marginTop: 0,
          }}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}
