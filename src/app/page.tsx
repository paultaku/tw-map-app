'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Card
} from '@heroui/react';
import {
  MapPin,
  Search,
  Globe,
  X,
  Locate,
  Moon,
  Map as MapIcon,
  Satellite,
  Cigarette,
  ChevronDown
} from 'lucide-react';
import { Place, COUNTIES } from '@/services/dataProvider';
import { fetchGridPlaces } from '@/services/gridProvider';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { BBox, GridCell } from '@/types/location';

// Dynamically import MapComponent to prevent SSR window reference errors
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
});

// Display labels for place categories (kept centralised for future tag/category features)
const CATEGORY_LABELS: Record<string, string> = {
  nature: '自然',
  culture: '文化',
  nightmarket: '夜市',
  smoking: '吸菸區',
};

const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] ?? category;

// Cap how many cards the sidebar renders. The map still shows every point (clustered);
// this only bounds DOM size so a dense viewport (thousands of points) doesn't jank the list.
const LIST_RENDER_CAP = 300;

// Build a Google Maps link for a place — prefer address (better label), fall back to coordinates.
const getGoogleMapsUrl = (place: Place) => {
  const [lat, lng] = place.coords;
  const query = place.address
    ? `${place.location ?? ''} ${place.address}`.trim()
    : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export default function Home() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [lastSelectedPlace, setLastSelectedPlace] = useState<Place | null>(null);
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'dark' | 'satellite'>('streets');
  // Category filter retained for future tag/category UI; filtering logic below still honours it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Mobile only: bottom sheet expanded (full list) vs peek (search + selector)
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number }>({ lat: 23.6978, lng: 120.9605 });
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number | null>(null);
  const [selectedCountyId, setSelectedCountyId] = useState<string>('all');
  const [isCountyDropdownOpen, setIsCountyDropdownOpen] = useState<boolean>(false);

  // Viewport-driven H3 data source (dev: static public/h3/*, prod: Firestore).
  // Detail (zoomed-in) → individual places; aggregate (zoomed-out) → count bubbles.
  const [places, setPlaces] = useState<Place[]>([]);
  const [aggregateCells, setAggregateCells] = useState<GridCell[]>([]);

  // Drop out-of-order responses when the user keeps panning/zooming.
  const reqIdRef = useRef(0);
  const loadViewport = async (bbox: BBox, zoom: number) => {
    const mine = ++reqIdRef.current;
    try {
      const result = await fetchGridPlaces(bbox, zoom);
      if (mine !== reqIdRef.current) return;
      if (result.mode === 'detail') {
        setPlaces(result.places);
        setAggregateCells([]);
      } else {
        setPlaces([]);
        setAggregateCells(result.cells);
      }
    } catch (e) {
      console.error('Viewport grid load failed:', e);
    }
  };
  // Debounce so continuous drag/zoom only triggers one load after it settles.
  const handleViewportChange = useDebouncedCallback(
    (bbox: BBox, zoom: number) => loadViewport(bbox, zoom),
    300,
  );

  // Total points represented by the current aggregate view (for list/handle copy).
  const aggregateTotal = aggregateCells.reduce((sum, c) => sum + c.count, 0);
  const inAggregate = aggregateCells.length > 0 && places.length === 0;

  // Sync lastSelectedPlace with selectedPlace to persist it during slide-out transition
  useEffect(() => {
    const found = places.find(p => p.id === selectedLocationId);
    if (found) {
      setLastSelectedPlace(found);
    }
  }, [selectedLocationId, places]);

  // Calculate dynamic stats
  const activeCount = places.filter(p => {
    const matchesCategory = currentFilter === 'all' || p.category === currentFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).length;

  const totalCount = places.length;

  // Filtered List
  const filteredPlaces = places.filter(p => {
    const matchesCategory = currentFilter === 'all' || p.category === currentFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedPlace = places.find(p => p.id === selectedLocationId);

  const handleSelectLocation = (id: number) => {
    setSelectedLocationId(id);
    const loc = places.find(p => p.id === id);
    if (loc) {
      setFlyToCoords(loc.coords);
      setFlyToZoom(15);
    }
  };

  const handleCountyChange = (countyId: string) => {
    setSelectedCountyId(countyId);
    setIsCountyDropdownOpen(false);

    // County selector now just flies the map there; data follows the viewport (H3).
    const county = COUNTIES.find(c => c.id === countyId);
    if (county) {
      setFlyToCoords(county.center);
      setFlyToZoom(county.zoom);
    }
    setSelectedLocationId(null);
  };

  return (
    <div className="relative md:flex h-dvh w-full overflow-hidden bg-[#080c14] text-slate-100">
      {/* Sidebar — desktop: left column / mobile: bottom sheet */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-slate-800 bg-[#0c1322] shadow-2xl transition-[height] duration-300 ease-out ${
          isSheetExpanded ? 'h-[85dvh]' : 'h-[42dvh]'
        } md:static md:h-full md:w-[380px] md:rounded-none md:border-t-0 md:border-r md:shadow-2xl md:shrink-0 md:z-10`}
      >
        {/* Mobile drag handle (toggles the bottom sheet) */}
        <button
          type="button"
          onClick={() => setIsSheetExpanded(v => !v)}
          aria-label={isSheetExpanded ? '收合面板' : '展開面板'}
          aria-expanded={isSheetExpanded}
          className="md:hidden flex flex-col items-center gap-1 w-full pt-2.5 pb-2 shrink-0 cursor-pointer touch-manipulation border-b border-slate-800/60 active:bg-slate-800/30 transition-colors"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-600" />
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSheetExpanded ? '' : 'rotate-180'}`} />
            {isSheetExpanded
              ? '收合清單'
              : inAggregate
                ? `此範圍約 ${aggregateTotal} 個地點 · 放大查看`
                : `${filteredPlaces.length} 個地點 · 點此展開`}
          </span>
        </button>

        {/* Header */}
        <header className="hidden md:flex p-6 border-b border-slate-800 items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              台灣地圖探索家
            </h1>
            <p className="text-xs text-slate-400 font-medium">台灣互動式地理資訊中心</p>
          </div>
        </header>

        {/* County / City Selector */}
        <section className="px-6 pt-4 pb-0 shrink-0">
          <div className="relative">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 px-0.5">
              選擇縣市
            </span>

            {/* Dropdown Button */}
            <button
              onClick={() => setIsCountyDropdownOpen(!isCountyDropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-900/55 hover:bg-slate-900/85 border border-slate-800/85 focus:border-blue-500 rounded-xl px-4 py-3 md:py-2.5 text-xs font-semibold transition-all cursor-pointer outline-none text-slate-200"
            >
              <div className="flex items-center gap-2">
                {selectedCountyId === 'all' ? (
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>
                  {COUNTIES.find(c => c.id === selectedCountyId)?.name}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCountyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isCountyDropdownOpen && (
              <>
                {/* Backdrop to close dropdown on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCountyDropdownOpen(false)}
                />
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#0e1726]/95 border border-slate-850 rounded-xl shadow-xl max-h-[260px] overflow-y-auto p-1.5 flex flex-col gap-0.5 backdrop-blur-md">
                  {COUNTIES.map(county => (
                    <button
                      key={county.id}
                      onClick={() => handleCountyChange(county.id)}
                      className={`w-full flex flex-col items-start px-3 py-2.5 md:py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        selectedCountyId === county.id
                          ? 'bg-blue-600/15 text-blue-400 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-[11px]">
                          {county.name}
                        </span>
                        {selectedCountyId === county.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-505 line-clamp-1 mt-0.5 font-normal leading-normal">{county.description}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Search */}
        <section className="px-6 py-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜尋縣市、景點…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-base md:text-sm bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900/80 focus:border-blue-500 outline-none transition-colors rounded-xl py-3 md:py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500"
            />
          </div>
        </section>

        {/* Scrollable Places List */}
        <section className="flex-grow overflow-y-auto overscroll-contain px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {inAggregate
                ? `此範圍約有 ${aggregateTotal} 個地點，放大地圖以檢視清單。`
                : '找不到地點。'}
            </div>
          ) : (
            <>
            {filteredPlaces.slice(0, LIST_RENDER_CAP).map(place => (
              <div
                key={place.id}
                onClick={() => handleSelectLocation(place.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                  selectedLocationId === place.id
                    ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5'
                    : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-900/50 hover:border-slate-700/60'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm text-slate-200 line-clamp-1">{place.title}</h3>
                  <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    place.category === 'nature' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/30' :
                    place.category === 'culture' ? 'bg-amber-950/30 text-amber-400 border border-amber-800/30' :
                    place.category === 'smoking' ? 'bg-purple-950/30 text-purple-400 border border-purple-800/30' :
                    'bg-red-950/30 text-red-400 border border-red-800/30'
                  }`}>
                    {getCategoryLabel(place.category)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="line-clamp-1">
                    {place.location}{place.address ? ` · ${place.address}` : ''}
                  </span>
                </p>
              </div>
            ))}
            {filteredPlaces.length > LIST_RENDER_CAP && (
              <div className="text-center py-3 text-[11px] text-slate-500">
                顯示前 {LIST_RENDER_CAP} / {filteredPlaces.length} 筆，請放大地圖或使用搜尋縮小範圍。
              </div>
            )}
            </>
          )}
        </section>



        {/* Footer info & Mouse coordinates (desktop only) */}
        <footer className="hidden md:block p-6 border-t border-slate-800">
          <Card className="bg-slate-950/60 border border-slate-800/80 shadow-md">
            <Card.Content className="p-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-0.5">地圖中心</span>
                  <span className="font-semibold text-slate-300">
                    北緯 {mouseCoords.lat.toFixed(4)}°, 東經 {mouseCoords.lng.toFixed(4)}°
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-0.5">顯示中地點</span>
                  <span className="font-semibold text-slate-300">
                    {inAggregate ? `約 ${aggregateTotal}` : `${activeCount} / ${totalCount}`}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
          <p className="text-[10px] text-slate-500 text-center mt-3">&copy; 2026 台灣地圖探索家。以 Next.js 15 打造。</p>
        </footer>
      </aside>

      {/* Details Panel (Slides out to the right of the sidebar) */}
      <section
        className={`fixed inset-x-0 bottom-0 z-40 h-[88dvh] rounded-t-2xl border-t border-slate-800/80 bg-[#090f1b] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-in-out md:static md:inset-auto md:h-full md:w-[360px] md:rounded-none md:border-t-0 md:border-r md:shadow-xl md:shrink-0 md:z-10 ${
          selectedLocationId
            ? 'translate-y-0 opacity-100 md:translate-y-0 md:ml-0'
            : 'translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:-ml-[360px]'
        }`}
      >
        {lastSelectedPlace && (
          <>
            {/* Mobile grabber (tap to close) */}
            <button
              type="button"
              onClick={() => setSelectedLocationId(null)}
              aria-label="關閉詳情"
              className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center min-h-11 w-20 touch-manipulation"
            >
              <span className="h-1.5 w-10 rounded-full bg-white/70 shadow" />
            </button>

            {/* Image Banner / Placeholder */}
            <div className="relative w-full h-48 shrink-0 overflow-hidden bg-slate-950">
              {lastSelectedPlace.image ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${lastSelectedPlace.image})` }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-950/50 to-slate-900 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none"></div>
                  <Cigarette className="w-12 h-12 text-purple-400/50 animate-pulse" />
                </div>
              )}
              {/* Close Button overlay */}
              <button
                onClick={() => setSelectedLocationId(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-slate-950/60 text-slate-400 hover:bg-slate-900 hover:text-white hover:scale-105 transition-all z-20 shadow-md backdrop-blur-sm cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Category tag overlay */}
              <div className="absolute left-4 bottom-4 z-10">
                <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md shadow-md ${
                  lastSelectedPlace.category === 'nature' ? 'bg-emerald-500/90 text-white' :
                  lastSelectedPlace.category === 'culture' ? 'bg-amber-500/90 text-slate-950' :
                  lastSelectedPlace.category === 'smoking' ? 'bg-purple-600/90 text-white' :
                  'bg-red-500/90 text-white'
                }`}>
                  {getCategoryLabel(lastSelectedPlace.category)}
                </span>
              </div>
            </div>

            {/* Scrollable details content */}
            <div className="flex-grow overflow-y-auto overscroll-contain p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className="font-display font-bold text-xl text-slate-100 tracking-tight leading-snug">
                  {lastSelectedPlace.title}
                </h2>
                <p className="text-xs text-slate-400 flex items-start gap-1.5 font-medium leading-relaxed">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    {lastSelectedPlace.location}
                    {lastSelectedPlace.address && (
                      <>
                        <br />
                        <span className="text-[11px] text-slate-500 font-normal">{lastSelectedPlace.address}</span>
                      </>
                    )}
                  </span>
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-3">
                <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">關於此地點</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/20 p-3 rounded-xl border border-slate-900/40">
                  {lastSelectedPlace.description}
                </p>
              </div>

              {lastSelectedPlace.category === 'smoking' && (
                <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-3">
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">詳細資訊</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {lastSelectedPlace.layoutType && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">樣態</span>
                        <span className="text-xs font-semibold text-slate-300">{lastSelectedPlace.layoutType}</span>
                      </div>
                    )}
                    {lastSelectedPlace.hours && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">開放時間</span>
                        <span className="text-xs font-semibold text-slate-300">{lastSelectedPlace.hours}</span>
                      </div>
                    )}
                    {lastSelectedPlace.management && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">管理單位</span>
                        <span className="text-xs font-semibold text-slate-300">
                          {lastSelectedPlace.management}
                        </span>
                        {lastSelectedPlace.phone && (
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            聯絡電話: {lastSelectedPlace.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Buttons at the bottom */}
            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-slate-800/80 bg-slate-950/40 shrink-0 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setFlyToCoords(lastSelectedPlace.coords);
                  setFlyToZoom(15);
                }}
                className="w-full text-xs font-semibold py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-98 transition-all text-white shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Locate className="w-4 h-4" />
                前往
              </button>
              <a
                href={getGoogleMapsUrl(lastSelectedPlace)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-xs font-semibold py-3 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 active:scale-98 transition-all text-slate-200 flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <MapPin className="w-4 h-4" />
                從 Google Map 開啟
              </a>
            </div>
          </>
        )}
      </section>

      {/* Map Viewport — mobile: full-screen base layer / desktop: flex column.
          `isolate` traps Leaflet's internal z-indexes (tiles 200, markers 600, controls 1000)
          inside this element so they can't paint over the bottom sheets (z-30 / z-40). */}
      <main className="absolute inset-0 isolate h-full w-full md:relative md:inset-auto md:flex-grow md:h-full">
        <MapComponent
          locations={filteredPlaces}
          aggregateCells={aggregateCells}
          onViewportChange={handleViewportChange}
          selectedLocationId={selectedLocationId}
          onSelectLocation={handleSelectLocation}
          activeTileLayer={activeTileLayer}
          onMouseMove={(lat, lng) => setMouseCoords({ lat, lng })}
          flyToCoords={flyToCoords}
          flyToZoom={flyToZoom ?? undefined}
          onFlyComplete={() => {
            setFlyToCoords(null);
            setFlyToZoom(null);
          }}
        />

        {/* Map Float Controls */}
        <div className={`absolute right-4 top-[max(1rem,env(safe-area-inset-top))] md:right-5 md:top-5 z-[1000] flex-col gap-3 ${(selectedLocationId || isSheetExpanded) ? 'hidden md:flex' : 'flex'}`}>
          {/* Layer switcher */}
          <div className="flex shadow-lg border border-slate-800 bg-[#0f172a]/95 rounded-xl p-0.5 gap-1">
            <button
              className={`p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer outline-none touch-manipulation ${
                activeTileLayer === 'streets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('streets')}
              title="街道圖層"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              className={`p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer outline-none touch-manipulation ${
                activeTileLayer === 'dark'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('dark')}
              title="深色圖層"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              className={`p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg transition-colors cursor-pointer outline-none touch-manipulation ${
                activeTileLayer === 'satellite'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('satellite')}
              title="衛星圖層"
            >
              <Satellite className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
