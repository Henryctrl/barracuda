'use client';

import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { PropertyProspect, STATUS_CONFIG, ProspectionFilters, ProspectionStatus } from '../types';
import { MapPin, Navigation, X, Search, ListPlus, User } from 'lucide-react';
import ProspectDetailModal from './ProspectDetailModal';

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; housenumber?: string; postcode?: string; city?: string };
}

interface ProspectionMapProps {
  prospects: PropertyProspect[];
  onProspectClick: (prospect: PropertyProspect) => void;
  onProspectUpdate: (id: string, updates: Partial<PropertyProspect>) => void;
  filters: ProspectionFilters;
  onFiltersChange: (filters: ProspectionFilters) => void;
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}

export default function ProspectionMap({
  prospects,
  onProspectClick,
  onProspectUpdate,
  filters,
  onFiltersChange,
  selectedIds,
  onSelectedIdsChange
}: ProspectionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const markers = useRef<maptilersdk.Marker[]>([]);
  const [mapStyle, setMapStyle] = useState('basic-v2');
  const [selectedProspect, setSelectedProspect] = useState<PropertyProspect | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [isSettingCenter, setIsSettingCenter] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showBatchAddedBy, setShowBatchAddedBy] = useState(false);
  const [showHitListModal, setShowHitListModal] = useState(false);
  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [0.4814265343726416, 44.85287567420269],
      zoom: 10,
      attributionControl: false
    });

    map.current = newMap;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const styleUrl = mapStyle === 'basic-v2' 
      ? maptilersdk.MapStyle.BASIC 
      : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(styleUrl);
  }, [mapStyle]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectedIdsChange(newSelected);
  };

  useEffect(() => {
    if (!map.current) return;

    // Add pulse animation CSS if not exists
    if (!document.getElementById('marker-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'marker-pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    prospects.forEach(prospect => {
      if (!prospect.latitude || !prospect.longitude) return;
    
      const isSelected = selectedIds.has(prospect.id);
    
      // Create marker element - NO POSITION STYLE!
      const el = document.createElement('div');
      el.className = 'prospect-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = isSelected ? '3px solid #ff00ff' : '2px solid white';
      el.style.backgroundColor = STATUS_CONFIG[prospect.status].dotColor;
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 10px ${STATUS_CONFIG[prospect.status].dotColor}`;
      // DO NOT SET POSITION HERE!
    
      // Add pulsing ring for selected
      if (isSelected) {
        const pulseRing = document.createElement('div');
pulseRing.style.cssText = `
  position: absolute;
  top: -8px;
  left: -8px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #ff00ff;
  animation: pulse 1.5s ease-in-out infinite;
  pointer-events: none;
`;

        el.appendChild(pulseRing);
    
        // Add checkmark
        const checkmark = document.createElement('div');
        checkmark.innerHTML = '✓';
        checkmark.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          font-size: 12px;
          text-shadow: 0 0 3px rgba(0,0,0,0.8);
          pointer-events: none;
        `;
        el.appendChild(checkmark);
      }
    
      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat([prospect.longitude, prospect.latitude])
        .addTo(map.current!);
    
      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSelect(prospect.id);
      });
    
      // Right-click to open detail modal
      marker.getElement().addEventListener('contextmenu', (e) => {
        e.preventDefault();
        setSelectedProspect(prospect);
        onProspectClick(prospect);
      });
    
      markers.current.push(marker);
    });
    

    if (prospects.length > 0 && !hasInitialFit.current) {
      const bounds = new maptilersdk.LngLatBounds();
      prospects.forEach(p => {
        if (p.latitude && p.longitude) {
          bounds.extend([p.longitude, p.latitude]);
        }
      });
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        hasInitialFit.current = true; // Mark as done
      }
    }    
  }, [prospects, selectedIds, onProspectClick]);

  const batchUpdateStatus = (status: ProspectionStatus) => {
    selectedIds.forEach(id => {
      onProspectUpdate(id, { status });
    });
    onSelectedIdsChange(new Set());
    setShowBatchActions(false);
  };

  const batchUpdateAddedBy = (addedBy: string) => {
    selectedIds.forEach(id => {
      onProspectUpdate(id, { added_by: addedBy });
    });
    onSelectedIdsChange(new Set());
    setShowBatchAddedBy(false);
  };

  const addToHitList = (listName?: string) => {
    const selectedProspects = prospects.filter(p => selectedIds.has(p.id));
    const stored = localStorage.getItem('hit_lists');
    let hitLists = stored ? JSON.parse(stored) : [];

    if (listName) {
      const existingList = hitLists.find((list: any) => list.name === listName);
      if (existingList) {
        const existingIds = new Set(existingList.prospects.map((p: any) => p.id));
        selectedProspects.forEach(p => {
          if (!existingIds.has(p.id)) {
            existingList.prospects.push(p);
          }
        });
      } else {
        hitLists.push({
          id: Date.now().toString(),
          name: listName,
          date: new Date().toISOString(),
          prospects: selectedProspects
        });
      }
    } else {
      const newName = prompt('Enter hit list name:', `Hit List ${new Date().toLocaleDateString()}`);
      if (!newName) return;
      
      hitLists.push({
        id: Date.now().toString(),
        name: newName,
        date: new Date().toISOString(),
        prospects: selectedProspects
      });
    }

    localStorage.setItem('hit_lists', JSON.stringify(hitLists));
    onSelectedIdsChange(new Set());
    setShowHitListModal(false);
    alert(`Added ${selectedProspects.length} prospects to hit list!`);
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  };

  const handleSuggestionClick = (feature: BanFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    
    setSearchQuery(feature.properties.label);
    setSuggestions([]);
    
    if (map.current) {
      map.current.flyTo({ center: [lon, lat], zoom: 14 });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].geometry.coordinates;
        map.current?.flyTo({ center: [lon, lat], zoom: 14 });
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleMapClick = (e: maptilersdk.MapMouseEvent) => {
    if (isSettingCenter) {
      const { lng, lat } = e.lngLat;
      onFiltersChange({
        ...filters,
        searchCenter: [lng, lat]
      });
      setIsSettingCenter(false);
      
      const el = document.createElement('div');
      el.className = 'center-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #ff00ff';
      el.style.backgroundColor = 'rgba(255, 0, 255, 0.3)';
      
      new maptilersdk.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map.current!);
    }
  };

  useEffect(() => {
    if (!map.current) return;
    if (isSettingCenter) {
      map.current.getCanvas().style.cursor = 'crosshair';
      map.current.on('click', handleMapClick);
    } else {
      map.current.getCanvas().style.cursor = '';
      map.current.off('click', handleMapClick);
    }
    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [isSettingCenter]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />

      {/* Selection Toolbar - NEW */}
      {selectedIds.size > 0 && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[60]">
          <div className="bg-accent-magenta/95 border-2 border-accent-magenta rounded-md p-3 shadow-glow-magenta backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm whitespace-nowrap">
                {selectedIds.size} SELECTED
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBatchActions(!showBatchActions);
                    setShowBatchAddedBy(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 whitespace-nowrap"
                >
                  STATUS
                </button>

                <button
                  onClick={() => {
                    setShowBatchAddedBy(!showBatchAddedBy);
                    setShowBatchActions(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-white text-background-dark rounded-md font-bold hover:bg-white/80 whitespace-nowrap"
                >
                  <User className="inline mr-1" size={14} />
                  ADDED BY
                </button>

                <button
                  onClick={() => setShowHitListModal(true)}
                  className="px-3 py-1.5 text-xs bg-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80 whitespace-nowrap"
                >
                  <ListPlus className="inline mr-1" size={14} />
                  HIT LIST
                </button>

                <button
                  onClick={() => onSelectedIdsChange(new Set())}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md font-bold hover:bg-red-700 whitespace-nowrap"
                >
                  CLEAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Status Panel - NEW */}
      {showBatchActions && selectedIds.size > 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60] max-w-2xl">
          <div className="bg-background-dark/95 border-2 border-accent-cyan rounded-md p-4 shadow-glow-cyan backdrop-blur-sm">
            <h3 className="text-accent-cyan font-bold mb-3 text-sm">UPDATE STATUS FOR SELECTED:</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => batchUpdateStatus(key as ProspectionStatus)}
                  className="px-3 py-2 text-xs rounded-md font-bold border-2 hover:scale-105 transition-all"
                  style={{
                    borderColor: config.dotColor,
                    color: config.dotColor,
                    backgroundColor: `${config.dotColor}20`
                  }}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batch Added By Panel - NEW */}
      {showBatchAddedBy && selectedIds.size > 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60]">
          <div className="bg-background-dark/95 border-2 border-accent-magenta rounded-md p-4 shadow-glow-magenta backdrop-blur-sm">
            <h3 className="text-accent-magenta font-bold mb-3 text-sm flex items-center gap-2">
              <User size={18} />
              UPDATE "ADDED BY" FOR SELECTED:
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => batchUpdateAddedBy('Henry')}
                className="px-6 py-2 text-sm rounded-md font-bold border-2 border-accent-magenta text-accent-magenta bg-accent-magenta/20 hover:bg-accent-magenta hover:text-background-dark transition-all"
              >
                Henry
              </button>
              <button
                onClick={() => batchUpdateAddedBy('Millé')}
                className="px-6 py-2 text-sm rounded-md font-bold border-2 border-accent-magenta text-accent-magenta bg-accent-magenta/20 hover:bg-accent-magenta hover:text-background-dark transition-all"
              >
                Millé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hit List Modal - NEW */}
      {showHitListModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-background-dark border-2 border-accent-yellow rounded-md p-6 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-accent-yellow mb-4">ADD TO HIT LIST</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => addToHitList()}
                className="w-full px-4 py-3 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
              >
                CREATE NEW HIT LIST
              </button>

              {(() => {
                const stored = localStorage.getItem('hit_lists');
                const existing = stored ? JSON.parse(stored) : [];
                return existing.map((list: any) => (
                  <button
                    key={list.id}
                    onClick={() => addToHitList(list.name)}
                    className="w-full px-4 py-3 bg-background-light border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark"
                  >
                    ADD TO "{list.name}"
                  </button>
                ));
              })()}

              <button
                onClick={() => setShowHitListModal(false)}
                className="w-full px-4 py-2 bg-transparent border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/50"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar - ORIGINAL */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-50 w-64 sm:w-80">
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-accent-cyan/70" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search location..."
                  className="w-full pl-10 pr-10 py-2 text-sm sm:text-base bg-background-dark/90 border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta shadow-glow-cyan backdrop-blur-sm"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              
              {suggestions.length > 0 && (
                <div className="absolute mt-2 w-full bg-background-dark border-2 border-accent-cyan rounded-md shadow-glow-cyan max-h-60 overflow-y-auto z-[9999]">
                  {suggestions.map((feature, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(feature)}
                      className="px-4 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer border-b border-accent-cyan/10 last:border-b-0"
                    >
                      <div className="font-semibold text-sm">{feature.properties.label}</div>
                      {feature.properties.postcode && (
                        <div className="text-xs text-accent-cyan/70">
                          {feature.properties.postcode} {feature.properties.city}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="hidden sm:flex px-4 py-2 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 shadow-glow-cyan items-center justify-center"
            >
              <MapPin size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Map Style Toggle - ORIGINAL */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
        <button
          onClick={() => setMapStyle(mapStyle === 'basic-v2' ? 'hybrid' : 'basic-v2')}
          className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-background-dark/90 border-2 border-accent-cyan text-accent-cyan rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all shadow-glow-cyan backdrop-blur-sm"
        >
          {mapStyle === 'basic-v2' ? 'SAT' : 'MAP'}
        </button>
      </div>

      {/* Filter Display - ORIGINAL */}
      {filters.maxDistance && (
        <div className="absolute bottom-16 sm:bottom-4 left-2 sm:left-4 z-10 bg-background-dark/90 border-2 border-accent-magenta rounded-md p-2 sm:p-4 backdrop-blur-sm text-xs sm:text-base">
          <div className="text-accent-magenta font-bold mb-1 sm:mb-2">
            FILTER: {filters.maxDistance}km
          </div>
          {filters.searchCenter && (
            <div className="text-xs text-text-primary/70 hidden sm:block">
              Center: {filters.searchCenter[1].toFixed(4)}, {filters.searchCenter[0].toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Set Center Button - ORIGINAL */}
      <div className="absolute bottom-16 sm:bottom-4 right-2 sm:right-4 z-10">
        <button
          onClick={() => setIsSettingCenter(!isSettingCenter)}
          className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base border-2 rounded-md font-bold transition-all backdrop-blur-sm ${
            isSettingCenter
              ? 'bg-accent-magenta text-background-dark border-accent-magenta'
              : 'bg-background-dark/90 text-accent-magenta border-accent-magenta hover:bg-accent-magenta hover:text-background-dark'
          }`}
        >
          <Navigation className="inline mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">{isSettingCenter ? 'CLICK MAP' : 'SET CENTER'}</span>
          <span className="sm:hidden">CENTER</span>
        </button>
      </div>

      {/* Legend - ORIGINAL */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background-dark/90 border-2 border-accent-cyan rounded-md p-2 sm:p-3 backdrop-blur-sm max-w-[90vw] overflow-x-auto">
        <div className="flex gap-2 sm:gap-4 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
              <div
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-white"
                style={{ 
                  backgroundColor: config.dotColor,
                  boxShadow: `0 0 6px ${config.dotColor}`
                }}
              />
              <span className="text-text-primary/80 font-semibold hidden sm:inline">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal - ORIGINAL */}
      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
        />
      )}

      {/* Styles - ORIGINAL */}
      <style jsx global>{`
        .maplibregl-map {
          width: 100%;
          height: 100%;
        }
        .maplibregl-control-container {
          display: none !important;
        }
        .maplibregl-canvas-container {
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
