'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  Tabs
} from '@heroui/react';
import { 
  MapPin, 
  Search, 
  Globe, 
  Trees, 
  Landmark, 
  Utensils, 
  X, 
  Locate, 
  Moon, 
  Map as MapIcon, 
  Satellite,
  Cigarette,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Place, COUNTIES, getPlacesByCounty } from '@/services/dataProvider';

// Dynamically import MapComponent to prevent SSR window reference errors
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
});

export default function Home() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [lastSelectedPlace, setLastSelectedPlace] = useState<Place | null>(null);
  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'dark' | 'satellite'>('streets');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [isTabsCollapsed, setIsTabsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number }>({ lat: 23.6978, lng: 120.9605 });
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number | null>(null);
  const [selectedCountyId, setSelectedCountyId] = useState<string>('all');
  const [isCountyDropdownOpen, setIsCountyDropdownOpen] = useState<boolean>(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState<boolean>(false);

  // Fetch dataset options from the generated mapping JSON
  const { data: datasetOptions = [] } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ['datasetOptions'],
    queryFn: async () => {
      try {
        const res = await fetch('/data-set-mapping.json');
        if (!res.ok) throw new Error('Failed to fetch dataset mapping');
        const json = await res.json();
        return json.options || [];
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  });

  // TanStack Query to manage/retrieve location list
  const { data: places = [] } = useQuery<Place[]>({
    queryKey: ['places', selectedCountyId, selectedDatasetId],
    queryFn: async () => {
      if (selectedCountyId === 'taipei' && selectedDatasetId) {
        try {
          const res = await fetch(`/taipei/data/${selectedDatasetId}.json`);
          if (!res.ok) {
            throw new Error(`Failed to fetch dataset ${selectedDatasetId}`);
          }
          const datasetJson = await res.json();
          return datasetJson.data || [];
        } catch (error) {
          console.error('Error loading dataset:', error);
          return [];
        }
      }
      return getPlacesByCounty(selectedCountyId);
    }
  });

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
  const natureCount = places.filter(p => p.category === 'nature').length;
  const cultureCount = places.filter(p => p.category === 'culture').length;
  const marketCount = places.filter(p => p.category === 'nightmarket').length;
  const smokingCount = places.filter(p => p.category === 'smoking').length;

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

  const handleFlyToCity = (countyId: string) => {
    const county = COUNTIES.find(c => c.id === countyId);
    if (county) {
      setSelectedCountyId(countyId);
      setSelectedDatasetId('');
      setFlyToCoords(county.center);
      setFlyToZoom(county.zoom);
      setSelectedLocationId(null);
    }
  };

  const handleCountyChange = (countyId: string) => {
    setSelectedCountyId(countyId);
    setSelectedDatasetId('');
    setIsCountyDropdownOpen(false);
    setIsDatasetDropdownOpen(false);
    
    const county = COUNTIES.find(c => c.id === countyId);
    if (county) {
      setFlyToCoords(county.center);
      setFlyToZoom(county.zoom);
    }
    setSelectedLocationId(null);
  };

  const handleDatasetChange = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setIsDatasetDropdownOpen(false);
    setSelectedLocationId(null);
    
    // Auto-fly to Taipei center when switching datasets to let the user see the new pins
    const taipeiCounty = COUNTIES.find(c => c.id === 'taipei');
    if (taipeiCounty) {
      setFlyToCoords(taipeiCounty.center);
      setFlyToZoom(taipeiCounty.zoom);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080c14] text-slate-100">
      {/* Sidebar */}
      <aside className="w-[380px] bg-[#0c1322] border-r border-slate-800 flex flex-col z-10 shadow-2xl shrink-0 h-full">
        {/* Header */}
        <header className="p-6 border-b border-slate-800 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              TW Map Explorer
            </h1>
            <p className="text-xs text-slate-400 font-medium">Taiwan Interactive Geographic Hub</p>
          </div>
        </header>

        {/* County / City Selector */}
        <section className="px-6 pt-4 pb-0 shrink-0">
          <div className="relative">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 px-0.5">
              Select Region / 選擇縣市
            </span>
            
            {/* Dropdown Button */}
            <button
              onClick={() => setIsCountyDropdownOpen(!isCountyDropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-900/55 hover:bg-slate-900/85 border border-slate-800/85 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer outline-none text-slate-200"
            >
              <div className="flex items-center gap-2">
                {selectedCountyId === 'all' ? (
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>
                  {COUNTIES.find(c => c.id === selectedCountyId)?.name}
                  <span className="text-slate-500 font-normal ml-1.5">
                    {COUNTIES.find(c => c.id === selectedCountyId)?.chineseName}
                  </span>
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
                      className={`w-full flex flex-col items-start px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        selectedCountyId === county.id
                          ? 'bg-blue-600/15 text-blue-400 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-[11px]">
                          {county.name}
                          <span className="text-[10px] text-slate-500 font-normal ml-2">{county.chineseName}</span>
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

          {/* Dataset Selector (Only for Taipei City) */}
          {selectedCountyId === 'taipei' && (
            <div className="relative mt-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 px-0.5">
                Select Dataset / 選擇資料集
              </span>
              
              {/* Dropdown Button */}
              <button
                onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-900/55 hover:bg-slate-900/85 border border-slate-800/85 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer outline-none text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <MapIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="line-clamp-1 max-w-[240px]">
                    {selectedDatasetId 
                      ? datasetOptions.find(opt => opt.value === selectedDatasetId)?.label 
                      : '預設景點與指定吸菸區'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDatasetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDatasetDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown on click outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDatasetDropdownOpen(false)}
                  />
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#0e1726]/95 border border-slate-850 rounded-xl shadow-xl max-h-[220px] overflow-y-auto p-1.5 flex flex-col gap-0.5 backdrop-blur-md animate-in fade-in-50 duration-150">
                    {/* Default Option */}
                    <button
                      onClick={() => handleDatasetChange('')}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                        !selectedDatasetId
                          ? 'bg-blue-600/15 text-blue-400 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">預設景點與指定吸菸區</span>
                      {!selectedDatasetId && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </button>
                    
                    {/* Mapping Options */}
                    {datasetOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleDatasetChange(option.value)}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                          selectedDatasetId === option.value
                            ? 'bg-blue-600/15 text-blue-400 font-bold'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                        }`}
                      >
                        <span className="text-[11px] font-semibold line-clamp-1 max-w-[240px]">{option.label}</span>
                        {selectedDatasetId === option.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Search */}
        <section className="px-6 py-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search cities, attractions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-slate-900/50 border border-slate-800/80 hover:bg-slate-900/80 focus:border-blue-500 outline-none transition-colors rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500"
            />
          </div>
        </section>

        {/* Categories Tabs */}
        <section className="px-6 pb-2 flex flex-col gap-1.5 shrink-0">
          <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-bold px-0.5">
            <span>Filter categories</span>
            <button 
              onClick={() => setIsTabsCollapsed(!isTabsCollapsed)}
              className="p-1 rounded hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer outline-none flex items-center gap-1 text-[9px] uppercase tracking-normal"
            >
              {isTabsCollapsed ? (
                <>
                  <span className="text-blue-400 font-semibold">{currentFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isTabsCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[200px] opacity-100'
          }`}>
            <Tabs 
              selectedKey={currentFilter} 
              onSelectionChange={(key) => setCurrentFilter(key as string)}
              className="w-full"
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Filter places" className="flex flex-wrap gap-1 border-b border-slate-800 pb-1.5 w-full">
                  <Tabs.Tab id="all" className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold cursor-pointer data-[selected=true]:text-blue-400 text-slate-400">
                    <Globe className="w-3 h-3" />
                    <span>All</span>
                    <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded-full font-bold">{totalCount}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="nature" className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold cursor-pointer data-[selected=true]:text-emerald-400 text-slate-400">
                    <Trees className="w-3 h-3" />
                    <span>Nature</span>
                    <span className="text-[8px] bg-emerald-950/40 text-emerald-400 px-1 py-0.2 rounded-full font-bold">{natureCount}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="culture" className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold cursor-pointer data-[selected=true]:text-amber-400 text-slate-400">
                    <Landmark className="w-3 h-3" />
                    <span>Culture</span>
                    <span className="text-[8px] bg-amber-950/40 text-amber-400 px-1 py-0.2 rounded-full font-bold">{cultureCount}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="nightmarket" className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold cursor-pointer data-[selected=true]:text-red-400 text-slate-400">
                    <Utensils className="w-3 h-3" />
                    <span>Markets</span>
                    <span className="text-[8px] bg-red-950/40 text-red-400 px-1 py-0.2 rounded-full font-bold">{marketCount}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="smoking" className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold cursor-pointer data-[selected=true]:text-purple-400 text-slate-400">
                    <Cigarette className="w-3 h-3" />
                    <span>Smoking</span>
                    <span className="text-[8px] bg-purple-950/40 text-purple-400 px-1 py-0.2 rounded-full font-bold">{smokingCount}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>
        </section>

        {/* Scrollable Places List */}
        <section className="flex-grow overflow-y-auto px-6 py-2 flex flex-col gap-2">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No locations found.</div>
          ) : (
            filteredPlaces.map(place => (
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
                    {place.category === 'nightmarket' ? 'Market' : place.category === 'smoking' ? 'Smoking' : place.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="line-clamp-1">
                    {place.location}{place.address ? ` · ${place.address}` : ''}
                  </span>
                </p>
              </div>
            ))
          )}
        </section>



        {/* Footer info & Mouse coordinates */}
        <footer className="p-6 border-t border-slate-800">
          <Card className="bg-slate-950/60 border border-slate-800/80 shadow-md">
            <Card.Content className="p-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-0.5">Map Center</span>
                  <span className="font-semibold text-slate-300">
                    {mouseCoords.lat.toFixed(4)}° N, {mouseCoords.lng.toFixed(4)}° E
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-0.5">Active Spots</span>
                  <span className="font-semibold text-slate-300">
                    {activeCount} / {totalCount}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
          <p className="text-[10px] text-slate-500 text-center mt-3">&copy; 2026 TW Map Explorer. Built on Next.js 15.</p>
        </footer>
      </aside>

      {/* Details Panel (Slides out to the right of the sidebar) */}
      <section 
        className={`w-[360px] bg-[#090f1b] border-r border-slate-800/80 flex flex-col z-10 shadow-xl shrink-0 h-full transition-all duration-300 ease-in-out relative ${
          selectedLocationId ? 'translate-x-0 opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ marginLeft: selectedLocationId ? '0' : '-360px' }}
      >
        {lastSelectedPlace && (
          <>
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
                  {lastSelectedPlace.category === 'nightmarket' ? 'Night Market' : lastSelectedPlace.category === 'smoking' ? 'Smoking Area' : lastSelectedPlace.category}
                </span>
              </div>
            </div>

            {/* Scrollable details content */}
            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
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
                <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">About this spot</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/20 p-3 rounded-xl border border-slate-900/40">
                  {lastSelectedPlace.description}
                </p>
              </div>

              {lastSelectedPlace.category === 'smoking' && (
                <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-3">
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Details</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {lastSelectedPlace.layoutType && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">樣態 / Type</span>
                        <span className="text-xs font-semibold text-slate-300">{lastSelectedPlace.layoutType}</span>
                      </div>
                    )}
                    {lastSelectedPlace.hours && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">開放時間 / Hours</span>
                        <span className="text-xs font-semibold text-slate-300">{lastSelectedPlace.hours}</span>
                      </div>
                    )}
                    {lastSelectedPlace.management && (
                      <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-900/60 flex flex-col gap-0.5">
                        <span className="text-slate-500 text-[9px] uppercase font-bold">管理單位 / Management</span>
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

            {/* Sticky Action Button at the bottom */}
            <div className="p-6 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
              <button
                onClick={() => {
                  setFlyToCoords(lastSelectedPlace.coords);
                  setFlyToZoom(15);
                }}
                className="w-full text-xs font-semibold py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-98 transition-all text-white shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Locate className="w-4 h-4" />
                Fly to Spot
              </button>
            </div>
          </>
        )}
      </section>

      {/* Map Viewport */}
      <main className="flex-grow h-full relative">
        <MapComponent
          locations={filteredPlaces}
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
        <div className="absolute top-5 right-5 z-[1000] flex flex-col gap-3">
          {/* Layer switcher */}
          {/* Layer switcher */}
          <div className="flex shadow-lg border border-slate-800 bg-[#0f172a]/95 rounded-xl p-0.5 gap-0.5">
            <button
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                activeTileLayer === 'streets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('streets')}
              title="Streets Layer"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                activeTileLayer === 'dark'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('dark')}
              title="Dark Mode Layer"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              className={`p-2 rounded-lg transition-colors cursor-pointer outline-none ${
                activeTileLayer === 'satellite'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => setActiveTileLayer('satellite')}
              title="Satellite Layer"
            >
              <Satellite className="w-4 h-4" />
            </button>
          </div>

          {/* Quick city coordinates fly-to shortcuts */}
          <div className="flex flex-col shadow-lg border border-slate-800 bg-[#0f172a]/95 rounded-xl p-0.5 gap-0.5">
            <button
              className="text-[10px] font-bold text-slate-300 min-w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer outline-none"
              onClick={() => handleFlyToCity('taipei')}
              title="Fly to Taipei"
            >
              TPE
            </button>
            <button
              className="text-[10px] font-bold text-slate-300 min-w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer outline-none"
              onClick={() => handleFlyToCity('taichung')}
              title="Fly to Taichung"
            >
              TXG
            </button>
            <button
              className="text-[10px] font-bold text-slate-300 min-w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer outline-none"
              onClick={() => handleFlyToCity('kaohsiung')}
              title="Fly to Kaohsiung"
            >
              KHH
            </button>
            <button
              className="text-[10px] font-bold text-slate-300 min-w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer outline-none"
              onClick={() => handleFlyToCity('hualien')}
              title="Fly to Hualien"
            >
              HUN
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
