'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { Location } from '@/types/location';

// ⚠️ Next.js 16：ssr:false 只能在 Client Component 使用。
//    放這個 'use client' 包裝層，避免在 page.tsx(Server Component) 直接用而報錯，
//    同時隔離依賴 window 的 Leaflet，杜絕 "window is not defined"。
//    H3ClusterMap 透過每個資料集(dataset)的 H3 網格載入；此頁預設載入第一個資料集。
const ClusterMap = dynamic(() => import('./H3ClusterMap'), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>地圖載入中…</div>,
});

export default function MapView({ initialLocations }: { initialLocations: Location[] }) {
  // Grids are per-dataset (the data "選項"); default to 性別友善廁所, else the first dataset.
  const [datasetId, setDatasetId] = useState<string>('');
  useEffect(() => {
    fetch('/data-set-mapping.json')
      .then((r) => (r.ok ? r.json() : { options: [] }))
      .then((json) => {
        const opts = json.options ?? [];
        setDatasetId(opts.find((o: { value: string }) => o.value === '00034025')?.value ?? opts[0]?.value ?? '');
      })
      .catch((e) => console.error('Failed to load dataset options:', e));
  }, []);

  return <ClusterMap datasetId={datasetId} initialLocations={initialLocations} />;
}
