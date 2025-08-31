'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { FrenchCadastralAPI } from '../lib/french-apis'
import { EnhancedDPEForCadastral } from '../services/enhancedDpeForCadastral'

import { PropertyInfo, DpeCandidate, Transaction } from '../types';

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

  // Use a ref to store the onPropertySelect callback to prevent re-renders from re-initializing the map
  const onPropertySelectRef = useRef(onPropertySelect);
  useEffect(() => {
    onPropertySelectRef.current = onPropertySelect;
  }, [onPropertySelect]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // Initialize map only once

    console.log('🗺️ INITIALIZING MAP (ONCE)');
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566],
      zoom: 12,
      maxBounds: [[-5, 42], [10, 52]],
      renderWorldCopies: false,
      interactive: true,
      scrollZoom: false, // Prevents mouse wheel scroll-hijacking
      boxZoom: false,
      dragRotate: false,
      dragPan: true, // Allows user to pan the map
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      console.log('✅ Map loaded - Setting up exact plot + DPE detection layers')
      
      const addCadastralLayers = async () => {
        try {
          console.log('🔍 Attempting to load French cadastral data for exact plot matching...')
          
          mapInstance.addSource('french-cadastral-parcels', {
            type: 'vector',
            url: `https://api.maptiler.com/tiles/fr-cadastre/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
            attribution: '© DGFiP - French Cadastre'
          });
          console.log('✅ MapTiler French cadastre source added');

          const addLayerSafely = (layerConfig: any) => {
            try {
              mapInstance.addLayer(layerConfig);
              return true;
            } catch (error) {
              console.warn(`⚠️ Failed to add layer ${layerConfig.id}:`, error);
              return false;
            }
          };

          addLayerSafely({
            id: 'cadastral-parcel-lines',
            type: 'line',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles',
            minzoom: 15,
            paint: { 'line-color': '#00ffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 18, 3], 'line-opacity': 0.8 }
          });

          addLayerSafely({
            id: 'cadastral-parcel-fills',
            type: 'fill',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles',
            minzoom: 16,
            paint: { 'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ff00ff', '#00ffff'], 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.1] }
          });
          
          addLayerSafely({
            id: 'cadastral-parcel-labels',
            type: 'symbol',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles',
            minzoom: 17,
            layout: { 'text-field': ['case', ['has', 'numero'], ['get', 'numero'], ['has', 'id'], ['get', 'id'], 'N/A'], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 10, 'text-anchor': 'center' },
            paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 }
          });

          setCadastralLayersLoaded(true);
          console.log('✅ Cadastral layers for exact plot detection setup complete');
        } catch (error) {
          console.error('❌ Failed to setup cadastral layers:', error);
          setCadastralLayersLoaded(false);
        }
      };

      addCadastralLayers();

      mapInstance.addSource('clicked-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapInstance.addLayer({ id: 'clicked-markers', type: 'circle', source: 'clicked-points', paint: { 'circle-radius': 10, 'circle-color': '#ff00ff', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });
      mapInstance.addLayer({ id: 'clicked-labels', type: 'symbol', source: 'clicked-points', layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-size': 11, 'text-anchor': 'bottom', 'text-offset': [0, -1.5] }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 2 } });
      
      mapInstance.on('zoom', () => setCurrentZoom(mapInstance.getZoom()));
      mapInstance.on('error', (e) => console.error('🚨 Map error:', e.error));

      const setupHoverEffects = () => {
        if (mapInstance.getLayer('cadastral-parcel-fills')) {
            mapInstance.on('mouseenter', 'cadastral-parcel-fills', (e) => {
              mapInstance.getCanvas().style.cursor = 'pointer'
              if (e.features && e.features.length > 0) {
                mapInstance.setFeatureState({ source: 'french-cadastral-parcels', sourceLayer: 'parcelles', id: e.features[0].id }, { hover: true })
              }
            });
            mapInstance.on('mouseleave', 'cadastral-parcel-fills', () => {
              mapInstance.getCanvas().style.cursor = ''
              mapInstance.removeFeatureState({ source: 'french-cadastral-parcels', sourceLayer: 'parcelles' })
            });
        }
      };
      setupHoverEffects();
    });

    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      console.log(`🎯 Checking exact plot for sales + DPE: ${lng.toFixed(6)}, ${lat.toFixed(6)}`);
      setLoading(true);

      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['cadastral-parcel-fills'] });
      const cadastralFeature = features.find(f => f.source === 'french-cadastral-parcels');
      
      if (!cadastralFeature) {
        console.log('❌ No cadastral parcel clicked - showing error message');
        const errorPoint = { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [lng, lat] }, properties: { label: '❌ Click on a\ncadastral parcel\nfor exact plot data' } };
        (mapInstance.getSource('clicked-points') as any)?.setData({ type: 'FeatureCollection', features: [errorPoint] });
        setLoading(false);
        return;
      }

      try {
        const cadastralId = cadastralFeature.properties?.id || cadastralFeature.properties?.cadastral_id || `${cadastralFeature.properties?.section || ''}${cadastralFeature.properties?.numero || ''}`;
        const propertyData = await FrenchCadastralAPI.getEnhancedPropertyData(lng, lat, cadastralFeature);
        
        if (!propertyData || !propertyData.parcel || !propertyData.parcel.surface_area) throw new Error('No real parcel data available');

        const { parcel, latest_sale, transactions, has_sales, sales_count } = propertyData;
        
        let enhancedDPE = null;
        let nearbyDpeCount = 0;
        let allCandidates: DpeCandidate[] = [];
        
        if (dataLayers?.dpe) {
          const propertyInfoForDPE = { cadastralId, commune: parcel.commune_name, department: parcel.department?.toString(), section: parcel.section, numero: parcel.numero, size: parcel.surface_area };
          const dpeResult = await EnhancedDPEForCadastral.getExactDPEForProperty(propertyInfoForDPE);
          if (dpeResult.success && dpeResult.hasExactMatch && dpeResult.dpeRating) {
            enhancedDPE = dpeResult.dpeRating;
          }
          nearbyDpeCount = dpeResult.nearbyDpeCount || 0;
          allCandidates = dpeResult.allDpeCandidates || [];
        }
        
        const propertyInfo: PropertyInfo = {
          cadastralId: parcel.cadastral_id || cadastralId, size: parcel.surface_area, zone: parcel.zone_type, commune: parcel.commune_name,
          department: `Dept. ${parcel.department}`, population: parcel.population, section: parcel.section, numero: parcel.numero,
          lastSaleDate: latest_sale?.sale_date, lastSalePrice: latest_sale?.sale_price,
          pricePerSqm: latest_sale && latest_sale.surface_area ? Math.round(latest_sale.sale_price / latest_sale.surface_area) : undefined,
          dataSource: 'real_cadastral', transactions: transactions || [], hasSales: has_sales, salesCount: sales_count,
        };

        const labelParts = [`${parcel.commune_name || 'Unknown'}`, `${parcel.section || ''}${parcel.numero || ''}`, `${parcel.surface_area} m² (REAL)`];
        if (has_sales && latest_sale) labelParts.push(`✅ SOLD: €${latest_sale.sale_price.toLocaleString()}`, `Date: ${latest_sale.sale_date}`);
        else labelParts.push('❌ NO SALES RECORDED');
        if (enhancedDPE) labelParts.push(`⚡ DPE: ${enhancedDPE.energy}/${enhancedDPE.ghg} (EXACT MATCH)`);
        else labelParts.push('⚡ NO EXACT DPE MATCH');
        
        const clickedPoint = { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [lng, lat] }, properties: { label: labelParts.join('\n') } };
        (mapInstance.getSource('clicked-points') as any)?.setData({ type: 'FeatureCollection', features: [clickedPoint] });

        if (onPropertySelectRef.current) {
          onPropertySelectRef.current(propertyInfo);
        }
      } catch (error) {
        console.error('❌ Error checking exact plot sales + DPE:', error);
        const errorPoint = { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [lng, lat] }, properties: { label: '❌ No real data\navailable for\nthis exact plot' } };
        (mapInstance.getSource('clicked-points') as any)?.setData({ type: 'FeatureCollection', features: [errorPoint] });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('🧹 CLEANING UP MAP');
      mapInstance.remove();
      map.current = null;
    };
  }, []); // Empty dependency array ensures this effect runs only ONCE.

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          {loading ? '🔄 CHECKING PLOT + EXACT DPE...' : '🇫🇷 EXACT PLOT + EXACT DPE DETECTOR'}
        </div>
        <div className="text-neon-cyan font-retro text-xs mt-1">
          Zoom: {currentZoom.toFixed(1)} • {currentZoom >= 15 ? 'PARCELS VISIBLE' : 'ZOOM IN FOR PARCELS'}
        </div>
        {!cadastralLayersLoaded && (
          <div className="text-neon-orange font-retro text-xs mt-1">
            ⚠️ Loading exact plot detection...
          </div>
        )}
      </div>
      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">EXACT PLOT + EXACT DPE DETECTION</div>
        <div className="space-y-1 text-xs text-white">
          <div>✅ geo.api.gouv.fr - Communes</div>
          <div>{cadastralLayersLoaded ? '✅' : '⚠️'} French Cadastre - Exact Plots</div>
          <div>✅ DVF+ Sales - Exact Plot Matching</div>
          <div>✅ ADEME DPE - EXACT MATCH ONLY</div>
          <div className="text-neon-cyan mt-2">
            {currentZoom >= 15 ? '🎯 Click exact plot for exact DPE match' : '🔍 Zoom in and click for exact plot data'}
          </div>
        </div>
      </div>
      <div 
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      />
    </div>
  )
}

export default MapComponent;
