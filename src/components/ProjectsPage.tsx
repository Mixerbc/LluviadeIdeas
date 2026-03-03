import { useState, useCallback } from "react";
import { useProjectsStore } from "../store/projectsStore";
import { ProjectCard } from "./ProjectCard";
import { Modal } from "./Modal";
import { UI } from "../lib/i18n";

export function ProjectsPage() {
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

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const project = createProject(newName.trim());
    setNewName("");
    setNewModalOpen(false);
    openProject(project.id);
  }, [createProject, newName, openProject]);

  const openRename = useCallback((id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameModalOpen(true);
  }, []);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleRename = useCallback(() => {
    if (renameId == null) return;
    const name = renameValue.trim();
    if (!name) return;
    if (name.length > 50) return;
    renameProject(renameId, name);
    setRenameModalOpen(false);
    setRenameId(null);
    setRenameValue("");
  }, [renameId, renameValue, renameProject]);

  const openDeleteConfirm = useCallback((id: string) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId == null) return;
    deleteProject(deleteId);
    setDeleteModalOpen(false);
    setDeleteId(null);
  }, [deleteId, deleteProject]);

  const noiseDataUrl =
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";

  return (
    <div
      className="relative min-h-screen p-6"
      style={{
        background: "linear-gradient(180deg, #f7f7fb 0%, #eef2ff 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: noiseDataUrl }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{UI.projects.title}</h1>
          <button
            type="button"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            onClick={() => {
              setNewName("");
              setNewModalOpen(true);
            }}
          >
            {UI.projects.newProject}
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-12 text-center text-gray-500 shadow-sm">
            {UI.projects.noProjects}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => openProject(project.id)}
                onRename={() => openRename(project.id, project.name)}
                onDelete={() => openDeleteConfirm(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={newModalOpen}
        title={UI.projects.newProjectModalTitle}
        onClose={() => setNewModalOpen(false)}
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
          <p className="text-xs text-gray-500">
            {renameValue.length}/50
          </p>
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
              {UI.modals.enrich.cancel}
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
          <p className="text-sm text-gray-700">
            {UI.projects.deleteModalMessage}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteId(null);
              }}
            >
              {UI.modals.enrich.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              onClick={handleDeleteConfirm}
            >
              {UI.projects.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
