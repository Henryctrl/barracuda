'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { FrenchCadastralAPI } from '../../lib/french-apis'
import { EnhancedDPEForCadastral } from '../../services/enhancedDpeForCadastral'

import { PropertyInfo, DpeCandidate, Transaction } from '../../types';

interface DataLayers {
  cadastral: boolean
  dvf: boolean
  dpe: boolean
}

interface MapComponentProps {
  onPropertySelect?: (property: PropertyInfo | null) => void
  dataLayers?: DataLayers
  viewMode?: 'cadastral' | 'market'
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  onPropertySelect,
  dataLayers
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(12)
  const [cadastralLayersLoaded, setCadastralLayersLoaded] = useState(false)

  const onPropertySelectRef = useRef(onPropertySelect);
  useEffect(() => {
    onPropertySelectRef.current = onPropertySelect;
  }, [onPropertySelect]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566],
      zoom: 12,
      maxBounds: [[-5, 42], [10, 52]],
      renderWorldCopies: false,
      interactive: true,
      scrollZoom: false,
      dragPan: true,
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      mapInstance.addControl(new maptilersdk.NavigationControl(), 'top-right');
      
      const addCadastralLayers = () => {
        try {
          mapInstance.addSource('french-cadastral-parcels', { type: 'vector', url: `https://api.maptiler.com/tiles/fr-cadastre/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`, attribution: '© DGFiP' });
          const addLayer = (layer: any) => { try { mapInstance.addLayer(layer); } catch (e) { console.warn(`Layer failed: ${layer.id}`); }};
          addLayer({ id: 'cadastral-parcel-lines', type: 'line', source: 'french-cadastral-parcels', 'source-layer': 'parcelles', minzoom: 15, paint: { 'line-color': '#00ffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 18, 3], 'line-opacity': 0.8 } });
          addLayer({ id: 'cadastral-parcel-fills', type: 'fill', source: 'french-cadastral-parcels', 'source-layer': 'parcelles', minzoom: 16, paint: { 'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ff00ff', '#00ffff'], 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.1] } });
          addLayer({ id: 'cadastral-parcel-labels', type: 'symbol', source: 'french-cadastral-parcels', 'source-layer': 'parcelles', minzoom: 17, layout: { 'text-field': ['get', 'numero'], 'text-font': ['Open Sans Bold'], 'text-size': 10 }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 } });
          setCadastralLayersLoaded(true);
        } catch (error) { console.error('❌ Failed to setup cadastral layers:', error); }
      };
      addCadastralLayers();

      mapInstance.addSource('clicked-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapInstance.addLayer({ id: 'clicked-markers', type: 'circle', source: 'clicked-points', paint: { 'circle-radius': 10, 'circle-color': '#ff00ff', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });
      mapInstance.addLayer({ id: 'clicked-labels', type: 'symbol', source: 'clicked-points', layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold'], 'text-size': 11, 'text-anchor': 'bottom', 'text-offset': [0, -1.5] }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 2 } });
      
      mapInstance.on('zoom', () => setCurrentZoom(mapInstance.getZoom()));
      mapInstance.on('error', (e) => console.error('🚨 Map error:', e.error));

      if (mapInstance.getLayer('cadastral-parcel-fills')) {
        mapInstance.on('mouseenter', 'cadastral-parcel-fills', (e) => { if (e.features?.length) { mapInstance.getCanvas().style.cursor = 'pointer'; mapInstance.setFeatureState({ source: 'french-cadastral-parcels', sourceLayer: 'parcelles', id: e.features[0].id }, { hover: true }); } });
        mapInstance.on('mouseleave', 'cadastral-parcel-fills', () => { mapInstance.getCanvas().style.cursor = ''; mapInstance.removeFeatureState({ source: 'french-cadastral-parcels', sourceLayer: 'parcelles' }); });
      }
    });

    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      setLoading(true);
      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['cadastral-parcel-fills'] });
      const cadastralFeature = features.find(f => f.source === 'french-cadastral-parcels');
      const source = mapInstance.getSource('clicked-points') as any;
      
      if (!cadastralFeature) {
        source?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { label: '❌ Click a parcel' } }] });
        setLoading(false);
        return;
      }

      try {
        const propertyData = await FrenchCadastralAPI.getEnhancedPropertyData(lng, lat, cadastralFeature);
        if (!propertyData || !propertyData.parcel) throw new Error('No parcel data');
        
        const { parcel, ...restOfPropertyData } = propertyData;
        
        const dpeResult = dataLayers?.dpe ? await EnhancedDPEForCadastral.getExactDPEForProperty(parcel) : null;

        const fullPropertyInfo: PropertyInfo = {
          ...restOfPropertyData,
          cadastralId: parcel.cadastral_id ?? null,
          size: parcel.surface_area ?? null,
          zone: parcel.zone_type ?? null,
          commune: parcel.commune_name,
          department: `Dept. ${parcel.department}`,
          population: parcel.population,
          section: parcel.section,
          numero: parcel.numero,
          dataSource: 'real_cadastral',
          coordinates: { lat, lon: lng },
          dpeRating: dpeResult?.dpeRating ?? null,
          nearbyDpeCount: dpeResult?.nearbyDpeCount ?? 0,
          allDpeCandidates: dpeResult?.allDpeCandidates ?? [],
        };
        
        const labelParts = [`${fullPropertyInfo.commune || ''}`, `${fullPropertyInfo.section || ''}${fullPropertyInfo.numero || ''}`];
        if (fullPropertyInfo.hasSales) labelParts.push(`✅ SOLD`);
        if (fullPropertyInfo.dpeRating) labelParts.push(`⚡ DPE: ${fullPropertyInfo.dpeRating.energy}`);
        
        source?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { label: labelParts.join('\n') } }] });

        if (onPropertySelectRef.current) {
          onPropertySelectRef.current(fullPropertyInfo);
        }
      } catch (error) {
        console.error('❌ Error:', error);
        source?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { label: '❌ No data' } }] });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="map-wrapper" style={{width: '100%', height: '100%'}}>
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">{loading ? '🔄 ANALYZING...' : '🇫🇷 EXACT PLOT DETECTOR'}</div>
        <div className="text-neon-cyan font-retro text-xs mt-1">Zoom: {currentZoom.toFixed(1)}</div>
      </div>
      <div 
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      />
    </div>
  )
}

export default MapComponent;
