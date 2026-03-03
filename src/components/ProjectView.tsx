import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useProjectsStore } from "../store/projectsStore";
import { useViewportStore } from "../store/viewportStore";
import { debounce } from "../lib/debounce";
import { Board, type BoardHandle } from "./Board";
import { GroupRibbonBar } from "./GroupRibbonBar";
import { Modal } from "./Modal";
import { UI } from "../lib/i18n";
import { confettiBurst } from "../utils/confetti";

const DEFAULT_VIEWPORT = { offsetX: 0, offsetY: 0, zoom: 1 };

export function ProjectView() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const activeGroupId = useProjectsStore((s) => s.activeGroupId);
  const project = useProjectsStore((s) =>
    activeProjectId ? s.getProject(activeProjectId) : null,
  );
  const group = useProjectsStore((s) =>
    activeProjectId && activeGroupId
      ? s.getGroup(activeProjectId, activeGroupId)
      : null,
  );
  const closeProject = useProjectsStore((s) => s.closeProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const createGroup = useProjectsStore((s) => s.createGroup);
  const setGroupViewport = useProjectsStore((s) => s.setGroupViewport);

  const setViewport = useViewportStore((s) => s.setViewport);
  const activeRef = useRef({ activeProjectId, activeGroupId });
  const boardRef = useRef<BoardHandle | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  activeRef.current = { activeProjectId, activeGroupId };

  // Sync viewport store from group when project/group changes.
  useEffect(() => {
    if (!group) return;
    const vp = group.viewport ?? DEFAULT_VIEWPORT;
    setViewport(vp);
  }, [activeProjectId, activeGroupId, group?.id, group?.viewport, setViewport]);

  // Persist viewport store to group (debounced on viewport change).
  useEffect(() => {
    if (!activeProjectId || !activeGroupId) return;
    const persist = debounce(() => {
      const { offsetX, offsetY, zoom } = useViewportStore.getState();
      const { activeProjectId: pid, activeGroupId: gid } = activeRef.current;
      if (pid && gid) {
        setGroupViewport(pid, gid, { offsetX, offsetY, zoom });
      }
    }, 600);
    const unsub = useViewportStore.subscribe(persist);
    return () => {
      unsub();
    };
  }, [activeProjectId, activeGroupId, setGroupViewport]);

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

  const handleCreateGroup = useCallback(() => {
    if (!activeProjectId) return;
    const nextNum = (project?.groups?.length ?? 0) + 1;
    const name = newGroupName.trim() || `Grupo ${nextNum}`;
    createGroup(activeProjectId, name);
    setNewGroupName("");
    setNewGroupOpen(false);
    confettiBurst();
  }, [activeProjectId, project?.groups?.length, newGroupName, createGroup]);

  if (!activeProjectId || !project) {
    return null;
  }

  return (
    <>
      <motion.div
        className="flex h-screen w-screen flex-col bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Top Header: sticky, white, 64px, border #eaeaea */}
        <header
          className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[#eaeaea] bg-white px-4"
          style={{ borderBottomWidth: "1px" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              onClick={closeProject}
              aria-label={UI.projects.volver}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
              {UI.projects.volver}
            </button>
            <button
              type="button"
              className="max-w-[200px] truncate rounded-lg px-2 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-100"
              title={project.name}
              onClick={openRename}
            >
              {project.name}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => {
                const nextNum = (project?.groups?.length ?? 0) + 1;
                setNewGroupName(`Grupo ${nextNum}`);
                setNewGroupOpen(true);
              }}
            >
              {UI.groups.newGroup}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
              onClick={() => boardRef.current?.newNote()}
            >
              {UI.topbar.newNote}
            </button>
          </div>
        </header>

        {/* Groups Bar: sticky under header, #fafafa, 56px, horizontal scroll */}
        <div
          className="sticky top-16 z-[35] h-14 shrink-0 border-b border-gray-200/80 bg-[#fafafa] px-4"
          style={{ borderBottomWidth: "1px" }}
        >
          <GroupRibbonBar projectId={activeProjectId} />
        </div>

        {/* Canvas area: flex-1, no overlap with sticky bars */}
        <main className="min-h-0 flex-1">
          {activeGroupId ? (
            <Board
              ref={boardRef}
              projectId={activeProjectId}
              groupId={activeGroupId}
              onBack={closeProject}
              projectName={project.name}
              onRenameProject={openRename}
              onNewGroup={() => {
                const nextNum = (project?.groups?.length ?? 0) + 1;
                setNewGroupName(`Grupo ${nextNum}`);
                setNewGroupOpen(true);
              }}
              hideTopBar
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {UI.projects.noNotesYet}
            </div>
          )}
        </main>
      </motion.div>

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

      <Modal
        isOpen={newGroupOpen}
        title={UI.groups.createGroupModalTitle}
        onClose={() => {
          setNewGroupOpen(false);
          setNewGroupName("");
        }}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            {UI.groups.nameLabel}
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={UI.groups.namePlaceholder}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setNewGroupOpen(false)}
            >
              {UI.groups.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
              onClick={handleCreateGroup}
            >
              {UI.groups.create}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
