/**
 * Light canvas theme constants (Canva/Miro style).
 */

export const CANVAS_BG = "#F7F8FA";
export const GRID_LINE = "rgba(0, 0, 0, 0.08)";

/** Palette: background + border for each note color (key = stored color value). */
export const NOTE_COLORS: Record<string, { bg: string; border: string }> = {
  "#FFF3B0": { bg: "#FFF3B0", border: "#F1C40F" },
  "#FFF2B2": { bg: "#FFF2B2", border: "#F1C40F" },
  "#CFE8FF": { bg: "#CFE8FF", border: "#3B82F6" },
  "#CFE7FF": { bg: "#CFE7FF", border: "#3B82F6" },
  "#CFFAE1": { bg: "#CFFAE1", border: "#22C55E" },
  "#CFF5D6": { bg: "#CFF5D6", border: "#22C55E" },
  "#FFE1C7": { bg: "#FFE1C7", border: "#F97316" },
  "#FFE0C2": { bg: "#FFE0C2", border: "#F97316" },
  "#FFD6E7": { bg: "#FFD6E7", border: "#EC4899" },
  "#FFD0E1": { bg: "#FFD0E1", border: "#EC4899" },
};

/** Pastel note colors (yellow, blue, green, orange, pink) for color picker. */
export const NOTE_PASTELS = [
  "#FFF2B2",
  "#CFE7FF",
  "#CFF5D6",
  "#FFE0C2",
  "#FFD0E1",
] as const;

export const DEFAULT_NOTE_COLOR = NOTE_PASTELS[1]; // blue

/** Resolve note color to bg and border from palette; fallback to color as bg and darker border. */
export function getNoteColors(color: string | undefined): { bg: string; border: string } {
  if (!color) return NOTE_COLORS[DEFAULT_NOTE_COLOR] ?? { bg: DEFAULT_NOTE_COLOR, border: "#1e40af" };
  const key = color.toLowerCase();
  for (const [k, v] of Object.entries(NOTE_COLORS)) {
    if (k.toLowerCase() === key) return v;
  }
  return { bg: color, border: color };
}

/** Text on pastel notes for readability. */
export const NOTE_TEXT_COLOR = "#111827";
