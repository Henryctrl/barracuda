'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Polygon } from 'geojson';

// Define interfaces
interface ParcelData {
  idu: string;
  contenance: number;
  code_insee: string;
  section: string;
  code_dep: string;
  numero: string;
  nom_com: string;
  [key: string]: unknown;
}

interface BanFeature {
  properties: {
    label: string;
    housenumber?: string;
  };
}

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [mapStyle, setMapStyle] = useState('basic-v2');
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [banAddress, setBanAddress] = useState<BanFeature | null>(null);
  const [otherAddresses, setOtherAddresses] = useState<BanFeature[]>([]);
  const [showOtherAddresses, setShowOtherAddresses] = useState(false);

  // Throttle function
  const throttle = useCallback(<T extends unknown[]>(
    func: (...args: T) => void, 
    limit: number
  ) => {
    let inThrottle: boolean = false;
    return function(this: unknown, ...args: T) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }, []);

  // Add data layers to the map
  const addDataLayers = useCallback(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    if (!currentMap.getSource('cadastre-parcelles')) {
      currentMap.addSource('cadastre-parcelles', { 
        type: 'vector', 
        url: `https://openmaptiles.geo.data.gouv.fr/data/cadastre.json` 
      });
    }
    
    const layers: maptilersdk.LayerSpecification[] = [
        { id: 'parcelles-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': 'rgba(0,0,0,0)' } },
        { id: 'parcelles-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 1, 'line-opacity': 0.5 } },
        { id: 'parcelles-hover', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#00ffff', 'line-width': 3 }, filter: ['==', 'id', ''] },
        { id: 'parcelles-click-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': '#00ffff', 'fill-opacity': 0.3 }, filter: ['==', 'id', ''] },
        { id: 'parcelles-click-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 3, 'line-opacity': 0.9 }, filter: ['==', 'id', ''] }
    ];

    layers.forEach(layer => {
        if (!currentMap.getLayer(layer.id)) {
            currentMap.addLayer(layer);
        }
    });
  }, []);

  // Effect to reset states when a parcel is deselected
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    if (!selectedParcelId) {
      if (currentMap.getLayer('parcelles-click-fill')) currentMap.setFilter('parcelles-click-fill', ['==', 'id', '']);
      if (currentMap.getLayer('parcelles-click-line')) currentMap.setFilter('parcelles-click-line', ['==', 'id', '']);
      setParcelData(null); 
      setBanAddress(null);
      setOtherAddresses([]);
      setShowOtherAddresses(false);
    }
  }, [selectedParcelId]);

  // Map initialization and event handlers
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [2.3522, 48.8566],
      zoom: 15,
    });
    map.current = newMap;

    newMap.on('load', () => {
      addDataLayers();

      const throttledHoverHandler = throttle((e: maptilersdk.MapMouseEvent & { features?: maptilersdk.MapGeoJSONFeature[] }) => {
        if (e.features?.length) {
            newMap.getCanvas().style.cursor = 'pointer';
            const newHoveredId = e.features[0].properties?.id as string;
            newMap.setFilter('parcelles-hover', ['==', 'id', newHoveredId || '']);
        }
      }, 100);

      newMap.on('mousemove', 'parcelles-fill', throttledHoverHandler);

      newMap.on('mouseleave', 'parcelles-fill', () => {
        newMap.getCanvas().style.cursor = '';
        newMap.setFilter('parcelles-hover', ['==', 'id', '']);
      });

      newMap.on('click', 'parcelles-fill', async (e) => {
         if (e.features?.length) {
           const parcelId = e.features[0].properties?.id as string;
           const parcelFeature = e.features[0];
           
           if (parcelId !== undefined) {
             newMap.setFilter('parcelles-hover', ['==', 'id', '']);
             setSelectedParcelId(String(parcelId));
             
             const bounds = new maptilersdk.LngLatBounds();
             const coordinates = (parcelFeature.geometry as Polygon).coordinates[0];
             coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
             const center = bounds.getCenter().toArray() as [number, number];

             setIsLoading(true);
             setParcelData(null);
             setBanAddress(null);
             setOtherAddresses([]);
             try {
                const parcelResponse = await fetch(`/api/cadastre/${parcelId}`);
                if (!parcelResponse.ok) throw new Error('Failed to fetch parcel data.');
                const parcelJson = await parcelResponse.json();
                setParcelData(parcelJson);

                const banResponse = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${center[0]}&lat=${center[1]}&limit=6`);
                if (!banResponse.ok) throw new Error('Failed to fetch address from BAN API.');
                const banJson = await banResponse.json();
                
                const features = banJson.features as BanFeature[];
                if (features?.length > 0) {
                  const bestResult = features.find(f => f.properties.housenumber) || features[0];
                  setBanAddress(bestResult);
                  const otherResults = features.filter(f => f.properties.label !== bestResult.properties.label).slice(0, 5);
                  setOtherAddresses(otherResults);
                }
                if (map.current) {
                  map.current.setFilter('parcelles-click-fill', ['==', 'id', parcelId]);
                  map.current.setFilter('parcelles-click-line', ['==', 'id', parcelId]);
                }
             } catch (error) {
                console.error("Failed to fetch details:", error);
                setParcelData(null);
                setBanAddress(null);
             } finally {
                setIsLoading(false);
             }
           }
         }
      });
    });

    return () => { newMap.remove(); map.current = null; };
  }, [addDataLayers, throttle]);

  // FIX: Restore the useEffect hook for map style changes
  useEffect(() => {
    if (!map.current) return;
    
    const newStyle = mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID;
    
    map.current.setStyle(newStyle, {
      transformStyle: (previousStyle, nextStyle) => {
        if (!previousStyle || !previousStyle.layers || !previousStyle.sources) {
          return nextStyle;
        }

        const customLayers = previousStyle.layers.filter(layer => 
          layer.id && layer.id.startsWith('parcelles-')
        );

        const customSources: { [key: string]: maptilersdk.SourceSpecification } = {};
        for (const [key, value] of Object.entries(previousStyle.sources)) {
          if (key === 'cadastre-parcelles') {
            customSources[key] = value as maptilersdk.SourceSpecification;
          }
        }

        return {
          ...nextStyle,
          sources: { ...nextStyle.sources, ...customSources },
          layers: [...nextStyle.layers, ...customLayers]
        };
      }
    });
  }, [mapStyle]);

  const formatSection = (section: string) => {
    if (!section) return 'N/A';
    return section.replace(/[0-9-]/g, '');
  };

  const createGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
      
      {(isLoading || parcelData) && (
        <div className="absolute top-4 left-4 z-20 w-80 rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]">PARCEL DETAILS</h3>
            <button onClick={() => setSelectedParcelId(null)} className="text-accent-cyan/70 hover:text-accent-cyan">
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
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-text-primary/80">IDU:</span><span className="font-bold text-white text-right">{parcelData.idu}</span>
                <span className="font-semibold text-text-primary/80">COMMUNE:</span><span className="font-bold text-white text-right">{parcelData.nom_com}</span>
                <span className="font-semibold text-text-primary/80">SECTION:</span><span className="font-bold text-white text-right">{formatSection(parcelData.section)}</span>
                <span className="font-semibold text-text-primary/80">NUMERO:</span><span className="font-bold text-white text-right">{parcelData.numero}</span>
                <span className="font-semibold text-text-primary/80">AREA:</span><span className="font-bold text-white text-right">{parcelData.contenance} m²</span>
                <span className="font-semibold text-text-primary/80">DEPT:</span><span className="font-bold text-white text-right">{parcelData.code_dep}</span>

                {banAddress && (
                  <>
                    <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/30 pt-2">ADDRESS:</span>
                    <a href={createGoogleMapsLink(banAddress.properties.label)} target="_blank" rel="noopener noreferrer" className="col-span-2 font-bold text-accent-cyan text-right hover:underline">
                      {banAddress.properties.label}
                    </a>
                    {otherAddresses.length > 0 && (
                      <div className="col-span-2 text-right">
                        <button onClick={() => setShowOtherAddresses(!showOtherAddresses)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 ml-auto">
                          {showOtherAddresses ? 'Hide alternatives' : 'Show alternatives'}
                          {showOtherAddresses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {showOtherAddresses && otherAddresses.length > 0 && (
                  <div className="col-span-2 mt-2 space-y-1 border-t border-dashed border-accent-cyan/30 pt-2">
                    {otherAddresses.map((addr, index) => (
                      <a key={index} href={createGoogleMapsLink(addr.properties.label)} target="_blank" rel="noopener noreferrer" className="block text-right text-xs text-accent-cyan/70 hover:underline">
                        {addr.properties.label}
                      </a>
                    ))}
                  </div>
                )}
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
