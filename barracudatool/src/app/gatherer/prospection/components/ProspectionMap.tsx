'use client';

import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { PropertyProspect, STATUS_CONFIG, ProspectionFilters } from '../types';
import { MapPin, Navigation, X, Search } from 'lucide-react';
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
}

export default function ProspectionMap({
  prospects,
  onProspectClick,
  onProspectUpdate,
  filters,
  onFiltersChange
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

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [2.3522, 48.8566],
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

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    prospects.forEach(prospect => {
      if (!prospect.latitude || !prospect.longitude) return;

      const el = document.createElement('div');
      el.className = 'prospect-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.backgroundColor = STATUS_CONFIG[prospect.status].dotColor;
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 10px ${STATUS_CONFIG[prospect.status].dotColor}`;

      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat([prospect.longitude, prospect.latitude])
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        setSelectedProspect(prospect);
        onProspectClick(prospect);
      });

      markers.current.push(marker);
    });

    if (prospects.length > 0) {
      const bounds = new maptilersdk.LngLatBounds();
      prospects.forEach(p => {
        if (p.latitude && p.longitude) {
          bounds.extend([p.longitude, p.latitude]);
        }
      });
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  }, [prospects, onProspectClick]);

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

      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
        <button
          onClick={() => setMapStyle(mapStyle === 'basic-v2' ? 'hybrid' : 'basic-v2')}
          className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-background-dark/90 border-2 border-accent-cyan text-accent-cyan rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all shadow-glow-cyan backdrop-blur-sm"
        >
          {mapStyle === 'basic-v2' ? 'SAT' : 'MAP'}
        </button>
      </div>

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

      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
        />
      )}

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
