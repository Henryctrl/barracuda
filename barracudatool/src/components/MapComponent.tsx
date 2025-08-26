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
  population?: number
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
  const [currentZoom, setCurrentZoom] = useState(12)

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return

    console.log('🗺️ INITIALIZING REAL FRENCH CADASTRAL PARCELS')
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566],
      zoom: 12,
      maxBounds: [[-5, 42], [10, 52]],
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
      console.log('✅ Map loaded - ADDING REAL FRENCH CADASTRAL PARCELS')
      
      // ✅ REAL FRENCH CADASTRAL PARCELS from MapTiler
      mapInstance.addSource('french-cadastral-parcels', {
        type: 'vector',
        // MapTiler's official French cadastral tileset
        tiles: [`https://api.maptiler.com/tiles/fr-cadastre/{z}/{x}/{y}.pbf?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`],
        minzoom: 10,
        maxzoom: 20,
        attribution: '© DGFiP - French Cadastre'
      })

      // REAL CADASTRAL PARCEL BOUNDARIES
      mapInstance.addLayer({
        id: 'cadastral-parcel-lines',
        type: 'line',
        source: 'french-cadastral-parcels',
        'source-layer': 'parcelles', // ✅ CORRECT: This is the parcel layer
        minzoom: 15, // Only show at high zoom levels
        paint: {
          'line-color': '#00ffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15, 1,
            18, 3
          ],
          'line-opacity': 0.8
        }
      })

      // CADASTRAL PARCEL FILLS (semi-transparent)
      mapInstance.addLayer({
        id: 'cadastral-parcel-fills',
        type: 'fill',
        source: 'french-cadastral-parcels',
        'source-layer': 'parcelles', // ✅ CORRECT: Parcel polygons
        minzoom: 16,
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#ff00ff', // Pink when hovered
            '#00ffff'  // Cyan default
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.4,
            0.1
          ]
        }
      })

      // CADASTRAL PARCEL LABELS (showing parcel numbers)
      mapInstance.addLayer({
        id: 'cadastral-parcel-labels',
        type: 'symbol',
        source: 'french-cadastral-parcels',
        'source-layer': 'parcelles',
        minzoom: 17,
        layout: {
          'text-field': [
            'case',
            ['has', 'numero'], ['get', 'numero'],
            ['has', 'id'], ['get', 'id'],
            'N/A'
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      })

      // OPTIONAL: Add buildings within parcels
      mapInstance.addLayer({
        id: 'cadastral-buildings',
        type: 'fill',
        source: 'french-cadastral-parcels',
        'source-layer': 'batiments', // ✅ Buildings layer
        minzoom: 17,
        paint: {
          'fill-color': '#ff8000',
          'fill-opacity': 0.6
        }
      })

      mapInstance.addLayer({
        id: 'cadastral-building-lines',
        type: 'line',
        source: 'french-cadastral-parcels',
        'source-layer': 'batiments',
        minzoom: 17,
        paint: {
          'line-color': '#ff4000',
          'line-width': 1
        }
      })

      // Clicked markers
      mapInstance.addSource('clicked-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      mapInstance.addLayer({
        id: 'clicked-markers',
        type: 'circle',
        source: 'clicked-points',
        paint: {
          'circle-radius': 10,
          'circle-color': '#ff00ff',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      })

      mapInstance.addLayer({
        id: 'clicked-labels',
        type: 'symbol',
        source: 'clicked-points',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'bottom',
          'text-offset': [0, -1.5]
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })

      // Track zoom
      mapInstance.on('zoom', () => {
        setCurrentZoom(mapInstance.getZoom())
      })

      // Hover effects for PARCELS (not buildings)
      mapInstance.on('mouseenter', 'cadastral-parcel-fills', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer'
        if (e.features && e.features.length > 0) {
          mapInstance.setFeatureState(
            { source: 'french-cadastral-parcels', sourceLayer: 'parcelles', id: e.features[0].id },
            { hover: true }
          )
        }
      })

      mapInstance.on('mouseleave', 'cadastral-parcel-fills', () => {
        mapInstance.getCanvas().style.cursor = ''
        mapInstance.removeFeatureState({
          source: 'french-cadastral-parcels',
          sourceLayer: 'parcelles'
        })
      })

      // Click on parcels (not buildings)
      mapInstance.on('click', 'cadastral-parcel-fills', (e) => {
        if (e.features && e.features.length > 0) {
          console.log('🏘️ Clicked on cadastral parcel:', e.features[0].properties)
        }
      })
    })

    // REAL DATA CLICK HANDLER (general map click)
    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      
      console.log(`🎯 Fetching REAL DATA for: ${lng.toFixed(6)}, ${lat.toFixed(6)}`)
      setLoading(true)

      try {
        // ✅ REAL API CALLS to French government
        const propertyData = await FrenchCadastralAPI.getCompleteParcelData(lng, lat)
        
        if (propertyData && propertyData.parcel) {
          const { parcel, latest_sale, dpe } = propertyData
          
          const propertyInfo: PropertyInfo = {
            cadastralId: parcel.cadastral_id,
            size: parcel.surface_area,
            zone: parcel.zone_type,
            commune: parcel.commune_name,
            department: `Dept. ${parcel.department}`,
            population: parcel.population,
            lastSaleDate: latest_sale?.sale_date,
            lastSalePrice: latest_sale?.sale_price,
            pricePerSqm: latest_sale && latest_sale.surface_area ? 
              Math.round(latest_sale.sale_price / latest_sale.surface_area) : undefined,
            dpeRating: dpe ? {
              energy: dpe.energy_class,
              ghg: dpe.ghg_class,
              date: dpe.rating_date,
              consumption: dpe.energy_consumption
            } : undefined
          }

          // Add marker with real data
          const clickedPoint = {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [lng, lat]
            },
            properties: {
              label: `${parcel.commune_name}\nPop: ${parcel.population?.toLocaleString()}\nDPE: ${dpe.energy_class}\n€${latest_sale?.sale_price?.toLocaleString() || 'N/A'}`
            }
          }

          const source = mapInstance.getSource('clicked-points') as any
          source.setData({
            type: 'FeatureCollection',
            features: [clickedPoint]
          })

          if (onPropertySelect) {
            onPropertySelect(propertyInfo)
          }

          console.log('🏠 REAL French data loaded:', propertyInfo)
        }
      } catch (error) {
        console.error('💥 Error fetching real data:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => {}
  }, [])

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          {loading ? '🔄 LOADING REAL FRENCH DATA...' : '🇫🇷 REAL CADASTRAL PARCELS'}
        </div>
        <div className="text-neon-cyan font-retro text-xs mt-1">
          Zoom: {currentZoom.toFixed(1)} • {currentZoom >= 15 ? 'PARCELS VISIBLE' : 'ZOOM IN FOR PARCELS'}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">REAL CADASTRAL DATA</div>
        <div className="space-y-1 text-xs text-white">
          <div>✅ geo.api.gouv.fr - Communes</div>
          <div>✅ DVF Etalab API - Sales</div>
          <div>✅ French Cadastre - Parcels</div>
          <div>🏘️ DGFiP Official Data</div>
          <div className="text-neon-cyan mt-2">
            {currentZoom >= 15 ? '📋 Cadastral parcels visible!' : '🔍 Zoom in for parcel boundaries'}
          </div>
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
