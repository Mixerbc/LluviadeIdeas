import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useProjectsStore } from "../store/projectsStore";
import { Modal } from "./Modal";
import { UI } from "../lib/i18n";
import { exportGroupToFile, parseGroupExportJson } from "../lib/exportImport";

const DROPDOWN_MENU_WIDTH = 180;
const DROPDOWN_Z_INDEX = 9999;
const IMPORT_OFFSET = 40;

export type GroupRibbonBarProps = {
  projectId: string;
};

export function GroupRibbonBar({ projectId }: GroupRibbonBarProps) {
  const project = useProjectsStore((s) => s.getProject(projectId));
  const activeGroupId = useProjectsStore((s) => s.activeGroupId);
  const selectGroup = useProjectsStore((s) => s.selectGroup);
  const duplicateGroup = useProjectsStore((s) => s.duplicateGroup);
  const deleteGroup = useProjectsStore((s) => s.deleteGroup);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importTargetGroupId, setImportTargetGroupId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const portalMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const renameGroup = useProjectsStore((s) => s.renameGroup);
  const addNote = useProjectsStore((s) => s.addNote);
  const groups = project?.groups ?? [];
  const canDeleteGroup = groups.length > 1;
  const openGroup = menuGroupId ? groups.find((g) => g.id === menuGroupId) : null;
  const closeMenu = useCallback(() => setMenuGroupId(null), []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Update anchor rect when menu opens and on scroll/resize.
  useEffect(() => {
    if (!menuGroupId) {
      setAnchorRect(null);
      return;
    }
    const updateRect = () => {
      if (triggerRef.current) {
        setAnchorRect(triggerRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [menuGroupId]);

  // Close on outside click (portal menu content doesn't live in the same tree).
  useEffect(() => {
    if (!menuGroupId) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (portalMenuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuGroupId(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuGroupId]);

  // Close on Escape.
  useEffect(() => {
    if (!menuGroupId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuGroupId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuGroupId]);

  const openRename = useCallback((groupId: string, currentName: string) => {
    setRenameGroupId(groupId);
    setRenameValue(currentName);
    setRenameModalOpen(true);
  }, []);

  const handleRename = useCallback(() => {
    if (renameGroupId == null || !projectId) return;
    renameGroup(projectId, renameGroupId, renameValue.trim() || UI.groups.defaultName);
    setRenameModalOpen(false);
    setRenameGroupId(null);
    setRenameValue("");
  }, [projectId, renameGroupId, renameValue, renameGroup]);

  const openDelete = useCallback((groupId: string) => {
    setDeleteGroupId(groupId);
    setDeleteModalOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (deleteGroupId == null || !projectId) return;
    deleteGroup(projectId, deleteGroupId);
    setDeleteModalOpen(false);
    setDeleteGroupId(null);
  }, [projectId, deleteGroupId, deleteGroup]);

  const handleExportGroup = useCallback(() => {
    if (!project || !openGroup) return;
    exportGroupToFile({
      version: 1,
      projectId,
      groupId: openGroup.id,
      groupName: openGroup.name,
      projectName: project.name,
      notes: openGroup.notes ?? [],
      viewport: openGroup.viewport,
    });
    closeMenu();
  }, [project, projectId, openGroup]);

  const handleImportIntoGroup = useCallback(() => {
    if (!openGroup) return;
    setImportTargetGroupId(openGroup.id);
    closeMenu();
    fileInputRef.current?.click();
  }, [openGroup, closeMenu]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const groupId = importTargetGroupId;
      setImportTargetGroupId(null);
      if (!file || !groupId || !projectId) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const result = parseGroupExportJson(text);
        if (!result.ok) {
          showToast(UI.groups.importError);
          return;
        }
        const now = new Date().toISOString();
        for (const n of result.notes) {
          addNote(projectId, groupId, {
            ...n,
            id: crypto.randomUUID(),
            x: n.x + IMPORT_OFFSET,
            y: n.y + IMPORT_OFFSET,
            updatedAt: now,
          });
        }
        showToast(UI.groups.importSuccess(result.notes.length));
      };
      reader.onerror = () => showToast(UI.groups.importError);
      reader.readAsText(file);
    },
    [importTargetGroupId, projectId, addNote, showToast],
  );

  if (groups.length === 0) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        onChange={handleFileChange}
      />
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-lg border border-gray-200 bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
      <div
        className="group-tabs-scroll relative z-10 flex h-full items-center gap-2 overflow-x-auto px-1 py-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style>{`.group-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex h-full items-center gap-2">
          {groups.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <div
                key={group.id}
                className={`
                  group/ribbon flex shrink-0 items-center gap-2 rounded-full border transition-all duration-200
                  ${isActive
                    ? "border-gray-300 bg-white shadow-sm"
                    : "border-transparent bg-transparent hover:bg-white/70"
                  }
                `}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full pl-3 pr-1 py-1.5 text-left"
                  onClick={() => selectGroup(projectId, group.id)}
                >
                  <span className="max-w-[120px] truncate text-sm font-medium text-gray-900">
                    {group.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {UI.projects.noteCount(group.notes.length)}
                  </span>
                </button>
                <button
                  ref={menuGroupId === group.id ? triggerRef : undefined}
                  type="button"
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 shrink-0"
                  title="Más acciones"
                  aria-expanded={menuGroupId === group.id}
                  aria-haspopup="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerRef.current = e.currentTarget as HTMLButtonElement;
                    setMenuGroupId((id) => (id === group.id ? null : group.id));
                  }}
                >
                  <span className="sr-only">Más acciones</span>
                  <span aria-hidden>⋯</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {openGroup &&
        anchorRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={portalMenuRef}
            className="min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            style={{
              position: "fixed",
              zIndex: DROPDOWN_Z_INDEX,
              top: anchorRect.bottom + 8,
              left: Math.max(8, anchorRect.right - DROPDOWN_MENU_WIDTH),
            }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                openRename(openGroup.id, openGroup.name);
                closeMenu();
              }}
            >
              {UI.groups.rename}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                duplicateGroup(projectId, openGroup.id);
                closeMenu();
              }}
            >
              {UI.groups.duplicate}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                handleExportGroup();
              }}
            >
              {UI.groups.exportGroup}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleImportIntoGroup}
            >
              {UI.groups.importIntoGroup}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              disabled={!canDeleteGroup}
              title={!canDeleteGroup ? UI.groups.deleteOnlyWhenMany : undefined}
              onClick={() => {
                if (canDeleteGroup) openDelete(openGroup.id);
                closeMenu();
              }}
            >
              {UI.groups.delete}
            </button>
          </div>,
          document.body,
        )}

      <Modal
        isOpen={renameModalOpen}
        title={UI.groups.renameModalTitle}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameGroupId(null);
          setRenameValue("");
        }}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">{UI.groups.nameLabel}</label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={UI.groups.namePlaceholder}
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
              {UI.groups.cancel}
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
        isOpen={deleteModalOpen}
        title={UI.groups.deleteModalTitle}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteGroupId(null);
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{UI.groups.deleteConfirm}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setDeleteModalOpen(false)}
            >
              {UI.groups.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              onClick={handleDelete}
            >
              {UI.groups.delete}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
