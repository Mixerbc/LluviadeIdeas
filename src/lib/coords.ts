import type { ViewportState } from "../store/viewportStore";

export type Point = {
  x: number;
  y: number;
};

/**
 * Convert from screen coordinates (e.g. pointer position relative to the board)
 * into world coordinates in the board's infinite space.
 */
export function screenToWorld(
  screen: Point,
  viewport: ViewportState,
): Point {
  const { offsetX, offsetY, zoom } = viewport;
  return {
    x: (screen.x - offsetX) / zoom,
    y: (screen.y - offsetY) / zoom,
  };
}

/**
 * Convert from world coordinates back into screen coordinates.
 */
export function worldToScreen(
  world: Point,
  viewport: ViewportState,
): Point {
  const { offsetX, offsetY, zoom } = viewport;
  return {
    x: world.x * zoom + offsetX,
    y: world.y * zoom + offsetY,
  };
}

