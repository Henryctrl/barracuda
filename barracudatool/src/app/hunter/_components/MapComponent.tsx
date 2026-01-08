'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import type { FilterSpecification, MapGeoJSONFeature } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { X, ChevronDown, ChevronUp, Search, Filter, RotateCcw, MapPin, Plus, Minus } from 'lucide-react';
import type { Polygon, Position } from 'geojson';

import { SearchPanel, SearchParams } from './SearchPanel';
import { useSearchCircle } from '../../../hooks/useSearchCircle';
import { ParcelSearchResult, DPERecord as DpeSearchResult } from '../types';
import BarracudaLoader from '../../../components/loaders/BarracudaLoader';

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
  const [dpeAutoIncrement, setDpeAutoIncrement] = useState(false);
  const [dpeHighlightedParcelId, setDpeHighlightedParcelId] = useState<string | null>(null);
const [dpeScanCommune, setDpeScanCommune] = useState<string | null>(null);
const [communeBoundaries, setCommuneBoundaries] = useState<any>(null);


  
  const [searchCenter, setSearchCenter] = useState<[number, number]>([2.3522, 48.8566]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<(DpeSearchResult | ParcelSearchResult)[]>([]);
  const [resultMarkers, setResultMarkers] = useState<maptilersdk.Marker[]>([]);
  const [searchRadiusKm, setSearchRadiusKm] = useState(2);
  
  const [dpeMinConso, setDpeMinConso] = useState(0);
  const [dpeMaxConso, setDpeMaxConso] = useState(800);
  const [dpeMinEmissions, setDpeMinEmissions] = useState(0);
  const [dpeMaxEmissions, setDpeMaxEmissions] = useState(200);
  const [showDpeFilters, setShowDpeFilters] = useState(false);
  const [dpeStartDate, setDpeStartDate] = useState('');
  const [dpeEndDate, setDpeEndDate] = useState('');

  const formatEuropeanDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchCommuneBoundaries = useCallback(async (communeNames: string[]) => {
    try {
      // Get unique commune names
      const uniqueCommunes = [...new Set(communeNames)];
      
      // Fetch boundaries for all communes
      const boundaries = await Promise.all(
        uniqueCommunes.map(async (communeName) => {
          try {
            // Search for commune by name
            const searchResponse = await fetch(
              `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(communeName)}&fields=nom,code,contour&format=geojson&geometry=contour`
            );
            
            if (searchResponse.ok) {
              const data = await searchResponse.json();
              return data.features && data.features.length > 0 ? data.features[0] : null;
            }
            return null;
          } catch (error) {
            console.error(`Failed to fetch boundary for ${communeName}`, error);
            return null;
          }
        })
      );
      
      // Filter out nulls and combine into FeatureCollection
      const validBoundaries = boundaries.filter(b => b !== null);
      
      if (validBoundaries.length > 0) {
        setCommuneBoundaries({
          type: 'FeatureCollection',
          features: validBoundaries
        });
      }
    } catch (error) {
      console.error('Failed to fetch commune boundaries', error);
    }
  }, []);

  const findDPE = useCallback(async (postalCode: string, lat: number, lon: number) => {
    setIsDpeLoading(true);
    setDpeError('');
    setDpeResults([]);
    setDpeSearchInfo('INITIALIZING DPE SECTOR SCAN...');
    setDpeScanCommune(postalCode); // Store the postal code for boundary display
    
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
      setDpeSearchInfo(`ANALYSIS COMPLETE. ${data.length} RAW ASSETS FOUND.`);

      // Fetch commune boundaries based on results
const communeNames = data
.map(dpe => dpe.nom_commune_ban)
.filter(name => name && name.trim() !== '');
if (communeNames.length > 0) {
fetchCommuneBoundaries(communeNames);
}

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown DPE Error';
      setDpeError(msg);
    } finally {
      setIsDpeLoading(false);
    }
  }, [fetchCommuneBoundaries]);
  

  const findDVF = useCallback(async (inseeCode: string, targetParcelId: string) => {
    setIsDvfLoading(true);
    setDvfError('');
    setDvfResults([]);
    setDvfSearchInfo('INITIALIZING DVF SECTOR SCAN...');
    
    try {
      setDvfSearchInfo(`QUERYING INTERNAL BARRACUDA GRID FOR PARCEL ${targetParcelId}...`);
      const response = await fetch(`/api/dvf?inseeCode=${inseeCode}&targetParcelId=${targetParcelId}`);
      if (!response.ok) throw new Error('DVF data fetch failed');
      const filteredSales: DVFRecord[] = await response.json();
      
      if (filteredSales.length === 0) {
        setDvfSearchInfo(`NO SALES HISTORY FOUND FOR THIS SPECIFIC PARCEL.`);
      } else {
        setDvfResults(filteredSales);
        setDvfSearchInfo(`ANALYSIS COMPLETE. ${filteredSales.length} HISTORICAL SALES FOUND.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown DVF Error';
      setDvfError(msg);
    } finally {
      setIsDvfLoading(false);
    }
  }, []);

  const getDpeColor = useCallback((rating: string) => {
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
  }, []);

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
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
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
      { id: 'parcelles-click-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#ff00ff', 'line-width': 3, 'line-opacity': 0.9 }, filter: ['==', 'id', ''] },
      { id: 'parcelles-sale-highlight-fill', type: 'fill', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'fill-color': '#FFFF00', 'fill-opacity': 0.3 }, filter: ['in', 'id', ''] },
      { id: 'parcelles-sale-highlight-line', type: 'line', source: 'cadastre-parcelles', 'source-layer': 'parcelles', paint: { 'line-color': '#F3FF58', 'line-width': 3.5, 'line-opacity': 0.9 }, filter: ['in', 'id', ''] }, {
        id: 'parcelles-dpe-highlight-fill',
        type: 'fill',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'fill-color': '#FFD700', // Gold/yellow
          'fill-opacity': 0.1
        },
        filter: ['==', 'id', '']
      },
      {
        id: 'parcelles-dpe-highlight-line',
        type: 'line',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'line-color': '#FFD700', // Gold/yellow
          'line-width': 4,
          'line-opacity': 1
        },
        filter: ['==', 'id', '']
      },
      
    ];

    layers.forEach(layer => {
      if (!currentMap.getLayer(layer.id)) currentMap.addLayer(layer);
    });
  }, []);
  
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
    
    // Clear previous result markers
    resultMarkers.forEach(marker => marker.remove());
    setResultMarkers([]);

    const queryParams = new URLSearchParams({
      lat: params.center[1].toString(),
      lon: params.center[0].toString(),
      radius: (params.radiusKm * 1000).toString(),
    });
    
    const endpoint = params.type === 'landSize' ? '/api/search/parcels' : '/api/search/dpe';
    
    if (params.type === 'landSize') {
      const { minSize, maxSize } = params as unknown as { minSize: number; maxSize: number };
      queryParams.append('minSize', minSize.toString());
      queryParams.append('maxSize', maxSize.toString());
    } else {
      const { minConsumption, maxConsumption, minEmissions, maxEmissions, startDate, endDate } = params as unknown as { 
        minConsumption: number; maxConsumption: number; minEmissions: number; maxEmissions: number; startDate: string; endDate: string;
      };
      queryParams.append('minConsumption', minConsumption.toString());
      queryParams.append('maxConsumption', maxConsumption.toString());
      queryParams.append('minEmissions', minEmissions.toString());
      queryParams.append('maxEmissions', maxEmissions.toString());
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
    }

    try {
      const response = await fetch(`${endpoint}?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Search request failed');
      const data = await response.json();
      setSearchResults(data);

      const newMarkers: maptilersdk.Marker[] = [];
      data.forEach((res: DpeSearchResult | ParcelSearchResult) => {
        let lng: number | undefined, lat: number | undefined;
        if ('center' in res) {
          [lng, lat] = res.center;
        } else if ('_geopoint' in res) {
          const parts = res._geopoint.split(',').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            [lat, lng] = parts;
          }
        }
        if (lng !== undefined && lat !== undefined) {
          const marker = new maptilersdk.Marker({ color: '#ff00ff' })
            .setLngLat([lng, lat])
            .addTo(map.current!);
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
    if ('center' in result) {
      [lng, lat] = result.center;
    } else if ('_geopoint' in result) {
      const parts = result._geopoint.split(',').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        [lat, lng] = parts;
      }
    }
    if(lng !== undefined && lat !== undefined) {
      map.current.flyTo({ center: [lng, lat], zoom: 18 });
    }
  };

  const handleResultLocate = (result: DpeSearchResult | ParcelSearchResult) => {
    if (!map.current) return;
    let lng: number | undefined, lat: number | undefined;
    if ('center' in result) {
      [lng, lat] = result.center;
    } else if ('_geopoint' in result) {
      const parts = result._geopoint.split(',').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        [lat, lng] = parts;
      }
    }
    if(lng !== undefined && lat !== undefined) {
      map.current.flyTo({ center: [lng, lat], zoom: 18 });
    }
  };

  const handleDpeLocate = (dpe: DPERecord) => {
    if (!map.current || !dpe._geopoint) return;
    
    const [lat, lon] = dpe._geopoint.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lon)) {
      // Fly to location first
      map.current.flyTo({ center: [lon, lat], zoom: 19 });
      
      // Wait for map to finish moving, then query for parcel
      setTimeout(() => {
        if (!map.current) return;
        
        // Query the cadastre layer at this point
        const features = map.current.queryRenderedFeatures(
          map.current.project([lon, lat]),
          { layers: ['parcelles-fill'] }
        );
        
        if (features && features.length > 0) {
          const parcelId = features[0].properties?.id as string;
          if (parcelId) {
            setDpeHighlightedParcelId(parcelId);
            // Clear highlight after 5 seconds
            setTimeout(() => setDpeHighlightedParcelId(null), 5000);
          }
        }
      }, 1000); // Wait 1 second for map to finish flying
    }
  };
  
  
  useEffect(() => {
    if (isSearchMode) setSelectedParcelId(null);
  }, [isSearchMode]);
  
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;
    
    if (!selectedParcelId) {
      const emptyFilter: FilterSpecification = ['in', 'id', ''];
      if (currentMap.getLayer('parcelles-click-fill')) currentMap.setFilter('parcelles-click-fill', ['==', 'id', '']);
      if (currentMap.getLayer('parcelles-click-line')) currentMap.setFilter('parcelles-click-line', ['==', 'id', '']);
      if (currentMap.getLayer('parcelles-sale-highlight-line')) currentMap.setFilter('parcelles-sale-highlight-line', emptyFilter);
      if (currentMap.getLayer('parcelles-sale-highlight-fill')) currentMap.setFilter('parcelles-sale-highlight-fill', emptyFilter);
      setDpeScanCommune(null);

      
      dpeMarkers.current.forEach(marker => marker.remove());
      dpeMarkers.current = [];
      
      setHighlightedSaleParcels([]);
      setParcelData(null);
      setBanAddress(null);
      setOtherAddresses([]);
      setShowOtherAddresses(false);
      setDpeResults([]);
      setDpeError('');
      setDpeSearchInfo('');
      setExpandedDpeId(null);
      setShowOtherDpeResults(false);
      setDvfResults([]);
      setDvfError('');
      setDvfSearchInfo('');
      setIsPanelMinimized(false);
      setCommuneBoundaries(null);

    }
  }, [selectedParcelId]);
  
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [2.3522, 48.8566],
      zoom: 15
    });
    
    map.current = newMap;
    
    newMap.on('load', () => {
      addDataLayers();
      
      const throttledHoverHandler = throttle((e: maptilersdk.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
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
    });
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [addDataLayers, throttle]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;
    
    const handleClick = async (e: maptilersdk.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      if (isSearchMode) return;
      
      if (e.features && e.features.length > 0) {
        const parcelFeature = e.features[0];
        const parcelId = parcelFeature.properties?.id as string;
        
        if (parcelId) {
          setHighlightedSaleParcels([]);
          setShowOtherDpeResults(false);
          setExpandedDpeId(null);
          setIsPanelMinimized(false);
          
          currentMap.setFilter('parcelles-hover', ['==', 'id', '']);
          setSelectedParcelId(String(parcelId));
          
          const bounds = new maptilersdk.LngLatBounds();
          const coordinates = (parcelFeature.geometry as Polygon).coordinates[0] as Position[];
          coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
          const center = bounds.getCenter().toArray() as [number, number];
          
          setIsLoading(true);
          setParcelData(null);
          setBanAddress(null);
          setOtherAddresses([]);
          setDpeResults([]);
          setDvfResults([]);
          
          try {
            const parcelResponse = await fetch(`/api/cadastre/${parcelId}`);
            if (!parcelResponse.ok) throw new Error('Failed to fetch parcel data.');
            const parcelJson = await parcelResponse.json();
            setParcelData(parcelJson);
            
            const inseeCode = parcelJson.code_insee;
            const targetParcelId = parcelJson.idu;
            
            if (inseeCode && targetParcelId) {
              findDVF(inseeCode, targetParcelId);
            } else {
              setDvfError('INSEE code or Parcel ID missing.');
            }
            
            const addressResponse = await fetch(`/api/address?lon=${center[0]}&lat=${center[1]}`);
            if (!addressResponse.ok) throw new Error('Failed to fetch address.');
            const addressFeatures: BanFeature[] = await addressResponse.json();
            
            if (addressFeatures.length > 0) {
              const bestResult = addressFeatures[0];
              setBanAddress(bestResult);
              setOtherAddresses(addressFeatures.slice(1, 6));
              
              const postalCode = bestResult.properties.postcode;
              const [banLon, banLat] = bestResult.geometry.coordinates;
              
              if (postalCode && banLat && banLon) {
                findDPE(postalCode, banLat, banLon);
              } else {
                setDpeError('Address data incomplete for DPE scan.');
              }
            } else {
              setDpeSearchInfo('No address found. Attempting DPE scan via geographic area...');
              const parcelInseeCode = parcelJson.code_insee;
              
              if (parcelInseeCode) {
                try {
                  const geoResponse = await fetch(`https://geo.api.gouv.fr/communes/${parcelInseeCode}?fields=codesPostaux`);
                  if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    const postalCode = geoData.codesPostaux?.[0];
                    
                    if (postalCode) {
                      findDPE(postalCode, center[1], center[0]);
                    } else {
                      setDpeSearchInfo('Could not find a postal code for this parcel to perform DPE scan.');
                    }
                  } else {
                    throw new Error(`Geo API failed with status ${geoResponse.status}`);
                  }
                } catch (geoError) {
                  console.error("Fallback DPE search failed:", geoError);
                  setDpeError('An error occurred while trying to find a postal code for DPE scan.');
                }
              } else {
                setDpeSearchInfo('INSEE code is missing for this parcel, cannot perform DPE scan.');
              }
            }
            
            if (map.current) {
              map.current.setFilter('parcelles-click-fill', ['==', 'id', parcelId]);
              map.current.setFilter('parcelles-click-line', ['==', 'id', parcelId]);
            }
          } catch (error) {
            console.error("Failed to fetch details:", error);
            const msg = error instanceof Error ? error.message : 'Unknown error';
            setParcelData(null);
            setBanAddress(null);
            setDpeError(msg);
            setDvfError(msg);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    
    currentMap.on('click', 'parcelles-fill', handleClick);
    return () => {
      currentMap.off('click', 'parcelles-fill', handleClick);
    };
  }, [isSearchMode, findDPE, findDVF]);

  // Update DPE markers based on filters and view mode
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap?.isStyleLoaded()) return;
    
    // Remove existing markers
    dpeMarkers.current.forEach(marker => marker.remove());
    dpeMarkers.current = [];
    
    // Only show DPE scan markers when not in search mode and on DPE view
    if (dpeResults.length > 0 && activeView === 'dpe' && !isSearchMode) {
      // Filter DPE results based on current filters
      const filteredDpeResults = dpeResults.filter(dpe => {
        const conso = dpe.conso_5_usages_par_m2_ep;
        const emissions = dpe.emission_ges_5_usages_par_m2;
        const dpeDate = dpe.date_etablissement_dpe ? new Date(dpe.date_etablissement_dpe) : null;
        
        let dateMatch = true;
        if (dpeStartDate && dpeDate) {
          dateMatch = dateMatch && dpeDate >= new Date(dpeStartDate);
        }
        if (dpeEndDate && dpeDate) {
          dateMatch = dateMatch && dpeDate <= new Date(dpeEndDate);
        }
        
        // Use auto-increment logic if enabled
const effectiveMaxConso = dpeAutoIncrement ? dpeMinConso + 1 : dpeMaxConso;
const effectiveMaxEmissions = dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions;

// Only apply filters if values are set (not zero)
const consoMatch = dpeMinConso === 0 && effectiveMaxConso === 0 
  ? true 
  : conso >= dpeMinConso && conso <= effectiveMaxConso;

const emissionsMatch = dpeMinEmissions === 0 && effectiveMaxEmissions === 0
  ? true
  : emissions >= dpeMinEmissions && emissions <= effectiveMaxEmissions;

return consoMatch && emissionsMatch && dateMatch;

      });
      
      
      filteredDpeResults.slice(0, 10000).forEach((dpe) => {
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
  }, [dpeResults, activeView, getDpeColor, showOtherDpeResults, isSearchMode, dpeMinConso, dpeMaxConso, dpeMinEmissions, dpeMaxEmissions, dpeStartDate, dpeEndDate]);

  // Hide search result markers when not in search mode
  // Clean up search markers when exiting search mode
useEffect(() => {
  if (!isSearchMode && resultMarkers.length > 0) {
    resultMarkers.forEach(marker => marker.remove());
    setResultMarkers([]);
    setSearchResults([]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isSearchMode]); // ✅ Only depend on isSearchMode


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

  // Handle DPE-highlighted parcel with fade in/out animation
useEffect(() => {
  if (map.current) {
    const filter: FilterSpecification = dpeHighlightedParcelId 
      ? ['==', 'id', dpeHighlightedParcelId]
      : ['==', 'id', ''];
    
    if (map.current.getLayer('parcelles-dpe-highlight-line')) {
      map.current.setFilter('parcelles-dpe-highlight-line', filter);
    }
    if (map.current.getLayer('parcelles-dpe-highlight-fill')) {
      map.current.setFilter('parcelles-dpe-highlight-fill', filter);
    }
    
    // Animate fade in
    if (dpeHighlightedParcelId) {
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.05;
        if (opacity >= 1) {
          opacity = 1;
          clearInterval(fadeIn);
        }
        if (map.current?.getLayer('parcelles-dpe-highlight-line')) {
          map.current.setPaintProperty('parcelles-dpe-highlight-line', 'line-opacity', opacity);
        }
        if (map.current?.getLayer('parcelles-dpe-highlight-fill')) {
          map.current.setPaintProperty('parcelles-dpe-highlight-fill', 'fill-opacity', 0.25 * opacity);
        }
      }, 30);
      
      // Start fade out after 4 seconds
      setTimeout(() => {
        let opacity = 1;
        const fadeOut = setInterval(() => {
          opacity -= 0.05;
          if (opacity <= 0) {
            opacity = 0;
            clearInterval(fadeOut);
            setDpeHighlightedParcelId(null);
          }
          if (map.current?.getLayer('parcelles-dpe-highlight-line')) {
            map.current.setPaintProperty('parcelles-dpe-highlight-line', 'line-opacity', opacity);
          }
          if (map.current?.getLayer('parcelles-dpe-highlight-fill')) {
            map.current.setPaintProperty('parcelles-dpe-highlight-fill', 'fill-opacity', 0.25 * opacity);
          }
        }, 30);
      }, 4000);
    }
  }
}, [dpeHighlightedParcelId]);


  useEffect(() => {
    if (activeView === 'sales' && dvfResults.length > 0) {
      setHighlightedSaleParcels(dvfResults[0].l_idpar);
    } else {
      setHighlightedSaleParcels([]);
    }
  }, [activeView, dvfResults]);

  useEffect(() => {
    if (!map.current) return;
    
    const newStyle = mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID;
    map.current.setStyle(newStyle, {
      transformStyle: (previousStyle, nextStyle) => {
        if (!previousStyle || !previousStyle.layers || !previousStyle.sources) return nextStyle;
        
        const customLayers = previousStyle.layers.filter(layer => 
          layer.id?.startsWith('parcelles-') || layer.id?.startsWith('search-area-')
        );
        
        const customSources: { [key: string]: maptilersdk.SourceSpecification } = {};
        for (const [key, value] of Object.entries(previousStyle.sources)) {
          if (key === 'cadastre-parcelles' || key === 'search-area-source') {
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

  // Render commune boundaries for DPE scan area
useEffect(() => {
  const currentMap = map.current;
  if (!currentMap?.isStyleLoaded()) return;
  
  // Remove existing layers/sources
  if (currentMap.getLayer('commune-boundary-fill')) {
    currentMap.removeLayer('commune-boundary-fill');
  }
  if (currentMap.getLayer('commune-boundary-line')) {
    currentMap.removeLayer('commune-boundary-line');
  }
  if (currentMap.getSource('commune-boundary-source')) {
    currentMap.removeSource('commune-boundary-source');
  }
  
  // Only show when on DPE view with boundaries data
  if (activeView === 'dpe' && communeBoundaries && !isSearchMode) {
    currentMap.addSource('commune-boundary-source', {
      type: 'geojson',
      data: communeBoundaries
    });
    
    // Add fill layer (very subtle)
    currentMap.addLayer({
      id: 'commune-boundary-fill',
      type: 'fill',
      source: 'commune-boundary-source',
      paint: {
        'fill-color': '#00ffff',
        'fill-opacity': 0.05
      }
    });
    
    // Add outline (dashed cyan)
    currentMap.addLayer({
      id: 'commune-boundary-line',
      type: 'line',
      source: 'commune-boundary-source',
      paint: {
        'line-color': '#00ffff',
        'line-width': 3,
        'line-opacity': 0.6,
        'line-dasharray': [4, 2]
      }
    });
  }
}, [activeView, communeBoundaries, isSearchMode]);

  
  const getPanelTitle = () => {
    switch(activeView) {
      case 'cadastre': return 'PARCEL DETAILS';
      case 'dpe': return 'DPE SCAN RESULTS';
      case 'sales': return 'SALES HISTORY';
      default: return 'DETAILS';
    }
  };
  
  const renderPanelContent = () => {
    if (isLoading) {
      return <BarracudaLoader text="INTERROGATING GRID..." />;
    }
    
    switch (activeView) {
      case 'cadastre':
        return parcelData ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <span className="font-semibold text-text-primary/80">IDU:</span>
            <span className="font-bold text-white text-right">{parcelData.idu}</span>
            <span className="font-semibold text-text-primary/80">COMMUNE:</span>
            <span className="font-bold text-white text-right">{parcelData.nom_com}</span>
            <span className="font-semibold text-text-primary/80">SECTION:</span>
            <span className="font-bold text-white text-right">{parcelData.section}</span>
            <span className="font-semibold text-text-primary/80">NUMERO:</span>
            <span className="font-bold text-white text-right">{parcelData.numero}</span>
            <span className="font-semibold text-text-primary/80">AREA:</span>
            <span className="font-bold text-white text-right">{parcelData.contenance} m²</span>
            <span className="font-semibold text-text-primary/80">DEPT:</span>
            <span className="font-bold text-white text-right">{parcelData.code_dep}</span>
            {banAddress && (
              <>
                <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/30 pt-2">ADDRESS:</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(banAddress.properties.label)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 font-bold text-accent-cyan text-right hover:underline"
                >
                  {banAddress.properties.label}
                </a>
                {otherAddresses.length > 0 && (
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => setShowOtherAddresses(!showOtherAddresses)}
                      className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 ml-auto"
                    >
                      {showOtherAddresses ? 'Hide' : 'Show'} alternatives{' '}
                      {showOtherAddresses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                )}
              </>
            )}
            {showOtherAddresses && otherAddresses.length > 0 && (
              <div className="col-span-2 mt-2 space-y-1 border-t border-dashed border-accent-cyan/30 pt-2">
                {otherAddresses.map((addr, index) => (
                  <a
                    key={index}
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr.properties.label)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-right text-xs text-accent-cyan/70 hover:underline"
                  >
                    {addr.properties.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-text-primary/70">Click on a parcel to see details.</div>
        );

      case 'dpe':
        if (isDpeLoading) {
          return <BarracudaLoader text="SCANNING DPE GRID..." />;
        }
        if (dpeError) {
          return (
            <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">
              {dpeError}
            </div>
          );
        }
        
        const filteredDpeResults = dpeResults.filter(dpe => {
          const conso = dpe.conso_5_usages_par_m2_ep;
          const emissions = dpe.emission_ges_5_usages_par_m2;
          const dpeDate = dpe.date_etablissement_dpe ? new Date(dpe.date_etablissement_dpe) : null;
          
          let dateMatch = true;
          if (dpeStartDate && dpeDate) {
            dateMatch = dateMatch && dpeDate >= new Date(dpeStartDate);
          }
          if (dpeEndDate && dpeDate) {
            dateMatch = dateMatch && dpeDate <= new Date(dpeEndDate);
          }
          
          // Use auto-increment logic if enabled
const effectiveMaxConso = dpeAutoIncrement ? dpeMinConso + 1 : dpeMaxConso;
const effectiveMaxEmissions = dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions;

// Only apply filters if values are set (not zero)
const consoMatch = dpeMinConso === 0 && effectiveMaxConso === 0 
  ? true 
  : conso >= dpeMinConso && conso <= effectiveMaxConso;

const emissionsMatch = dpeMinEmissions === 0 && effectiveMaxEmissions === 0
  ? true
  : emissions >= dpeMinEmissions && emissions <= effectiveMaxEmissions;

return consoMatch && emissionsMatch && dateMatch;

        });
        

        const renderDpeItem = (dpe: DPERecord, isTopResult: boolean) => (
          <div
            key={dpe.numero_dpe}
            id={`dpe-${dpe.numero_dpe}`}
            className={`p-3 rounded-lg transition-all relative ${
              expandedDpeId === dpe.numero_dpe ? 'bg-accent-cyan/10' : ''
            }`}
          >
            <button
              onClick={() => handleDpeLocate(dpe)}
              className="absolute top-2 right-2 p-2 bg-accent-magenta/80 hover:bg-accent-magenta rounded-md transition-all"
              title="Show on map"
            >
              <MapPin size={16} className="text-white" />
            </button>
            
            <div className={`text-sm font-bold mb-2 ${isTopResult ? 'text-accent-magenta' : 'text-accent-cyan'}`}>
              {isTopResult ? 'Closest Result' : `Result #${dpeResults.indexOf(dpe) + 1}`}: ~{Math.round(dpe._distance ?? 0)}m
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <span className="font-semibold text-text-primary/80">Address:</span>
              <span className="font-bold text-white text-right">{dpe.adresse_ban || 'N/A'}</span>
              <span className="font-semibold text-text-primary/80">Date:</span>
              <span className="font-bold text-white text-right">{formatEuropeanDate(dpe.date_etablissement_dpe)}</span>
              <span className="font-semibold text-text-primary/80">Energy:</span>
              <span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_dpe) }}>
                {dpe.etiquette_dpe}
              </span>
              <span className="font-semibold text-text-primary/80">GHG:</span>
              <span className="font-bold text-right" style={{ color: getDpeColor(dpe.etiquette_ges) }}>
                {dpe.etiquette_ges}
              </span>
            </div>
            <button
              onClick={() => setExpandedDpeId(expandedDpeId === dpe.numero_dpe ? null : dpe.numero_dpe)}
              className="text-xs text-accent-magenta/80 hover:text-accent-magenta flex items-center gap-1 mt-3"
            >
              {expandedDpeId === dpe.numero_dpe ? 'Hide' : 'Show'} Details{' '}
              <ChevronDown
                className={`transition-transform ${expandedDpeId === dpe.numero_dpe ? 'rotate-180' : ''}`}
                size={14}
              />
            </button>
            {expandedDpeId === dpe.numero_dpe && (
              <div className="mt-3 pt-3 border-t border-dashed border-accent-cyan/20 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <span className="font-semibold text-text-primary/80">DPE ID:</span>
                <a
                  href={`https://observatoire-dpe-audit.ademe.fr/afficher-dpe/${dpe.numero_dpe}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-accent-cyan text-right hover:underline"
                >
                  {dpe.numero_dpe}
                </a>
                <span className="font-semibold text-text-primary/80">Conso. Primaire:</span>
                <span className="font-bold text-white text-right">{dpe.conso_5_usages_par_m2_ep.toFixed(2)} kWh/m²</span>
                <span className="font-semibold text-text-primary/80">Conso. Finale:</span>
                <span className="font-bold text-white text-right">{dpe.conso_5_usages_par_m2_ef.toFixed(2)} kWh/m²</span>
                <span className="font-semibold text-text-primary/80">Emissions GES:</span>
                <span className="font-bold text-white text-right">{dpe.emission_ges_5_usages_par_m2.toFixed(2)} kgCO₂/m²</span>
                <span className="font-semibold text-text-primary/80 col-span-2 pt-2 mt-2 border-t border-dashed border-accent-cyan/10">
                  Building Info
                </span>
                <span className="font-semibold text-text-primary/80">Hab. Surface:</span>
                <span className="font-bold text-white text-right">
                  {dpe.surface_habitable_logement ? `${dpe.surface_habitable_logement} m²` : 'N/A'}
                </span>
                <span className="font-semibold text-text-primary/80">Building Type:</span>
                <span className="font-bold text-white text-right">{dpe.type_batiment || 'N/A'}</span>
                <span className="font-semibold text-text-primary/80">Heating:</span>
                <span className="font-bold text-white text-right truncate">
                  {dpe.type_generateur_chauffage_principal || 'N/A'}
                </span>
              </div>
            )}
          </div>
        );

        return (
          <div>
            {dpeSearchInfo && !isDpeLoading && (
              <div className="p-3 mb-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">
                {dpeSearchInfo} ({dpeResults.length} found, {filteredDpeResults.length} shown)
              </div>
            )}
            <div className="mb-4">
              <button
                onClick={() => setShowDpeFilters(!showDpeFilters)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-accent-yellow/80 hover:text-accent-yellow"
              >
                <Filter size={14} /> {showDpeFilters ? 'Hide' : 'Show'} Filters{' '}
                <ChevronUp className={`transition-transform ${showDpeFilters ? 'rotate-180' : ''}`} size={16} />
              </button>
              {showDpeFilters && (
  <div className="space-y-3 mt-2 p-3 border border-dashed border-accent-yellow/30 rounded-md">
    {/* Auto-increment toggle */}
    <div className="flex items-center justify-between p-2 bg-background-dark border border-accent-yellow/30 rounded-md">
      <span className="text-xs font-semibold text-text-primary/80">Auto Max (Min + 1)</span>
      <button
        onClick={() => setDpeAutoIncrement(!dpeAutoIncrement)}
        className={`relative w-12 h-6 rounded-full transition-all ${
          dpeAutoIncrement ? 'bg-accent-cyan' : 'bg-accent-cyan/20'
        }`}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          dpeAutoIncrement ? 'translate-x-6' : 'translate-x-0'
        }`} />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-x-2">
      <div>
        <label htmlFor="minConso" className="block text-xs font-semibold text-text-primary/80">
          Min Conso.
        </label>
        <input
          id="minConso"
          type="number"
          value={dpeMinConso}
          onChange={e => setDpeMinConso(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta"
        />
      </div>
      <div>
        <label htmlFor="maxConso" className="block text-xs font-semibold text-text-primary/80">
          Max Conso.
        </label>
        <input
          id="maxConso"
          type="number"
          value={dpeAutoIncrement ? dpeMinConso + 1 : dpeMaxConso}
          onChange={e => !dpeAutoIncrement && setDpeMaxConso(e.target.value === '' ? 0 : Number(e.target.value))}
          disabled={dpeAutoIncrement}
          className={`w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta ${
            dpeAutoIncrement ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-x-2">
      <div>
        <label htmlFor="minEmissions" className="block text-xs font-semibold text-text-primary/80">
          Min Emissions
        </label>
        <input
          id="minEmissions"
          type="number"
          value={dpeMinEmissions}
          onChange={e => setDpeMinEmissions(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta"
        />
      </div>
      <div>
        <label htmlFor="maxEmissions" className="block text-xs font-semibold text-text-primary/80">
          Max Emissions
        </label>
        <input
          id="maxEmissions"
          type="number"
          value={dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions}
          onChange={e => !dpeAutoIncrement && setDpeMaxEmissions(e.target.value === '' ? 0 : Number(e.target.value))}
          disabled={dpeAutoIncrement}
          className={`w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta ${
            dpeAutoIncrement ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-x-2">
      <div>
        <label htmlFor="startDate" className="block text-xs font-semibold text-text-primary/80">
          Start Date
        </label>
        <input
          id="startDate"
          type="date"
          value={dpeStartDate}
          onChange={e => setDpeStartDate(e.target.value)}
          className="w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta"
        />
      </div>
      <div>
        <label htmlFor="endDate" className="block text-xs font-semibold text-text-primary/80">
          End Date
        </label>
        <input
          id="endDate"
          type="date"
          value={dpeEndDate}
          onChange={e => setDpeEndDate(e.target.value)}
          className="w-full mt-1 p-1 bg-background-dark border-2 border-accent-yellow/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta"
        />
      </div>
    </div>

    {/* Expand/Contract button */}
    <button
      onClick={() => {
        // Min -1, Max +1 (or just min if auto-increment)
        if (!dpeAutoIncrement) {
          setDpeMinConso(prev => Math.max(0, prev - 1));
          setDpeMaxConso(prev => prev + 1);
          setDpeMinEmissions(prev => Math.max(0, prev - 1));
          setDpeMaxEmissions(prev => prev + 1);
        } else {
          setDpeMinConso(prev => Math.max(0, prev - 1));
          setDpeMinEmissions(prev => Math.max(0, prev - 1));
        }
        
        // Adjust dates by ±1 day
        if (dpeStartDate) {
          const startDate = new Date(dpeStartDate);
          startDate.setDate(startDate.getDate() - 1);
          setDpeStartDate(startDate.toISOString().split('T')[0]);
        }
        if (dpeEndDate) {
          const endDate = new Date(dpeEndDate);
          endDate.setDate(endDate.getDate() + 1);
          setDpeEndDate(endDate.toISOString().split('T')[0]);
        }
      }}
      className="w-full flex items-center justify-center gap-2 text-sm bg-accent-yellow/20 border-2 border-accent-yellow/50 text-accent-yellow rounded-md px-3 py-2 font-bold hover:bg-accent-yellow/30 transition-all"
    >
      Expand Range (Min -1, Max +1, Dates ±1)
    </button>
    
    <button
      onClick={() => {
        setDpeMinConso(0);
        setDpeMaxConso(800);
        setDpeMinEmissions(0);
        setDpeMaxEmissions(200);
        setDpeStartDate('');
        setDpeEndDate('');
      }}
      className="w-full flex items-center justify-center gap-2 text-sm mt-2 bg-accent-yellow/80 border-2 border-accent-yellow/90 text-background-dark rounded-md px-3 py-2 font-bold hover:bg-accent-yellow transition-all"
    >
      <RotateCcw size={14} /> Reset Filters
    </button>
  </div>
)}

            </div>
            {filteredDpeResults.length > 0 ? (
              <div className="space-y-2">
                {renderDpeItem(filteredDpeResults[0], true)}
                {filteredDpeResults.length > 1 && (
                  <div className="pt-3 mt-3 border-t border-accent-cyan/50">
                    <button
                      onClick={() => setShowOtherDpeResults(!showOtherDpeResults)}
                      className="w-full text-center text-accent-cyan hover:text-accent-magenta flex items-center justify-center gap-2 font-bold"
                    >
                      {showOtherDpeResults ? 'Hide' : `Show ${filteredDpeResults.length - 1} Other Results`}{' '}
                      <ChevronDown
                        className={`transition-transform ${showOtherDpeResults ? 'rotate-180' : ''}`}
                        size={16}
                      />
                    </button>
                    {showOtherDpeResults && (
                      <div className="mt-2 space-y-2">
                        {filteredDpeResults.slice(1).map(dpe => (
                          <div key={dpe.numero_dpe} className="border-t border-dashed border-accent-cyan/30">
                            {renderDpeItem(dpe, false)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-text-primary/70 p-4">
                No results match your current filter criteria.
              </div>
            )}
          </div>
        );

      case 'sales':
        if (isDvfLoading) {
          return <BarracudaLoader text="SCANNING DVF GRID..." />;
        }
        if (dvfError) {
          return (
            <div className="p-3 text-center font-bold bg-red-900/50 border border-red-500 text-red-400 rounded-md">
              {dvfError}
            </div>
          );
        }
        if (dvfResults.length === 0) {
          return dvfSearchInfo && !isDvfLoading ? (
            <div className="p-3 text-center font-bold bg-cyan-900/50 border border-accent-cyan text-accent-cyan rounded-md">
              {dvfSearchInfo}
            </div>
          ) : (
            <div className="text-center text-text-primary/70">No sales history available.</div>
          );
        }
        
        return (
          <div className="space-y-2">
            {dvfResults.slice(0, 10).map((sale, index) => (
              <div
                key={sale.idmutinvar}
                onClick={() => setHighlightedSaleParcels(sale.l_idpar)}
                className={`w-full text-left p-2 rounded-md transition-all cursor-pointer hover:bg-accent-yellow/20 focus:outline-none focus:ring-2 focus:ring-accent-yellow ${
                  highlightedSaleParcels.map(p => p.id).join(',') === sale.l_idpar.map(p => p.id).join(',')
                    ? 'bg-accent-yellow/20 ring-2 ring-accent-yellow'
                    : ''
                }`}
                role="button"
                tabIndex={0}
              >
                <div className={`pt-2 ${index > 0 ? 'border-t border-dashed border-accent-cyan/30' : ''}`}>
                  <div className={`text-sm font-bold mb-2 ${index === 0 ? 'text-accent-magenta' : 'text-accent-cyan'}`}>
                    SALE: {formatEuropeanDate(sale.datemut)}
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-text-primary/80">PRICE:</span>
                    <span className="font-bold text-white text-right">
                      {parseFloat(sale.valeurfonc).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="font-semibold text-text-primary/80">TYPE:</span>
                    <span className="font-bold text-white text-right">{sale.libtypbien || 'N/A'}</span>
                    <span className="font-semibold text-text-primary/80 col-span-2 mt-2 border-t border-dashed border-accent-cyan/20 pt-2">
                      PARCELS ({sale.l_idpar.length}):
                    </span>
                    <div className="col-span-2 text-right font-mono text-xs text-accent-cyan/80 space-y-1">
                      {sale.l_idpar.map(p => (
                        <div key={p.id}>
                          {p.id} ({p.sterr} m²)
                        </div>
                      ))}
                      {sale.l_idpar.length > 1 && (
                        <div className="font-bold text-white text-sm border-t border-dashed border-accent-cyan/20 pt-1 mt-1">
                          TOTAL AREA: {sale.sterr} m²
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
      
      <div className="absolute top-4 left-4 z-10 w-72">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-accent-cyan/70" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for an address..."
            className="w-full pl-10 pr-10 py-2 bg-container-bg border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta shadow-glow-cyan backdrop-blur-sm bg-background-dark/75"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan"
              aria-label="Clear search"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute mt-2 w-full bg-container-bg border border-accent-cyan rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((feature, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(feature)}
                className="px-4 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer backdrop-blur-sm bg-background-dark/75"
              >
                {feature.properties.label}
                {feature.properties.postcode && (
                  <span className="text-accent-cyan/70 ml-2">({feature.properties.postcode})</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isSearchMode && (
        <SearchPanel
          onClose={() => setIsSearchMode(false)}
          onSearch={handleApiSearch}
          onRecenter={resetSearchCenter}
          center={searchCenter}
          results={searchResults}
          isLoading={isSearching}
          onResultClick={handleResultClick}
          onResultLocate={handleResultLocate}
        />
      )}

{(selectedParcelId && !isSearchMode) && (
  <div
  className={`absolute top-20 sm:top-16 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan p-4 shadow-glow-cyan backdrop-blur-sm bg-background-dark/75`}

  >
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-accent-cyan [filter:drop-shadow(0_0_4px_#00ffff)]">
        {getPanelTitle()}
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPanelMinimized(!isPanelMinimized)}
          className="text-accent-cyan/70 hover:text-accent-cyan"
        >
          {isPanelMinimized ? <Plus size={20} /> : <Minus size={20} />}
        </button>
        <button onClick={() => setSelectedParcelId(null)} className="text-accent-cyan/70 hover:text-accent-cyan">
          <X size={20} />
        </button>
      </div>
    </div>
    {!isPanelMinimized && (
      <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4">
        {renderPanelContent()}
      </div>
    )}
  </div>
)}


<div className="absolute top-4 right-4 z-10">

        <button
          onClick={() => setMapStyle(mapStyle === 'basic-v2' ? 'hybrid' : 'basic-v2')}
          className="px-4 py-2 bg-container-bg border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all shadow-glow-yellow backdrop-blur-sm bg-background-dark/75"
        >
          {mapStyle === 'basic-v2' ? 'Satellite View' : 'Map View'}
        </button>
      </div>
    </div>
  );
}
