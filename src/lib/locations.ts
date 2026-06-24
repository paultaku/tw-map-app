import 'server-only'; // 保證此模組永不被打包進 client bundle（僅供建置時的 Server Component 使用）
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { BBox, Location } from '@/types/location';
import { DEFAULT_BBOX } from '@/lib/constants';
import { filterByBBox, normalizeLocation } from '@/lib/normalize';

// 靜態 JSON 路徑（此處沿用專案既有的台北吸菸區資料；換成你的檔案即可）
const DATA_FILE = path.join(process.cwd(), 'public', 'smoking_areas.json');

// 模組層級記憶體快取：JSON 只解析一次
let cache: Location[] | null = null;

async function loadAll(): Promise<Location[]> {
  if (cache) return cache;
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
  cache = parsed.map(normalizeLocation);
  return cache;
}

// 建置時的 BBox 過濾（與前端共用 filterByBBox 純函式）
export async function getLocationsInBBox(b: BBox, limit = 2000): Promise<Location[]> {
  const all = await loadAll();
  return filterByBBox(all, b, limit);
}

// 給首頁 Server Component 的初始資料（預設中心區域），於「建置時」執行
export const getInitialLocations = () => getLocationsInBBox(DEFAULT_BBOX);
