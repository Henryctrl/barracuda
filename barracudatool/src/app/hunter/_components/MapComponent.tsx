'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import type { FilterSpecification } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Loader2, X, ChevronDown, ChevronUp, Search, Minus, Plus } from 'lucide-react'; // Added Minus and Plus icons
import type { Polygon, Position } from 'geojson';


// --- Interfaces ---
interface ParcelData {
  idu: string; contenance: number; code_insee: string; section: string; code_dep: string; numero: string; nom_com: string; [key: string]: unknown;
}
interface BanFeature {
  geometry: { coordinates: [number, number]; };
  properties: { label: string; housenumber?: string; postcode?: string; city?: string; };
}
interface DPERecord {
  'numero_dpe': string;
  'adresse_ban': string;
  'date_etablissement_dpe': string;
  'etiquette_dpe': string;
  'etiquette_ges': string;
  'surface_habitable_logement': number;
  'conso_5_usages_par_m2_ep': number;
  'conso_5_usages_par_m2_ef': number;
  'emission_ges_5_usages_par_m2': number;
  'type_batiment': string;
  'type_generateur_chauffage_principal': string;
  '_geopoint': string;
  'nom_commune_ban': string;
  '_distance'?: number;
}
interface ParcelInfo {
  id: string;
  sterr: number;
}
interface DVFRecord {
  idmutinvar: string; datemut: string; valeurfonc: string; libtypbien: string; sbati: string; sterr: string;
  l_idpar: ParcelInfo[];
  l_addr: string; geom: { coordinates: number[][][][]; }; _distance?: number;
}


interface MapComponentProps {
  activeView: 'cadastre' | 'dpe' | 'sales';
}


export function MapComponent({ activeView }: MapComponentProps) {
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
  // ADDED: State to manage the panel's minimized/maximized view
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);


  // API Call Functions
  const findDPE = useCallback(async (postalCode: string, lat: number, lon: number) => {
    setIsDpeLoading(true); setDpeError(''); setDpeResults([]); setDpeSearchInfo('INITIALIZING DPE SECTOR SCAN...');
    try {
      setDpeSearchInfo(`QUERYING INTERNAL BARRACUDA GRID FOR SECTOR ${postalCode}...`);
      const response = await fetch(`/api/dpe?postalCode=${postalCode}&lat=${lat}&lon=${lon}`);
      if (!response.ok) throw new Error('DPE data fetch failed');
      const data: DPERecord[] = await response.json();
      if (data.length === 0) { 
        setDpeSearchInfo(`NO DPE ASSETS FOUND IN SECTOR ${postalCode}.`); 
        return; 
      }
      
      data.sort((a, b) => {
        const distanceDiff = (a._distance ?? Infinity) - (b._distance ?? Infinity);
        if (distanceDiff !== 0) return distanceDiff;
        const dateA = a.date_etablissement_dpe ? new Date(a.date_etablissement_dpe).getTime() : 0;
        const dateB = b.date_etablissement_dpe ? new Date(b.date_etablissement_dpe).getTime() : 0;
        return dateB - dateA;
      });
      setDpeResults(data);
      setDpeSearchInfo(`ANALYSIS COMPLETE. ${data.length} VALID ASSETS FOUND.`);
    } catch (err) { const msg = err instanceof Error ? err.message : 'Unknown DPE Error'; setDpeError(msg);
    } finally { setIsDpeLoading(false); }
  }, []);
  
  const findDVF = useCallback(async (inseeCode: string, targetParcelId: string) => {
    setIsDvfLoading(true); setDvfError(''); setDvfResults([]); setDvfSearchInfo('INITIALIZING DVF SECTOR SCAN...');
    try {
      setDvfSearchInfo(`QUERYING INTERNAL BARRACUDA GRID FOR PARCEL ${targetParcelId}...`);
      const response = await fetch(`/api/dvf?inseeCode=${inseeCode}&targetParcelId=${targetParcelId}`);
      if (!response.ok) throw new Error('DVF data fetch failed');
      const filteredSales: DVFRecord[] = await response.json();
      if (filteredSales.length === 0) { setDvfSearchInfo(`NO SALES HISTORY FOUND FOR THIS SPECIFIC PARCEL.`);
      } else { setDvfResults(filteredSales); setDvfSearchInfo(`ANALYSIS COMPLETE. ${filteredSales.length} HISTORICAL SALES FOUND.`); }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Unknown DVF Error'; setDvfError(msg);
    } finally { setIsDvfLoading(false); }
  }, []);
  
  // Helper Functions
  const getDpeColor = useCallback((rating: string) => { switch (rating) { case 'A': return '#00ff00'; case 'B': return '#adff2f'; case 'C': return '#ffff00'; case 'D': return '#ffd700'; case 'E': return '#ffa500'; case 'F': return '#ff4500'; case 'G': return '#ff0000'; default: return '#808080'; } }, []);
  const throttle = useCallback(<T extends unknown[]>(func: (...args: T) => void, limit: number) => { let inThrottle: boolean = false; return function(this: unknown, ...args: T) { if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); } } }, []);
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try { const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`); const data = await response.json(); setSuggestions(data.features || []); } catch (error) { console.error("Failed to fetch suggestions:", error); setSuggestions([]); }
  }, []);
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
  
  // Main useEffect Hooks
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
      // ADDED: Reset panel view state when closed
      setIsPanelMinimized(false);
    }
  }, [selectedParcelId]);
  
  useEffect(() => {
    if (map.current || !mapContainer.current) return; maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!; const newMap = new maptilersdk.Map({ container: mapContainer.current, style: maptilersdk.MapStyle.BASIC, center: [2.3522, 48.8566], zoom: 15, }); map.current = newMap;
    newMap.on('load', () => {
      addDataLayers();
      const throttledHoverHandler = throttle((e: maptilersdk.MapMouseEvent & { features?: maptilersdk.MapGeoJSONFeature[] }) => { if (e.features && e.features.length > 0) { newMap.getCanvas().style.cursor = 'pointer'; newMap.setFilter('parcelles-hover', ['==', 'id', e.features[0].properties?.id as string || '']); } }, 100);
      newMap.on('mousemove', 'parcelles-fill', throttledHoverHandler);
      newMap.on('mouseleave', 'parcelles-fill', () => { newMap.getCanvas().style.cursor = ''; newMap.setFilter('parcelles-hover', ['==', 'id', '']); });
      newMap.on('click', 'parcelles-fill', async (e) => {
         if (e.features && e.features.length > 0) {
           const parcelFeature = e.features[0]; const parcelId = parcelFeature.properties?.id as string;
           if (parcelId) {
             // Reset state for new selection
             setHighlightedSaleParcels([]); setShowOtherDpeResults(false); setExpandedDpeId(null); setIsPanelMinimized(false);
             newMap.setFilter('parcelles-hover', ['==', 'id', '']); setSelectedParcelId(String(parcelId)); const bounds = new maptilersdk.LngLatBounds();
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
                  // No address found, but try to get DPE results using the parcel's INSEE code.
                  setDpeSearchInfo('No address found. Attempting DPE scan via geographic area...');
                  const parcelInseeCode = parcelJson.code_insee;
                  if (parcelInseeCode) {
                    try {
                      // Use the geo.api.gouv.fr to find postal codes for the given INSEE code.
                      const geoResponse = await fetch(`https://geo.api.gouv.fr/communes/${parcelInseeCode}?fields=codesPostaux`);
                      if (geoResponse.ok) {
                        const geoData = await geoResponse.json();
                        const postalCode = geoData.codesPostaux?.[0]; // Use the first postal code found.
                        if (postalCode) {
                          // If a postal code is found, perform the DPE search using the parcel's center coordinates.
                          findDPE(postalCode, center[1], center[0]);
                        } else {
                          // Inform the user if no postal code could be found for the area.
                          setDpeSearchInfo('Could not find a postal code for this parcel to perform DPE scan.');
                        }
                      } else {
                        // Handle cases where the Geo API call fails.
                        throw new Error(`Geo API failed with status ${geoResponse.status}`);
                      }
                    } catch (geoError) {
                      console.error("Fallback DPE search failed:", geoError);
                      setDpeError('An error occurred while trying to find a postal code for DPE scan.');
                    }
                  } else {
                    // Inform the user if the parcel data itself is missing the necessary INSEE code.
                    setDpeSearchInfo('INSEE code is missing for this parcel, cannot perform DPE scan.');
                  }
                }
                if (map.current) { map.current.setFilter('parcelles-click-fill', ['==', 'id', parcelId]); map.current.setFilter('parcelles-click-line', ['==', 'id', parcelId]); }
             } catch (error) { console.error("Failed to fetch details:", error); const msg = error instanceof Error ? error.message : 'Unknown error'; setParcelData(null); setBanAddress(null); setDpeError(msg); setDvfError(msg);
             } finally { setIsLoading(false); }
           }
         }
      });
    });
    return () => { newMap.remove(); map.current = null; };
  }, [addDataLayers, throttle, findDPE, findDVF]);
  
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap?.isStyleLoaded()) return;
    dpeMarkers.current.forEach(marker => marker.remove());
    dpeMarkers.current = [];
    if (dpeResults.length > 0 && activeView === 'dpe') {
        dpeResults.slice(0, 100).forEach((dpe) => {
            if (!dpe._geopoint) return;
            const [lat, lon] = dpe._geopoint.split(',').map(Number);
            if (isNaN(lat) || isNaN(lon)) return;
            const el = document.createElement('div');
            el.innerText = dpe.etiquette_dpe;
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.backgroundColor = getDpeColor(dpe.etiquette_dpe);
            el.style.color = ['A', 'B', 'C'].includes(dpe.etiquette_dpe) ? 'black' : 'white';
            el.style.borderRadius = '50%';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontWeight = 'bold';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 0 5px black';
            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const dpeElement = document.getElementById(`dpe-${dpe.numero_dpe}`);
                if (dpeElement) {
                  const isHidden = !showOtherDpeResults && dpeResults.findIndex(r => r.numero_dpe === dpe.numero_dpe) > 0;
                  if (isHidden) {
                      setShowOtherDpeResults(true);
                  }
                  setTimeout(() => {
                      dpeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setExpandedDpeId(dpe.numero_dpe);
                  }, 50);
                }
            });
            const marker = new maptilersdk.Marker({ element: el })
                .setLngLat([lon, lat])
                .addTo(currentMap);
            
            dpeMarkers.current.push(marker);
        });
    }
  }, [dpeResults, activeView, getDpeColor, showOtherDpeResults]);
  
  useEffect(() => {
    if (map.current) {
      const parcelIds = highlightedSaleParcels.map(p => p.id);
      const filter: FilterSpecification = parcelIds.length > 0 ? ['in', 'id', ...parcelIds] : ['in', 'id', ''];
      if (map.current.getLayer('parcelles-sale-highlight-line')) {
        map.current.setFilter('parcelles-sale-highlight-line', filter);
      }
      if (map.current.getLayer('parcelles-sale-highlight-fill')) {
        map.current.setFilter('parcelles-sale-highlight-fill', filter);
      }
    }
  }, [highlightedSaleParcels]);
  
  useEffect(() => {
    if (activeView === 'sales' && dvfResults.length > 0) {
      setHighlightedSaleParcels(dvfResults[0].l_idpar);
    } else {
      setHighlightedSaleParcels([]);
    }
  }, [activeView, dvfResults]);
  
  useEffect(() => {
    if (!map.current) return; const newStyle = mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(newStyle, { transformStyle: (previousStyle, nextStyle) => {
        if (!previousStyle || !previousStyle.layers || !previousStyle.sources) return nextStyle; const customLayers = previousStyle.layers.filter(layer => layer.id?.startsWith('parcelles-')); const customSources: { [key: string]: maptilersdk.SourceSpecification } = {};
        for (const [key, value] of Object.entries(previousStyle.sources)) { if (key === 'cadastre-parcelles') customSources[key] = value as maptilersdk.SourceSpecification; }
        return { ...nextStyle, sources: { ...nextStyle.sources, ...customSources }, layers: [...nextStyle.layers, ...customLayers] };
      }
    });
  }, [mapStyle]);
  
  // Render Functions
  const formatSection = (section: string) => section ? section.replace(/[0-9-]/g, '') : 'N/A';
  const createGoogleMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const getPanelTitle = () => { switch(activeView) { case 'cadastre': return 'PARCEL DETAILS'; case 'dpe': return 'DPE SCAN RESULTS'; case 'sales': return 'SALES HISTORY'; default: 'DETAILS'; } };
  
  const renderPanelContent = () => {
    if (isLoading) { return <div className="flex items-center justify-center gap-2 text-text-primary"><Loader2 className="animate-spin" size={16} /><span>INTERROGATING GRID...</span></div>; }
    switch (activeView) {
      case 'cadastre': return parcelData ? ( <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"> <span className="font-semibold text-text-primary/80">IDU:</span><span className="font-bold text-white text-right">{parcelData.idu}</span> <span className="font-semibold text-text-primary/80">COMMUNE:</span><span className="font-bold text-white text-right">{parcelData.nom_com}</span> <span className="font-semibold text-text-primary/80">SECTION:</span><span className="font-bold text-white text-right">{formatSection(parcelData.section)}</span> <span className="font-semibold text-text-primary/80">NUMERO:</span><span className="font-bold text-white text-right">{parcelData.numero}</span> <span className="font-semibold text-text-primary/80">AREA:</span><span className="font-bold text-white text-right">{parcelData.contenance} m²</span> <span className="font-semibold text-text-primary/80">DEPT:</span><span className="font-bold text-white text-right">{parcelData.code_dep}</span> {banAddress && ( <> <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/30 pt-2">ADDRESS:</span> <a href={createGoogleMapsLink(banAddress.properties.label)} target="_blank" rel="noopener noreferrer" className="col-span-2 font-bold text-accent-cyan text-right hover:underline">{banAddress.properties.label}</a> {otherAddresses.length > 0 && (<div className="col-span-2 text-right"><button onClick={() => setShowOtherAddresses(!showOtherAddresses)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 ml-auto">{showOtherAddresses ? 'Hide' : 'Show'} alternatives {showOtherAddresses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>)} </> )} {showOtherAddresses && otherAddresses.length > 0 && ( <div className="col-span-2 mt-2 space-y-1 border-t border-dashed border-accent-cyan/30 pt-2"> {otherAddresses.map((addr, index) => (<a key={index} href={createGoogleMapsLink(addr.properties.label)} target="_blank" rel="noopener noreferrer" className="block text-right text-xs text-accent-cyan/70 hover:underline">{addr.properties.label}</a>))} </div> )} </div> ) : <div className="text-center text-text-primary/70">Click on a parcel to see details.</div>;
      
      case 'dpe':
        if (isDpeLoading) { return <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>SCANNING DPE GRID...</span></div>; }
        if (dpeError) { return <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">{dpeError}</div>; }
        if (dpeResults.length === 0) { return dpeSearchInfo && !isDpeLoading ? (<div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dpeSearchInfo}</div>) : (<div className="text-center text-text-primary/70">No DPE results available.</div>); }
        const topResult = dpeResults[0];
        const otherResults = dpeResults.slice(1, 100);
        const allParcelAddresses = [banAddress?.properties.label, ...otherAddresses.map(a => a.properties.label)].filter((label): label is string => !!label);
        
        const dpeAddressGroups = dpeResults.reduce((acc, dpe) => {
            if(dpe.adresse_ban) {
                acc[dpe.adresse_ban] = acc[dpe.adresse_ban] || [];
                acc[dpe.adresse_ban].push(dpe);
            }
            return acc;
        }, {} as Record<string, DPERecord[]>);
        for (const address in dpeAddressGroups) {
            dpeAddressGroups[address].sort((a, b) => new Date(b.date_etablissement_dpe).getTime() - new Date(a.date_etablissement_dpe).getTime());
        }
        const renderDpeItem = (dpe: DPERecord, index: number) => {
            const isExpanded = expandedDpeId === dpe.numero_dpe;
            const isAddressMatch = allParcelAddresses.some(addr => addr === dpe.adresse_ban);
            const group = dpeAddressGroups[dpe.adresse_ban] || [];
            const isPrevMatch = group.length > 1 && group[0].numero_dpe !== dpe.numero_dpe;
            return (
                <div key={dpe.numero_dpe} id={`dpe-${dpe.numero_dpe}`} className={`p-3 rounded-lg transition-all ${expandedDpeId === dpe.numero_dpe ? 'bg-accent-cyan/10' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`text-sm font-bold ${index === 0 ? 'text-accent-magenta' : 'text-accent-cyan'}`}>
                            {index === 0 ? 'Closest Result' : `Result #${index + 1}`}: ~{Math.round(dpe._distance ?? 0)}m
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {isAddressMatch && <span className="text-xs font-bold bg-green-500/30 text-green-300 px-2 py-1 rounded-full">ADDRESS MATCH</span>}
                            {isPrevMatch && <span className="text-xs font-bold bg-yellow-500/30 text-yellow-300 px-2 py-1 rounded-full">PREV. REPORT</span>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                        <span className="font-semibold text-text-primary/80">Address:</span><span className="font-bold text-white text-right">{dpe.adresse_ban || 'N/A'}</span>
                        <span className="font-semibold text-text-primary/80">Date:</span><span className="font-bold text-white text-right">{dpe.date_etablissement_dpe ? new Date(dpe.date_etablissement_dpe).toLocaleDateString() : 'N/A'}</span>
                        <span className="font-semibold text-text-primary/80">Energy:</span><span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_dpe) }}>{dpe.etiquette_dpe}</span>
                        <span className="font-semibold text-text-primary/80">GHG:</span><span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_ges) }}>{dpe.etiquette_ges}</span>
                        <span className="font-semibold text-text-primary/80">ID:</span><span className="font-mono text-white text-right text-xs">{dpe.numero_dpe}</span>
                    </div>
                    <button onClick={() => setExpandedDpeId(isExpanded ? null : dpe.numero_dpe)} className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 mt-3">
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-dashed border-accent-cyan/20 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            <span className="font-semibold text-text-primary/80">Hab. Surface:</span><span className="font-bold text-white text-right">{dpe.surface_habitable_logement ? `${dpe.surface_habitable_logement} m²` : 'N/A'}</span>
                            <span className="font-semibold text-text-primary/80">Building Type:</span><span className="font-bold text-white text-right">{dpe.type_batiment || 'N/A'}</span>
                            <span className="font-semibold text-text-primary/80">Heating:</span><span className="font-bold text-white text-right truncate">{dpe.type_generateur_chauffage_principal || 'N/A'}</span>
                            <span className="font-semibold text-text-primary/80">Conso Primaire/m²:</span><span className="font-bold text-white text-right">{dpe.conso_5_usages_par_m2_ep ?? 'N/A'}</span>
                            <span className="font-semibold text-text-primary/80">Conso Finale/m²:</span><span className="font-bold text-white text-right">{dpe.conso_5_usages_par_m2_ef ?? 'N/A'}</span>
                            <span className="font-semibold text-text-primary/80">Emissions Gaz/m²:</span><span className="font-bold text-white text-right">{dpe.emission_ges_5_usages_par_m2 ?? 'N/A'}</span>
                        </div>
                    )}
                </div>
            );
        };
        return (
            <div>
                {dpeSearchInfo && !isDpeLoading && (<div className="p-3 mb-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dpeSearchInfo}</div>)}
                <div className="space-y-2">
                    {renderDpeItem(topResult, 0)}
                    {otherResults.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-accent-cyan/50">
                            <button onClick={() => setShowOtherDpeResults(!showOtherDpeResults)} className="w-full text-center text-accent-cyan hover:text-accent-magenta flex items-center justify-center gap-2 font-bold">
                                {showOtherDpeResults ? 'Hide Other Results' : `Show ${otherResults.length} Other Nearby Results`}
                                {showOtherDpeResults ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showOtherDpeResults && (
                                <div className="mt-2 space-y-2">
                                    {otherResults.map((dpe, index) => (
                                        <div key={dpe.numero_dpe} className="border-t border-dashed border-accent-cyan/30">
                                            {renderDpeItem(dpe, index + 1)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
      case 'sales': return ( <div> {isDvfLoading && <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>SCANNING DVF GRID...</span></div>} {dvfError && <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">{dvfError}</div>} {dvfSearchInfo && !isDvfLoading && <div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">{dvfSearchInfo}</div>} {dvfResults.length > 0 && ( <div className="space-y-2"> {dvfResults.slice(0, 10).map((sale, index) => { 
        const highlightedIds = highlightedSaleParcels.map(p => p.id).join(',');
        const saleIds = sale.l_idpar.map(p => p.id).join(',');
        const isHighlighted = highlightedIds === saleIds;
        return ( 
          <div key={sale.idmutinvar} onClick={() => setHighlightedSaleParcels(sale.l_idpar)} className={`w-full text-left p-2 rounded-md transition-all cursor-pointer hover:bg-accent-yellow/20 focus:outline-none focus:ring-2 focus:ring-accent-yellow ${isHighlighted ? 'bg-accent-yellow/20 ring-2 ring-accent-yellow' : ''}`} role="button" tabIndex={0} > 
            <div className={`pt-2 ${index > 0 ? 'border-t border-dashed border-accent-cyan/30' : ''}`}> 
              <div className={`text-sm font-bold mb-2 ${index === 0 ? 'text-accent-magenta' : 'text-accent-cyan'}`}> SALE: {new Date(sale.datemut).toLocaleDateString()} </div> 
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"> 
                <span className="font-semibold text-text-primary/80">PRICE:</span><span className="font-bold text-white text-right">{parseFloat(sale.valeurfonc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || 'N/A'}</span>
                <span className="font-semibold text-text-primary/80">PROPERTY TYPE:</span><span className="font-bold text-white text-right">{sale.libtypbien || 'N/A'}</span>
                <span className="font-semibold text-text-primary/80">HABITABLE AREA:</span><span className="font-bold text-white text-right">{sale.sbati ? `${parseFloat(sale.sbati)} m²` : 'N/A'}</span> 
                
                {sale.l_idpar.length <= 1 && (
                    <span className="font-semibold text-text-primary/80">LAND AREA:</span>
                )}
                {sale.l_idpar.length <= 1 && (
                    <span className="font-bold text-white text-right">{sale.sterr ? `${parseFloat(sale.sterr)} m²` : 'N/A'}</span> 
                )}


                <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/20 pt-2">CADASTRAL PARCELS ({sale.l_idpar.length}):</span> 
                <div className="col-span-2 text-right font-mono text-xs text-accent-cyan/80 space-y-1"> 
                  {sale.l_idpar.map(parcel => <div key={parcel.id}>{parcel.id} ({parcel.sterr} m²)</div>)} 
                  {sale.l_idpar.length > 1 && (
                    <div className="font-bold text-white text-sm border-t border-dashed border-accent-cyan/20 pt-1 mt-1">
                      TOTAL LAND AREA: {sale.sterr} m²
                    </div>
                  )}
                </div> 
              </div> 
            </div> 
          </div> 
        ); 
      })} </div> )} </div> );
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
      {(selectedParcelId) && (
        <div className="absolute top-20 sm:top-4 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]"> {getPanelTitle()} </h3>
            {/* ADDED: Group of control buttons */}
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPanelMinimized(!isPanelMinimized)} className="text-accent-cyan/70 hover:text-accent-cyan">
                {isPanelMinimized ? <Plus size={20} /> : <Minus size={20} />}
              </button>
              <button onClick={() => setSelectedParcelId(null)} className="text-accent-cyan/70 hover:text-accent-cyan">
                <X size={20} />
              </button>
            </div>
          </div>
          {/* ADDED: Conditional rendering for the panel content */}
          {!isPanelMinimized && (
            <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4"> 
              {renderPanelContent()} 
            </div>
          )}
        </div>
      )}
      <button onClick={() => setMapStyle(style => style === 'basic-v2' ? 'satellite' : 'basic-v2')} className="absolute top-4 right-12 z-10 rounded-md border-2 border-accent-cyan bg-container-bg px-4 py-2 font-bold text-accent-cyan shadow-glow-cyan transition hover:bg-accent-cyan hover:text-background-dark">
        {mapStyle === 'basic-v2' ? 'Satellite' : 'Basic'}
      </button>
    </div>
  );
}
