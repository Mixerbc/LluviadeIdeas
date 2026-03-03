import { motion } from "framer-motion";
import type { Project } from "../types/project";
import { ProjectPreview } from "./ProjectPreview";
import { UI } from "../lib/i18n";

export type ProjectPageCardProps = {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  isPlaceholder?: boolean;
  side?: "left" | "right";
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const paperGrainStyle = {
  backgroundImage: `repeating-radial-gradient(
    circle at 0 0,
    rgba(0,0,0,0.03) 0px,
    transparent 1px
  )`,
  backgroundSize: "24px 24px",
};

export function ProjectPageCard({
  project,
  onOpen,
  onRename,
  onDelete,
  isPlaceholder,
  side = "right",
}: ProjectPageCardProps) {
  const roundedClass = side === "left" ? "rounded-l-lg" : "rounded-r-lg";

  if (isPlaceholder) {
    return (
      <div
        className={`flex h-full min-h-[320px] w-full flex-col items-center justify-center border border-gray-200/80 p-6 md:min-h-[380px] ${roundedClass}`}
        style={{
          backgroundColor: "#fffdf8",
          ...paperGrainStyle,
        }}
      >
        <span className="text-sm text-gray-400">{UI.projects.noProjects}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col border border-gray-200/80 p-6 md:p-6 ${roundedClass}`}
      style={{
        backgroundColor: "#fffdf8",
        ...paperGrainStyle,
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2
          className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-gray-900"
          title={project.name}
        >
          {project.name}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/80"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            {UI.projects.rename}
          </button>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            {UI.projects.delete}
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        {UI.projects.noteCount(
          (project.groups ?? []).reduce((a, g) => a + (g.notes?.length ?? 0), 0),
        )} · {UI.projects.updated}: {formatDate(project.updatedAt)}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center">
        <button type="button" className="group mb-4 block w-full focus:outline-none" onClick={onOpen}>
          <ProjectPreview
            notes={(project.groups ?? [])?.flatMap((g) => g.notes ?? []) ?? []}
            className="mx-auto"
          />
        </button>
        <motion.button
          type="button"
          className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-600"
          onClick={onOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {UI.projects.open}
        </motion.button>
      </div>
    </div>
  );
}
