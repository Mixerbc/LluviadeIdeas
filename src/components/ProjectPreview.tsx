import type { Note } from "../store/notesStore";
import { getNotePlainContent } from "../lib/noteUtils";
import { UI } from "../lib/i18n";

const PREVIEW_PADDING = 16;
const PREVIEW_W_DESKTOP = 420;
const PREVIEW_H_DESKTOP = 260;
const PREVIEW_W_MOBILE = 280;
const PREVIEW_H_MOBILE = 174;
const PREVIEW_LINE_CLAMP = 2;
const PREVIEW_CONTENT_MAX_CHARS = 60;

function getPreviewSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: PREVIEW_W_DESKTOP, h: PREVIEW_H_DESKTOP };
  return window.innerWidth < 640
    ? { w: PREVIEW_W_MOBILE, h: PREVIEW_H_MOBILE }
    : { w: PREVIEW_W_DESKTOP, h: PREVIEW_H_DESKTOP };
}

function computeBounds(notes: Note[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (notes.length === 0) {
    return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of notes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  const pad = 40;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

export type ProjectPreviewProps = {
  notes: Note[];
  className?: string;
};

export function ProjectPreview({ notes, className = "" }: ProjectPreviewProps) {
  const { w: boxW, h: boxH } = getPreviewSize();
  const innerW = boxW - PREVIEW_PADDING * 2;
  const innerH = boxH - PREVIEW_PADDING * 2;

  const bounds = computeBounds(notes);
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(innerW / rangeX, innerH / rangeY);
  const offsetX = PREVIEW_PADDING + (innerW - rangeX * scale) / 2 - bounds.minX * scale;
  const offsetY = PREVIEW_PADDING + (innerH - rangeY * scale) / 2 - bounds.minY * scale;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200/80 bg-[#F7F8FA] shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] ${className}`}
      style={{
        width: boxW,
        height: boxH,
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }}
    >
      {notes.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center p-4 text-center">
          <span className="text-sm text-gray-500">{UI.projects.noNotesYet}</span>
        </div>
      ) : (
        notes.map((note) => {
          const left = offsetX + note.x * scale;
          const top = offsetY + note.y * scale;
          const width = Math.max(8, note.w * scale);
          const height = Math.max(8, note.h * scale);
          const plain = getNotePlainContent(note);
          const previewText =
            plain.trim().slice(0, PREVIEW_CONTENT_MAX_CHARS) +
            (plain.length > PREVIEW_CONTENT_MAX_CHARS ? "…" : "");
          return (
            <div
              key={note.id}
              className="absolute rounded-md border border-gray-200/60 shadow-sm"
              style={{
                left,
                top,
                width,
                height,
                backgroundColor: note.color || "#CFE7FF",
                fontSize: "10px",
                lineHeight: 1.25,
                color: "#111827",
                overflow: "hidden",
                padding: "4px 6px",
              }}
            >
              <span
                className="block break-words"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: PREVIEW_LINE_CLAMP,
                  WebkitBoxOrient: "vertical",
                }}
                title={note.content || ""}
              >
                {previewText || " "}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
