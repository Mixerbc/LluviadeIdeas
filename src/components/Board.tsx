import type { MouseEvent } from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ContextMenu } from "./ContextMenu";
import { useUiStore } from "../store/uiStore";
import { useNotesStore } from "../store/notesStore";
import { useProjectsStore } from "../store/projectsStore";
import { debounce } from "../lib";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "../lib";
import {
  createSnapshotForExport,
  downloadSnapshotAsFile,
  parseSnapshotFromJson,
} from "../lib";
import { isOverlapping } from "../lib/collision";
import {
  geminiGenerateWithRetry,
  buildMergePrompt,
  buildImprovePrompt,
  buildSplitIdeasPrompt,
  GeminiError,
  getGeminiCooldownRemaining,
  isGeminiBusy,
} from "../lib/geminiDirect";
import { fallbackSplitIdeas } from "../lib/fallbackSplit";
import { Modal } from "./Modal";
import { NoteEditorModal } from "./NoteEditorModal";
import { TopBar } from "./TopBar";
import { NoteCard } from "./NoteCard";
import { getNotePlainContent } from "../lib/noteUtils";
import { confettiBurst } from "../utils/confetti";
import type { ImportMode } from "../store/uiStore";
import DOMPurify from "dompurify";
import { UI } from "../lib/i18n";
import { CANVAS_BG, DEFAULT_NOTE_COLOR, GRID_LINE } from "../lib/theme";

const DEFAULT_VIEWPORT = { offsetX: 0, offsetY: 0, zoom: 1 };

/** Workspace mínimo y padding para que el canvas se sienta infinito. */
const BASE_WORKSPACE_WIDTH = 3000;
const BASE_WORKSPACE_HEIGHT = 2000;
const WORKSPACE_PADDING = 200;
const SPAWN_OFFSET = 120;

function computeWorkspaceSize(notes: { x: number; y: number; w: number; h: number }[]): {
  width: number;
  height: number;
} {
  if (notes.length === 0) {
    return { width: BASE_WORKSPACE_WIDTH, height: BASE_WORKSPACE_HEIGHT };
  }
  const maxX = Math.max(...notes.map((n) => n.x + n.w));
  const maxY = Math.max(...notes.map((n) => n.y + n.h));
  return {
    width: Math.max(BASE_WORKSPACE_WIDTH, maxX + WORKSPACE_PADDING),
    height: Math.max(BASE_WORKSPACE_HEIGHT, maxY + WORKSPACE_PADDING),
  };
}

function getFriendlyGeminiMessage(err: unknown): {
  message: string;
  details: string;
  is429?: boolean;
  retryAfterSec?: number;
} {
  if (err instanceof GeminiError) {
    if (err.status === 429) {
      return {
        message: err.message || "Límite temporal de Gemini. Intenta de nuevo en unos segundos.",
        details: err.raw,
        is429: true,
        retryAfterSec: err.retryAfterSec,
      };
    }
    if (err.status === 503) {
      return { message: err.message || UI.errors.service503, details: err.raw };
    }
    if (err.message?.includes("tardó demasiado") || err.message?.includes("Reintenta")) {
      return { message: UI.errors.geminiTimeout, details: err.raw };
    }
    return { message: err.message || UI.errors.general, details: err.raw };
  }
  return { message: err instanceof Error ? err.message : UI.errors.general, details: "" };
}

/** Parse split-ideas output into blocks by "1) TÍTULO:", "2) TÍTULO:", etc. */
function parseSplitIdeasBlocks(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  const re = /\d+\)\s*TÍTULO:/gm;
  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) indices.push(match.index);
  if (indices.length === 0) return [trimmed];
  const blocks: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i < indices.length - 1 ? indices[i + 1] : trimmed.length;
    blocks.push(trimmed.slice(start, end).trim());
  }
  return blocks.length ? blocks : [trimmed];
}

export type BoardProps = {
  /** When set, board uses this project's notes and persists via projectsStore. */
  projectId?: string;
  /** When set with projectId, board uses this group's notes and viewport. */
  groupId?: string;
  onBack?: () => void;
  projectName?: string;
  onRenameProject?: () => void;
  /** When set, TopBar shows "Nuevo grupo" button (opens create-group flow). */
  onNewGroup?: () => void;
  /** When true, do not render TopBar (parent provides header). */
  hideTopBar?: boolean;
};

export type BoardHandle = {
  newNote: () => void;
  exportBoard: () => void;
};

function BoardInner(
  {
    projectId,
    groupId,
    onBack,
    projectName,
    onRenameProject,
    onNewGroup,
    hideTopBar = false,
  }: BoardProps = {},
  ref: React.Ref<BoardHandle>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const project = useProjectsStore((s) => (projectId ? s.getProject(projectId) : null));
  const group = useProjectsStore((s) =>
    projectId && groupId ? s.getGroup(projectId, groupId) : null,
  );

  const notesStoreNotes = useNotesStore((state) => state.notes);
  const notesStoreSetNotes = useNotesStore((state) => state.setNotes);
  const notesStoreCreateNoteAt = useNotesStore((state) => state.createNoteAt);
  const notesStoreAddNote = useNotesStore((state) => state.addNote);
  const notesStoreUpdateNote = useNotesStore((state) => state.updateNote);
  const notesStoreGetNote = useNotesStore((state) => state.getNote);
  const notesStoreRemoveNote = useNotesStore((state) => state.removeNote);

  const projectsSetGroupNotes = useProjectsStore((s) => s.setGroupNotes);
  const projectsCreateNoteAt = useProjectsStore((s) => s.createNoteAt);
  const projectsAddNote = useProjectsStore((s) => s.addNote);
  const projectsUpdateNote = useProjectsStore((s) => s.updateNote);
  const projectsGetNote = useProjectsStore((s) => s.getNote);
  const projectsRemoveNote = useProjectsStore((s) => s.removeNote);

  const useGroupScope = Boolean(projectId && groupId);
  const groupNotes = group?.notes ?? [];

  const notes = useGroupScope ? groupNotes : notesStoreNotes;
  const setNotes = useGroupScope
    ? (n: typeof groupNotes) => projectId && groupId && projectsSetGroupNotes(projectId, groupId, n)
    : notesStoreSetNotes;
  const createNoteAt = useGroupScope
    ? (x: number, y: number) =>
        projectId && groupId ? projectsCreateNoteAt(projectId, groupId, x, y) : undefined!
    : notesStoreCreateNoteAt;
  const addNote = useGroupScope
    ? (note: Parameters<typeof notesStoreAddNote>[0]) =>
        projectId && groupId && projectsAddNote(projectId, groupId, note)
    : notesStoreAddNote;
  const updateNote = useGroupScope
    ? (id: string, patch: Parameters<typeof notesStoreUpdateNote>[1]) =>
        projectId && groupId && projectsUpdateNote(projectId, groupId, id, patch)
    : notesStoreUpdateNote;
  const getNote = useGroupScope
    ? (id: string) => (projectId && groupId ? projectsGetNote(projectId, groupId, id) : undefined)
    : notesStoreGetNote;
  const removeNote = useGroupScope
    ? (id: string) => projectId && groupId && projectsRemoveNote(projectId, groupId, id)
    : notesStoreRemoveNote;

  const pendingMergeLoading = useUiStore((state) => state.pendingMergeLoading);

  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  const workspaceSize = computeWorkspaceSize(notes);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeErrorDetails, setMergeErrorDetails] = useState<string | null>(null);
  const [showImproveDetails, setShowImproveDetails] = useState(false);
  const [showSplitDetails, setShowSplitDetails] = useState(false);
  const [showMergeDetails, setShowMergeDetails] = useState(false);

  const openContextMenu = useUiStore((state) => state.openContextMenu);
  const importModal = useUiStore((state) => state.importModal);
  const openImportModal = useUiStore((state) => state.openImportModal);
  const closeImportModal = useUiStore((state) => state.closeImportModal);
  const setImportText = useUiStore((state) => state.setImportText);
  const setImportMode = useUiStore((state) => state.setImportMode);
  const setImportError = useUiStore((state) => state.setImportError);
  const improveModal = useUiStore((state) => state.improveModal);
  const openImproveModal = useUiStore((state) => state.openImproveModal);
  const closeImproveModal = useUiStore((state) => state.closeImproveModal);
  const setImproveLoading = useUiStore((state) => state.setImproveLoading);
  const setImproveDraft = useUiStore((state) => state.setImproveDraft);
  const setImproveError = useUiStore((state) => state.setImproveError);
  const setImproveRetryAfterSec = useUiStore((state) => state.setImproveRetryAfterSec);
  const splitModal = useUiStore((state) => state.splitModal);
  const openSplitModal = useUiStore((state) => state.openSplitModal);
  const closeSplitModal = useUiStore((state) => state.closeSplitModal);
  const setSplitResult = useUiStore((state) => state.setSplitResult);
  const setSplitLoading = useUiStore((state) => state.setSplitLoading);
  const setSplitError = useUiStore((state) => state.setSplitError);
  const setSplitRetryAfterSec = useUiStore((state) => state.setSplitRetryAfterSec);
  const mergeMode = useUiStore((state) => state.mergeMode);
  const startMergeMode = useUiStore((state) => state.startMergeMode);
  const exitMergeMode = useUiStore((state) => state.exitMergeMode);
  const setMergeLoading = useUiStore((state) => state.setMergeLoading);
  const pendingMerge = useUiStore((state) => state.pendingMerge);
  const setPendingMerge = useUiStore((state) => state.setPendingMerge);
  const setPendingMergeLoading = useUiStore((state) => state.setPendingMergeLoading);
  const mergeCooldown = useUiStore((state) => state.mergeCooldown);
  const setMergeCooldown = useUiStore((state) => state.setMergeCooldown);
  const selectedNoteId = useUiStore((state) => state.selectedNoteId);
  const setSelectedNote = useUiStore((state) => state.setSelectedNote);
  const closeContextMenu = useUiStore((state) => state.closeContextMenu);

  const [editorNoteId, setEditorNoteId] = useState<string | null>(null);
  const [mergeRetryAttempt, setMergeRetryAttempt] = useState<number | null>(null);
  const [mergeCooldownRemaining, setMergeCooldownRemaining] = useState(0);
  const mergeAbortRef = useRef<AbortController | null>(null);
  const splitAbortRef = useRef<AbortController | null>(null);

  // Initial hydration from localStorage (only when not using a project).
  useEffect(() => {
    if (projectId) return;
    const snapshot = loadSnapshot();
    if (!snapshot) return;
    notesStoreSetNotes(snapshot.notes);
  }, [projectId, notesStoreSetNotes]);

  useEffect(() => {
    if (!improveModal.loading) return;
    const id = setInterval(() => {
      const sec = useUiStore.getState().improveModal.retryAfterSec;
      if (sec == null || sec <= 0) return;
      useUiStore.getState().setImproveRetryAfterSec(Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [improveModal.loading]);

  useEffect(() => {
    if (!splitModal.loading) return;
    const id = setInterval(() => {
      const sec = useUiStore.getState().splitModal.retryAfterSec;
      if (sec == null || sec <= 0) return;
      useUiStore.getState().setSplitRetryAfterSec(Math.max(0, sec - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [splitModal.loading]);

  useEffect(() => {
    if (!improveModal.isOpen) setShowImproveDetails(false);
  }, [improveModal.isOpen]);

  useEffect(() => {
    if (!improveModal.isOpen || !improveModal.error || improveModal.loading) return;
    const id = setInterval(() => {
      const remaining = getGeminiCooldownRemaining();
      useUiStore.getState().setImproveRetryAfterSec(remaining > 0 ? remaining : null);
    }, 1000);
    return () => clearInterval(id);
  }, [improveModal.isOpen, improveModal.error, improveModal.loading]);
  useEffect(() => {
    if (!splitModal.isOpen) setShowSplitDetails(false);
  }, [splitModal.isOpen]);

  useEffect(() => {
    if (!splitModal.isOpen || !splitModal.error || splitModal.loading) return;
    const id = setInterval(() => {
      const remaining = getGeminiCooldownRemaining();
      useUiStore.getState().setSplitRetryAfterSec(remaining > 0 ? remaining : null);
    }, 1000);
    return () => clearInterval(id);
  }, [splitModal.isOpen, splitModal.error, splitModal.loading]);

  useEffect(() => {
    if (!pendingMerge) setShowMergeDetails(false);
  }, [pendingMerge]);

  useEffect(() => {
    if (pendingMerge == null) return;
    const tick = () => setMergeCooldownRemaining(getGeminiCooldownRemaining());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingMerge]);

  // Debounced persistence to localStorage (only when not using a project).
  useEffect(() => {
    if (projectId) return;
    const scheduleSave = debounce(() => {
      const notesState = useNotesStore.getState();
      saveSnapshot({
        notes: notesState.notes,
        viewport: DEFAULT_VIEWPORT,
        updatedAt: new Date().toISOString(),
      });
    }, 600);

    const unsubscribeNotes = useNotesStore.subscribe(() => {
      scheduleSave();
    });

    return () => {
      unsubscribeNotes();
    };
  }, [projectId]);

  const handleNewNote = () => {
    const el = scrollContainerRef.current;
    const scrollLeft = el?.scrollLeft ?? 0;
    const scrollTop = el?.scrollTop ?? 0;
    const x = Math.max(0, scrollLeft + SPAWN_OFFSET);
    const y = Math.max(0, scrollTop + SPAWN_OFFSET);
    createNoteAt(x, y);
    confettiBurst();
  };

  const handleExport = () => {
    const viewport =
      useGroupScope && group
        ? (group.viewport ?? DEFAULT_VIEWPORT)
        : DEFAULT_VIEWPORT;
    const snapshot = createSnapshotForExport(notes, viewport);
    const fileName =
      projectId && project
        ? `${project.name.replace(/\s+/g, "-")}-notes.json`
        : undefined;
    downloadSnapshotAsFile(snapshot, fileName);
  };

  useImperativeHandle(
    ref,
    () => ({ newNote: handleNewNote, exportBoard: handleExport }),
    [handleNewNote, handleExport],
  );

  const generateId = (): string => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleNoteContextMenu = (
    noteId: string,
    event: MouseEvent<HTMLDivElement>,
  ) => {
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "note",
      noteId,
    });
  };

  const handleImproveNote = (noteId: string) => {
    const note = getNote(noteId);
    if (!note) return;
    const contentToImprove = getNotePlainContent(note);
    openImproveModal(noteId, contentToImprove);
    const prompt = buildImprovePrompt(contentToImprove);
    geminiGenerateWithRetry(prompt, {
      maxOutputTokens: 768,
      onRetry: (_attempt, retryAfterSec) => {
        setImproveRetryAfterSec(retryAfterSec ?? null);
      },
    })
      .then((resultText) => {
        const raw = resultText || "(sin respuesta)";
        const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
        setImproveDraft(clean);
      })
      .catch((err) => {
        const { message, details, retryAfterSec: sec } = getFriendlyGeminiMessage(err);
        setImproveError(message, details);
        if (err instanceof GeminiError && err.status === 429 && sec != null) {
          setImproveRetryAfterSec(sec);
        }
      })
      .finally(() => setImproveLoading(false));
  };

  const handleConfirmImprove = () => {
    if (!improveModal.noteId) return;
    const clean = DOMPurify.sanitize(improveModal.afterText, { USE_PROFILES: { html: true } });
    updateNote(improveModal.noteId, { descriptionHtml: clean });
    closeImproveModal();
  };

  const handleEditNote = (noteId: string) => {
    closeContextMenu();
    setEditorNoteId(noteId);
  };

  const handleSaveNote = (payload: { title: string; descriptionHtml: string }) => {
    if (!editorNoteId) return;
    updateNote(editorNoteId, {
      title: payload.title,
      descriptionHtml: payload.descriptionHtml,
      updatedAt: new Date().toISOString(),
    });
    setEditorNoteId(null);
    confettiBurst({ subtle: true });
  };

  const handleCancelNote = () => {
    setEditorNoteId(null);
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNote(noteId);
  };

  const handleStartMerge = (noteId: string) => {
    startMergeMode(noteId);
  };

  const handleConfirmOverlapMerge = async () => {
    if (!pendingMerge || pendingMergeLoading) return;
    if (getGeminiCooldownRemaining() > 0) return;
    const noteA = getNote(pendingMerge.fromId);
    const noteB = getNote(pendingMerge.toId);
    if (!noteA || !noteB) {
      setPendingMerge(null);
      return;
    }
    setMergeError(null);
    setMergeErrorDetails(null);
    setPendingMergeLoading(true);
    mergeAbortRef.current = new AbortController();
    try {
      const prompt = buildMergePrompt(getNotePlainContent(noteA), getNotePlainContent(noteB));
      const resultText = await geminiGenerateWithRetry(prompt, {
        signal: mergeAbortRef.current.signal,
        maxOutputTokens: 768,
        onRetry: (attempt, sec) => {
          setMergeRetryAttempt(attempt);
          setMergeError(`Límite temporal. Reintentando (${attempt})…`);
        },
      });
      setMergeError(null);
      updateNote(pendingMerge.fromId, {
        descriptionHtml: resultText || "(sin respuesta)",
      });
      removeNote(pendingMerge.toId);
      setPendingMerge(null);
      setMergeCooldown({ noteId: pendingMerge.fromId, until: Date.now() + 800 });
    } catch (err) {
      const { message, details } = getFriendlyGeminiMessage(err);
      setMergeError(message);
      setMergeErrorDetails(details || null);
    } finally {
      setPendingMergeLoading(false);
      setMergeRetryAttempt(null);
      mergeAbortRef.current = null;
    }
  };

  const handleCancelOverlapMerge = () => {
    mergeAbortRef.current?.abort();
    mergeAbortRef.current = null;
    setPendingMerge(null);
    setMergeError(null);
    setMergeErrorDetails(null);
  };

  const handleNoteClickAsMergeTarget = async (noteIdB: string) => {
    if (!mergeMode.active || !mergeMode.fromNoteId || mergeMode.loading) return;
    const noteA = getNote(mergeMode.fromNoteId);
    const noteB = getNote(noteIdB);
    if (!noteA || !noteB) return;
    setMergeLoading(true);
    try {
      const prompt = buildMergePrompt(getNotePlainContent(noteA), getNotePlainContent(noteB));
      const resultText = await geminiGenerateWithRetry(prompt, {
        maxOutputTokens: 768,
      });
      const midX = (noteA.x + noteB.x) / 2;
      const midY = (noteA.y + noteB.y) / 2;
      const now = new Date().toISOString();
      addNote({
        id: generateId(),
        x: midX - 130,
        y: midY - 80,
        w: 260,
        h: 160,
        color: "#60a5fa",
        title: "Sin título",
        descriptionHtml: resultText || "(sin respuesta)",
        updatedAt: now,
      });
      exitMergeMode();
    } catch (err) {
      const { message } = getFriendlyGeminiMessage(err);
      alert(message);
      exitMergeMode();
    } finally {
      setMergeLoading(false);
    }
  };

  const handleSplitIdeas = (noteId: string) => {
    const note = getNote(noteId);
    if (!note) return;
    const originalContent = getNotePlainContent(note);
    openSplitModal(noteId, originalContent);
  };

  const handleRunSplitIdeas = () => {
    if (splitModal.loading || getGeminiCooldownRemaining() > 0) return;
    const beforeText = splitModal.beforeText ?? "";
    if (!beforeText.trim()) return;
    setSplitError(null, undefined);
    setSplitRetryAfterSec(null);
    setSplitLoading(true);
    splitAbortRef.current = new AbortController();
    const signal = splitAbortRef.current.signal;
    const prompt = buildSplitIdeasPrompt(beforeText);
    geminiGenerateWithRetry(prompt, {
      signal,
      maxOutputTokens: 1024,
      onRetry: (_attempt, retryAfterSec) => {
        setSplitRetryAfterSec(retryAfterSec ?? null);
      },
    })
      .then((resultText) => {
        const draft = (resultText || "").trim();
        setSplitResult(draft || fallbackSplitIdeas(beforeText));
      })
      .catch((err) => {
        if (err instanceof Error && (err.name === "AbortError" || (err instanceof GeminiError && err.message?.includes("cancelada")))) return;
        const { message, details, retryAfterSec: sec } = getFriendlyGeminiMessage(err);
        setSplitError(message, details);
        setSplitResult(fallbackSplitIdeas(beforeText));
        if (err instanceof GeminiError && err.status === 429 && sec != null) {
          setSplitRetryAfterSec(sec);
        }
      })
      .finally(() => {
        setSplitLoading(false);
        splitAbortRef.current = null;
      });
  };

  const handleCloseSplitModal = () => {
    splitAbortRef.current?.abort();
    splitAbortRef.current = null;
    closeSplitModal();
  };

  const handleConfirmSplit = () => {
    if (!splitModal.noteId) return;
    const note = getNote(splitModal.noteId);
    if (!note || !splitModal.resultText.trim()) {
      closeSplitModal();
      return;
    }
    const blocks = parseSplitIdeasBlocks(splitModal.resultText);
    const now = new Date().toISOString();
    blocks.forEach((blockText, i) => {
      addNote({
        id: generateId(),
        x: note.x + 40 * (i + 1),
        y: note.y + 40 * (i + 1),
        w: 260,
        h: 160,
        color: note.color || DEFAULT_NOTE_COLOR,
        title: "Sin título",
        descriptionHtml: blockText,
        updatedAt: now,
      });
    });
    closeSplitModal();
  };

  const handleCreateNoteAt = (worldX: number, worldY: number) => {
    const noteX = Math.max(0, worldX - 130);
    const noteY = Math.max(0, worldY - 80);
    createNoteAt(noteX, noteY);
  };

  const handleChangeRect = (
    noteId: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    updateNote(noteId, { x: clampedX, y: clampedY, w, h });

    const now = Date.now();
    if (mergeCooldown && now >= mergeCooldown.until) {
      setMergeCooldown(null);
    }
    if (mergeCooldown && mergeCooldown.noteId === noteId && now < mergeCooldown.until) {
      return;
    }

    const others = notes.filter((n) => n.id !== noteId);
    const rectA = { x, y, w, h };
    for (const other of others) {
      const rectB = { x: other.x, y: other.y, w: other.w, h: other.h };
      if (isOverlapping(rectA, rectB)) {
        setPendingMerge({ fromId: noteId, toId: other.id });
        return;
      }
    }
  };

  const applyImportedSnapshot = (mode: ImportMode, jsonText: string) => {
    if (!jsonText.trim()) {
      setImportError(UI.errors.importEmpty);
      return;
    }

    const result = parseSnapshotFromJson(jsonText);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    const snapshot = result.snapshot;

    if (mode === "replace") {
      setNotes(snapshot.notes);
    } else {
      const existingIds = new Set(notes.map((n) => n.id));
      const merged = notes.concat(
        snapshot.notes.filter((n) => !existingIds.has(n.id)),
      );
      setNotes(merged);
    }

    setImportError(null);
    closeImportModal();
  };

  useEffect(() => {
    if (!mergeMode.active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitMergeMode();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mergeMode.active, exitMergeMode]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const updateSize = () => {
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const handleBoardContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldX = scrollEl.scrollLeft + localX;
    const worldY = scrollEl.scrollTop + localY;
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "board",
      worldX,
      worldY,
    });
  };

  const handleBoardDoubleClick: React.MouseEventHandler<HTMLDivElement> = (
    event,
  ) => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const worldX = scrollEl.scrollLeft + (event.clientX - rect.left);
    const worldY = scrollEl.scrollTop + (event.clientY - rect.top);
    const x = Math.max(0, worldX - 130);
    const y = Math.max(0, worldY - 80);
    createNoteAt(x, y);
  };

  const gridStyle = {
    backgroundSize: "40px 40px",
    backgroundImage: `
      linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px),
      linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)
    `,
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex h-full w-full flex-col text-gray-900"
      >
        {!hideTopBar && (
          <TopBar
            onNewNote={handleNewNote}
            onExport={handleExport}
            onBack={onBack}
            projectName={projectName}
            onRenameProject={onRenameProject}
            onNewGroup={onNewGroup}
          />
        )}

        {mergeMode.loading && (
          <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-sm">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-800 shadow-xl">
              {UI.loading.merging}
            </div>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-auto"
          style={{ backgroundColor: CANVAS_BG }}
          onContextMenu={handleBoardContextMenu}
        >
          <div
            className="relative shrink-0"
            style={{
              width: workspaceSize.width,
              height: workspaceSize.height,
              ...gridStyle,
              pointerEvents: "none",
            }}
            aria-hidden
          />
          <div
            className="relative shrink-0"
            style={{
              width: workspaceSize.width,
              height: workspaceSize.height,
              marginTop: -workspaceSize.height,
            }}
            onClick={() => setSelectedNote(null)}
            onDoubleClick={handleBoardDoubleClick}
          >
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpenContextMenu={handleNoteContextMenu}
                onChangeRect={handleChangeRect}
                onNoteClick={handleNoteClickAsMergeTarget}
                onSelectNote={handleSelectNote}
                onOpenEditor={handleEditNote}
                editorNoteId={editorNoteId}
                zIndex={selectedNoteId === note.id ? 1 : 0}
              />
            ))}
          </div>
        </div>
      </div>

      <NoteEditorModal
        open={editorNoteId != null}
        noteId={editorNoteId}
        initialTitle={editorNoteId ? (getNote(editorNoteId)?.title ?? "Sin título") : ""}
        initialHtml={editorNoteId ? (getNote(editorNoteId)?.descriptionHtml ?? "") : ""}
        onCancel={handleCancelNote}
        onSave={handleSaveNote}
      />

      <Modal
        isOpen={improveModal.isOpen}
        title={UI.modals.enrich.title}
        onClose={closeImproveModal}
        disableClose={improveModal.loading}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.enrich.before}
              </div>
              <pre className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800 whitespace-pre-wrap">
                {improveModal.beforeText || UI.empty.vacia}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.enrich.after}
              </div>
              <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800">
                {improveModal.loading
                  ? (improveModal.retryAfterSec != null && improveModal.retryAfterSec > 0
                      ? UI.loading.retryIn(Math.ceil(improveModal.retryAfterSec))
                      : UI.loading.processingAI)
                  : improveModal.afterText
                    ? (
                        <div
                          className="noteBody improve-preview"
                          dangerouslySetInnerHTML={{ __html: improveModal.afterText }}
                        />
                      )
                    : UI.empty.vacia}
              </div>
            </div>
          </div>
          {improveModal.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
              <p>{improveModal.error}</p>
              {improveModal.errorDetails && (
                <>
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-red-600 underline hover:text-red-700"
                    onClick={() => setShowImproveDetails((v) => !v)}
                  >
                    {showImproveDetails ? UI.modals.hideDetails : UI.modals.details}
                  </button>
                  {showImproveDetails && (
                    <pre className="mt-1 max-h-20 overflow-auto text-[10px] opacity-80">
                      {improveModal.errorDetails.slice(0, 400)}
                    </pre>
                  )}
                </>
              )}
              <button
                type="button"
                className="mt-2 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-[11px] text-red-800 hover:bg-red-200 disabled:opacity-50"
                disabled={improveModal.loading || (improveModal.retryAfterSec != null && improveModal.retryAfterSec > 0)}
                onClick={() => {
                  setImproveError(null, undefined);
                  setImproveRetryAfterSec(null);
                  setImproveLoading(true);
                  const prompt = buildImprovePrompt(improveModal.beforeText ?? "");
                  geminiGenerateWithRetry(prompt, {
                    maxOutputTokens: 768,
                    onRetry: (_a, sec) => setImproveRetryAfterSec(sec ?? null),
                  })
                    .then((resultText) => {
                      const raw = resultText || UI.empty.vacia;
                      const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
                      setImproveDraft(clean);
                    })
                    .catch((err) => {
                      const { message, details, retryAfterSec: sec } = getFriendlyGeminiMessage(err);
                      setImproveError(message, details);
                      if (err instanceof GeminiError && err.status === 429 && sec != null) {
                        setImproveRetryAfterSec(sec);
                      }
                    })
                    .finally(() => setImproveLoading(false));
                }}
              >
                {improveModal.retryAfterSec != null && improveModal.retryAfterSec > 0
                  ? `${UI.modals.merge.retry} en ${improveModal.retryAfterSec}s`
                  : UI.modals.merge.retry}
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              onClick={closeImproveModal}
              disabled={improveModal.loading}
            >
              {UI.modals.enrich.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              onClick={handleConfirmImprove}
              disabled={improveModal.loading || !improveModal.afterText || isGeminiBusy()}
            >
              {UI.modals.enrich.apply}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={splitModal.isOpen}
        title={UI.modals.split.title}
        onClose={handleCloseSplitModal}
        disableClose={splitModal.loading}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.split.before}
              </div>
              <pre className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800 whitespace-pre-wrap">
                {splitModal.beforeText?.slice(0, 500) || UI.empty.vacia}
                {(splitModal.beforeText?.length ?? 0) > 500 ? "…" : ""}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.split.result}
              </div>
              <pre className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800 whitespace-pre-wrap">
                {splitModal.loading
                  ? splitModal.retryAfterSec != null && splitModal.retryAfterSec > 0
                    ? UI.loading.retryIn(Math.ceil(splitModal.retryAfterSec))
                    : UI.loading.processingAI
                  : splitModal.resultText || UI.empty.vacio}
              </pre>
              {splitModal.error && splitModal.resultText.trim() && (
                <p className="mt-1.5 text-[10px] text-amber-700">
                  {UI.modals.split.fallbackNote}
                </p>
              )}
            </div>
          </div>
          {splitModal.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
              <p>{splitModal.error}</p>
              {splitModal.errorDetails && (
                <>
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-red-600 underline hover:text-red-700"
                    onClick={() => setShowSplitDetails((v) => !v)}
                  >
                    {showSplitDetails ? UI.modals.hideDetails : UI.modals.details}
                  </button>
                  {showSplitDetails && (
                    <pre className="mt-1 max-h-20 overflow-auto text-[10px] opacity-80">
                      {splitModal.errorDetails.slice(0, 400)}
                    </pre>
                  )}
                </>
              )}
              <button
                type="button"
                className="mt-2 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-[11px] text-red-800 hover:bg-red-200 disabled:opacity-50"
                disabled={splitModal.loading || (splitModal.retryAfterSec != null && splitModal.retryAfterSec > 0)}
                onClick={handleRunSplitIdeas}
              >
                {splitModal.retryAfterSec != null && splitModal.retryAfterSec > 0
                  ? `${UI.modals.merge.retry} en ${splitModal.retryAfterSec}s`
                  : UI.modals.merge.retry}
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              onClick={handleCloseSplitModal}
              disabled={splitModal.loading}
            >
              {UI.modals.split.cancel}
            </button>
            {splitModal.resultText.trim() ? (
              <button
                type="button"
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                onClick={handleConfirmSplit}
                disabled={splitModal.loading || isGeminiBusy()}
              >
                {UI.modals.split.apply}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                onClick={handleRunSplitIdeas}
                disabled={splitModal.loading || getGeminiCooldownRemaining() > 0}
              >
                {UI.modals.split.runButton}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={pendingMerge !== null}
        title={UI.modals.merge.title}
        onClose={handleCancelOverlapMerge}
        disableClose={pendingMergeLoading}
      >
        {pendingMerge && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-600">
              {UI.modals.merge.subtitle}
            </p>
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.merge.noteA}
              </div>
              <pre className="max-h-20 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800 whitespace-pre-wrap break-words">
                {getNotePlainContent(getNote(pendingMerge.fromId)).slice(0, 200) || UI.empty.vacia}
                {getNotePlainContent(getNote(pendingMerge.fromId)).length > 200 ? "…" : ""}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-gray-500">
                {UI.modals.merge.noteB}
              </div>
              <pre className="max-h-20 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-800 whitespace-pre-wrap break-words">
                {getNotePlainContent(getNote(pendingMerge.toId)).slice(0, 200) || UI.empty.vacia}
                {getNotePlainContent(getNote(pendingMerge.toId)).length > 200 ? "…" : ""}
              </pre>
            </div>
            {mergeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
                <p>{mergeError}</p>
                {mergeErrorDetails && (
                  <>
                    <button
                      type="button"
                      className="mt-1 text-[10px] text-red-600 underline hover:text-red-700"
                      onClick={() => setShowMergeDetails((v) => !v)}
                    >
                      {showMergeDetails ? UI.modals.hideDetails : UI.modals.details}
                    </button>
                    {showMergeDetails && (
                      <pre className="mt-1 max-h-20 overflow-auto text-[10px] opacity-80">
                        {mergeErrorDetails.slice(0, 400)}
                      </pre>
                    )}
                  </>
                )}
                {mergeCooldownRemaining > 0 ? (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Reintenta en {mergeCooldownRemaining}s.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-red-300 bg-red-100 px-2 py-1 text-[11px] text-red-800 hover:bg-red-200 disabled:opacity-50"
                    onClick={() => {
                      setMergeError(null);
                      setMergeErrorDetails(null);
                      handleConfirmOverlapMerge();
                    }}
                  >
                    {UI.modals.merge.retry}
                  </button>
                )}
              </div>
            )}
            {pendingMergeLoading ? (
              <div className="py-2 text-[11px] text-blue-600">
                {mergeRetryAttempt != null
                  ? UI.loading.retryingAttempt(mergeRetryAttempt, 3)
                  : UI.loading.merging}
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-100"
                  onClick={handleCancelOverlapMerge}
                >
                  {UI.modals.merge.cancel}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                  onClick={handleConfirmOverlapMerge}
                  disabled={isGeminiBusy() || mergeCooldownRemaining > 0}
                >
                  {UI.modals.merge.merge}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={importModal.isOpen}
        title={UI.modals.import.title}
        onClose={closeImportModal}
      >
        <div className="space-y-3">
          <p className="text-[11px] text-gray-600">
            {UI.modals.import.description}
          </p>

          <textarea
            className="h-40 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder='{"notes":[...],"viewport":{...}}'
            value={importModal.text}
            onChange={(event) => {
              setImportText(event.target.value);
              if (importModal.error) setImportError(null);
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-500">{UI.modals.import.mode}:</span>
              {(["merge", "replace"] as ImportMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    importModal.mode === mode
                      ? "bg-blue-500 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setImportMode(mode)}
                >
                  {mode === "merge" ? UI.modals.import.merge : UI.modals.import.replace}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-[11px] text-blue-600 hover:text-blue-700">
                <span>{UI.modals.import.uploadFile}</span>
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImportText(String(reader.result ?? ""));
                      setImportError(null);
                    };
                    reader.readAsText(file);
                    event.target.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-600"
                onClick={() =>
                  applyImportedSnapshot(importModal.mode, importModal.text)
                }
              >
                {UI.modals.import.import}
              </button>
            </div>
          </div>

          {importModal.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">
              {importModal.error}
            </div>
          )}
        </div>
      </Modal>

      <ContextMenu
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
        geminiBusy={isGeminiBusy()}
        onCreateNoteAt={handleCreateNoteAt}
        onExportJson={handleExport}
        onImportJson={() => openImportModal()}
        onEditNote={handleEditNote}
        onImproveNote={handleImproveNote}
        onSplitIdeas={handleSplitIdeas}
        onResetBoard={() => {
          if (useGroupScope) {
            setNotes([]);
          } else {
            useNotesStore.getState().resetNotes();
            clearSnapshot();
          }
        }}
        onDuplicateNote={(noteId) => {
          const n = getNote(noteId);
          if (!n) return;
          addNote({
            ...n,
            id: generateId(),
            x: n.x + 20,
            y: n.y + 20,
            w: n.w,
            h: n.h,
            updatedAt: new Date().toISOString(),
          });
        }}
        onDeleteNote={removeNote}
        onChangeNoteColor={(noteId, color) => updateNote(noteId, { color })}
        onStartMerge={handleStartMerge}
      />
    </>
  );
}

export const Board = forwardRef<BoardHandle, BoardProps>(BoardInner);
