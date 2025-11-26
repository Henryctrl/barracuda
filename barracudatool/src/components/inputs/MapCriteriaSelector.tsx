'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { MapPin, Trash2, Plus, Pencil, Circle, Move } from 'lucide-react';
import * as turf from '@turf/turf';

interface Place {
  type: 'commune' | 'department' | 'region';
  code: string;
  name: string;
  center: [number, number];
}

interface RadiusSearch {
  place_code: string;
  place_name: string;
  center: [number, number];
  radius_km: number;
}

interface MapCriteriaSelectorProps {
  selectedPlaces: Place[];
  radiusSearches: RadiusSearch[];
  customSectors: GeoJSON.FeatureCollection | null;
  onPlacesChange: (places: Place[]) => void;
  onRadiusChange: (radius: RadiusSearch[]) => void;
  onSectorsChange: (sectors: GeoJSON.FeatureCollection | null) => void;
}

type Mode = 'places' | 'radius' | 'sectors';

export default function MapCriteriaSelector({
  selectedPlaces,
  radiusSearches,
  customSectors,
  onPlacesChange,
  onRadiusChange,
  onSectorsChange,
}: MapCriteriaSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [mode, setMode] = useState<Mode>('places');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ geometry: { coordinates: [number, number] }; properties: { label: string } }>>([]);
  const drawingMarkers = useRef<maptilersdk.Marker[]>([]);
  const radiusMarkers = useRef<Map<string, maptilersdk.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [2.3522, 48.8566],
      zoom: 5,
    });

    map.current = newMap;

    newMap.on('load', () => {
      // Add administrative boundaries source from French government
      newMap.addSource('french-communes', {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json'
      });

      // Add layers for clickable boundaries
      newMap.addLayer({
        id: 'communes-fill',
        type: 'fill',
        source: 'french-communes',
        'source-layer': 'communes',
        paint: {
          'fill-color': 'transparent',
          'fill-opacity': 0,
        },
        minzoom: 10,
      });

      newMap.addLayer({
        id: 'communes-outline',
        type: 'line',
        source: 'french-communes',
        'source-layer': 'communes',
        paint: {
          'line-color': '#00ffff',
          'line-width': 1,
          'line-opacity': 0.3,
        },
        minzoom: 10,
      });

      newMap.addLayer({
        id: 'communes-hover',
        type: 'fill',
        source: 'french-communes',
        'source-layer': 'communes',
        paint: {
          'fill-color': '#00ffff',
          'fill-opacity': 0.3,
        },
        filter: ['==', 'code', ''],
        minzoom: 10,
      });

      // Departments layer (visible at medium zoom)
      newMap.addLayer({
        id: 'departments-fill',
        type: 'fill',
        source: 'french-communes',
        'source-layer': 'departements',
        paint: {
          'fill-color': 'transparent',
        },
        maxzoom: 10,
        minzoom: 7,
      });

      newMap.addLayer({
        id: 'departments-outline',
        type: 'line',
        source: 'french-communes',
        'source-layer': 'departements',
        paint: {
          'line-color': '#ff00ff',
          'line-width': 2,
          'line-opacity': 0.5,
        },
        maxzoom: 10,
        minzoom: 7,
      });

      newMap.addLayer({
        id: 'departments-hover',
        type: 'fill',
        source: 'french-communes',
        'source-layer': 'departements',
        paint: {
          'fill-color': '#ff00ff',
          'fill-opacity': 0.3,
        },
        filter: ['==', 'code', ''],
        maxzoom: 10,
        minzoom: 7,
      });

      // Add sources for user selections
      newMap.addSource('selected-places', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      newMap.addSource('radius-circles', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      newMap.addSource('custom-sectors', {
        type: 'geojson',
        data: customSectors || {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Selected places layers
      newMap.addLayer({
        id: 'selected-places-fill',
        type: 'fill',
        source: 'selected-places',
        paint: {
          'fill-color': '#00ffff',
          'fill-opacity': 0.2,
        },
      });

      newMap.addLayer({
        id: 'selected-places-outline',
        type: 'line',
        source: 'selected-places',
        paint: {
          'line-color': '#00ffff',
          'line-width': 2,
        },
      });

      // Radius circles layers
      newMap.addLayer({
        id: 'radius-circles-fill',
        type: 'fill',
        source: 'radius-circles',
        paint: {
          'fill-color': '#ff00ff',
          'fill-opacity': 0.15,
        },
      });

      newMap.addLayer({
        id: 'radius-circles-outline',
        type: 'line',
        source: 'radius-circles',
        paint: {
          'line-color': '#ff00ff',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // Custom sectors layers
      newMap.addLayer({
        id: 'custom-sectors-fill',
        type: 'fill',
        source: 'custom-sectors',
        paint: {
          'fill-color': '#ffff00',
          'fill-opacity': 0.2,
        },
      });

      newMap.addLayer({
        id: 'custom-sectors-outline',
        type: 'line',
        source: 'custom-sectors',
        paint: {
          'line-color': '#ffff00',
          'line-width': 3,
        },
      });

      // Hover effects for clickable boundaries
      newMap.on('mousemove', 'communes-fill', (e) => {
        if (mode !== 'places' || !e.features || e.features.length === 0) return;
        const code = e.features[0].properties?.code as string;
        if (code) {
          newMap.setFilter('communes-hover', ['==', 'code', code]);
          newMap.getCanvas().style.cursor = 'pointer';
        }
      });

      newMap.on('mouseleave', 'communes-fill', () => {
        newMap.setFilter('communes-hover', ['==', 'code', '']);
        newMap.getCanvas().style.cursor = '';
      });

      newMap.on('mousemove', 'departments-fill', (e) => {
        if (mode !== 'places' || !e.features || e.features.length === 0) return;
        const code = e.features[0].properties?.code as string;
        if (code) {
          newMap.setFilter('departments-hover', ['==', 'code', code]);
          newMap.getCanvas().style.cursor = 'pointer';
        }
      });

      newMap.on('mouseleave', 'departments-fill', () => {
        newMap.setFilter('departments-hover', ['==', 'code', '']);
        newMap.getCanvas().style.cursor = '';
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update radius circles with draggable markers
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    // Clear existing markers
    radiusMarkers.current.forEach(marker => marker.remove());
    radiusMarkers.current.clear();

    const circles = radiusSearches.map(r => 
      turf.circle(r.center, r.radius_km, { units: 'kilometers' })
    );

    const source = map.current.getSource('radius-circles') as maptilersdk.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: circles,
      });
    }

    // Add draggable markers for each radius
    radiusSearches.forEach(r => {
      const el = document.createElement('div');
      el.className = 'radius-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.backgroundColor = '#ff00ff';
      el.style.border = '2px solid white';
      el.style.borderRadius = '50%';
      el.style.cursor = 'move';
      el.style.boxShadow = '0 0 10px rgba(255,0,255,0.8)';

      const marker = new maptilersdk.Marker({ element: el, draggable: true })
        .setLngLat(r.center)
        .addTo(map.current!);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        updateRadiusCenter(r.place_code, [lngLat.lng, lngLat.lat]);
      });

      radiusMarkers.current.set(r.place_code, marker);
    });
  }, [radiusSearches]);

  const updateRadiusCenter = useCallback((placeCode: string, newCenter: [number, number]) => {
    onRadiusChange(
      radiusSearches.map(r =>
        r.place_code === placeCode ? { ...r, center: newCenter } : r
      )
    );
  }, [radiusSearches, onRadiusChange]);

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    
    const source = map.current.getSource('custom-sectors') as maptilersdk.GeoJSONSource;
    if (source) {
      source.setData(customSectors || {
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [customSectors]);

  // Address search
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
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
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchSuggestions(query);
  };

  const handleSuggestionClick = async (feature: { geometry: { coordinates: [number, number] }; properties: { label: string } }) => {
    setSearchQuery('');
    setSuggestions([]);

    const [lon, lat] = feature.geometry.coordinates;
    
    if (map.current) {
      map.current.flyTo({ center: [lon, lat], zoom: 14 });
    }

    // Automatically add this place to selectedPlaces
    try {
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=nom,code,centre,contour`
      );
      const communes = await response.json();
      
      if (communes.length > 0) {
        const commune = communes[0];
        const newPlace: Place = {
          type: 'commune',
          code: commune.code,
          name: commune.nom,
          center: [lon, lat],
        };

        if (!selectedPlaces.find(p => p.code === commune.code)) {
          onPlacesChange([...selectedPlaces, newPlace]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch commune:', error);
    }
  };

  // Handle clicks on administrative boundaries
  useEffect(() => {
    if (!map.current) return;

    const handleCommuneClick = async (e: maptilersdk.MapMouseEvent & { features?: maptilersdk.MapGeoJSONFeature[] }) => {
      if (mode !== 'places' || !e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const code = feature.properties?.code as string;
      const name = feature.properties?.nom as string;
      
      if (!code || !name) return;

      const newPlace: Place = {
        type: 'commune',
        code,
        name,
        center: [e.lngLat.lng, e.lngLat.lat],
      };

      if (!selectedPlaces.find(p => p.code === code)) {
        onPlacesChange([...selectedPlaces, newPlace]);
      }
    };

    const handleDepartmentClick = async (e: maptilersdk.MapMouseEvent & { features?: maptilersdk.MapGeoJSONFeature[] }) => {
      if (mode !== 'places' || !e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const code = feature.properties?.code as string;
      const name = feature.properties?.nom as string;
      
      if (!code || !name) return;

      const newPlace: Place = {
        type: 'department',
        code,
        name,
        center: [e.lngLat.lng, e.lngLat.lat],
      };

      if (!selectedPlaces.find(p => p.code === code)) {
        onPlacesChange([...selectedPlaces, newPlace]);
      }
    };

    map.current.on('click', 'communes-fill', handleCommuneClick);
    map.current.on('click', 'departments-fill', handleDepartmentClick);

    return () => {
      if (map.current) {
        map.current.off('click', 'communes-fill', handleCommuneClick);
        map.current.off('click', 'departments-fill', handleDepartmentClick);
      }
    };
  }, [mode, selectedPlaces, onPlacesChange]);
  // Polygon drawing
  const handleMapClick = useCallback((e: maptilersdk.MapMouseEvent) => {
    if (mode !== 'sectors' || !isDrawing) return;

    const { lng, lat } = e.lngLat;
    const newPoint: [number, number] = [lng, lat];
    
    setCurrentPolygon(prev => [...prev, newPoint]);

    const marker = new maptilersdk.Marker({ color: '#ffff00' })
      .setLngLat([lng, lat])
      .addTo(map.current!);
    drawingMarkers.current.push(marker);
  }, [mode, isDrawing]);

  useEffect(() => {
    if (!map.current) return;
    
    if (mode === 'sectors' && isDrawing) {
      map.current.on('click', handleMapClick);
      map.current.getCanvas().style.cursor = 'crosshair';
    } else {
      map.current.off('click', handleMapClick);
      map.current.getCanvas().style.cursor = '';
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [mode, isDrawing, handleMapClick]);

  // Toggle boundary visibility based on mode
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    const visibility = mode === 'places' ? 'visible' : 'none';

    const layers = [
      'communes-fill',
      'communes-outline',
      'communes-hover',
      'departments-fill',
      'departments-outline',
      'departments-hover'
    ];

    layers.forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });
  }, [mode]);

  const finishDrawing = () => {
    if (currentPolygon.length < 3) {
      alert('You need at least 3 points to create a sector');
      return;
    }

    const closedPolygon = [...currentPolygon, currentPolygon[0]];
    
    const newFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [closedPolygon],
      },
    };

    const updatedSectors: GeoJSON.FeatureCollection = customSectors 
      ? {
          ...customSectors,
          features: [...customSectors.features, newFeature],
        }
      : {
          type: 'FeatureCollection',
          features: [newFeature],
        };

    onSectorsChange(updatedSectors);
    
    setCurrentPolygon([]);
    setIsDrawing(false);
    drawingMarkers.current.forEach(m => m.remove());
    drawingMarkers.current = [];
  };

  const cancelDrawing = () => {
    setCurrentPolygon([]);
    setIsDrawing(false);
    drawingMarkers.current.forEach(m => m.remove());
    drawingMarkers.current = [];
  };

  const removePlace = (code: string) => {
    onPlacesChange(selectedPlaces.filter(p => p.code !== code));
    onRadiusChange(radiusSearches.filter(r => r.place_code !== code));
  };

  const addRadiusToPlace = (place: Place, radiusKm: number) => {
    const existing = radiusSearches.find(r => r.place_code === place.code);
    
    if (existing) {
      onRadiusChange(
        radiusSearches.map(r => 
          r.place_code === place.code 
            ? { ...r, radius_km: radiusKm }
            : r
        )
      );
    } else {
      onRadiusChange([
        ...radiusSearches,
        {
          place_code: place.code,
          place_name: place.name,
          center: place.center,
          radius_km: radiusKm,
        },
      ]);
    }
  };

  const removeRadius = (placeCode: string) => {
    onRadiusChange(radiusSearches.filter(r => r.place_code !== placeCode));
  };

  const clearAllSectors = () => {
    onSectorsChange({
      type: 'FeatureCollection',
      features: [],
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 border-b border-[#00ffff]/30 pb-2">
        <button
          onClick={() => setMode('places')}
          className={`flex-1 py-2 px-3 text-xs font-bold uppercase rounded transition-all ${
            mode === 'places'
              ? 'bg-[#00ffff] text-black'
              : 'bg-transparent text-[#00ffff] border border-[#00ffff]/30 hover:border-[#00ffff]'
          }`}
        >
          <MapPin size={14} className="inline mr-1" />
          Places
        </button>
        <button
          onClick={() => setMode('radius')}
          className={`flex-1 py-2 px-3 text-xs font-bold uppercase rounded transition-all ${
            mode === 'radius'
              ? 'bg-[#ff00ff] text-white'
              : 'bg-transparent text-[#ff00ff] border border-[#ff00ff]/30 hover:border-[#ff00ff]'
          }`}
        >
          <Circle size={14} className="inline mr-1" />
          Radius
        </button>
        <button
          onClick={() => setMode('sectors')}
          className={`flex-1 py-2 px-3 text-xs font-bold uppercase rounded transition-all ${
            mode === 'sectors'
              ? 'bg-[#ffff00] text-black'
              : 'bg-transparent text-[#ffff00] border border-[#ffff00]/30 hover:border-[#ffff00]'
          }`}
        >
          <Pencil size={14} className="inline mr-1" />
          Sectors
        </button>
      </div>

      <div ref={mapContainer} className="w-full h-64 md:h-96 rounded-lg border-2 border-[#00ffff] relative">
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for a location..."
              className="w-full px-3 py-2 bg-[#0d0d21]/90 backdrop-blur-sm border border-[#00ffff] rounded text-white text-sm focus:outline-none focus:border-[#ff00ff]"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-[#0d0d21] border border-[#00ffff] rounded max-h-40 overflow-y-auto">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSuggestionClick(sug)}
                    className="px-3 py-2 text-xs text-white hover:bg-[#00ffff]/20 cursor-pointer border-b border-[#00ffff]/10 last:border-0"
                  >
                    {sug.properties.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {mode === 'sectors' && (
          <div className="absolute bottom-2 left-2 right-2 z-10 flex gap-2">
            {!isDrawing ? (
              <button
                onClick={() => setIsDrawing(true)}
                className="flex-1 py-2 bg-[#ffff00] text-black font-bold text-xs uppercase rounded hover:bg-[#ffff00]/80"
              >
                <Plus size={14} className="inline mr-1" />
                Draw New Sector
              </button>
            ) : (
              <>
                <button
                  onClick={finishDrawing}
                  className="flex-1 py-2 bg-[#00ff00] text-black font-bold text-xs uppercase rounded"
                >
                  Finish ({currentPolygon.length} points)
                </button>
                <button
                  onClick={cancelDrawing}
                  className="py-2 px-4 bg-red-500 text-white font-bold text-xs uppercase rounded"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {mode === 'places' && (
        <div>
          <div className="text-xs text-[#00ffff] font-bold mb-2 uppercase">
            Selected Places ({selectedPlaces.length})
          </div>
          {selectedPlaces.length === 0 ? (
            <div className="text-xs text-gray-400 italic">
              Click on map boundaries to select towns/departments
            </div>
          ) : (
            <div className="space-y-1">
              {selectedPlaces.map(place => (
                <div
                  key={place.code}
                  className="flex items-center justify-between bg-[#00ffff]/10 border border-[#00ffff]/30 rounded px-2 py-1.5"
                >
                  <span className="text-xs text-white">
                    {place.name} <span className="text-[#00ffff]/50">({place.type})</span>
                  </span>
                  <button
                    onClick={() => removePlace(place.code)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'radius' && (
        <div>
          <div className="text-xs text-[#ff00ff] font-bold mb-2 uppercase flex items-center gap-2">
            Radius Searches
            <span className="text-[0.65rem] text-gray-400 font-normal flex items-center gap-1">
              <Move size={10} /> Drag markers to adjust
            </span>
          </div>
          {selectedPlaces.length === 0 ? (
            <div className="text-xs text-gray-400 italic">
              Add places first, then set radius for each
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPlaces.map(place => {
                const radius = radiusSearches.find(r => r.place_code === place.code);
                return (
                  <div
                    key={place.code}
                    className="bg-[#ff00ff]/10 border border-[#ff00ff]/30 rounded p-2"
                  >
                    <div className="text-xs text-white font-bold mb-1">{place.name}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={radius?.radius_km || 10}
                        onChange={e => addRadiusToPlace(place, Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-[#ff00ff] font-bold w-16">
                        {radius?.radius_km || 10} km
                      </span>
                      {radius && (
                        <button
                          onClick={() => removeRadius(place.code)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'sectors' && (
        <div>
          <div className="text-xs text-[#ffff00] font-bold mb-2 uppercase">
            Custom Sectors ({customSectors?.features.length || 0})
          </div>
          {(!customSectors || customSectors.features.length === 0) ? (
            <div className="text-xs text-gray-400 italic">
              Click Draw New Sector to start
            </div>
          ) : (
            <button
              onClick={clearAllSectors}
              className="w-full py-2 bg-red-500/20 border border-red-500 text-red-400 font-bold text-xs uppercase rounded hover:bg-red-500/30"
            >
              <Trash2 size={12} className="inline mr-1" />
              Clear All Sectors
            </button>
          )}
        </div>
      )}
    </div>
  );
}
