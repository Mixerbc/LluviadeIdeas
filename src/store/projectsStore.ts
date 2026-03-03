import { create } from "zustand";
import { DEFAULT_NOTE_COLOR } from "../lib/theme";
import { debounce } from "../lib/debounce";
import type { Note } from "./notesStore";
import { normalizeNote } from "./notesStore";
import type { ViewportState } from "./viewportStore";
import type { Project, ProjectsPayload, Group } from "../types/project";

const PROJECTS_KEY_V2 = "notacanva.projects.v2";
const PROJECTS_KEY_V1 = "notacanva.projects.v1";
const OLD_SNAPSHOT_KEY = "notes_canvas_v1";
const DEFAULT_VIEWPORT: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };
const DEFAULT_GROUP_NAME = "Grupo 1";

/** Paleta pastel tipo confetti para accentColor de proyectos (determinista por id). */
const ACCENT_PALETTE = [
  "#FFD400", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE",
] as const;

function getAccentForProjectId(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash << 5) - hash + projectId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}

function ensureProjectAccent(p: Project): Project {
  if (p.accentColor) return p;
  return { ...p, accentColor: getAccentForProjectId(p.id) };
}

function createGroup(name: string, notes: Note[] = [], viewport?: ViewportState): Group {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || DEFAULT_GROUP_NAME,
    createdAt: now,
    updatedAt: now,
    notes,
    viewport,
  };
}

function loadV2(): ProjectsPayload {
  if (typeof window === "undefined") {
    return { activeProjectId: null, activeGroupId: null, projects: [] };
  }
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY_V2);
    if (!raw) return { activeProjectId: null, activeGroupId: null, projects: [] };
    const data = JSON.parse(raw) as Partial<ProjectsPayload>;
    const projects = (Array.isArray(data.projects) ? data.projects : []).map(ensureProjectAccent);
    return {
      activeProjectId: data.activeProjectId ?? null,
      activeGroupId: data.activeGroupId ?? null,
      projects,
    };
  } catch {
    return { activeProjectId: null, activeGroupId: null, projects: [] };
  }
}

type V1Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  notes?: Note[];
  viewport?: ViewportState;
};

function migrateV1ToV2(): Project[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY_V1);
    if (!raw) return null;
    const data = JSON.parse(raw) as { projects?: V1Project[] };
    const v1Projects = Array.isArray(data?.projects) ? data.projects! : [];
    if (v1Projects.length === 0) return null;
    const projects: Project[] = v1Projects.map((p) => {
      const notes = Array.isArray(p.notes) ? p.notes : [];
      const viewport =
        p.viewport && typeof p.viewport === "object"
          ? {
              offsetX: Number(p.viewport.offsetX) || 0,
              offsetY: Number(p.viewport.offsetY) || 0,
              zoom: Number(p.viewport.zoom) || 1,
            }
          : DEFAULT_VIEWPORT;
      const group = createGroup(DEFAULT_GROUP_NAME, notes, viewport);
      return ensureProjectAccent({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        groups: [group],
      });
    });
    window.localStorage.removeItem(PROJECTS_KEY_V1);
    return projects;
  } catch {
    return null;
  }
}

function migrateOldSnapshot(): Project | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OLD_SNAPSHOT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      notes?: Note[];
      viewport?: ViewportState;
      updatedAt?: string;
    };
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    const viewport =
      data?.viewport && typeof data.viewport === "object"
        ? {
            offsetX: Number(data.viewport.offsetX) || 0,
            offsetY: Number(data.viewport.offsetY) || 0,
            zoom: Number(data.viewport.zoom) || 1,
          }
        : DEFAULT_VIEWPORT;
    const now = new Date().toISOString();
    const project: Project = ensureProjectAccent({
      id: crypto.randomUUID(),
      name: "Mi primer proyecto",
      createdAt: now,
      updatedAt: data?.updatedAt ?? now,
      groups: [createGroup(DEFAULT_GROUP_NAME, notes, viewport)],
    });
    window.localStorage.removeItem(OLD_SNAPSHOT_KEY);
    return project;
  } catch {
    return null;
  }
}

function runMigrations(): { projects: Project[] } {
  const v2 = loadV2();
  if (v2.projects.length > 0) {
    return { projects: v2.projects };
  }
  const fromV1 = migrateV1ToV2();
  if (fromV1 && fromV1.length > 0) {
    return { projects: fromV1 };
  }
  const fromSnapshot = migrateOldSnapshot();
  if (fromSnapshot) {
    return { projects: [fromSnapshot] };
  }
  return { projects: [] };
}

function saveToStorage(payload: ProjectsPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECTS_KEY_V2, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

type ProjectsStore = {
  projects: Project[];
  activeProjectId: string | null;
  activeGroupId: string | null;
  createProject: (name: string) => Project;
  renameProject: (projectId: string, name: string) => void;
  deleteProject: (projectId: string) => void;
  openProject: (projectId: string) => void;
  closeProject: () => void;
  getProject: (projectId: string) => Project | undefined;
  getGroup: (projectId: string, groupId: string) => Group | undefined;
  getActiveGroup: () => Group | undefined;
  createGroup: (projectId: string, groupName: string) => Group;
  renameGroup: (projectId: string, groupId: string, groupName: string) => void;
  deleteGroup: (projectId: string, groupId: string) => void;
  duplicateGroup: (projectId: string, groupId: string) => Group | undefined;
  selectGroup: (projectId: string, groupId: string) => void;
  setGroupNotes: (projectId: string, groupId: string, notes: Note[]) => void;
  setGroupViewport: (projectId: string, groupId: string, viewport: ViewportState) => void;
  addNote: (projectId: string, groupId: string, note: Note) => void;
  createNoteAt: (projectId: string, groupId: string, x: number, y: number) => Note;
  updateNote: (projectId: string, groupId: string, noteId: string, patch: Partial<Omit<Note, "id">>) => void;
  getNote: (projectId: string, groupId: string, noteId: string) => Note | undefined;
  removeNote: (projectId: string, groupId: string, noteId: string) => void;
  updateProjectUpdatedAt: (projectId: string) => void;
  updateGroupUpdatedAt: (projectId: string, groupId: string) => void;
  _persist: () => void;
};

function normalizeActive(
  projects: Project[],
  activeProjectId: string | null,
  activeGroupId: string | null,
): { activeProjectId: string | null; activeGroupId: string | null } {
  if (!activeProjectId) return { activeProjectId: null, activeGroupId: null };
  const project = projects.find((p) => p.id === activeProjectId);
  if (!project?.groups?.length) return { activeProjectId: null, activeGroupId: null };
  const validGroup = activeGroupId && project.groups.some((g) => g.id === activeGroupId);
  return {
    activeProjectId,
    activeGroupId: validGroup ? activeGroupId : project.groups[0].id,
  };
}

export const useProjectsStore = create<ProjectsStore>((set, get) => {
  const { projects: migratedProjects } = runMigrations();
  const v2 = loadV2();
  const projects = migratedProjects.length > 0 ? migratedProjects : v2.projects;
  const { activeProjectId, activeGroupId } = normalizeActive(
    projects,
    migratedProjects.length > 0 ? null : v2.activeProjectId,
    migratedProjects.length > 0 ? null : v2.activeGroupId,
  );
  const didMigrate = migratedProjects.length > 0;
  if (didMigrate || (v2.activeProjectId !== activeProjectId || v2.activeGroupId !== activeGroupId)) {
    if (projects.length > 0 || didMigrate) {
      saveToStorage({ activeProjectId, activeGroupId, projects });
    }
  }

  const persist = debounce(() => {
    const state = get();
    saveToStorage({
      activeProjectId: state.activeProjectId,
      activeGroupId: state.activeGroupId,
      projects: state.projects,
    });
  }, 600);

  return {
    projects,
    activeProjectId,
    activeGroupId,

    createProject: (name) => {
      const id = crypto.randomUUID();
      const project: Project = ensureProjectAccent({
        id,
        name: name.trim() || "Sin nombre",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        groups: [createGroup(DEFAULT_GROUP_NAME)],
      });
      set((state) => ({ projects: [project, ...state.projects] }));
      persist();
      return project;
    },

    renameProject: (projectId, name) => {
      const trimmed = name.trim() || "Sin nombre";
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p,
        ),
      }));
      persist();
    },

    deleteProject: (projectId) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
        activeGroupId: state.activeProjectId === projectId ? null : state.activeGroupId,
      }));
      persist();
    },

    openProject: (projectId) => {
      const project = get().projects.find((p) => p.id === projectId);
      const firstGroupId = project?.groups?.[0]?.id ?? null;
      set({ activeProjectId: projectId, activeGroupId: firstGroupId });
      persist();
    },

    closeProject: () => {
      set({ activeProjectId: null, activeGroupId: null });
      persist();
    },

    getProject: (projectId) => get().projects.find((p) => p.id === projectId),

    getGroup: (projectId, groupId) => {
      const project = get().getProject(projectId);
      return project?.groups?.find((g) => g.id === groupId);
    },

    getActiveGroup: () => {
      const { activeProjectId: pid, activeGroupId: gid } = get();
      if (!pid || !gid) return undefined;
      return get().getGroup(pid, gid);
    },

    createGroup: (projectId, groupName) => {
      const group = createGroup(groupName);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: [...(p.groups || []), group],
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
        activeGroupId: group.id,
      }));
      persist();
      return group;
    },

    renameGroup: (projectId, groupId, groupName) => {
      const trimmed = groupName.trim() || DEFAULT_GROUP_NAME;
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId ? { ...g, name: trimmed, updatedAt: new Date().toISOString() } : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    deleteGroup: (projectId, groupId) => {
      const project = get().getProject(projectId);
      const groups = project?.groups ?? [];
      if (groups.length <= 1) return;
      const next = groups.find((g) => g.id !== groupId);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).filter((g) => g.id !== groupId),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
        activeGroupId: state.activeGroupId === groupId ? next?.id ?? null : state.activeGroupId,
      }));
      persist();
    },

    duplicateGroup: (projectId, groupId) => {
      const group = get().getGroup(projectId, groupId);
      if (!group) return undefined;
      const now = new Date().toISOString();
      const notes = group.notes.map((n) =>
        normalizeNote({
          ...n,
          id: crypto.randomUUID(),
          x: n.x + 20,
          y: n.y + 20,
          updatedAt: now,
        } as Note),
      );
      const copy: Group = {
        id: crypto.randomUUID(),
        name: `${group.name} (copia)`,
        createdAt: now,
        updatedAt: now,
        notes,
        viewport: group.viewport,
      };
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: [...(p.groups || []), copy],
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
        activeGroupId: copy.id,
      }));
      persist();
      return copy;
    },

    selectGroup: (projectId, groupId) => {
      set((state) => ({
        activeProjectId: state.activeProjectId === projectId ? projectId : state.activeProjectId,
        activeGroupId: groupId,
      }));
      persist();
    },

    setGroupNotes: (projectId, groupId, notes) => {
      const normalized = notes.map((n) => normalizeNote(n as Note));
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId
                    ? { ...g, notes: normalized, updatedAt: new Date().toISOString() }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    setGroupViewport: (projectId, groupId, viewport) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) => (g.id === groupId ? { ...g, viewport } : g)),
              }
            : p,
        ),
      }));
      persist();
    },

    addNote: (projectId, groupId, note) => {
      const normalized = normalizeNote(note as Note);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        notes: [...g.notes, normalized],
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    createNoteAt: (projectId, groupId, x, y) => {
      const note: Note = {
        id: crypto.randomUUID(),
        x,
        y,
        w: 260,
        h: 160,
        title: "",
        descriptionHtml: "",
        color: DEFAULT_NOTE_COLOR,
        updatedAt: new Date().toISOString(),
      };
      get().addNote(projectId, groupId, note);
      return note;
    },

    updateNote: (projectId, groupId, noteId, patch) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        notes: g.notes.map((n) =>
                          n.id === noteId
                            ? {
                                ...n,
                                ...patch,
                                updatedAt:
                                  (patch as { updatedAt?: string }).updatedAt ?? new Date().toISOString(),
                              }
                            : n,
                        ),
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    getNote: (projectId, groupId, noteId) => {
      const group = get().getGroup(projectId, groupId);
      const note = group?.notes.find((n) => n.id === noteId);
      return note ? normalizeNote(note as Note) : undefined;
    },

    removeNote: (projectId, groupId, noteId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId
                    ? {
                        ...g,
                        notes: g.notes.filter((n) => n.id !== noteId),
                        updatedAt: new Date().toISOString(),
                      }
                    : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    updateProjectUpdatedAt: (projectId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, updatedAt: new Date().toISOString() } : p,
        ),
      }));
      persist();
    },

    updateGroupUpdatedAt: (projectId, groupId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                groups: (p.groups || []).map((g) =>
                  g.id === groupId ? { ...g, updatedAt: new Date().toISOString() } : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      persist();
    },

    _persist: persist,
  };
});
