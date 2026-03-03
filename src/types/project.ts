import type { Note } from "../store/notesStore";
import type { ViewportState } from "../store/viewportStore";

export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
  viewport?: ViewportState;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  /** Color de acento para la card en el index (botón Abrir, borde). */
  accentColor?: string;
};

export type ProjectsPayload = {
  activeProjectId: string | null;
  activeGroupId: string | null;
  projects: Project[];
};
