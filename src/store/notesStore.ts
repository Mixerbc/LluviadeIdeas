import { create } from "zustand";
import { DEFAULT_NOTE_COLOR } from "../lib/theme";

export type NoteColor = string;

const DEFAULT_TITLE = "Sin título";

export type Note = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: NoteColor;
  title: string;
  descriptionHtml: string;
  updatedAt: string;
  /** @deprecated Legacy; use title + descriptionHtml. Kept for migration. */
  content?: string;
};

/** Normalize legacy note (content-only) to title + descriptionHtml. */
export function normalizeNote(n: Partial<Note> & Pick<Note, "id" | "x" | "y" | "w" | "h" | "color" | "updatedAt">): Note {
  return {
    ...n,
    title: n.title ?? DEFAULT_TITLE,
    descriptionHtml: n.descriptionHtml ?? (typeof n.content === "string" ? n.content : ""),
  } as Note;
}

type NotesStore = {
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  resetNotes: () => void;
  addNote: (note: Note) => void;
  createNoteAt: (x: number, y: number) => void;
  updateNote: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  getNote: (id: string) => Note | undefined;
  removeNote: (id: string) => void;
  deleteNote: (id: string) => void;
};

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  setNotes: (notes) => set({ notes: notes.map((n) => normalizeNote(n as Note)) }),
  resetNotes: () => set({ notes: [] }),
  addNote: (note) =>
    set((state) => ({
      notes: [...state.notes, normalizeNote(note as Note)],
    })),
  createNoteAt: (x, y) =>
    set((state) => ({
      notes: [
        ...state.notes,
        {
          id: crypto.randomUUID(),
          x,
          y,
          w: 260,
          h: 160,
          title: "",
          descriptionHtml: "",
          color: DEFAULT_NOTE_COLOR,
          updatedAt: new Date().toISOString(),
        },
      ],
    })),
  updateNote: (id, patch) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id
          ? normalizeNote({
              ...n,
              ...patch,
              updatedAt:
                (patch as { updatedAt?: string }).updatedAt ??
                new Date().toISOString(),
            })
          : normalizeNote(n),
      ),
    })),
  getNote: (id) => {
    const n = get().notes.find((note) => note.id === id);
    return n ? normalizeNote(n) : undefined;
  },
  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),
}));
