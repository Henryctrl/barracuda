'use client'
import React from 'react'
import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'

interface PropertyInfo {
  cadastralId: string
  size: number
  zone: string
  lastSaleDate?: string
  lastSalePrice?: number
  pricePerSqm?: number
  dpeRating?: {
    energy: string
    ghg: string
    date: string
  }
}

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
  onPropertySelect
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const initialized = useRef(false)

  // Mock data - defined once, never changes
  const cadastralPlots = [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[2.35, 48.85], [2.355, 48.85], [2.355, 48.855], [2.35, 48.855], [2.35, 48.85]]]
      },
      properties: { 
        cadastralId: 'PARIS_001', 
        size: 1200, 
        zone: 'Ub'
      }
    }
  ]

  useEffect(() => {
    // ABSOLUTE: Only run once, never again
    if (initialized.current) return
    if (!mapContainer.current) return

    console.log('🗺️ FINAL INITIALIZATION')
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    // ULTRA-STABLE MAP CONFIG
    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566], // SET ONCE, NEVER CHANGE
      zoom: 13,
      // LOCK BOUNDARIES
      maxBounds: [[-5, 42], [10, 52]],
      renderWorldCopies: false,
      // MINIMAL INTERACTIONS
      interactive: true,
      scrollZoom: true,
      boxZoom: false,
      dragRotate: false,
      dragPan: true,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false
    })

    // CRITICAL: Mark initialized before ANY events
    initialized.current = true
    map.current = mapInstance

    mapInstance.on('load', () => {
      console.log('✅ Map loaded - FINAL STABLE VERSION')
      
      // Add data - ONCE
      mapInstance.addSource('plots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: cadastralPlots }
      })

      mapInstance.addLayer({
        id: 'plot-fill',
        type: 'fill',
        source: 'plots',
        paint: { 'fill-color': '#00ffff', 'fill-opacity': 0.4 }
      })

      mapInstance.addLayer({
        id: 'plot-line',
        type: 'line', 
        source: 'plots',
        paint: { 'line-color': '#ffffff', 'line-width': 2 }
      })

      // Click handler - NO MOVEMENTS WHATSOEVER
      mapInstance.on('click', 'plot-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          if (feature && feature.properties && onPropertySelect) {
            console.log('🎯 Plot selected:', feature.properties.cadastralId)
            onPropertySelect(feature.properties as PropertyInfo)
          }
        }
      })

      // Cursor handlers only
      mapInstance.on('mouseenter', 'plot-fill', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })

      mapInstance.on('mouseleave', 'plot-fill', () => {
        mapInstance.getCanvas().style.cursor = ''
      })

      // REMOVE ALL MOVE EVENT HANDLERS - they were causing the issue
      // No movestart, no move, no moveend events
    })

    // NO CLEANUP - prevent React from interfering
    return () => {}
  }, []) // EMPTY DEPS - NEVER re-run

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          🔒 LOCKED MODE - NO AUTO MOVEMENT
        </div>
      </div>
      
      <div 
        ref={mapContainer}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px'
        }}
      />
    </div>
  )
}

export default MapComponent
