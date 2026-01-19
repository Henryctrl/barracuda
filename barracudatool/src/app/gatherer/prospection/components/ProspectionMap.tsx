'use client';

import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { PropertyProspect, STATUS_CONFIG, ProspectionFilters } from '../types';
import { MapPin, Navigation } from 'lucide-react';
import ProspectDetailModal from './ProspectDetailModal';

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
  const [isSettingCenter, setIsSettingCenter] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [2.3522, 48.8566], // Paris default
      zoom: 10
    });

    map.current = newMap;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style
  useEffect(() => {
    if (!map.current) return;
    const styleUrl = mapStyle === 'basic-v2' 
      ? maptilersdk.MapStyle.BASIC 
      : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(styleUrl);
  }, [mapStyle]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
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

    // Fit bounds if prospects exist
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

  // Handle search
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
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle click to set center
  const handleMapClick = (e: any) => {
    if (isSettingCenter) {
      const { lng, lat } = e.lngLat;
      onFiltersChange({
        ...filters,
        searchCenter: [lng, lat]
      });
      setIsSettingCenter(false);
      
      // Add temporary marker
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

      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search location..."
            className="flex-1 px-4 py-2 bg-background-dark/90 border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta shadow-glow-cyan backdrop-blur-sm"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>

      {/* Map Style Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setMapStyle(mapStyle === 'basic-v2' ? 'hybrid' : 'basic-v2')}
          className="px-4 py-2 bg-background-dark/90 border-2 border-accent-cyan text-accent-cyan rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all shadow-glow-cyan backdrop-blur-sm"
        >
          {mapStyle === 'basic-v2' ? 'SATELLITE' : 'MAP'}
        </button>
      </div>

      {/* Distance Filter Control */}
      {filters.maxDistance && (
        <div className="absolute bottom-4 left-4 z-10 bg-background-dark/90 border-2 border-accent-magenta rounded-md p-4 backdrop-blur-sm">
          <div className="text-accent-magenta font-bold mb-2">
            DISTANCE FILTER: {filters.maxDistance}km
          </div>
          {filters.searchCenter && (
            <div className="text-xs text-text-primary/70">
              Center: {filters.searchCenter[1].toFixed(4)}, {filters.searchCenter[0].toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Set Center Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => setIsSettingCenter(!isSettingCenter)}
          className={`px-4 py-2 border-2 rounded-md font-bold transition-all backdrop-blur-sm ${
            isSettingCenter
              ? 'bg-accent-magenta text-background-dark border-accent-magenta'
              : 'bg-background-dark/90 text-accent-magenta border-accent-magenta hover:bg-accent-magenta hover:text-background-dark'
          }`}
        >
          <Navigation className="inline mr-2" size={20} />
          {isSettingCenter ? 'CLICK MAP TO SET CENTER' : 'SET DISTANCE CENTER'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background-dark/90 border-2 border-accent-cyan rounded-md p-3 backdrop-blur-sm">
        <div className="flex gap-4 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-white"
                style={{ 
                  backgroundColor: config.dotColor,
                  boxShadow: `0 0 6px ${config.dotColor}`
                }}
              />
              <span className="text-text-primary/80 font-semibold">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
        />
      )}
    </div>
  );
}
