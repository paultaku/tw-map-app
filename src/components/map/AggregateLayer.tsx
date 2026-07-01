'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GridCell } from '@/types/location';

// Renders one count "bubble" per H3 cell (aggregate / zoomed-out view).
// Tapping a bubble zooms in, which crosses the detail threshold and switches to real points.
export function AggregateLayer({ cells }: { cells: GridCell[] }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const group = L.layerGroup();
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const cell of cells) {
      const size = cell.count >= 100 ? 56 : cell.count >= 20 ? 46 : 38;
      const icon = L.divIcon({
        className: 'h3-aggregate-bubble',
        html: `<div style="
          width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
          border-radius:9999px;background:rgba(37,99,235,0.85);color:#fff;font-weight:700;
          font-size:${cell.count >= 100 ? 13 : 12}px;border:3px solid rgba(255,255,255,0.85);
          box-shadow:0 4px 12px rgba(0,0,0,0.45);">${cell.count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([cell.center.lat, cell.center.lng], { icon });
      marker.on('click', () => {
        map.flyTo([cell.center.lat, cell.center.lng], Math.min(map.getZoom() + 3, 18));
      });
      group.addLayer(marker);
    }
  }, [cells, map]);

  return null;
}
