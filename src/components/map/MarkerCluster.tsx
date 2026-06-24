'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Location } from '@/types/location';

// 沿用專案既有的 leaflet.markercluster（免再裝套件）。
// 圓形群組中央顯示「合併數字」是它的預設行為。
export function MarkerCluster({ locations }: { locations: Location[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  // 建立一次聚合群組
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      chunkedLoading: true, // 大量點位分批渲染，避免主執行緒卡頓
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  // locations 變動 → 重建 marker（批次操作，效能優於逐一 addLayer）
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    const markers = locations.map((l) =>
      L.marker([l.lat, l.lng]).bindPopup(l.name),
    );
    group.addLayers(markers);
  }, [locations]);

  return null; // 只操作 Leaflet，不渲染 React DOM
}
