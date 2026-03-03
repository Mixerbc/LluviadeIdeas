import { useEffect, useState, useCallback } from "react";
import { useProjectsStore } from "../store/projectsStore";
import { useViewportStore } from "../store/viewportStore";
import { Board } from "./Board";
import { Modal } from "./Modal";
import { UI } from "../lib/i18n";

const DEFAULT_VIEWPORT = { offsetX: 0, offsetY: 0, zoom: 1 };

export function CanvasView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const activeGroupId = useProjectsStore((s) => s.activeGroupId);
  const project = useProjectsStore((s) => (activeProjectId ? s.getProject(activeProjectId) : null));
  const group = useProjectsStore((s) =>
    activeProjectId && activeGroupId
      ? s.getGroup(activeProjectId, activeGroupId)
      : null,
  );
  const closeProject = useProjectsStore((s) => s.closeProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const setViewport = useViewportStore((s) => s.setViewport);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const vp = group?.viewport ?? DEFAULT_VIEWPORT;
    setViewport(vp);
  }, [group?.id, group?.viewport, setViewport]);

  const handleRename = useCallback(() => {
    if (!activeProjectId) return;
    renameProject(activeProjectId, renameValue.trim() || "Sin nombre");
    setRenameOpen(false);
    setRenameValue("");
  }, [activeProjectId, renameValue, renameProject]);

  const openRename = useCallback(() => {
    if (project) {
      setRenameValue(project.name);
      setRenameOpen(true);
    }
  }, [project]);

  if (!activeProjectId || !project) {
    return null;
  }

  return (
    <>
      <div className="h-screen w-screen">
        <Board
          projectId={activeProjectId ?? undefined}
          groupId={activeGroupId ?? undefined}
          onBack={closeProject}
          projectName={project.name}
          onRenameProject={openRename}
        />
      </div>

      <Modal
        isOpen={renameOpen}
        title={UI.projects.renameModalTitle}
        onClose={() => {
          setRenameOpen(false);
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
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setRenameOpen(false)}
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
    </>
  );
}
