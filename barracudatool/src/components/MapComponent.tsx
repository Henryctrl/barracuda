'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'; // Import the CSS for controls
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
      scrollZoom: false,      // This correctly stays false
      dragPan: true,          // This correctly stays true
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      console.log('✅ Map loaded - Adding controls and layers');
      
      // --- THIS IS THE FIX ---
      // Add the navigation control (the +/‒ zoom buttons) to the map.
      mapInstance.addControl(new maptilersdk.NavigationControl(), 'top-right');
      // ----------------------

      // The rest of your layer setup code remains the same...
      const addCadastralLayers = async () => { /* ... */ };
      addCadastralLayers();
    });

    mapInstance.on('click', async (e) => {
      // Your click handling logic remains the same
    });

    return () => {
      console.log('🧹 CLEANING UP MAP');
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="map-wrapper" style={{width: '100%', height: '100%'}}>
      {/* Your UI overlays remain the same */}
      <div 
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      />
    </div>
  )
}

export default MapComponent;

