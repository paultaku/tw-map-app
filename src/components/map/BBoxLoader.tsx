'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { Location } from '@/types/location';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { filterByBBox, normalizeLocation } from '@/lib/normalize';
import { DATA_URL } from '@/lib/constants';

// 靜態匯出（output: export）沒有執行期伺服器，因此 BBox 過濾改在「前端」進行：
//   1. 全量靜態 JSON 只在掛載時抓一次（由 Firebase Hosting 直接提供）。
//   2. moveend/zoomend（防抖 300ms）時，依目前視角在瀏覽器端過濾後回報。
export function BBoxLoader({ onLoaded }: { onLoaded: (locations: Location[]) => void }) {
  const map = useMap();
  const allRef = useRef<Location[] | null>(null); // 全量資料存記憶體，只抓一次

  // 用 ref 保存最新 onLoaded，避免重建 effect / 產生 stale closure
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // 依目前視角過濾並回報
  const applyBBox = () => {
    const all = allRef.current;
    if (!all) return;
    const b = map.getBounds();
    const filtered = filterByBBox(all, {
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    });
    onLoadedRef.current(filtered);
  };

  // 全量靜態 JSON 只載入一次，載入後立即依目前視角套用一次
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) return;
        const raw = (await res.json()) as Array<Record<string, unknown>>;
        if (cancelled) return;
        allRef.current = raw.map(normalizeLocation);
        applyBBox();
      } catch (e) {
        console.error('載入地點資料失敗：', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔑 防抖 300ms：連續拖曳/縮放，只在「停下來」後過濾一次
  const debouncedApply = useDebouncedCallback(applyBBox, 300);

  // 監聽地圖事件
  useMapEvents({
    moveend: () => debouncedApply(), // 拖曳結束
    zoomend: () => debouncedApply(), // 縮放結束
  });

  return null;
}
