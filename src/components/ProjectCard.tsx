import { useState, useCallback } from "react";
import type { Project } from "../types/project";
import { UI } from "../lib/i18n";
import { Dropdown } from "./ui/Dropdown";

export type ProjectCardProps = {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ProjectCard({ project, onOpen, onRename, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRename = useCallback(() => {
    setMenuOpen(false);
    onRename();
  }, [onRename]);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    onDelete();
  }, [onDelete]);

  return (
    <div className="relative rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Dropdown
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        align="bottom-end"
        className="absolute right-2 top-3"
        trigger={
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Opciones del proyecto"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <span className="text-lg leading-none" aria-hidden="true">
              ⋯
            </span>
          </button>
        }
      >
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
          role="menuitem"
          onClick={handleRename}
        >
          {UI.projects.rename}
        </button>
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
          role="menuitem"
          onClick={handleDelete}
        >
          {UI.projects.delete}
        </button>
      </Dropdown>

      <h3
        className="pr-10 truncate text-lg font-semibold text-gray-900"
        title={project.name}
      >
        {project.name}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {UI.projects.lastUpdated}: {formatDate(project.updatedAt)}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">
        {UI.projects.noteCount(
          (project.groups ?? []).reduce((a, g) => a + (g.notes?.length ?? 0), 0),
        )}
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          onClick={onOpen}
        >
          {UI.projects.open}
        </button>
      </div>
    </div>
  );
}
