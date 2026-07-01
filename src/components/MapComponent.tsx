'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Place } from '@/services/dataProvider';
import type { BBox, GridCell } from '@/types/location';

// Import Leaflet MarkerCluster plugin and styles
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MapComponentProps {
  locations: Place[];
  selectedLocationId: number | null;
  onSelectLocation: (id: number) => void;
  activeTileLayer: 'streets' | 'dark' | 'satellite';
  onMouseMove: (lat: number, lng: number) => void;
  flyToCoords: [number, number] | null;
  flyToZoom?: number;
  onFlyComplete: () => void;
  // H3 aggregate count bubbles (zoomed-out view); empty in detail view.
  aggregateCells?: GridCell[];
  // Fired (current viewport bbox + zoom) on moveend/zoomend and once after init.
  onViewportChange?: (bbox: BBox, zoom: number) => void;
}

const tileLayerUrls = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

// Display labels for place categories (Traditional Chinese)
const categoryLabels: { [key: string]: string } = {
  nature: '自然',
  culture: '文化',
  nightmarket: '夜市',
  smoking: '吸菸區',
};

const tileLayerAttributions = {
  streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
};

export default function MapComponent({
  locations,
  selectedLocationId,
  onSelectLocation,
  activeTileLayer,
  onMouseMove,
  flyToCoords,
  flyToZoom,
  onFlyComplete,
  aggregateCells = [],
  onViewportChange,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  const tileLayerInstanceRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const aggregateGroupRef = useRef<L.LayerGroup | null>(null);

  // Refs for callbacks so the init effect doesn't need to re-run when they change.
  const onMouseMoveRef = useRef(onMouseMove);
  useEffect(() => {
    onMouseMoveRef.current = onMouseMove;
  }, [onMouseMove]);

  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  // 1. Initialize Map (Only runs once on mount)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Center of Taiwan
    const centerOfTaiwan: [number, number] = [23.6978, 120.9605];

    // Geographic bounds restricting the map to the Taiwan area (incl. Penghu & outlying padding)
    const taiwanBounds = L.latLngBounds(
      [21.3, 119.3], // Southwest corner
      [25.5, 122.2]  // Northeast corner
    );

    const mapInstance = L.map(mapRef.current, {
      center: centerOfTaiwan,
      zoom: 8, // Integer zoom for cleaner tile loading
      minZoom: 7, // Keep the view scoped to Taiwan; can't zoom out to the whole world
      maxZoom: 19, // Specify maxZoom to prevent Leaflet.markercluster "Map has no maxZoom specified" error
      zoomControl: true,
      maxBounds: taiwanBounds, // Lock panning to the Taiwan area
      maxBoundsViscosity: 1.0, // Make the bounds a solid wall
    });

    // Create and add Marker Cluster Group
    const markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45, // Grouping radius in pixels
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16, // Don't cluster when zoomed in deep
      chunkedLoading: true, // Add markers in chunks so a dense viewport doesn't block the main thread
    });
    mapInstance.addLayer(markerClusterGroup);
    markerClusterGroupRef.current = markerClusterGroup;

    mapInstanceRef.current = mapInstance;
    setMapInitialized(true);

    // Track mouse move for coordinates display
    mapInstance.on('mousemove', (e: L.LeafletMouseEvent) => {
      onMouseMoveRef.current(e.latlng.lat, e.latlng.lng);
    });

    // Report viewport changes so the page can load the matching H3 grid (debounced upstream).
    const fireViewport = () => {
      if (!mapInstanceRef.current) return;
      const b = mapInstance.getBounds();
      onViewportChangeRef.current?.(
        { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() },
        mapInstance.getZoom(),
      );
    };
    mapInstance.on('moveend', fireViewport);
    mapInstance.on('zoomend', fireViewport);

    // Invalidate size after layout pass to handle Next.js client-side rendering/hydration timing,
    // then fire the initial viewport load (bounds are correct only after sizing).
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        fireViewport();
      }
    }, 200);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Failed to cleanly remove map instance:', e);
        }
        mapInstanceRef.current = null;
      }
      setMapInitialized(false);
      markersRef.current = {};
      tileLayerInstanceRef.current = null;
      markerClusterGroupRef.current = null;
      aggregateGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Handle Tile Layer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    try {
      if (!map.getContainer()) return;
    } catch (e) {
      return;
    }

    if (tileLayerInstanceRef.current) {
      try {
        if (map.hasLayer(tileLayerInstanceRef.current)) {
          map.removeLayer(tileLayerInstanceRef.current);
        }
      } catch (e) {
        console.warn('Failed to remove existing tile layer:', e);
      }
    }

    const newLayer = L.tileLayer(tileLayerUrls[activeTileLayer], {
      attribution: tileLayerAttributions[activeTileLayer],
      maxZoom: 20,
    });

    try {
      newLayer.addTo(map);
      tileLayerInstanceRef.current = newLayer;
    } catch (e) {
      console.error('Failed to add tile layer:', e);
    }

    return () => {
      if (newLayer) {
        try {
          if (mapInstanceRef.current && mapInstanceRef.current.hasLayer(newLayer)) {
            mapInstanceRef.current.removeLayer(newLayer);
          }
        } catch (e) {
          console.warn('Failed to cleanly remove tile layer on cleanup:', e);
        }
      }
    };
  }, [mapInitialized, activeTileLayer]);

  // 3a. Synchronize markers with the locations list
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    try {
      if (!map.getContainer()) return;
    } catch (e) {
      return;
    }

    // Close any active popups to prevent Leaflet errors if the marker is removed during transitions
    try {
      map.closePopup();
    } catch (e) {
      console.warn('Failed to close popup:', e);
    }

    // Force map to recalculate container size
    try {
      map.invalidateSize();
    } catch (e) {
      console.warn('Failed to invalidate map size:', e);
    }

    // Build a map of current locations for fast lookup
    const locMap = new Map(locations.map(loc => [loc.id, loc]));

    // Determine markers to remove (in bulk)
    const markersToRemove: L.Marker[] = [];
    Object.keys(markersRef.current).forEach((idStr) => {
      const id = Number(idStr);
      const marker = markersRef.current[id];
      if (marker && !locMap.has(id)) {
        try {
          marker.closePopup();
        } catch (e) {}
        markersToRemove.push(marker);
        delete markersRef.current[id];
      }
    });

    // Remove old layers from cluster group in bulk
    if (markersToRemove.length > 0 && markerClusterGroupRef.current) {
      try {
        markerClusterGroupRef.current.removeLayers(markersToRemove);
      } catch (e) {
        console.warn('Failed to bulk remove markers:', e);
      }
    }

    // Determine new markers to add (in bulk)
    const markersToAdd: L.Marker[] = [];
    locations.forEach((loc) => {
      if (markersRef.current[loc.id]) return; // Already exists

      let markerColor = '#3b82f6'; // Blue (Default)
      if (loc.category === 'nature') markerColor = '#10b981'; // Green
      if (loc.category === 'culture') markerColor = '#f59e0b'; // Amber
      if (loc.category === 'nightmarket') markerColor = '#ef4444'; // Red
      if (loc.category === 'smoking') markerColor = '#a855f7'; // Purple

      const size = 22;

      // Custom divIcon matching design system
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background: ${markerColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      try {
        const marker = L.marker(loc.coords, { icon: customIcon });

        // Simple HTML Popup
        const popupContent = document.createElement('div');
        popupContent.className = 'custom-popup-content';
        popupContent.innerHTML = `
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #f8fafc;">${loc.title}</h4>
          <span style="font-size: 9px; color: ${markerColor}; font-weight: 800; display: inline-block; padding: 1px 6px; background: ${markerColor}20; border: 1px solid ${markerColor}30; border-radius: 4px; margin: 3px 0 5px 0;">
            ${categoryLabels[loc.category] ?? loc.category}
          </span>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; line-height: 1.3;">
            ${loc.location}${loc.address ? ` · ${loc.address}` : ''}
          </p>
        `;

        const viewDetailsLink = document.createElement('a');
        viewDetailsLink.className = 'custom-popup-link';
        viewDetailsLink.innerText = '查看詳情';
        viewDetailsLink.addEventListener('click', (e) => {
          e.preventDefault();
          onSelectLocation(loc.id);
          try {
            marker.closePopup();
          } catch (err) {
            console.warn('Failed to close marker popup:', err);
          }
        });

        popupContent.appendChild(viewDetailsLink);

        marker.bindPopup(popupContent, {
          closeButton: true,
          offset: L.point(0, -4),
        });

        marker.on('click', () => {
          onSelectLocation(loc.id);
        });

        markersRef.current[loc.id] = marker;
        markersToAdd.push(marker);
      } catch (e) {
        console.error('Failed to configure marker:', e);
      }
    });

    // Add new layers to cluster group in bulk
    if (markersToAdd.length > 0 && markerClusterGroupRef.current) {
      try {
        markerClusterGroupRef.current.addLayers(markersToAdd);
      } catch (e) {
        console.error('Failed to bulk add markers to cluster group:', e);
      }
    }
  }, [mapInitialized, locations, onSelectLocation]);

  // 3b. Update marker icons and handle cluster popups when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    try {
      if (!map.getContainer()) return;
    } catch (e) {
      return;
    }

    // 1. Update marker icons
    locations.forEach((loc) => {
      const marker = markersRef.current[loc.id];
      if (!marker) return;

      let markerColor = '#3b82f6'; // Blue (Default)
      if (loc.category === 'nature') markerColor = '#10b981'; // Green
      if (loc.category === 'culture') markerColor = '#f59e0b'; // Amber
      if (loc.category === 'nightmarket') markerColor = '#ef4444'; // Red
      if (loc.category === 'smoking') markerColor = '#a855f7'; // Purple

      const isSelected = selectedLocationId === loc.id;
      const size = isSelected ? 30 : 22;

      // Custom divIcon matching design system
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background: ${markerColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(${isSelected ? 1.25 : 1});
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      marker.setIcon(customIcon);

      // Bring selected marker to front
      if (isSelected) {
        marker.setZIndexOffset(1000);
      } else {
        marker.setZIndexOffset(0);
      }
    });

    // 2. If a marker is selected, zoom to show it (handles clustering) and open popup
    if (selectedLocationId && markersRef.current[selectedLocationId]) {
      const selectedMarker = markersRef.current[selectedLocationId];
      if (markerClusterGroupRef.current) {
        try {
          markerClusterGroupRef.current.zoomToShowLayer(selectedMarker, () => {
            if (mapInstanceRef.current && mapInitialized && markersRef.current[selectedLocationId]) {
              try {
                selectedMarker.openPopup();
              } catch (err) {
                console.warn('Failed to open popup in callback:', err);
              }
            }
          });
        } catch (e) {
          try {
            selectedMarker.openPopup();
          } catch (err) {}
        }
      }
    }
  }, [mapInitialized, locations, selectedLocationId]);

  // 4. Handle Programmatic Fly-To
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized || !flyToCoords) return;

    try {
      if (!map.getContainer()) return;
      const targetZoom = flyToZoom || 12;
      map.flyTo(flyToCoords, targetZoom, {
        animate: true,
        duration: 1.5,
      });
    } catch (e) {
      console.error('Failed to fly to coordinates:', e);
    }

    onFlyComplete();
  }, [mapInitialized, flyToCoords, flyToZoom, onFlyComplete]);

  // 5. Render H3 aggregate count bubbles (zoomed-out view). Tapping one zooms in,
  //    which crosses the detail threshold and switches to individual markers.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    let group = aggregateGroupRef.current;
    if (!group) {
      group = L.layerGroup().addTo(map);
      aggregateGroupRef.current = group;
    }
    const g = group;
    g.clearLayers();

    aggregateCells.forEach((cell) => {
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
      g.addLayer(marker);
    });
  }, [mapInitialized, aggregateCells]);

  return <div ref={mapRef} className="w-full h-full" />;
}
