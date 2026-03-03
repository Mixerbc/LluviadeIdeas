import { useEffect } from "react";
import { confettiOnEnter } from "../utils/confetti";

/**
 * Dispara confetti al entrar en una pantalla, una sola vez por `screenKey`.
 * Ideal para usar en App/Layout: pasa la key de la pantalla actual
 * (ej. 'index' o `project-${activeProjectId}`). Evita duplicados por
 * StrictMode (doble mount en dev) gracias al tracking en confettiOnEnter.
 *
 * Si usas React Router, puedes derivar la key desde location:
 *   const location = useLocation();
 *   const screenKey = location.pathname || 'index';
 *   useRouteConfetti(screenKey);
 */
export function useRouteConfetti(screenKey: string): void {
  useEffect(() => {
    confettiOnEnter(screenKey);
  }, [screenKey]);
}
