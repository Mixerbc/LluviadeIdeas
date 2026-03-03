import { useProjectsStore } from "./store/projectsStore";
import { ProjectsRibbons } from "./components/ProjectsRibbons";
import { ProjectView } from "./components/ProjectView";
import { useRouteConfetti } from "./hooks/useRouteConfetti";

function App() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const screenKey = activeProjectId == null ? "index" : `project-${activeProjectId}`;
  useRouteConfetti(screenKey);

  return (
    <div className="h-screen w-screen">
      {activeProjectId == null ? (
        <ProjectsRibbons />
      ) : (
        <ProjectView />
      )}
    </div>
  );
}

export default App;
