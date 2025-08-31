'use client';

import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Loader2, X } from 'lucide-react';

// Define an interface for the expected parcel data
interface ParcelData {
  idu: string;
  contenance: number;
  code_insee: string;
  section: string;
  code_dep: string;
  nom_com: string;
  [key: string]: any; // Allow other properties
}

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [mapStyle, setMapStyle] = useState('basic-v2');
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  let hoveredParcelId: string | number | undefined = undefined;

  // Fetch parcel data when a parcel is selected
  useEffect(() => {
    if (!selectedParcelId) return;

    const fetchParcelData = async () => {
      setIsLoading(true);
      setParcelData(null);
      try {
        const response = await fetch(`/api/cadastre/${selectedParcelId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch parcel data.');
        }
        const data = await response.json();
        setParcelData(data);
      } catch (error) {
        console.error("Failed to fetch parcel details:", error);
        setParcelData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcelData();
  }, [selectedParcelId]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle[mapStyle === 'basic-v2' ? 'BASIC' : 'SATELLITE'],
      center: [2.3522, 48.8566],
      zoom: 15,
    });

    map.current.on('load', () => {
      const currentMap = map.current!;
      currentMap.addSource('cadastre-parcelles', { type: 'vector', url: `https://openmaptiles.geo.data.gouv.fr/data/cadastre.json` });
      currentMap.addLayer({ id: 'parcelles-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': 'rgba(0,0,0,0)' } });
      currentMap.addLayer({ id: 'parcelles-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 1, 'line-opacity': 0.5 } });
      currentMap.addLayer({ id: 'parcelles-hover', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#00ffff', 'line-width': 3 }, filter: ['==', 'id', ''] });
      currentMap.addLayer({ id: 'parcelles-click', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff80ed', 'line-width': 3.5 }, filter: ['==', 'id', ''] });

      currentMap.on('mousemove', 'parcelles-fill', (e) => {
        currentMap.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const newHoveredId = e.features[0].properties.id;
          if (newHoveredId !== undefined && String(newHoveredId) !== selectedParcelId) {
             currentMap.setFilter('parcelles-hover', ['==', 'id', newHoveredId]);
          }
        }
      });

      currentMap.on('mouseleave', 'parcelles-fill', () => {
        currentMap.getCanvas().style.cursor = '';
        currentMap.setFilter('parcelles-hover', ['==', 'id', '']);
      });

      currentMap.on('click', 'parcelles-fill', (e) => {
         if (e.features && e.features.length > 0) {
           const parcelId = e.features[0].properties.id;
           if (parcelId !== undefined) {
             currentMap.setFilter('parcelles-click', ['==', 'id', parcelId]);
             currentMap.setFilter('parcelles-hover', ['==', 'id', '']);
             setSelectedParcelId(String(parcelId));
           }
         }
      });
    });
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.SATELLITE);
  }, [mapStyle]);

  // --- THIS IS THE FIX (Part 1) ---
  // This new formatting function now removes all numbers from the section string.
  const formatSection = (section: string) => {
    if (!section) return 'N/A';
    // Use replace with a regular expression to strip all digits (0-9)
    return section.replace(/[0-9]/g, '');
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />

      {(isLoading || parcelData) && (
        <div className="absolute top-4 left-4 z-10 w-80 rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]">PARCEL DETAILS</h3>
            <button onClick={() => { setParcelData(null); setSelectedParcelId(null); map.current?.setFilter('parcelles-click', ['==', 'id', '']); }} className="text-accent-cyan/70 hover:text-accent-cyan">
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-text-primary">
                <Loader2 className="animate-spin" size={16} />
                <span>INTERROGATING GRID...</span>
              </div>
            ) : parcelData ? (
              // --- THIS IS THE FIX (Part 2) ---
              // The INSEE line has been removed.
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-text-primary/80">IDU:</span><span className="font-bold text-white text-right">{parcelData.idu}</span>
                <span className="font-semibold text-text-primary/80">COMMUNE:</span><span className="font-bold text-white text-right">{parcelData.nom_com}</span>
                <span className="font-semibold text-text-primary/80">SECTION:</span><span className="font-bold text-white text-right">{formatSection(parcelData.section)}</span>
                <span className="font-semibold text-text-primary/80">AREA:</span><span className="font-bold text-white text-right">{parcelData.contenance} m²</span>
                <span className="font-semibold text-text-primary/80">DEPT:</span><span className="font-bold text-white text-right">{parcelData.code_dep}</span>
              </div>
            ) : (
                 <div className="text-center text-red-400">DATA NOT FOUND</div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setMapStyle(style => style === 'basic-v2' ? 'satellite' : 'basic-v2')}
        className="absolute top-4 right-12 z-10 rounded-md border-2 border-accent-cyan bg-container-bg px-4 py-2 font-bold text-accent-cyan shadow-glow-cyan transition hover:bg-accent-cyan hover:text-background-dark"
      >
        {mapStyle === 'basic-v2' ? 'Satellite' : 'Basic'} View
      </button>
    </div>
  );
}
