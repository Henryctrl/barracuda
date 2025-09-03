'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Loader2, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { Polygon, Position } from 'geojson';

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
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    label: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
  };
}

// Interface for DPE records from the ADEME API
interface DPERecord {
  'numero_dpe': string;
  'adresse_brut': string;
  'nom_commune_ban': string;
  'code_postal_ban': string;
  'etiquette_dpe': string;
  'etiquette_ges': string;
  '_geopoint': string;
  '_distance'?: number;
}

// Component Props
interface MapComponentProps {
  activeView: 'cadastre' | 'dpe';
}

export function MapComponent({ activeView }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [mapStyle, setMapStyle] = useState('basic-v2');
  
  // State for Cadastre/Parcel data
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [banAddress, setBanAddress] = useState<BanFeature | null>(null);
  const [otherAddresses, setOtherAddresses] = useState<BanFeature[]>([]);
  const [showOtherAddresses, setShowOtherAddresses] = useState(false);

  // State for DPE data
  const [dpeResults, setDpeResults] = useState<DPERecord[]>([]);
  const [isDpeLoading, setIsDpeLoading] = useState(false);
  const [dpeError, setDpeError] = useState('');
  const [dpeSearchInfo, setDpeSearchInfo] = useState('');

  // State for the custom search bar
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- DPE Search Logic (Corrected) ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const findDPE = useCallback(async (postalCode: string, lat: number, lon: number) => {
    setIsDpeLoading(true);
    setDpeError('');
    setDpeResults([]);
    setDpeSearchInfo('INITIALIZING DPE SECTOR SCAN...');
    
    if (!postalCode || isNaN(lat) || isNaN(lon)) {
      setDpeError('CRITICAL ERROR: INVALID COORDINATES OR SECTOR ID FOR DPE SCAN');
      setIsDpeLoading(false);
      return;
    }

    try {
      setDpeSearchInfo(`QUERYING ADEME GRID FOR SECTOR ${postalCode}...`);
      // FIXED: Using the correct 'data-fair' API endpoint and parameters
      const dataset = 'dpe03existant';
      const queryParams = new URLSearchParams({
          qs: `code_postal_ban:"${postalCode}"`,
          size: '10000',
          select: 'numero_dpe,adresse_brut,nom_commune_ban,code_postal_ban,etiquette_dpe,etiquette_ges,_geopoint'
      }).toString();
      
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`GRID OFFLINE: HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        setDpeSearchInfo(`NO DPE ASSETS FOUND IN SECTOR ${postalCode}.`);
        setIsDpeLoading(false);
        return;
      }
      
      setDpeSearchInfo(`GRID RESPONSE: ${data.results.length} ASSETS DETECTED. CALCULATING PROXIMITY...`);
      
      // FIXED: Parsing logic reverted to handle the original API response structure
      const recordsWithDistance = data.results
        .map((record: DPERecord) => {
          if (record._geopoint) {
            const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
            if (!isNaN(recordLat) && !isNaN(recordLon)) {
              record._distance = calculateDistance(lat, lon, recordLat, recordLon);
              return record;
            }
          }
          return null;
        })
        .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
        .sort((a: DPERecord, b: DPERecord) => a._distance! - b._distance!);

      if (recordsWithDistance.length === 0) {
        setDpeSearchInfo(`DPE ASSET DATA CORRUPTED. CANNOT CALCULATE PROXIMITY.`);
        setIsDpeLoading(false);
        return;
      }
      setDpeResults(recordsWithDistance);
      setDpeSearchInfo(`ANALYSIS COMPLETE. ${recordsWithDistance.length} VALID ASSETS. CLOSEST TARGET: ${Math.round(recordsWithDistance[0]._distance!)}m`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDpeError(`DPE SYSTEM FAILURE: ${errorMessage}`);
      setDpeSearchInfo('');
    } finally {
      setIsDpeLoading(false);
    }
  }, []);

  const getDpeColor = (rating: string) => {
    switch (rating) {
      case 'A': return '#00ff00';
      case 'B': return '#adff2f';
      case 'C': return '#ffff00';
      case 'D': return '#ffd700';
      case 'E': return '#ffa500';
      case 'F': return '#ff4500';
      case 'G': return '#ff0000';
      default: return '#808080';
    }
  };

  // Fetch search suggestions from BAN API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { fetchSuggestions(query); }, 300);
  };

  const handleSuggestionClick = (feature: BanFeature) => {
    setSearchQuery(feature.properties.label);
    setSuggestions([]);
    if (map.current) {
      const [lon, lat] = feature.geometry.coordinates;
      map.current.flyTo({ center: [lon, lat], zoom: 18 });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const throttle = useCallback(<T extends unknown[]>(func: (...args: T) => void, limit: number) => {
    let inThrottle: boolean = false;
    return function(this: unknown, ...args: T) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }, []);

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
        if (!currentMap.getLayer(layer.id)) currentMap.addLayer(layer);
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
      // Also reset DPE data
      setDpeResults([]);
      setDpeError('');
      setDpeSearchInfo('');
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
        if (e.features && e.features.length > 0) {
            newMap.getCanvas().style.cursor = 'pointer';
            newMap.setFilter('parcelles-hover', ['==', 'id', e.features[0].properties?.id as string || '']);
        }
      }, 100);
      newMap.on('mousemove', 'parcelles-fill', throttledHoverHandler);
      newMap.on('mouseleave', 'parcelles-fill', () => {
        newMap.getCanvas().style.cursor = '';
        newMap.setFilter('parcelles-hover', ['==', 'id', '']);
      });

      newMap.on('click', 'parcelles-fill', async (e) => {
         if (e.features && e.features.length > 0) {
           const parcelFeature = e.features[0];
           const parcelId = parcelFeature.properties?.id as string;
           
           if (parcelId) {
             newMap.setFilter('parcelles-hover', ['==', 'id', '']);
             setSelectedParcelId(String(parcelId));
             
             const bounds = new maptilersdk.LngLatBounds();
             const coordinates = (parcelFeature.geometry as Polygon).coordinates[0] as Position[];
             coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
             const center = bounds.getCenter().toArray() as [number, number];
             
             setIsLoading(true);
             setParcelData(null);
             setBanAddress(null);
             setOtherAddresses([]);
             setDpeResults([]); // Clear previous DPE results
             
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
                  setOtherAddresses(features.filter(f => f.properties.label !== bestResult.properties.label).slice(0, 5));
                  
                  // *** TRIGGER DPE SEARCH ***
                  const postalCode = bestResult.properties.postcode;
                  const [lon, lat] = bestResult.geometry.coordinates;
                  if (postalCode && lat && lon) {
                    findDPE(postalCode, lat, lon);
                  } else {
                    setDpeError('Postal code or coordinates missing for DPE scan.');
                    setDpeSearchInfo('');
                  }

                } else {
                   setDpeError('No address found for parcel, cannot perform DPE scan.');
                   setDpeSearchInfo('');
                }

                if (map.current) {
                  map.current.setFilter('parcelles-click-fill', ['==', 'id', parcelId]);
                  map.current.setFilter('parcelles-click-line', ['==', 'id', parcelId]);
                }
             } catch (error) {
                console.error("Failed to fetch details:", error);
                setParcelData(null);
                setBanAddress(null);
                setDpeError(error instanceof Error ? error.message : 'Unknown error');
             } finally {
                setIsLoading(false);
             }
           }
         }
      });
    });
    return () => { newMap.remove(); map.current = null; };
  }, [addDataLayers, throttle, findDPE]);

  useEffect(() => {
    if (!map.current) return;
    const newStyle = mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(newStyle, {
      transformStyle: (previousStyle, nextStyle) => {
        if (!previousStyle || !previousStyle.layers || !previousStyle.sources) return nextStyle;
        const customLayers = previousStyle.layers.filter(layer => layer.id?.startsWith('parcelles-'));
        const customSources: { [key: string]: maptilersdk.SourceSpecification } = {};
        for (const [key, value] of Object.entries(previousStyle.sources)) {
          if (key === 'cadastre-parcelles') customSources[key] = value as maptilersdk.SourceSpecification;
        }
        return { ...nextStyle, sources: { ...nextStyle.sources, ...customSources }, layers: [...nextStyle.layers, ...customLayers] };
      }
    });
  }, [mapStyle]);

  const formatSection = (section: string) => section ? section.replace(/[0-9-]/g, '') : 'N/A';
  const createGoogleMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
      
      {/* Custom BAN Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-72">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-accent-cyan/70" size={20} />
          <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search for an address..." className="w-full pl-10 pr-10 py-2 bg-container-bg border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta shadow-glow-cyan" />
          {searchQuery.length > 0 && (
            <button onClick={handleClearSearch} className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan" aria-label="Clear search"><X size={20} /></button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute mt-2 w-full bg-container-bg border border-accent-cyan rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((feature, index) => (
              <div key={index} onClick={() => handleSuggestionClick(feature)} className="px-4 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer">
                {feature.properties.label}
                {feature.properties.postcode && <span className="text-accent-cyan/70 ml-2">({feature.properties.postcode})</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Info Panel */}
      {(isLoading || parcelData) && (
        <div className="absolute top-20 sm:top-4 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]">
              {activeView === 'cadastre' ? 'PARCEL DETAILS' : 'DPE SCAN RESULTS'}
            </h3>
            <button onClick={() => setSelectedParcelId(null)} className="text-accent-cyan/70 hover:text-accent-cyan"><X size={20} /></button>
          </div>
          <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-text-primary"><Loader2 className="animate-spin" size={16} /><span>INTERROGATING GRID...</span></div>
            ) : activeView === 'cadastre' ? (
              // CADASTRE VIEW
              parcelData ? (
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
                        <a href={createGoogleMapsLink(banAddress.properties.label)} target="_blank" rel="noopener noreferrer" className="col-span-2 font-bold text-accent-cyan text-right hover:underline">{banAddress.properties.label}</a>
                        {otherAddresses.length > 0 && (<div className="col-span-2 text-right"><button onClick={() => setShowOtherAddresses(!showOtherAddresses)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 ml-auto">{showOtherAddresses ? 'Hide' : 'Show'} alternatives {showOtherAddresses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>)}
                      </>
                    )}
                    {showOtherAddresses && otherAddresses.length > 0 && (
                      <div className="col-span-2 mt-2 space-y-1 border-t border-dashed border-accent-cyan/30 pt-2">
                        {otherAddresses.map((addr, index) => (<a key={index} href={createGoogleMapsLink(addr.properties.label)} target="_blank" rel="noopener noreferrer" className="block text-right text-xs text-accent-cyan/70 hover:underline">{addr.properties.label}</a>))}
                      </div>
                    )}
                </div>
              ) : <div className="text-center text-red-400">PARCEL DATA NOT FOUND</div>
            ) : (
              // DPE VIEW
              <div>
                {isDpeLoading && <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>SCANNING DPE GRID...</span></div>}
                {dpeError && <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">{dpeError}</div>}
                {dpeSearchInfo && !isDpeLoading && <div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dpeSearchInfo}</div>}
                {dpeResults.length > 0 && (
                  <div className="space-y-4">
                    {dpeResults.slice(0, 10).map((dpe, index) => ( // Show top 10 results
                      <div key={dpe.numero_dpe} className={`p-4 rounded-lg border bg-container-bg/50 transition-all ${index === 0 ? 'border-accent-magenta shadow-glow-magenta' : 'border-accent-cyan/50'}`}>
                        <div className="text-base font-bold text-accent-magenta mb-3">TARGET #{index + 1} - {dpe.adresse_brut}</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="block text-accent-cyan/70">PROXIMITY</span><span className="font-bold text-white">{Math.round(dpe._distance ?? 0)} meters</span></div>
                          <div><span className="block text-accent-cyan/70">LOCATION</span><span className="font-bold text-white">{dpe.nom_commune_ban}</span></div>
                          <div><span className="block text-accent-cyan/70">ENERGY</span><span className="font-bold" style={{ color: getDpeColor(dpe.etiquette_dpe) }}>{dpe.etiquette_dpe}</span></div>
                          <div><span className="block text-accent-cyan/70">GHG</span><span className="font-bold" style={{ color: getDpeColor(dpe.etiquette_ges) }}>{dpe.etiquette_ges}</span></div>
                        </div>
                        <div className="mt-3 text-xs text-right text-gray-500 italic">ID: {dpe.numero_dpe}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Style Toggle Button */}
      <button onClick={() => setMapStyle(style => style === 'basic-v2' ? 'satellite' : 'basic-v2')} className="absolute top-4 right-12 z-10 rounded-md border-2 border-accent-cyan bg-container-bg px-4 py-2 font-bold text-accent-cyan shadow-glow-cyan transition hover:bg-accent-cyan hover:text-background-dark">
        {mapStyle === 'basic-v2' ? 'Satellite' : 'Basic'}
      </button>
    </div>
  );
}
