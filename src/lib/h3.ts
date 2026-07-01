import { polygonToCells } from 'h3-js';
import type { BBox } from '@/types/location';

// scripts/parseOpenData.ts only generates two grids:
export const RES_AGGREGATE = 7; // ~5 km edge — zoomed-out count bubbles
export const RES_DETAIL = 9;    // ~0.17 km edge — individual points

// Below this zoom we show aggregate bubbles (res 7); at/above it we show detail points (res 9).
// Kept high so a detail (res 9) viewport stays small enough to cover with few cells.
export const DETAIL_ZOOM_THRESHOLD = 15;

// Safety cap so a pathologically large viewport can't fan out into hundreds of Firestore reads.
const MAX_CELLS = 600;

// Map the current map zoom to the H3 resolution we query.
export function resForZoom(zoom: number): number {
  return zoom >= DETAIL_ZOOM_THRESHOLD ? RES_DETAIL : RES_AGGREGATE;
}

// Convert a viewport BBox into the H3 cells covering it (h3-js v4 expects [lat, lng] rings).
export function bboxToH3Cells(bbox: BBox, res: number): string[] {
  const ring: [number, number][] = [
    [bbox.minLat, bbox.minLng],
    [bbox.minLat, bbox.maxLng],
    [bbox.maxLat, bbox.maxLng],
    [bbox.maxLat, bbox.minLng],
  ];
  const cells = polygonToCells(ring, res);
  if (cells.length > MAX_CELLS) {
    console.warn(`bboxToH3Cells: ${cells.length} cells at res ${res} exceeds cap ${MAX_CELLS}; truncating.`);
    return cells.slice(0, MAX_CELLS);
  }
  return cells;
}
