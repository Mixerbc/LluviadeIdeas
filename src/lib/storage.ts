import type { ViewportState } from "../store/viewportStore";
import type { Note } from "../store/notesStore";

const STORAGE_KEY = "notes_canvas_v1";

export type PersistedSnapshot = {
  notes: Note[];
  viewport: ViewportState;
  updatedAt: string;
};

export function loadSnapshot(): PersistedSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as Partial<PersistedSnapshot>;
    if (!data || !data.viewport || !Array.isArray(data.notes)) {
      return null;
    }

    return {
      notes: data.notes ?? [],
      viewport: {
        offsetX: data.viewport.offsetX ?? 0,
        offsetY: data.viewport.offsetY ?? 0,
        zoom: data.viewport.zoom ?? 1,
      },
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: PersistedSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore persistence errors in static demo.
  }
}

export function clearSnapshot(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

