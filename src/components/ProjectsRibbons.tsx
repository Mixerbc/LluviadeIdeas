import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectsStore } from "../store/projectsStore";
import { confettiBurst } from "../utils/confetti";
import { Modal } from "./Modal";
import { Dropdown } from "./ui/Dropdown";
import { UI } from "../lib/i18n";
import type { Project } from "../types/project";
import type { Note } from "../store/notesStore";

import logoImage from "../img/lluvialogo.png";

const LIST_STAGGER = 0.06;
const CARD_TRANSITION = { type: "spring", stiffness: 400, damping: 30 };

function formatUpdated(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "ahora";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays < 7) return `hace ${diffDays} días`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return UI.projects.updated;
  }
}

/** "Actualizado hace X min" / "Actualizado ahora" */
function updatedLabel(updatedAt: string): string {
  const rel = formatUpdated(updatedAt);
  return rel === "ahora" ? "Actualizado ahora" : `Actualizado ${rel}`;
}

/** Mini preview: 2-3 rectángulos de notas dentro de un canvas simulado */
function MiniPreview({ project }: { project: Project }) {
  const notes: Note[] = (project.groups ?? []).flatMap((g) => g.notes ?? []).slice(0, 3);
  const hasNotes = notes.length > 0;
  return (
    <div
      className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200/60 bg-[#f8f9fb]"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "12px 12px",
      }}
    >
      {hasNotes ? (
        notes.map((note, i) => (
          <div
            key={note.id}
            className="absolute rounded border border-gray-200/50 shadow-sm"
            style={{
              left: 8 + i * 12,
              top: 8 + i * 8,
              width: Math.min(72, 40 + note.w * 0.15),
              height: Math.min(48, 28 + note.h * 0.15),
              backgroundColor: note.color ?? "#e0e7ff",
              fontSize: "8px",
              padding: "3px 4px",
              overflow: "hidden",
              color: "#374151",
              lineHeight: 1.2,
            }}
          >
            <span className="block truncate" title={note.title ?? ""}>
              {note.title || "Nota"}
            </span>
          </div>
        ))
      ) : (
        <>
          <div
            className="absolute rounded border border-gray-200/50 bg-gray-100/80"
            style={{ left: 8, top: 8, width: 56, height: 36 }}
          />
          <div
            className="absolute rounded border border-gray-200/50 bg-gray-100/80"
            style={{ left: 28, top: 28, width: 48, height: 32 }}
          />
        </>
      )}
    </div>
  );
}

export function ProjectsRibbons() {
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const openProject = useProjectsStore((s) => s.openProject);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [transitioningToProjectId, setTransitioningToProjectId] = useState<string | null>(null);
  const [lastCreatedProjectId, setLastCreatedProjectId] = useState<string | null>(null);
  const createdIdRef = useRef<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const project = createProject(newName.trim());
    setNewName("");
    setNewModalOpen(false);
    createdIdRef.current = project.id;
    setLastCreatedProjectId(project.id);
    confettiBurst();
    setTimeout(() => {
      openProject(project.id);
    }, 450);
  }, [createProject, newName, openProject]);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      setTransitioningToProjectId(projectId);
      setTimeout(() => {
        openProject(projectId);
        setTransitioningToProjectId(null);
      }, 150);
    },
    [openProject],
  );

  const openRename = useCallback((id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameModalOpen(true);
  }, []);

  const handleRename = useCallback(() => {
    if (renameId == null) return;
    const name = renameValue.trim();
    if (!name || name.length > 50) return;
    renameProject(renameId, name);
    setRenameModalOpen(false);
    setRenameId(null);
    setRenameValue("");
  }, [renameId, renameValue, renameProject]);

  const openDelete = useCallback((id: string) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (deleteId == null) return;
    deleteProject(deleteId);
    setDeleteModalOpen(false);
    setDeleteId(null);
  }, [deleteId, deleteProject]);

  return (
    <div className="relative min-h-screen w-full bg-white">
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-6">
        <a
          href="/"
          className="flex items-center transition-opacity duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 rounded"
          aria-label="Lluvia de Ideas"
        >
          <img
            src={logoImage}
            alt="Lluvia de Ideas"
            className="h-[37px] w-auto"
            width="auto"
            height={37}
          />
        </a>
        <button
          type="button"
          className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
          onClick={() => {
            setNewName("");
            setNewModalOpen(true);
          }}
        >
          {UI.projects.newProject}
        </button>
      </header>

      {/* Overlay durante transición al abrir proyecto */}
      <AnimatePresence>
        {transitioningToProjectId && (
          <motion.div
            className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        {projects.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-md">
              <h2 className="text-xl font-semibold text-gray-900">
                Crea tu primer proyecto
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Agrupa ideas en proyectos y organiza tus notas por grupos.
              </p>
              <button
                type="button"
                className="mt-6 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
                onClick={() => {
                  setNewName("");
                  setNewModalOpen(true);
                }}
              >
                {UI.projects.newProject}
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: LIST_STAGGER } },
              hidden: {},
            }}
          >
            <AnimatePresence mode="popLayout">
              {projects.map((project, index) => {
                const groupCount = project.groups?.length ?? 0;
                const noteCount =
                  project.groups?.reduce(
                    (acc, g) => acc + (g.notes?.length ?? 0),
                    0,
                  ) ?? 0;
                const meta = [
                  UI.projects.groupCount(groupCount),
                  UI.projects.noteCount(noteCount),
                  updatedLabel(project.updatedAt),
                ].join(" · ");
                const accent = project.accentColor ?? "#4ECDC4";
                const isNewCard = project.id === lastCreatedProjectId;
                const isTransitioning = transitioningToProjectId === project.id;

                return (
                  <motion.article
                    key={project.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: { opacity: 1, y: 0, transition: CARD_TRANSITION },
                    }}
                    initial={isNewCard ? { scale: 0.98, opacity: 0 } : undefined}
                    animate={
                      isNewCard
                        ? { scale: 1, opacity: 1, transition: CARD_TRANSITION }
                        : isTransitioning
                          ? { scale: 0.98, transition: { duration: 0.15 } }
                          : undefined
                    }
                    onAnimationComplete={() => {
                      if (isNewCard) {
                        setLastCreatedProjectId(null);
                        createdIdRef.current = null;
                      }
                    }}
                    className="group relative flex cursor-pointer flex-col overflow-visible rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm focus:outline-none"
                    style={{
                      boxShadow: isTransitioning
                        ? "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        : undefined,
                      borderTop: `3px solid ${accent}`,
                    }}
                    onClick={() => handleOpenProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenProject(project.id);
                      }
                    }}
                    aria-label={`Abrir ${project.name}`}
                    whileHover={{ y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.12)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div
                      className="flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3
                        className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900"
                        title={project.name}
                      >
                        {project.name}
                      </h3>
                      <Dropdown
                        open={openMenuId === project.id}
                        onClose={() => setOpenMenuId(null)}
                        align="bottom-end"
                        offset={[12, 6]}
                        className="shrink-0"
                        trigger={
                          <button
                            type="button"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-blue-400/35 focus-visible:ring-offset-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((id) =>
                                id === project.id ? null : project.id,
                              );
                            }}
                            aria-label="Opciones del proyecto"
                            aria-expanded={openMenuId === project.id}
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
                          onClick={() => {
                            setOpenMenuId(null);
                            openRename(project.id, project.name);
                          }}
                        >
                          {UI.projects.rename}
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null);
                            openDelete(project.id);
                          }}
                        >
                          {UI.projects.delete}
                        </button>
                      </Dropdown>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{meta}</p>
                    <div className="mt-3 min-h-[6rem]">
                      <MiniPreview project={project} />
                    </div>
                    <div
                      className="relative z-10 mt-3 flex justify-start pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.button
                        type="button"
                        className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        style={{
                          backgroundColor: accent,
                          boxShadow: `0 1px 3px ${accent}40`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                        whileHover={{
                          scale: 1.02,
                          filter: "brightness(1.08)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {UI.projects.open}
                      </motion.button>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <Modal
        isOpen={newModalOpen}
        title={UI.projects.newProjectModalTitle}
        onClose={() => {
          setNewModalOpen(false);
          setNewName("");
        }}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {UI.projects.nameLabel}
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={UI.projects.namePlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setNewModalOpen(false)}
            >
              {UI.modals.enrich.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              {UI.projects.create}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={renameModalOpen}
        title={UI.projects.renameModalTitle}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameId(null);
          setRenameValue("");
        }}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {UI.projects.nameLabel}
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={UI.projects.namePlaceholder}
            value={renameValue}
            maxLength={50}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <p className="text-xs text-gray-500">{renameValue.length}/50</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setRenameModalOpen(false);
                setRenameId(null);
                setRenameValue("");
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              onClick={handleRename}
              disabled={!renameValue.trim() || renameValue.trim().length > 50}
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        title={UI.projects.deleteModalTitle}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteId(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{UI.projects.deleteModalMessage}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteId(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              onClick={handleDelete}
            >
              {UI.projects.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
