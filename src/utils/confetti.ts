/**
 * Confetti helper para "Lluvias de Ideas".
 * Usa canvas-confetti con palette fija, reduced-motion y SSR-safe.
 */

import confetti from "canvas-confetti";

const PALETTE = [
  "#FFD400", // amarillo
  "#FF3B30", // rojo
  "#007AFF", // azul
  "#34C759", // verde
  "#AF52DE", // morado
  "#FF2D55", // rosa
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mq.matches;
}

export type ConfettiBurstOptions = {
  /** Menos partículas, para modales (ej. Guardar) */
  subtle?: boolean;
  /** Origen X 0–1 (por defecto variado en ráfagas) */
  originX?: number;
  /** Origen Y 0–1 */
  originY?: number;
};

const DEFAULT_OPTIONS = {
  colors: [...PALETTE],
  shapes: ["circle", "square" as const],
  scalar: 0.8,
  gravity: 0.6,
  drift: 0.2,
  ticks: 100,
  startVelocity: 22,
  spread: 60,
  particleCount: 50,
  decay: 0.92,
};

const SUBTLE_OPTIONS = {
  ...DEFAULT_OPTIONS,
  particleCount: 18,
  scalar: 0.6,
  spread: 45,
  startVelocity: 16,
  decay: 0.94,
};

function fireOne(
  opts: Record<string, unknown> & { particleCount: number; origin?: { x: number; y: number } },
) {
  if (typeof window === "undefined") return;
  confetti({
    ...opts,
    origin: opts.origin ?? { x: 0.5, y: 0.5 },
  });
}

/**
 * Dispara 2–3 ráfagas (centro + laterales) con la palette fija. Duración ~1.2–1.8s.
 * No hace nada si prefers-reduced-motion o en SSR. No bloquea la UI.
 */
export function confettiBurst(options: ConfettiBurstOptions = {}): void {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const base = options.subtle ? SUBTLE_OPTIONS : DEFAULT_OPTIONS;

  // Ráfaga central
  fireOne({
    ...base,
    origin: { x: 0.5, y: 0.55 },
    colors: base.colors,
    shapes: base.shapes,
  } as Parameters<typeof confetti>[0]);

  // Laterales con pequeño delay para efecto premium
  setTimeout(() => {
    fireOne({
      ...base,
      particleCount: Math.floor((base.particleCount as number) * 0.55),
      origin: { x: 0.28, y: 0.6 },
      colors: base.colors,
      shapes: base.shapes,
      spread: 58,
    } as Parameters<typeof confetti>[0]);
  }, 120);

  setTimeout(() => {
    fireOne({
      ...base,
      particleCount: Math.floor((base.particleCount as number) * 0.55),
      origin: { x: 0.72, y: 0.6 },
      colors: base.colors,
      shapes: base.shapes,
      spread: 58,
    } as Parameters<typeof confetti>[0]);
  }, 240);
}

/** Última key para la que se disparó confetti (evita duplicados por StrictMode / doble mount). */
let lastFiredKey: string | null = null;

/**
 * Dispara confetti al "entrar" en una pantalla, solo 1 vez por key.
 * Si la key es la misma que la última, no dispara (evita doble ejecución en dev).
 */
export function confettiOnEnter(routeKey: string): void {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;
  if (lastFiredKey === routeKey) return;
  lastFiredKey = routeKey;
  confettiBurst();
}
