import type { BBox, Location } from '@/types/location';

// 同時供 server（建置時讀檔）與 client（瀏覽器過濾）使用，
// 因此不可含 node:fs / server-only 等僅伺服器可用的相依。

// 把原始資料（如 coords:[lat,lng] / title）轉成統一的 Location
export function normalizeLocation(item: Record<string, unknown>, index: number): Location {
  const coords = item.coords as [number, number] | undefined;
  return {
    id: (item.id as number | string) ?? index,
    name: (item.title as string) ?? (item.name as string) ?? '未命名地點',
    lat: coords ? coords[0] : (item.lat as number),
    lng: coords ? coords[1] : (item.lng as number),
    category: item.category as string | undefined,
  };
}

// 純函式：點是否落在 BBox 內
export const inBBox = (l: Location, b: BBox) =>
  l.lat >= b.minLat && l.lat <= b.maxLat && l.lng >= b.minLng && l.lng <= b.maxLng;

// 依 BBox 過濾（含上限保護，避免單次顯示爆量點）
export function filterByBBox(all: Location[], b: BBox, limit = 2000): Location[] {
  const out: Location[] = [];
  for (const l of all) {
    if (inBBox(l, b)) {
      out.push(l);
      if (out.length >= limit) break;
    }
  }
  return out;
}
