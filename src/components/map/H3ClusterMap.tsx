'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '@/types/location';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { MarkerCluster } from './MarkerCluster';
import { AggregateLayer } from './AggregateLayer';
import { H3Loader } from './H3Loader';
import type { GridResult } from '@/services/gridProvider';

export default function H3ClusterMap({ datasetId = '', initialLocations }: { datasetId?: string; initialLocations: Location[] }) {
  // Seed with build-time hydration data for instant first paint; H3Loader then queries Firestore.
  const [grid, setGrid] = useState<GridResult>({ mode: 'detail', points: initialLocations });
  const handleLoaded = useCallback((result: GridResult) => setGrid(result), []);

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

      {/* Detail (res 9) → clustered markers · Aggregate (res 7) → count bubbles */}
      {grid.mode === 'detail' ? (
        <MarkerCluster locations={grid.points} />
      ) : (
        <AggregateLayer cells={grid.cells} />
      )}

      {/* Firestore-backed H3 loader (mirrors BBoxLoader) */}
      <H3Loader datasetId={datasetId} onLoaded={handleLoaded} />
    </MapContainer>
  );
}
