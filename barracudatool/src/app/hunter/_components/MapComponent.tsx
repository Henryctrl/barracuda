'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import type { FilterSpecification, MapGeoJSONFeature } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Loader2, X, ChevronDown, ChevronUp, Search, Minus, Plus } from 'lucide-react';
import type { Polygon, Position } from 'geojson';

// Import NEW unified panel and types
import { SearchPanel, SearchParams } from './SearchPanel';
import { useSearchCircle } from '../../../hooks/useSearchCircle';
import { ParcelSearchResult, DPERecord as DpeSearchResult } from '../types';

// --- Interfaces ---
interface ParcelData {
  idu: string; contenance: number; code_insee: string; section: string; code_dep: string; numero: string; nom_com: string; [key: string]: unknown;
}
interface BanFeature {
  geometry: { coordinates: [number, number]; };
  properties: { label: string; housenumber?: string; postcode?: string; city?: string; };
}
interface DPERecord {
  'numero_dpe': string; 'adresse_ban': string; 'date_etablissement_dpe': string; 'etiquette_dpe': string; 'etiquette_ges': string; 'surface_habitable_logement': number; 'conso_5_usages_par_m2_ep': number; 'conso_5_usages_par_m2_ef': number; 'emission_ges_5_usages_par_m2': number; 'type_batiment': string; 'type_generateur_chauffage_principal': string; '_geopoint': string; 'nom_commune_ban': string; '_distance'?: number;
}
interface ParcelInfo {
  id: string; sterr: number;
}
interface DVFRecord {
  idmutinvar: string; datemut: string; valeurfonc: string; libtypbien: string; sbati: string; sterr: string; l_idpar: ParcelInfo[]; l_addr: string; geom: { coordinates: number[][][][]; }; _distance?: number;
}

interface MapComponentProps {
  activeView: 'cadastre' | 'dpe' | 'sales';
  isSearchMode: boolean;
  setIsSearchMode: (isSearchMode: boolean) => void;
}

export function MapComponent({ activeView, isSearchMode, setIsSearchMode }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const dpeMarkers = useRef<maptilersdk.Marker[]>([]);
  const [mapStyle, setMapStyle] = useState('basic-v2');
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [banAddress, setBanAddress] = useState<BanFeature | null>(null);
  const [otherAddresses, setOtherAddresses] = useState<BanFeature[]>([]);
  const [showOtherAddresses, setShowOtherAddresses] = useState(false);
  const [dpeResults, setDpeResults] = useState<DPERecord[]>([]);
  const [isDpeLoading, setIsDpeLoading] = useState(false);
  const [dpeError, setDpeError] = useState('');
  const [dpeSearchInfo, setDpeSearchInfo] = useState('');
  const [showOtherDpeResults, setShowOtherDpeResults] = useState(false);
  const [expandedDpeId, setExpandedDpeId] = useState<string | null>(null);
  const [dvfResults, setDvfResults] = useState<DVFRecord[]>([]);
  const [isDvfLoading, setIsDvfLoading] = useState(false);
  const [dvfError, setDvfError] = useState('');
  const [dvfSearchInfo, setDvfSearchInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [highlightedSaleParcels, setHighlightedSaleParcels] = useState<ParcelInfo[]>([]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  
  const [searchCenter, setSearchCenter] = useState<[number, number]>([2.3522, 48.8566]);
  
  // State for search logic
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<(DpeSearchResult | ParcelSearchResult)[]>([]);
  const [resultMarkers, setResultMarkers] = useState<maptilersdk.Marker[]>([]);
  const [searchRadiusKm, setSearchRadiusKm] = useState(2);

  const findDPE = useCallback(async (postalCode: string, lat: number, lon: number) => { setIsLoading(true); setDpeError(''); setDpeResults([]); setDpeSearchInfo('INITIALIZING DPE SECTOR SCAN...'); try { setDpeSearchInfo(`QUERYING INTERNAL BARRACUDA GRID FOR SECTOR ${postalCode}...`); const response = await fetch(`/api/dpe?postalCode=${postalCode}&lat=${lat}&lon=${lon}`); if (!response.ok) throw new Error('DPE data fetch failed'); const data: DPERecord[] = await response.json(); if (data.length === 0) { setDpeSearchInfo(`NO DPE ASSETS FOUND IN SECTOR ${postalCode}.`); return; } data.sort((a, b) => { const distanceDiff = (a._distance ?? Infinity) - (b._distance ?? Infinity); if (distanceDiff !== 0) return distanceDiff; const dateA = a.date_etablissement_dpe ? new Date(a.date_etablissement_dpe).getTime() : 0; const dateB = b.date_etablissement_dpe ? new Date(b.date_etablissement_dpe).getTime() : 0; return dateB - dateA; }); setDpeResults(data); setDpeSearchInfo(`ANALYSIS COMPLETE. ${data.length} VALID ASSETS FOUND.`); } catch (err) { const msg = err instanceof Error ? err.message : 'Unknown DPE Error'; setDpeError(msg); } finally { setIsLoading(false); } }, []);
  const findDVF = useCallback(async (inseeCode: string, targetParcelId: string) => { setIsDvfLoading(true); setDvfError(''); setDvfResults([]); setDvfSearchInfo('INITIALIZING DVF SECTOR SCAN...'); try { setDvfSearchInfo(`QUERYING INTERNAL BARRACUDA GRID FOR PARCEL ${targetParcelId}...`); const response = await fetch(`/api/dvf?inseeCode=${inseeCode}&targetParcelId=${targetParcelId}`); if (!response.ok) throw new Error('DVF data fetch failed'); const filteredSales: DVFRecord[] = await response.json(); if (filteredSales.length === 0) { setDvfSearchInfo(`NO SALES HISTORY FOUND FOR THIS SPECIFIC PARCEL.`); } else { setDvfResults(filteredSales); setDvfSearchInfo(`ANALYSIS COMPLETE. ${filteredSales.length} HISTORICAL SALES FOUND.`); } } catch (err) { const msg = err instanceof Error ? err.message : 'Unknown DVF Error'; setDvfError(msg); } finally { setIsDvfLoading(false); } }, []);
  const getDpeColor = useCallback((rating: string) => { switch (rating) { case 'A': return '#00ff00'; case 'B': return '#adff2f'; case 'C': return '#ffff00'; case 'D': return '#ffd700'; case 'E': return '#ffa500'; case 'F': return '#ff4500'; case 'G': return '#ff0000'; default: return '#808080'; } }, []);
  const throttle = useCallback(<T extends unknown[]>(func: (...args: T) => void, limit: number) => { let inThrottle: boolean = false; return function(this: unknown, ...args: T) { if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); } } }, []);
  const fetchSuggestions = useCallback(async (query: string) => { if (query.length < 3) { setSuggestions([]); return; } try { const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`); const data = await response.json(); setSuggestions(data.features || []); } catch (error) { console.error("Failed to fetch suggestions:", error); setSuggestions([]); } }, []);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { const query = e.target.value; setSearchQuery(query); if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => { fetchSuggestions(query); }, 300); };
  const handleSuggestionClick = (feature: BanFeature) => { setSearchQuery(feature.properties.label); setSuggestions([]); if (map.current) { const [lon, lat] = feature.geometry.coordinates; map.current.flyTo({ center: [lon, lat], zoom: 18 }); } };
  const handleClearSearch = () => { setSearchQuery(''); setSuggestions([]); };

  const addDataLayers = useCallback(() => {
    const currentMap = map.current; if (!currentMap) return; if (!currentMap.getSource('cadastre-parcelles')) { currentMap.addSource('cadastre-parcelles', { type: 'vector', url: `https://openmaptiles.geo.data.gouv.fr/data/cadastre.json` }); }
    const layers: maptilersdk.LayerSpecification[] = [ 
      { id: 'parcelles-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': 'rgba(0,0,0,0)' } }, 
      { id: 'parcelles-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 1, 'line-opacity': 0.5 } }, 
      { id: 'parcelles-hover', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#00ffff', 'line-width': 3 }, filter: ['==', 'id', ''] }, 
      { id: 'parcelles-click-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': '#00ffff', 'fill-opacity': 0.3 }, filter: ['==', 'id', ''] }, 
      { id: 'parcelles-click-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 3, 'line-opacity': 0.9 }, filter: ['==', 'id', ''] },
      { id: 'parcelles-sale-highlight-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': '#FFFF00', 'fill-opacity': 0.3 }, filter: ['in', 'id', ''] },
      { id: 'parcelles-sale-highlight-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#F3FF58', 'line-width': 3.5, 'line-opacity': 0.9 }, filter: ['in', 'id', ''] }
    ];
    layers.forEach(layer => { if (!currentMap.getLayer(layer.id)) currentMap.addLayer(layer); });
  }, []);
  
  // *** THIS IS THE NEW FUNCTION TO PASS AS A PROP ***
  const resetSearchCenter = () => { 
    if (map.current) { 
      const currentCenter = map.current.getCenter(); 
      setSearchCenter([currentCenter.lng, currentCenter.lat]); 
      map.current.flyTo({ center: currentCenter, zoom: map.current.getZoom() });
    } 
  };
  
  useSearchCircle(map.current, isSearchMode, searchCenter, searchRadiusKm, setSearchCenter);
  
  const handleApiSearch = async (params: SearchParams) => {
    if (!map.current) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchRadiusKm(params.radiusKm);
    resultMarkers.forEach(marker => marker.remove());
    setResultMarkers([]);

    const queryParams = new URLSearchParams({
      lat: params.center[1].toString(),
      lon: params.center[0].toString(),
      radius: (params.radiusKm * 1000).toString(),
    });

    const endpoint = params.type === 'landSize' ? '/api/search/parcels' : '/api/search/dpe';
    
    if (params.type === 'landSize') {
        queryParams.append('minSize', params.minSize.toString());
        queryParams.append('maxSize', params.maxSize.toString());
    } else {
        queryParams.append('minConsumption', params.minConsumption.toString());
        queryParams.append('maxConsumption', params.maxConsumption.toString());
        queryParams.append('minEmissions', params.minEmissions.toString());
        queryParams.append('maxEmissions', params.maxEmissions.toString());
        queryParams.append('idealConsumption', params.idealConsumption.toString());
        queryParams.append('idealEmissions', params.idealEmissions.toString());
    }

    try {
        const response = await fetch(`${endpoint}?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Search request failed');
        const data = await response.json();
        setSearchResults(data);

        const newMarkers: maptilersdk.Marker[] = [];
        data.forEach((res: any) => {
            let lng: number | undefined, lat: number | undefined;
            if (res.center) { [lng, lat] = res.center; } 
            else if (res._geopoint) { 
                const parts = res._geopoint.split(',').map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { [lat, lng] = parts; }
            }
            if (lng !== undefined && lat !== undefined) {
                const marker = new maptilersdk.Marker({ color: '#ff00ff' }).setLngLat([lng, lat]).addTo(map.current!);
                newMarkers.push(marker);
            }
        });
        setResultMarkers(newMarkers);
    } catch (error) {
        console.error("Search failed:", error);
    } finally {
        setIsSearching(false);
    }
  };
  
  const handleResultClick = (result: DpeSearchResult | ParcelSearchResult) => {
    if (!map.current) return;
    let lng: number | undefined, lat: number | undefined;
    if ('center' in result) { [lng, lat] = result.center; } 
    else if ('_geopoint' in result) { 
        const parts = result._geopoint.split(',').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { [lat, lng] = parts; }
    }
    if(lng !== undefined && lat !== undefined) { map.current.flyTo({ center: [lng, lat], zoom: 18 }); }
  };
  
  useEffect(() => { if (isSearchMode) setSelectedParcelId(null); }, [isSearchMode]);
  
  useEffect(() => {
    const currentMap = map.current; if (!currentMap) return;
    if (!selectedParcelId) {
      const emptyFilter: FilterSpecification = ['in', 'id', ''];
      if (currentMap.getLayer('parcelles-click-fill')) currentMap.setFilter('parcelles-click-fill', ['==', 'id', '']);
      if (currentMap.getLayer('parcelles-click-line')) currentMap.setFilter('parcelles-click-line', ['==', 'id', '']);
      if (currentMap.getLayer('parcelles-sale-highlight-line')) currentMap.setFilter('parcelles-sale-highlight-line', emptyFilter);
      if (currentMap.getLayer('parcelles-sale-highlight-fill')) currentMap.setFilter('parcelles-sale-highlight-fill', emptyFilter);
      dpeMarkers.current.forEach(marker => marker.remove());
      dpeMarkers.current = [];
      setHighlightedSaleParcels([]);
      setParcelData(null); setBanAddress(null); setOtherAddresses([]); setShowOtherAddresses(false); setDpeResults([]); setDpeError(''); setDpeSearchInfo(''); setExpandedDpeId(null); setShowOtherDpeResults(false); setDvfResults([]); setDvfError(''); setDvfSearchInfo('');
      setIsPanelMinimized(false);
    }
  }, [selectedParcelId]);
  
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({ container: mapContainer.current, style: maptilersdk.MapStyle.BASIC, center: [2.3522, 48.8566], zoom: 15 });
    map.current = newMap;
    newMap.on('load', () => {
        addDataLayers();
        const throttledHoverHandler = throttle((e: maptilersdk.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => { if (e.features && e.features.length > 0) { newMap.getCanvas().style.cursor = 'pointer'; newMap.setFilter('parcelles-hover', ['==', 'id', e.features[0].properties?.id as string || '']); } }, 100);
        newMap.on('mousemove', 'parcelles-fill', throttledHoverHandler);
        newMap.on('mouseleave', 'parcelles-fill', () => { newMap.getCanvas().style.cursor = ''; newMap.setFilter('parcelles-hover', ['==', 'id', '']); });
    });
    return () => { if (map.current) { map.current.remove(); map.current = null; } };
  }, [addDataLayers, throttle]);

  useEffect(() => {
    const currentMap = map.current; if (!currentMap) return;
    const handleClick = async (e: maptilersdk.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        if (isSearchMode) return;
        if (e.features && e.features.length > 0) {
            const parcelFeature = e.features[0]; const parcelId = parcelFeature.properties?.id as string;
            if (parcelId) {
                setHighlightedSaleParcels([]); setShowOtherDpeResults(false); setExpandedDpeId(null); setIsPanelMinimized(false);
                currentMap.setFilter('parcelles-hover', ['==', 'id', '']); setSelectedParcelId(String(parcelId)); const bounds = new maptilersdk.LngLatBounds();
                const coordinates = (parcelFeature.geometry as Polygon).coordinates[0] as Position[]; coordinates.forEach((coord) => bounds.extend(coord as [number, number])); const center = bounds.getCenter().toArray() as [number, number];
                setIsLoading(true); setParcelData(null); setBanAddress(null); setOtherAddresses([]); setDpeResults([]); setDvfResults([]);
                try {
                    const parcelResponse = await fetch(`/api/cadastre/${parcelId}`); if (!parcelResponse.ok) throw new Error('Failed to fetch parcel data.');
                    const parcelJson = await parcelResponse.json(); setParcelData(parcelJson);
                    const inseeCode = parcelJson.code_insee; const targetParcelId = parcelJson.idu;
                    if (inseeCode && targetParcelId) { findDVF(inseeCode, targetParcelId); } else { setDvfError('INSEE code or Parcel ID missing.'); }
                    const addressResponse = await fetch(`/api/address?lon=${center[0]}&lat=${center[1]}`); if (!addressResponse.ok) throw new Error('Failed to fetch address.');
                    const addressFeatures: BanFeature[] = await addressResponse.json();
                    if (addressFeatures.length > 0) {
                        const bestResult = addressFeatures[0];
                        setBanAddress(bestResult); setOtherAddresses(addressFeatures.slice(1, 6));
                        const postalCode = bestResult.properties.postcode; const [banLon, banLat] = bestResult.geometry.coordinates;
                        if (postalCode && banLat && banLon) { findDPE(postalCode, banLat, banLon); } else { setDpeError('Address data incomplete for DPE scan.'); }
                    } else {
                        setDpeSearchInfo('No address found. Attempting DPE scan via geographic area...');
                        const parcelInseeCode = parcelJson.code_insee;
                        if (parcelInseeCode) {
                            try {
                                const geoResponse = await fetch(`https://geo.api.gouv.fr/communes/${parcelInseeCode}?fields=codesPostaux`);
                                if (geoResponse.ok) {
                                    const geoData = await geoResponse.json(); const postalCode = geoData.codesPostaux?.[0];
                                    if (postalCode) { findDPE(postalCode, center[1], center[0]); } else { setDpeSearchInfo('Could not find a postal code for this parcel to perform DPE scan.'); }
                                } else { throw new Error(`Geo API failed with status ${geoResponse.status}`); }
                            } catch (geoError) { console.error("Fallback DPE search failed:", geoError); setDpeError('An error occurred while trying to find a postal code for DPE scan.'); }
                        } else { setDpeSearchInfo('INSEE code is missing for this parcel, cannot perform DPE scan.'); }
                    }
                    if (map.current) { map.current.setFilter('parcelles-click-fill', ['==', 'id', parcelId]); map.current.setFilter('parcelles-click-line', ['==', 'id', parcelId]); }
                } catch (error) { console.error("Failed to fetch details:", error); const msg = error instanceof Error ? error.message : 'Unknown error'; setParcelData(null); setBanAddress(null); setDpeError(msg); setDvfError(msg);
                } finally { setIsLoading(false); }
            }
        }
    };
    currentMap.on('click', 'parcelles-fill', handleClick);
    return () => { currentMap.off('click', 'parcelles-fill', handleClick); };
  }, [isSearchMode, findDPE, findDVF]);

  useEffect(() => {
    const currentMap = map.current; if (!currentMap?.isStyleLoaded()) return; dpeMarkers.current.forEach(marker => marker.remove()); dpeMarkers.current = [];
    if (dpeResults.length > 0 && activeView === 'dpe') {
        dpeResults.slice(0, 10000).forEach((dpe) => {
            if (!dpe._geopoint) return;
            const [lat, lon] = dpe._geopoint.split(',').map(Number);
            if (isNaN(lat) || isNaN(lon)) return;
            const el = document.createElement('div'); el.innerText = dpe.etiquette_dpe; el.style.width = '30px'; el.style.height = '30px'; el.style.backgroundColor = getDpeColor(dpe.etiquette_dpe); el.style.color = ['A', 'B', 'C'].includes(dpe.etiquette_dpe) ? 'black' : 'white'; el.style.borderRadius = '50%'; el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; el.style.fontWeight = 'bold'; el.style.border = '2px solid white'; el.style.boxShadow = '0 0 5px black'; el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const dpeElement = document.getElementById(`dpe-${dpe.numero_dpe}`);
                if (dpeElement) {
                  const isHidden = !showOtherDpeResults && dpeResults.findIndex(r => r.numero_dpe === dpe.numero_dpe) > 0;
                  if (isHidden) { setShowOtherDpeResults(true); }
                  setTimeout(() => { dpeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); setExpandedDpeId(dpe.numero_dpe); }, 50);
                }
            });
            const marker = new maptilersdk.Marker({ element: el }).setLngLat([lon, lat]).addTo(currentMap);
            dpeMarkers.current.push(marker);
        });
    }
   }, [dpeResults, activeView, getDpeColor, showOtherDpeResults]);
   
  useEffect(() => { if (map.current) { const parcelIds = highlightedSaleParcels.map(p => p.id); const filter: FilterSpecification = parcelIds.length > 0 ? ['in', 'id', ...parcelIds] : ['in', 'id', '']; if (map.current.getLayer('parcelles-sale-highlight-line')) { map.current.setFilter('parcelles-sale-highlight-line', filter); } if (map.current.getLayer('parcelles-sale-highlight-fill')) { map.current.setFilter('parcelles-sale-highlight-fill', filter); } } }, [highlightedSaleParcels]);
  useEffect(() => { if (activeView === 'sales' && dvfResults.length > 0) { setHighlightedSaleParcels(dvfResults[0].l_idpar); } else { setHighlightedSaleParcels([]); } }, [activeView, dvfResults]);

  useEffect(() => {
    if (!map.current) return; 
    const newStyle = mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(newStyle, { transformStyle: (previousStyle, nextStyle) => {
        if (!previousStyle || !previousStyle.layers || !previousStyle.sources) return nextStyle; 
        const customLayers = previousStyle.layers.filter(layer => layer.id?.startsWith('parcelles-') || layer.id?.startsWith('search-area-')); 
        const customSources: { [key: string]: maptilersdk.SourceSpecification } = {};
        for (const [key, value] of Object.entries(previousStyle.sources)) { 
            if (key === 'cadastre-parcelles' || key === 'search-area-source') {
                customSources[key] = value as maptilersdk.SourceSpecification; 
            }
        }
        return { ...nextStyle, sources: { ...nextStyle.sources, ...customSources }, layers: [...nextStyle.layers, ...customLayers] };
      }
    });
  }, [mapStyle]);
  
  const getPanelTitle = () => { switch(activeView) { case 'cadastre': return 'PARCEL DETAILS'; case 'dpe': return 'DPE SCAN RESULTS'; case 'sales': return 'SALES HISTORY'; default: 'DETAILS'; } };
  
  const renderPanelContent = () => {
    if (isLoading) { return <div className="flex items-center justify-center gap-2 text-text-primary"><Loader2 className="animate-spin" size={16} /><span>INTERROGATING GRID...</span></div>; }
    switch (activeView) {
      case 'cadastre': 
        return parcelData ? ( <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"> <span className="font-semibold text-text-primary/80">IDU:</span><span className="font-bold text-white text-right">{parcelData.idu}</span> <span className="font-semibold text-text-primary/80">COMMUNE:</span><span className="font-bold text-white text-right">{parcelData.nom_com}</span> <span className="font-semibold text-text-primary/80">SECTION:</span><span className="font-bold text-white text-right">{parcelData.section}</span> <span className="font-semibold text-text-primary/80">NUMERO:</span><span className="font-bold text-white text-right">{parcelData.numero}</span> <span className="font-semibold text-text-primary/80">AREA:</span><span className="font-bold text-white text-right">{parcelData.contenance} m²</span> <span className="font-semibold text-text-primary/80">DEPT:</span><span className="font-bold text-white text-right">{parcelData.code_dep}</span> {banAddress && ( <> <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/30 pt-2">ADDRESS:</span> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(banAddress.properties.label)}`} target="_blank" rel="noopener noreferrer" className="col-span-2 font-bold text-accent-cyan text-right hover:underline">{banAddress.properties.label}</a> {otherAddresses.length > 0 && (<div className="col-span-2 text-right"><button onClick={() => setShowOtherAddresses(!showOtherAddresses)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 ml-auto">{showOtherAddresses ? 'Hide' : 'Show'} alternatives {showOtherAddresses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>)} </> )} {showOtherAddresses && otherAddresses.length > 0 && ( <div className="col-span-2 mt-2 space-y-1 border-t border-dashed border-accent-cyan/30 pt-2"> {otherAddresses.map((addr, index) => (<a key={index} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.properties.label)}`} target="_blank" rel="noopener noreferrer" className="block text-right text-xs text-accent-cyan/70 hover:underline">{addr.properties.label}</a>))} </div> )} </div> ) : <div className="text-center text-text-primary/70">Click on a parcel to see details.</div>;
      case 'dpe':
        if (isDpeLoading) { return <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>SCANNING DPE GRID...</span></div>; }
        if (dpeError) { return <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">{dpeError}</div>; }
        if (dpeResults.length === 0) { return dpeSearchInfo && !isDpeLoading ? (<div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dpeSearchInfo}</div>) : (<div className="text-center text-text-primary/70">No DPE results available.</div>); }
        const topResult = dpeResults[0];
        const otherResults = dpeResults.slice(1, 10000);
        const renderDpeItem = (dpe: DPERecord, isTopResult: boolean) => (<div key={dpe.numero_dpe} id={`dpe-${dpe.numero_dpe}`} className={`p-3 rounded-lg transition-all ${expandedDpeId === dpe.numero_dpe ? 'bg-accent-cyan/10' : ''}`}><div className={`text-sm font-bold mb-2 ${isTopResult ? 'text-accent-magenta' : 'text-accent-cyan'}`}>{isTopResult ? 'Closest Result' : `Result #${dpeResults.indexOf(dpe) + 1}`}: ~{Math.round(dpe._distance ?? 0)}m</div><div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm"><span className="font-semibold text-text-primary/80">Address:</span><span className="font-bold text-white text-right">{dpe.adresse_ban || 'N/A'}</span><span className="font-semibold text-text-primary/80">Date:</span><span className="font-bold text-white text-right">{dpe.date_etablissement_dpe ? new Date(dpe.date_etablissement_dpe).toLocaleDateString() : 'N/A'}</span><span className="font-semibold text-text-primary/80">Energy:</span><span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_dpe) }}>{dpe.etiquette_dpe}</span><span className="font-semibold text-text-primary/80">GHG:</span><span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_ges) }}>{dpe.etiquette_ges}</span></div><button onClick={() => setExpandedDpeId(expandedDpeId === dpe.numero_dpe ? null : dpe.numero_dpe)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 mt-3">{expandedDpeId === dpe.numero_dpe ? 'Hide' : 'Show'} Details <ChevronDown className={`transition-transform ${expandedDpeId === dpe.numero_dpe ? 'rotate-180' : ''}`} size={14} /></button>{expandedDpeId === dpe.numero_dpe && (<div className="mt-3 pt-3 border-t border-dashed border-accent-cyan/20 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm"><span className="font-semibold text-text-primary/80">Hab. Surface:</span><span className="font-bold text-white text-right">{dpe.surface_habitable_logement ? `${dpe.surface_habitable_logement} m²` : 'N/A'}</span><span className="font-semibold text-text-primary/80">Building Type:</span><span className="font-bold text-white text-right">{dpe.type_batiment || 'N/A'}</span><span className="font-semibold text-text-primary/80">Heating:</span><span className="font-bold text-white text-right truncate">{dpe.type_generateur_chauffage_principal || 'N/A'}</span></div>)}</div>);
        return <div>{dpeSearchInfo && !isDpeLoading && <div className="p-3 mb-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dpeSearchInfo}</div>}<div className="space-y-2">{renderDpeItem(topResult, true)}{otherResults.length > 0 && <div className="pt-3 mt-3 border-t border-accent-cyan/50"><button onClick={() => setShowOtherDpeResults(!showOtherDpeResults)} className="w-full text-center text-accent-cyan hover:text-accent-magenta flex items-center justify-center gap-2 font-bold">{showOtherDpeResults ? 'Hide' : `Show ${otherResults.length} Other Results`} <ChevronDown className={`transition-transform ${showOtherDpeResults ? 'rotate-180' : ''}`} size={16} /></button>{showOtherDpeResults && <div className="mt-2 space-y-2">{otherResults.map(dpe => <div key={dpe.numero_dpe} className="border-t border-dashed border-accent-cyan/30">{renderDpeItem(dpe, false)}</div>)}</div>}</div>}</div></div>;
      case 'sales':
        if (isDvfLoading) { return <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>SCANNING DVF GRID...</span></div> }
        if (dvfError) { return <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">{dvfError}</div> }
        if (dvfResults.length === 0) { return dvfSearchInfo && !isDvfLoading ? (<div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dvfSearchInfo}</div>) : (<div className="text-center text-text-primary/70">No sales history available.</div>); }
        return <div className="space-y-2">{dvfResults.slice(0, 10).map((sale, index) => (<div key={sale.idmutinvar} onClick={() => setHighlightedSaleParcels(sale.l_idpar)} className={`w-full text-left p-2 rounded-md transition-all cursor-pointer hover:bg-accent-yellow/20 focus:outline-none focus:ring-2 focus:ring-accent-yellow ${highlightedSaleParcels.map(p => p.id).join(',') === sale.l_idpar.map(p => p.id).join(',') ? 'bg-accent-yellow/20 ring-2 ring-accent-yellow' : ''}`} role="button" tabIndex={0}><div className={`pt-2 ${index > 0 ? 'border-t border-dashed border-accent-cyan/30' : ''}`}><div className={`text-sm font-bold mb-2 ${index === 0 ? 'text-accent-magenta' : 'text-accent-cyan'}`}> SALE: {new Date(sale.datemut).toLocaleDateString()} </div><div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><span className="font-semibold text-text-primary/80">PRICE:</span><span className="font-bold text-white text-right">{parseFloat(sale.valeurfonc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span><span className="font-semibold text-text-primary/80">TYPE:</span><span className="font-bold text-white text-right">{sale.libtypbien || 'N/A'}</span><span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/20 pt-2">PARCELS ({sale.l_idpar.length}):</span><div className="col-span-2 text-right font-mono text-xs text-accent-cyan/80 space-y-1">{sale.l_idpar.map(p => <div key={p.id}>{p.id} ({p.sterr} m²)</div>)}{sale.l_idpar.length > 1 && <div className="font-bold text-white text-sm border-t border-dashed border-accent-cyan/20 pt-1 mt-1">TOTAL AREA: {sale.sterr} m²</div>}</div></div></div></div>))}</div>;
      default: return null;
    }
  };
  
  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
      <div className="absolute top-4 left-4 z-10 w-72">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-accent-cyan/70" size={20} />
          <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search for an address..." className="w-full pl-10 pr-10 py-2 bg-container-bg border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta shadow-glow-cyan" />
          {searchQuery.length > 0 && ( <button onClick={handleClearSearch} className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan" aria-label="Clear search"><X size={20} /></button> )}
        </div>
        {suggestions.length > 0 && ( <div className="absolute mt-2 w-full bg-container-bg border border-accent-cyan rounded-md shadow-lg max-h-60 overflow-y-auto"> {suggestions.map((feature, index) => ( <div key={index} onClick={() => handleSuggestionClick(feature)} className="px-4 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer"> {feature.properties.label} {feature.properties.postcode && <span className="text-accent-cyan/70 ml-2">({feature.properties.postcode})</span>} </div> ))} </div> )}
      </div>

      {(selectedParcelId && !isSearchMode) && (
        <div className="absolute top-20 sm:top-4 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]"> {getPanelTitle()} </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPanelMinimized(!isPanelMinimized)} className="text-accent-cyan/70 hover:text-accent-cyan">{isPanelMinimized ? <Plus size={20} /> : <Minus size={20} />}</button>
              <button onClick={() => setSelectedParcelId(null)} className="text-accent-cyan/70 hover:text-accent-cyan"><X size={20} /></button>
            </div>
          </div>
          {!isPanelMinimized && (<div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4">{renderPanelContent()}</div>)}
        </div>
      )}

      {isSearchMode && (
        <SearchPanel
          onClose={() => {
            setIsSearchMode(false);
            setSearchResults([]);
            resultMarkers.forEach(marker => marker.remove());
            setResultMarkers([]);
          }}
          onSearch={handleApiSearch}
          onRecenter={resetSearchCenter}
          center={searchCenter}
          results={searchResults}
          isLoading={isSearching}
          onResultClick={handleResultClick}
        />
      )}

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button onClick={() => setMapStyle(style => style === 'basic-v2' ? 'satellite' : 'basic-v2')} className="rounded-md border-2 border-accent-cyan bg-container-bg px-4 py-2 font-bold text-accent-cyan shadow-glow-cyan transition hover:bg-accent-cyan hover:text-background-dark">
          {mapStyle === 'basic-v2' ? 'Satellite' : 'Basic'}
        </button>
      </div>
    </div>
  );
}
