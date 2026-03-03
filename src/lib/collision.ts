/**
 * Collision detection for note rectangles.
 * Used to trigger "Merge notes?" when dragging/resizing causes overlap.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Returns true if rect a overlaps rect b by at least 30% of the smaller area,
 * OR if the center of A is inside B.
 */
export function isOverlapping(a: Rect, b: Rect): boolean {
  const centerAx = a.x + a.w / 2;
  const centerAy = a.y + a.h / 2;
  const centerInB =
    centerAx >= b.x &&
    centerAx <= b.x + b.w &&
    centerAy >= b.y &&
    centerAy <= b.y + b.h;
  if (centerInB) return true;

  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const intersectionArea = ix * iy;
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const minArea = Math.min(areaA, areaB);
  if (minArea <= 0) return false;
  const overlapRatio = intersectionArea / minArea;
  return overlapRatio >= 0.3;
}
