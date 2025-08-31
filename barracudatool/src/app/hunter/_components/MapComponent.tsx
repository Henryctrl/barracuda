'use client';

import { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';


// Component to encapsulate all MapTiler logic
export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [mapStyle, setMapStyle] = useState('basic-v2'); // 'basic-v2' or 'satellite'
  const [clickedPoint, setClickedPoint] = useState<maptilersdk.LngLat | null>(null);
  let hoveredParcelId: string | number | undefined = undefined;

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return; // Initialize map only once

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle[mapStyle === 'basic-v2' ? 'BASIC' : 'SATELLITE'],
      center: [2.3522, 48.8566], // Default center: Paris
      zoom: 12,
    });

    // Add map sources and layers once loaded
    map.current.on('load', () => {
      const currentMap = map.current!;

      // SOURCE: French Cadastral Parcels
      currentMap.addSource('cadastre-parcelles', {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/cadastre.json',
      });

      // LAYER: Transparent fill for interaction
      currentMap.addLayer({
        id: 'parcelles-fill',
        type: 'fill',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'fill-color': 'rgba(0,0,0,0)',
        },
      });

      // LAYER: Base parcel outlines
      currentMap.addLayer({
        id: 'parcelles-line',
        type: 'line',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'line-color': '#ff00ff', // Cyberpunk Magenta
          'line-width': 1,
          'line-opacity': 0.5,
        },
      });

      // LAYER: Hover effect (light blue highlight)
      currentMap.addLayer({
        id: 'parcelles-hover',
        type: 'line',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'line-color': '#00ffff', // Cyberpunk Cyan
          'line-width': 3,
        },
        filter: ['==', ['id'], ''], // Initially filter everything
      });
      
      // LAYER: Click effect (light pink highlight)
      currentMap.addLayer({
        id: 'parcelles-click',
        type: 'line',
        source: 'cadastre-parcelles',
        'source-layer': 'parcelles',
        paint: {
          'line-color': '#ff80ed', // Light Pink
          'line-width': 3.5,
        },
        filter: ['==', ['id'], ''], // Initially filter everything
      });

      // SOURCE & LAYER: For the orange cross pointer
      currentMap.addSource('clicked-point-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      currentMap.addLayer({
        id: 'clicked-point-layer',
        type: 'symbol',
        source: 'clicked-point-source',
        layout: {
          'icon-image': 'marker-cross',
          'icon-size': 0.8,
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-color': '#FFA500', // Orange
        },
      });

      // --- MAP EVENTS ---
      currentMap.on('mousemove', 'parcelles-fill', (e) => {
        currentMap.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const newHoveredId = e.features[0].id;
          // FIX: Only set filter if the ID is not undefined
          if (newHoveredId !== undefined) {
            hoveredParcelId = newHoveredId;
            currentMap.setFilter('parcelles-hover', ['==', ['id'], hoveredParcelId]);
          }
        }
      });

      currentMap.on('mouseleave', 'parcelles-fill', () => {
        currentMap.getCanvas().style.cursor = '';
        if (hoveredParcelId !== undefined) {
          // Clear the filter by setting it to an impossible condition
          currentMap.setFilter('parcelles-hover', ['==', ['id'], '']);
        }
        hoveredParcelId = undefined;
      });

      currentMap.on('click', 'parcelles-fill', (e) => {
         if (e.features && e.features.length > 0) {
           const parcelId = e.features[0].id;
           // FIX: Only set filter if the parcelId is not undefined
           if (parcelId !== undefined) {
             currentMap.setFilter('parcelles-click', ['==', ['id'], parcelId]);
             setClickedPoint(e.lngLat); // Update state for the orange cross
             
             console.log(`Clicked Parcel ID: ${parcelId}`);
           }
         }
      });
    });

  }, []); // Run only once

  // Effect to handle map style changes
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.SATELLITE);
  }, [mapStyle]);

  // Effect to handle the orange cross pointer
  useEffect(() => {
    if (!map.current || !clickedPoint) return;
    const source = map.current.getSource('clicked-point-source') as maptilersdk.GeoJSONSource;
    if(source) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [clickedPoint.lng, clickedPoint.lat],
          },
          properties: {}
        }],
      });
    }
  }, [clickedPoint]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
      <button
        onClick={() => setMapStyle(style => style === 'basic-v2' ? 'satellite' : 'basic-v2')}
        className="absolute top-4 right-4 z-10 rounded-md border-2 border-accent-cyan bg-container-bg px-4 py-2 font-bold text-accent-cyan shadow-glow-cyan transition hover:bg-accent-cyan hover:text-background-dark"
      >
        {mapStyle === 'basic-v2' ? 'Satellite' : 'Basic'} View
      </button>
    </div>
  );
}
