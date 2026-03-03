import { create } from "zustand";

export type ViewportState = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

type ViewportStore = ViewportState & {
  setViewport: (next: ViewportState) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

export const clampZoom = (value: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

export const useViewportStore = create<ViewportStore>((set) => ({
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  setViewport: (next) =>
    set({
      offsetX: next.offsetX,
      offsetY: next.offsetY,
      zoom: clampZoom(next.zoom),
    }),
  setOffset: (offsetX, offsetY) =>
    set({
      offsetX,
      offsetY,
    }),
  setZoom: (zoom) =>
    set({
      zoom: clampZoom(zoom),
    }),
  resetViewport: () =>
    set({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    }),
}));

