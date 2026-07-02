import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { cellToParent } from 'h3-js';
import { db } from '@/services/firebase';
import { normalizeLocation } from '@/lib/normalize';
import { bboxToH3Cells, resForZoom, RES_AGGREGATE, RES_DETAIL } from '@/lib/h3';
import type { BBox, GridCell, Location } from '@/types/location';
import type { Place } from '@/services/dataProvider';

// Grids are now per-dataset. Every fetch is scoped to a single `datasetId`
// (the 資料集編號, e.g. "00001540"); switching datasets swaps the whole source.

type Mode = 'aggregate' | 'detail';
interface CellResult { mode: Mode; cells: GridCell[]; }

const inBBox = (lat: number, lng: number, b: BBox) =>
  lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;

// ---------------------------------------------------------------------------
// Source 1 — Firestore (production)
//   datasets/<datasetId>/r7/<h3>   — aggregate cells (counts only)
//   datasets/<datasetId>/r9/<h3>   — detail cells (with points)
// ---------------------------------------------------------------------------

const FIRESTORE_IN_LIMIT = 30; // max values per Firestore `in` query

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Queries the dataset's matching subcollection by document id (= H3 index), chunked + parallel.
// documentId() resolves relative to the queried subcollection, so the cell ids match doc names.
async function fetchCellsFirestore(datasetId: string, bbox: BBox, zoom: number): Promise<CellResult> {
  const res = resForZoom(zoom);
  const mode: Mode = res >= RES_DETAIL ? 'detail' : 'aggregate';
  const cellIds = bboxToH3Cells(bbox, res);
  if (cellIds.length === 0) return { mode, cells: [] };

  const col = collection(db, 'datasets', datasetId, mode === 'detail' ? 'r9' : 'r7');
  const snaps = await Promise.all(
    chunk(cellIds, FIRESTORE_IN_LIMIT).map((ids) =>
      getDocs(query(col, where(documentId(), 'in', ids))),
    ),
  );
  return { mode, cells: snaps.flatMap((s) => s.docs.map((d) => d.data() as GridCell)) };
}

// ---------------------------------------------------------------------------
// Source 2 — static public/h3/<datasetId>/* files (local development)
//   /h3/<id>/grids_r7.json          — whole aggregate grid (small)
//   /h3/<id>/r9/<parentR7>.json     — detail cells sharded by parent r7 cell
// ---------------------------------------------------------------------------

// Caches are keyed by dataset so switching datasets doesn't evict the previous one.
const r7Cache = new Map<string, Promise<Map<string, GridCell>>>();
const shardCache = new Map<string, Promise<Map<string, GridCell>>>(); // key: `${datasetId}::${parent}`

function indexCells(cells: GridCell[]): Map<string, GridCell> {
  const m = new Map<string, GridCell>();
  for (const c of cells) m.set(c.h3, c);
  return m;
}

function loadR7(datasetId: string): Promise<Map<string, GridCell>> {
  let p = r7Cache.get(datasetId);
  if (!p) {
    p = fetch(`/h3/${datasetId}/grids_r7.json`).then(async (r) => {
      if (r.status === 404) return new Map<string, GridCell>(); // dataset not generated / empty
      if (!r.ok) throw new Error(`grids_r7.json (${datasetId}): HTTP ${r.status}`);
      const json = await r.json();
      return indexCells(json.cells ?? []);
    });
    p.catch(() => { r7Cache.delete(datasetId); }); // allow retry on failure
    r7Cache.set(datasetId, p);
  }
  return p;
}

function loadShard(datasetId: string, parent: string): Promise<Map<string, GridCell>> {
  const key = `${datasetId}::${parent}`;
  let p = shardCache.get(key);
  if (!p) {
    p = fetch(`/h3/${datasetId}/r9/${parent}.json`).then(async (r) => {
      if (r.status === 404) return new Map<string, GridCell>(); // sparse area: no shard, legitimately empty
      if (!r.ok) throw new Error(`r9 shard ${key}: HTTP ${r.status}`);
      const json = await r.json();
      return indexCells(json.cells ?? []);
    });
    p.catch(() => shardCache.delete(key)); // allow retry; don't cache failures
    shardCache.set(key, p);
  }
  return p;
}

async function fetchCellsStatic(datasetId: string, bbox: BBox, zoom: number): Promise<CellResult> {
  const res = resForZoom(zoom);

  if (res < RES_DETAIL) {
    // Aggregate grid is small (loaded whole); filter by cell-center-in-bbox.
    // This avoids the polygonToCells cap on wide viewports (e.g. the home page's default zoom).
    const grid = await loadR7(datasetId);
    const cells = [...grid.values()].filter((c) => inBBox(c.center.lat, c.center.lng, bbox));
    return { mode: 'aggregate', cells };
  }

  // Detail: fetch only the r9 shards whose parent r7 cell intersects the viewport.
  const wanted = bboxToH3Cells(bbox, RES_DETAIL);
  const parents = [...new Set(wanted.map((h) => cellToParent(h, RES_AGGREGATE)))];
  const wantedSet = new Set(wanted);
  const shardMaps = await Promise.all(parents.map((p) => loadShard(datasetId, p)));
  const cells = shardMaps.flatMap((m) => [...m.values()].filter((c) => wantedSet.has(c.h3)));
  return { mode: 'detail', cells };
}

// ---------------------------------------------------------------------------
// Dispatcher — dev uses the static files, production uses Firestore.
// Override with NEXT_PUBLIC_GRID_SOURCE=static|firestore.
// ---------------------------------------------------------------------------

function gridSource(): 'static' | 'firestore' {
  const override = process.env.NEXT_PUBLIC_GRID_SOURCE;
  if (override === 'static' || override === 'firestore') return override;
  return process.env.NODE_ENV === 'production' ? 'firestore' : 'static';
}

function fetchCells(datasetId: string, bbox: BBox, zoom: number): Promise<CellResult> {
  return gridSource() === 'static'
    ? fetchCellsStatic(datasetId, bbox, zoom)
    : fetchCellsFirestore(datasetId, bbox, zoom);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// For the /map route — detail points are normalized to the lightweight Location shape.
export type GridResult =
  | { mode: 'aggregate'; cells: GridCell[] }
  | { mode: 'detail'; points: Location[] };

export async function fetchGrid(datasetId: string, bbox: BBox, zoom: number): Promise<GridResult> {
  const { mode, cells } = await fetchCells(datasetId, bbox, zoom);
  if (mode === 'detail') {
    const points = cells.flatMap((c) => (c.points ?? []).map((p, i) => normalizeLocation(p, i)));
    return { mode, points };
  }
  return { mode, cells };
}

// For the home page — detail points are the full Place objects stored in each cell,
// so the sidebar list and details panel keep all their fields (address, hours, etc.).
export type PlaceGridResult =
  | { mode: 'aggregate'; cells: GridCell[] }
  | { mode: 'detail'; places: Place[] };

export async function fetchGridPlaces(datasetId: string, bbox: BBox, zoom: number): Promise<PlaceGridResult> {
  const { mode, cells } = await fetchCells(datasetId, bbox, zoom);
  if (mode === 'detail') {
    const places = cells.flatMap((c) => (c.points ?? []) as unknown as Place[]);
    return { mode, places };
  }
  return { mode, cells };
}
