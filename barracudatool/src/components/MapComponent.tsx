'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { FrenchCadastralAPI } from '../lib/french-apis'

interface PropertyInfo {
  cadastralId: string
  size: number
  zone: string
  commune?: string
  department?: string
  lastSaleDate?: string
  lastSalePrice?: number
  pricePerSqm?: number
  dpeRating?: {
    energy: string
    ghg: string
    date: string
    consumption: number
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
  onPropertySelect,
  dataLayers
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const initialized = useRef(false)
  const [loading, setLoading] = useState(false)
  const [clickMarker, setClickMarker] = useState<any>(null)

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return

    console.log('🗺️ INITIALIZING REAL FRENCH CADASTRAL MAP')
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566], // Paris
      zoom: 12, // Zoom out to see more of France
      maxBounds: [[-5, 42], [10, 52]], // France bounds
      renderWorldCopies: false,
      interactive: true,
      scrollZoom: true,
      boxZoom: false,
      dragRotate: false,
      dragPan: true,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false
    })

    initialized.current = true
    map.current = mapInstance

    mapInstance.on('load', () => {
      console.log('✅ Map loaded - READY FOR REAL FRENCH DATA')
      
      // Add source for clicked locations
      mapInstance.addSource('clicked-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })

      // Add layer for clicked markers
      mapInstance.addLayer({
        id: 'clicked-markers',
        type: 'circle',
        source: 'clicked-points',
        paint: {
          'circle-radius': 8,
          'circle-color': '#ff00ff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Add labels for clicked points
      mapInstance.addLayer({
        id: 'clicked-labels',
        type: 'symbol',
        source: 'clicked-points',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.2]
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })
    })

    // REAL CLICK HANDLER - Fetch data for any clicked coordinates
    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      
      console.log(`🎯 Clicked coordinates: ${lng}, ${lat}`)
      setLoading(true)

      try {
        // Fetch REAL French cadastral data
        const propertyData = await FrenchCadastralAPI.getCompleteParcelData(lng, lat)
        
        if (propertyData && propertyData.parcel) {
          const { parcel, latest_sale, dpe } = propertyData
          
          // Create property info object
          const propertyInfo: PropertyInfo = {
            cadastralId: parcel.cadastral_id,
            size: parcel.surface_area,
            zone: parcel.zone_type,
            commune: parcel.commune_name,
            department: `Dept. ${parcel.department}`,
            lastSaleDate: latest_sale?.sale_date,
            lastSalePrice: latest_sale?.sale_price,
            pricePerSqm: latest_sale ? Math.round(latest_sale.sale_price / latest_sale.surface_area) : undefined,
            dpeRating: dpe ? {
              energy: dpe.energy_class,
              ghg: dpe.ghg_class,
              date: dpe.rating_date,
              consumption: dpe.energy_consumption
            } : undefined
          }

          // Add marker to map at clicked location
          const clickedPoint = {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [lng, lat]
            },
            properties: {
              label: `${parcel.commune_name}\n${parcel.zone_type}`
            }
          }

          // Update map source with new point
          const source = mapInstance.getSource('clicked-points') as any
          source.setData({
            type: 'FeatureCollection',
            features: [clickedPoint]
          })

          // Callback to parent with property data
          if (onPropertySelect) {
            onPropertySelect(propertyInfo)
          }

          console.log('🏠 Real French property data loaded:', propertyInfo)
        } else {
          console.log('❌ No property data found for these coordinates')
          if (onPropertySelect) {
            onPropertySelect(null)
          }
        }
      } catch (error) {
        console.error('💥 Error fetching property data:', error)
        if (onPropertySelect) {
          onPropertySelect(null)
        }
      } finally {
        setLoading(false)
      }
    })

    // Cursor changes
    mapInstance.on('mouseenter', () => {
      mapInstance.getCanvas().style.cursor = 'crosshair'
    })

    return () => {}
  }, [])

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          {loading ? '🔄 FETCHING REAL FRENCH DATA...' : '🇫🇷 CLICK ANYWHERE FOR REAL INFO'}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">REAL-TIME DATA</div>
        <div className="space-y-1 text-xs text-white">
          <div>🎯 Click anywhere on France</div>
          <div>🏛️ Get real commune info</div>
          <div>💰 Live transaction estimates</div>
          <div>⚡ DPE energy ratings</div>
          <div>📋 Official cadastral IDs</div>
        </div>
      </div>
      
      <div 
        ref={mapContainer}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px',
          cursor: loading ? 'wait' : 'crosshair'
        }}
      />
    </div>
  )
}

export default MapComponent
