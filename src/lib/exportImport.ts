import type { Note } from "../store/notesStore";
import { normalizeNote } from "../store/notesStore";
import type { ViewportState } from "../store/viewportStore";
import type { PersistedSnapshot } from "./storage";

/** Group export payload for download. */
export type GroupExportPayload = {
  version: number;
  projectId: string;
  groupId: string;
  groupName: string;
  projectName?: string;
  notes: Note[];
  viewport?: ViewportState;
};

const GROUP_EXPORT_VERSION = 1;

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\-_\s]/g, "").replace(/\s+/g, "_").trim() || "export";
}

/** Build filename: projectName__groupName__YYYY-MM-DD.json */
export function groupExportFilename(projectName: string, groupName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${safeFilename(projectName)}__${safeFilename(groupName)}__${date}.json`;
}

export function exportGroupToFile(payload: GroupExportPayload): void {
  if (typeof window === "undefined") return;
  const exportData: GroupExportPayload = {
    version: GROUP_EXPORT_VERSION,
    projectId: payload.projectId,
    groupId: payload.groupId,
    groupName: payload.groupName,
    projectName: payload.projectName,
    notes: payload.notes,
    viewport: payload.viewport,
  };
  const filename = groupExportFilename(
    payload.projectName ?? "proyecto",
    payload.groupName,
  );
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type ParseGroupExportResult =
  | { ok: true; notes: Note[] }
  | { ok: false; error: string };

/** Parse group export JSON; returns notes array (viewport optional). */
export function parseGroupExportJson(json: string): ParseGroupExportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON no válido." };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "El JSON debe ser un objeto." };
  }
  const root = data as Partial<GroupExportPayload>;
  if (!Array.isArray(root.notes)) {
    return { ok: false, error: "Falta o no es válido el array 'notes'." };
  }
  const toNumberOr = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const notes: Note[] = [];
  for (const rawNote of root.notes) {
    if (!rawNote || typeof rawNote !== "object") continue;
    const n = rawNote as Partial<Note & { width?: number; height?: number }>;
    const w = toNumberOr(n.w, toNumberOr((n as { width?: number }).width, 260));
    const h = toNumberOr(n.h, toNumberOr((n as { height?: number }).height, 160));
    const title = typeof n.title === "string" ? n.title : "Sin título";
    const descriptionHtml =
      typeof n.descriptionHtml === "string"
        ? n.descriptionHtml
        : typeof n.content === "string"
          ? n.content
          : "";
    notes.push(
      normalizeNote({
        id: typeof n.id === "string" ? n.id : crypto.randomUUID(),
        x: toNumberOr(n.x, 0),
        y: toNumberOr(n.y, 0),
        w,
        h,
        color: typeof n.color === "string" ? n.color : "#CFE7FF",
        title,
        descriptionHtml,
        updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : new Date().toISOString(),
      } as Note),
    );
  }
  return { ok: true, notes };
}

export function createSnapshotForExport(
  notes: Note[],
  viewport: ViewportState,
): PersistedSnapshot {
  return {
    notes,
    viewport: {
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      zoom: viewport.zoom,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function downloadSnapshotAsFile(
  snapshot: PersistedSnapshot,
  filename = "notes-canvas.json",
): void {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type ParsedSnapshotResult =
  | { ok: true; snapshot: PersistedSnapshot }
  | { ok: false; error: string };

export function parseSnapshotFromJson(json: string): ParsedSnapshotResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON. Please check the syntax." };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "JSON must be an object." };
  }

  const root = data as Partial<PersistedSnapshot>;

  if (!Array.isArray(root.notes)) {
    return { ok: false, error: "Missing or invalid `notes` array." };
  }

  if (!root.viewport || typeof root.viewport !== "object") {
    return { ok: false, error: "Missing or invalid `viewport` object." };
  }

  const viewport = root.viewport as Partial<ViewportState>;
  const toNumberOr = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  const safeViewport: ViewportState = {
    offsetX: toNumberOr(viewport.offsetX, 0),
    offsetY: toNumberOr(viewport.offsetY, 0),
    zoom: toNumberOr(viewport.zoom, 1),
  };

  const notes: Note[] = [];

  for (const rawNote of root.notes) {
    if (!rawNote || typeof rawNote !== "object") continue;
    const n = rawNote as Partial<Note & { width?: number; height?: number }>;

    if (typeof n.id !== "string") continue;

    const w = toNumberOr(n.w, toNumberOr(n.width, 260));
    const h = toNumberOr(n.h, toNumberOr(n.height, 160));

    const title = typeof n.title === "string" ? n.title : "Sin título";
    const descriptionHtml =
      typeof n.descriptionHtml === "string"
        ? n.descriptionHtml
        : typeof n.content === "string"
          ? n.content
          : "";
    notes.push(
      normalizeNote({
        id: n.id,
        x: toNumberOr(n.x, 0),
        y: toNumberOr(n.y, 0),
        w,
        h,
        color: typeof n.color === "string" ? n.color : "#FDE68A",
        title,
        descriptionHtml,
        updatedAt:
          typeof n.updatedAt === "string"
            ? n.updatedAt
            : new Date().toISOString(),
      } as Note),
    );
  }

  return {
    ok: true,
    snapshot: {
      notes,
      viewport: safeViewport,
      updatedAt:
        typeof root.updatedAt === "string"
          ? root.updatedAt
          : new Date().toISOString(),
    },
  };
}

