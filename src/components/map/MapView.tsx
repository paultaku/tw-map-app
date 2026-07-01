'use client';

import dynamic from 'next/dynamic';
import type { Location } from '@/types/location';

// ⚠️ Next.js 16：ssr:false 只能在 Client Component 使用。
//    放這個 'use client' 包裝層，避免在 page.tsx(Server Component) 直接用而報錯，
//    同時隔離依賴 window 的 Leaflet，杜絕 "window is not defined"。
//    H3ClusterMap 透過 Firestore H3 網格載入；若要改回純靜態 JSON 版本，
//    將下方改成 import('./ClusterMap') 即可。
const ClusterMap = dynamic(() => import('./H3ClusterMap'), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>地圖載入中…</div>,
});

export default function MapView({ initialLocations }: { initialLocations: Location[] }) {
  return <ClusterMap initialLocations={initialLocations} />;
}
