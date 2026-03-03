import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectsStore } from "../store/projectsStore";
import { ProjectPageCard } from "./ProjectPageCard";
import { Modal } from "./Modal";
import { UI } from "../lib/i18n";

const FLIP_DURATION = 0.4;
const FLIP_EASE = [0.25, 0.1, 0.25, 1] as const;

export function BookProjects() {
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const openProject = useProjectsStore((s) => s.openProject);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev" | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPages = Math.max(1, projects.length);
  const clampedIndex = projects.length === 0 ? 0 : Math.min(currentPageIndex, projects.length - 1);

  useEffect(() => {
    if (projects.length > 0 && currentPageIndex >= projects.length) {
      setCurrentPageIndex(Math.max(0, projects.length - 1));
    }
  }, [projects.length, currentPageIndex]);

  useEffect(() => {
    if (flipDirection === null) return;
    const t = setTimeout(() => setFlipDirection(null), FLIP_DURATION * 1000 + 50);
    return () => clearTimeout(t);
  }, [flipDirection]);

  const goPrev = useCallback(() => {
    if (clampedIndex <= 0) return;
    setFlipDirection("prev");
    setCurrentPageIndex((i) => i - 1);
  }, [clampedIndex]);

  const goNext = useCallback(() => {
    if (clampedIndex >= projects.length - 1) return;
    setFlipDirection("next");
    setCurrentPageIndex((i) => i + 1);
  }, [clampedIndex, projects.length]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const project = createProject(newName.trim());
    setNewName("");
    setNewModalOpen(false);
    setCurrentPageIndex(0);
    openProject(project.id);
  }, [createProject, newName, openProject]);

  const openRename = useCallback((id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameModalOpen(true);
  }, []);

  const handleRename = useCallback(() => {
    if (renameId == null) return;
    renameProject(renameId, renameValue.trim() || "Sin nombre");
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
    const idx = projects.findIndex((p) => p.id === deleteId);
    deleteProject(deleteId);
    setDeleteModalOpen(false);
    setDeleteId(null);
    if (projects.length <= 1) {
      setCurrentPageIndex(0);
    } else if (idx <= currentPageIndex && currentPageIndex > 0) {
      setCurrentPageIndex((i) => i - 1);
    } else if (idx <= currentPageIndex) {
      setCurrentPageIndex(0);
    }
  }, [deleteId, deleteProject, projects, currentPageIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (newModalOpen || renameModalOpen || deleteModalOpen) return;
      if (e.key === "ArrowLeft") {
        goPrev();
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        goNext();
        e.preventDefault();
      } else if (e.key === "Enter" && projects[clampedIndex]) {
        openProject(projects[clampedIndex].id);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newModalOpen, renameModalOpen, deleteModalOpen, goPrev, goNext, projects, clampedIndex, openProject]);

  const leftProject = clampedIndex > 0 ? projects[clampedIndex - 1] : null;
  const rightProject = projects[clampedIndex] ?? null;

  const pageVariants = {
    enter: (dir: "next" | "prev" | null) => ({
      x: dir === "next" ? "20%" : dir === "prev" ? "-20%" : 0,
      rotateY: dir === "next" ? -12 : dir === "prev" ? 12 : 0,
      opacity: 0.85,
    }),
    center: {
      x: 0,
      rotateY: 0,
      opacity: 1,
      transition: { duration: FLIP_DURATION, ease: FLIP_EASE },
    },
    exit: (dir: "next" | "prev" | null) => ({
      x: dir === "next" ? "-20%" : dir === "prev" ? "20%" : 0,
      rotateY: dir === "next" ? 12 : dir === "prev" ? -12 : 0,
      opacity: 0.85,
      transition: { duration: FLIP_DURATION, ease: FLIP_EASE },
    }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <h1 className="text-xl font-bold text-gray-900">{UI.projects.title}</h1>
        <button
          type="button"
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-600"
          onClick={() => {
            setNewName("");
            setNewModalOpen(true);
          }}
        >
          {UI.projects.newProject}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center overflow-hidden p-4 md:p-8">
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-lg"
          >
            {UI.projects.noProjects}
          </motion.div>
        ) : (
          <motion.div
            className="relative flex w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
            style={{
              minHeight: "400px",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05), 0 12px 24px -8px rgba(0,0,0,0.1)",
            }}
          >
            {/* Spine gradient (center) */}
            <div
              className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-px"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.08) 100%)",
              }}
            />

            {/* Desktop: two pages */}
            <div className="hidden md:flex md:h-full md:min-h-[400px] md:perspective-[1200px]">
              <div className="flex w-1/2 shrink-0 items-stretch overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
                <AnimatePresence initial={false} custom={flipDirection}>
                  <motion.div
                    key={leftProject?.id ?? "left-empty"}
                    className="flex w-full items-stretch"
                    style={{ transformStyle: "preserve-3d", transformOrigin: "right center" }}
                    custom={flipDirection}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: FLIP_DURATION, ease: FLIP_EASE }}
                  >
                    {leftProject ? (
                      <motion.div
                        className="w-full cursor-pointer"
                        onClick={() => openProject(leftProject.id)}
                        whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <ProjectPageCard
                          project={leftProject}
                          side="left"
                          onOpen={() => openProject(leftProject.id)}
                          onRename={() => openRename(leftProject.id, leftProject.name)}
                          onDelete={() => openDelete(leftProject.id)}
                        />
                      </motion.div>
                    ) : (
                      <ProjectPageCard
                        project={projects[0]}
                        side="left"
                        isPlaceholder
                        onOpen={() => {}}
                        onRename={() => {}}
                        onDelete={() => {}}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex w-1/2 shrink-0 items-stretch overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
                <AnimatePresence initial={false} custom={flipDirection}>
                  {rightProject && (
                    <motion.div
                      key={rightProject.id}
                      className="flex w-full items-stretch"
                      style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
                      custom={flipDirection}
                      variants={pageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: FLIP_DURATION, ease: FLIP_EASE }}
                    >
                      <motion.div
                        className="w-full cursor-pointer"
                        onClick={() => openProject(rightProject.id)}
                        whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <ProjectPageCard
                          project={rightProject}
                          side="right"
                          onOpen={() => openProject(rightProject.id)}
                          onRename={() => openRename(rightProject.id, rightProject.name)}
                          onDelete={() => openDelete(rightProject.id)}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile: single page with arrows */}
            <div className="relative flex min-h-[340px] md:hidden">
              <button
                type="button"
                className="absolute left-0 top-0 z-10 flex h-full w-14 items-center justify-center bg-gray-100/90 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                onClick={goPrev}
                disabled={clampedIndex <= 0}
                aria-label={UI.projects.prev}
              >
                ←
              </button>
              <div className="flex flex-1 flex-col items-center justify-center px-16 py-4">
                <AnimatePresence mode="wait">
                  {rightProject && (
                    <motion.div
                      key={rightProject.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.3, ease: FLIP_EASE }}
                      className="w-full"
                    >
                      <ProjectPageCard
                        project={rightProject}
                        onOpen={() => openProject(rightProject.id)}
                        onRename={() => openRename(rightProject.id, rightProject.name)}
                        onDelete={() => openDelete(rightProject.id)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                className="absolute right-0 top-0 z-10 flex h-full w-14 items-center justify-center bg-gray-100/90 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                onClick={goNext}
                disabled={clampedIndex >= projects.length - 1}
                aria-label={UI.projects.next}
              >
                →
              </button>
            </div>
          </motion.div>
        )}

        {projects.length > 0 && (
          <nav className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                onClick={goPrev}
                disabled={clampedIndex <= 0}
                whileHover={clampedIndex > 0 ? { scale: 1.03 } : {}}
                whileTap={clampedIndex > 0 ? { scale: 0.98 } : {}}
              >
                ← {UI.projects.prev}
              </motion.button>
              <span className="min-w-[140px] text-center text-sm font-medium text-gray-600">
                {UI.projects.pageOf(clampedIndex + 1, totalPages)}
              </span>
              <motion.button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                onClick={goNext}
                disabled={clampedIndex >= projects.length - 1}
                whileHover={clampedIndex < projects.length - 1 ? { scale: 1.03 } : {}}
                whileTap={clampedIndex < projects.length - 1 ? { scale: 0.98 } : {}}
              >
                {UI.projects.next} →
              </motion.button>
            </div>
            <span className="text-xs text-gray-400">{UI.projects.navKeyboardHint}</span>
          </nav>
        )}
      </main>

      {/* New project modal */}
      <Modal isOpen={newModalOpen} title={UI.projects.newProjectModalTitle} onClose={() => setNewModalOpen(false)}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">{UI.projects.nameLabel}</label>
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

      {/* Rename modal */}
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
          <label className="block text-sm font-medium text-gray-700">{UI.projects.nameLabel}</label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={UI.projects.namePlaceholder}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setRenameModalOpen(false)}
            >
              {UI.modals.enrich.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              onClick={handleRename}
              disabled={!renameValue.trim()}
            >
              {UI.modals.save}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        title={UI.projects.deleteProjectConfirm}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteId(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">No se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setDeleteModalOpen(false)}
            >
              {UI.modals.enrich.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
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
