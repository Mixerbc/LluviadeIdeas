import { create } from "zustand";

export type ContextMenuTarget = "board" | "note";

export type ContextMenuState = {
  isOpen: boolean;
  x: number;
  y: number;
  target: ContextMenuTarget | null;
  noteId?: string;
  worldX?: number;
  worldY?: number;
};

export type ImportMode = "merge" | "replace";

export type ImportModalState = {
  isOpen: boolean;
  text: string;
  mode: ImportMode;
  error: string | null;
};

export type MergeModeState = {
  active: boolean;
  fromNoteId: string | null;
  /** True while the merge API request is in progress. */
  loading: boolean;
};

export type ImproveModalState = {
  isOpen: boolean;
  noteId: string | null;
  beforeText: string;
  afterText: string;
  loading: boolean;
  error: string | null;
  errorDetails: string | null;
  /** For 429: seconds to wait before retry (for countdown UI). */
  retryAfterSec: number | null;
};

export type SplitModalState = {
  isOpen: boolean;
  noteId: string | null;
  beforeText: string;
  resultText: string;
  loading: boolean;
  error: string | null;
  errorDetails: string | null;
  retryAfterSec: number | null;
};

/** Shown when drag/resize causes overlap; user can confirm merge. */
export type PendingMergeState = {
  fromId: string;
  toId: string;
} | null;

/** Cooldown after a merge so the same note doesn't re-trigger overlap modal. */
export type MergeCooldownState = {
  noteId: string;
  until: number;
} | null;

type UiStore = {
  contextMenu: ContextMenuState;
  importModal: ImportModalState;
  mergeMode: MergeModeState;
  improveModal: ImproveModalState;
  splitModal: SplitModalState;
  pendingMerge: PendingMergeState;
  pendingMergeLoading: boolean;
  mergeCooldown: MergeCooldownState;
  selectedNoteId: string | null;
  editingNoteId: string | null;
  /** Draft content for the note being edited; only valid when editingNoteId is set. */
  editingNoteDraft: string | null;
  setSelectedNote: (id: string | null) => void;
  setEditingNoteId: (id: string | null) => void;
  setEditingNoteDraft: (draft: string | null) => void;
  clearEditing: () => void;
  openContextMenu: (payload: Omit<ContextMenuState, "isOpen">) => void;
  closeContextMenu: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  setImportText: (text: string) => void;
  setImportMode: (mode: ImportMode) => void;
  setImportError: (message: string | null) => void;
  startMergeMode: (fromNoteId: string) => void;
  exitMergeMode: () => void;
  setMergeLoading: (loading: boolean) => void;
  openImproveModal: (noteId: string, beforeText: string) => void;
  closeImproveModal: () => void;
  setImproveLoading: (loading: boolean) => void;
  setImproveDraft: (draft: string) => void;
  setImproveError: (error: string | null, details?: string | null) => void;
  setImproveRetryAfterSec: (sec: number | null) => void;
  openSplitModal: (noteId: string, beforeText: string) => void;
  closeSplitModal: () => void;
  setSplitResult: (resultText: string) => void;
  setSplitLoading: (loading: boolean) => void;
  setSplitError: (error: string | null, details?: string | null) => void;
  setSplitRetryAfterSec: (sec: number | null) => void;
  setPendingMerge: (payload: PendingMergeState) => void;
  setPendingMergeLoading: (loading: boolean) => void;
  setMergeCooldown: (payload: MergeCooldownState) => void;
};

const initialContextMenu: ContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  target: null,
};

const initialImportModal: ImportModalState = {
  isOpen: false,
  text: "",
  mode: "merge",
  error: null,
};

const initialMergeMode: MergeModeState = {
  active: false,
  fromNoteId: null,
  loading: false,
};

const initialImproveModal: ImproveModalState = {
  isOpen: false,
  noteId: null,
  beforeText: "",
  afterText: "",
  loading: false,
  error: null,
  errorDetails: null,
  retryAfterSec: null,
};

const initialSplitModal: SplitModalState = {
  isOpen: false,
  noteId: null,
  beforeText: "",
  resultText: "",
  loading: false,
  error: null,
  errorDetails: null,
  retryAfterSec: null,
};

export const useUiStore = create<UiStore>((set) => ({
  contextMenu: initialContextMenu,
  importModal: initialImportModal,
  mergeMode: initialMergeMode,
  improveModal: initialImproveModal,
  splitModal: initialSplitModal,
  pendingMerge: null,
  pendingMergeLoading: false,
  mergeCooldown: null,
  selectedNoteId: null,
  editingNoteId: null,
  editingNoteDraft: null,
  setSelectedNote: (id) => set({ selectedNoteId: id }),
  setEditingNoteId: (id) => set({ editingNoteId: id }),
  setEditingNoteDraft: (draft) => set({ editingNoteDraft: draft }),
  clearEditing: () => set({ editingNoteId: null, editingNoteDraft: null }),
  openContextMenu: (payload) =>
    set({
      contextMenu: {
        ...initialContextMenu,
        ...payload,
        isOpen: true,
      },
    }),
  closeContextMenu: () =>
    set({
      contextMenu: initialContextMenu,
    }),
  openImportModal: () =>
    set({
      importModal: {
        ...initialImportModal,
        isOpen: true,
      },
    }),
  closeImportModal: () =>
    set({
      importModal: initialImportModal,
    }),
  setImportText: (text) =>
    set((state) => ({
      importModal: {
        ...state.importModal,
        text,
      },
    })),
  setImportMode: (mode) =>
    set((state) => ({
      importModal: {
        ...state.importModal,
        mode,
      },
    })),
  setImportError: (message) =>
    set((state) => ({
      importModal: {
        ...state.importModal,
        error: message,
      },
    })),
  startMergeMode: (fromNoteId) =>
    set({
      mergeMode: { active: true, fromNoteId, loading: false },
    }),
  exitMergeMode: () =>
    set({
      mergeMode: initialMergeMode,
    }),
  setMergeLoading: (loading) =>
    set((state) => ({
      mergeMode: {
        ...state.mergeMode,
        loading,
      },
    })),
  openImproveModal: (noteId, beforeText) =>
    set({
      improveModal: {
        ...initialImproveModal,
        isOpen: true,
        noteId,
        beforeText,
        afterText: "",
        loading: true,
        error: null,
        errorDetails: null,
        retryAfterSec: null,
      },
    }),
  closeImproveModal: () =>
    set({
      improveModal: initialImproveModal,
    }),
  setImproveLoading: (loading) =>
    set((state) => ({
      improveModal: { ...state.improveModal, loading },
    })),
  setImproveDraft: (draft) =>
    set((state) => ({
      improveModal: { ...state.improveModal, afterText: draft, loading: false, error: null, errorDetails: null, retryAfterSec: null },
    })),
  setImproveError: (error, details) =>
    set((state) => ({
      improveModal: { ...state.improveModal, error, errorDetails: details ?? null, loading: false, retryAfterSec: null },
    })),
  setImproveRetryAfterSec: (sec) =>
    set((state) => ({
      improveModal: { ...state.improveModal, retryAfterSec: sec },
    })),
  openSplitModal: (noteId, beforeText) =>
    set({
      splitModal: {
        ...initialSplitModal,
        isOpen: true,
        noteId,
        beforeText,
        resultText: "",
        loading: true,
        error: null,
        errorDetails: null,
        retryAfterSec: null,
      },
    }),
  closeSplitModal: () =>
    set({
      splitModal: initialSplitModal,
    }),
  setSplitResult: (resultText) =>
    set((state) => ({
      splitModal: { ...state.splitModal, resultText, loading: false, error: null, errorDetails: null, retryAfterSec: null },
    })),
  setSplitLoading: (loading) =>
    set((state) => ({
      splitModal: { ...state.splitModal, loading },
    })),
  setSplitError: (error, details) =>
    set((state) => ({
      splitModal: { ...state.splitModal, error, errorDetails: details ?? null, loading: false, retryAfterSec: null },
    })),
  setSplitRetryAfterSec: (sec) =>
    set((state) => ({
      splitModal: { ...state.splitModal, retryAfterSec: sec },
    })),
  setPendingMerge: (payload) => set({ pendingMerge: payload }),
  setPendingMergeLoading: (loading) => set({ pendingMergeLoading: loading }),
  setMergeCooldown: (payload) => set({ mergeCooldown: payload }),
}));


