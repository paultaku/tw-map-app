'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { fetchGrid, type GridResult } from '@/services/gridProvider';

// Mirrors BBoxLoader, but the data source is Firestore H3 grids instead of a static JSON file.
// On move/zoom (debounced 300ms) it queries the resolution-appropriate grid for the viewport:
//   low zoom  → grids_r7 (aggregate count bubbles)
//   high zoom → grids_r9 (detail points)
export function H3Loader({ onLoaded }: { onLoaded: (result: GridResult) => void }) {
  const map = useMap();
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Monotonic request id: when the user keeps moving, drop responses that arrive out of order.
  const reqId = useRef(0);

  const load = async () => {
    const b = map.getBounds();
    const bbox = {
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    };
    const mine = ++reqId.current;
    try {
      const result = await fetchGrid(bbox, map.getZoom());
      if (mine === reqId.current) onLoadedRef.current(result);
    } catch (e) {
      console.error('H3 grid load failed:', e);
    }
  };

  const debouncedLoad = useDebouncedCallback(load, 300);

  // Initial load on mount (queries Firestore for the starting viewport).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMapEvents({
    moveend: () => debouncedLoad(),
    zoomend: () => debouncedLoad(),
  });

  return null;
}
