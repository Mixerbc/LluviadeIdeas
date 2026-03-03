import { useUiStore } from "../store/uiStore";
import { UI } from "../lib/i18n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export type TopBarProps = {
  onNewNote: () => void;
  onExport: () => void;
  /** When set, show back button and project name instead of app title. */
  onBack?: () => void;
  projectName?: string;
  onRenameProject?: () => void;
  /** When set, show "Nuevo grupo" button (secondary) before "Nueva nota". */
  onNewGroup?: () => void;
};

export function TopBar({ onNewNote, onExport, onBack, projectName, onRenameProject, onNewGroup }: TopBarProps) {
  const openImportModal = useUiStore((state) => state.openImportModal);

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 text-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {onBack ? (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              onClick={onBack}
              aria-label={UI.projects.volver}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
              {UI.projects.volver}
            </button>
            {projectName != null && (
              onRenameProject ? (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 font-semibold text-gray-900 hover:bg-gray-100 truncate max-w-[200px]"
                  onClick={onRenameProject}
                  title={projectName}
                >
                  {projectName}
                </button>
              ) : (
                <span className="font-semibold text-gray-900 truncate max-w-[200px]" title={projectName}>
                  {projectName}
                </span>
              )
            )}
          </>
        ) : (
          <span className="font-semibold tracking-wide text-gray-900">
            {UI.appTitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onNewGroup && (
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={onNewGroup}
          >
            {UI.groups.newGroup}
          </button>
        )}
        <button
          type="button"
          className="rounded-lg bg-blue-500 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
          onClick={onNewNote}
        >
          {UI.topbar.newNote}
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onExport}
        >
          {UI.topbar.export}
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50"
          onClick={() => openImportModal()}
        >
          {UI.topbar.import}
        </button>
      </div>
    </div>
  );
}
