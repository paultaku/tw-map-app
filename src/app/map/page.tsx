// 沒有 'use client' → 這是 Server Component，可直接在伺服器讀取靜態 JSON
import { getInitialLocations } from '@/lib/locations';
import MapView from '@/components/map/MapView';

export default async function MapPage() {
  // 伺服器端先取「預設中心點區域」的點 → 作為水合初始資料，首開秒現
  const initialLocations = await getInitialLocations();

  return (
    <main style={{ height: '100dvh', width: '100%' }}>
      <MapView initialLocations={initialLocations} />
    </main>
  );
}
