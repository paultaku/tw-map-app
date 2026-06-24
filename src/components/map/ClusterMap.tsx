'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '@/types/location';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { MarkerCluster } from './MarkerCluster';
import { BBoxLoader } from './BBoxLoader';

export default function ClusterMap({ initialLocations }: { initialLocations: Location[] }) {
  // 以伺服器水合的資料當初始 state（首屏即有點，不需等 client fetch）
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const handleLoaded = useCallback((next: Location[]) => setLocations(next), []);

  return (
    <MapContainer
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 點聚合：鄰近點合併，圓形群組中央自動顯示「合併數字」 */}
      <MarkerCluster locations={locations} />

      {/* 視角改變（moveend / zoomend）→ 防抖 → 向 /api/locations 抓新區塊 */}
      <BBoxLoader onLoaded={handleLoaded} />
    </MapContainer>
  );
}
