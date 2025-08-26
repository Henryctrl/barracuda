'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { parisStaticParcels, getDPEColor } from '../lib/static-cadastral-data'

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
  onPropertySelect,
  dataLayers
}) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const initialized = useRef(false)
  const [selectedParcel, setSelectedParcel] = useState<string | null>(null)

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return

    console.log('🗺️ INITIALIZING MAP WITH STATIC FRENCH DATA')
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566], // Paris
      zoom: 16,
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
      console.log('✅ Map loaded - USING STATIC FRENCH CADASTRAL DATA')
      
      // Add static cadastral data
      mapInstance.addSource('static-cadastral', {
        type: 'geojson',
        data: parisStaticParcels
      })

      // Cadastral fill with DPE color coding
      mapInstance.addLayer({
        id: 'cadastral-fill',
        type: 'fill',
        source: 'static-cadastral',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'cadastral_id'], selectedParcel || ''],
            '#ff00ff', // Selected - pink
            [
              'case',
              ['has', 'dpe_energy'],
              [
                'case',
                ['==', ['get', 'dpe_energy'], 'A'], '#00ff00',
                ['==', ['get', 'dpe_energy'], 'B'], '#7fff00',
                ['==', ['get', 'dpe_energy'], 'C'], '#ffff00',
                ['==', ['get', 'dpe_energy'], 'D'], '#ffa500',
                ['==', ['get', 'dpe_energy'], 'E'], '#ff8000',
                ['==', ['get', 'dpe_energy'], 'F'], '#ff4500',
                ['==', ['get', 'dpe_energy'], 'G'], '#ff0000',
                '#00ffff'
              ],
              '#00ffff'
            ]
          ],
          'fill-opacity': 0.5
        }
      })

      mapInstance.addLayer({
        id: 'cadastral-line',
        type: 'line',
        source: 'static-cadastral',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'cadastral_id'], selectedParcel || ''],
            '#ff00ff',
            '#ffffff'
          ],
          'line-width': [
            'case',
            ['==', ['get', 'cadastral_id'], selectedParcel || ''],
            3,
            2
          ],
          'line-opacity': 0.8
        }
      })

      // Labels showing DPE rating and price
      mapInstance.addLayer({
        id: 'cadastral-labels',
        type: 'symbol',
        source: 'static-cadastral',
        layout: {
          'text-field': [
            'concat',
            'DPE: ', ['get', 'dpe_energy'], '\n',
            '€', ['get', 'price_per_sqm'], '/m²'
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })

      // DPE rating circles
      mapInstance.addSource('dpe-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: parisStaticParcels.features.map(feature => {
            // Calculate center of polygon
            const coords = feature.geometry.coordinates[0]
            const centerLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
            const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
            
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [centerLng + 0.0005, centerLat + 0.0005] // Slight offset
              },
              properties: feature.properties
            }
          })
        }
      })

      mapInstance.addLayer({
        id: 'dpe-circles',
        type: 'circle',
        source: 'dpe-points',
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'dpe_energy'], 'A'], '#00ff00',
            ['==', ['get', 'dpe_energy'], 'B'], '#7fff00',
            ['==', ['get', 'dpe_energy'], 'C'], '#ffff00',
            ['==', ['get', 'dpe_energy'], 'D'], '#ffa500',
            ['==', ['get', 'dpe_energy'], 'E'], '#ff8000',
            ['==', ['get', 'dpe_energy'], 'F'], '#ff4500',
            ['==', ['get', 'dpe_energy'], 'G'], '#ff0000',
            '#ffffff'
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000'
        }
      })

      mapInstance.addLayer({
        id: 'dpe-circle-labels',
        type: 'symbol',
        source: 'dpe-points',
        layout: {
          'text-field': ['get', 'dpe_energy'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#000000'
        }
      })

      // Click handler for static data
      mapInstance.on('click', 'cadastral-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          if (feature && feature.properties && onPropertySelect) {
            const props = feature.properties
            
            setSelectedParcel(props.cadastral_id)
            
            const propertyInfo: PropertyInfo = {
              cadastralId: props.cadastral_id,
              size: props.surface_area,
              zone: props.zone_type,
              lastSaleDate: props.last_sale_date,
              lastSalePrice: props.last_sale_price,
              pricePerSqm: props.price_per_sqm,
              dpeRating: props.dpe_energy ? {
                energy: props.dpe_energy,
                ghg: props.dpe_ghg,
                date: '2023-06-15'
              } : undefined
            }
            
            onPropertySelect(propertyInfo)
            console.log('🎯 Static French property selected:', propertyInfo)
          }
        }
      })

      // Cursor handlers
      mapInstance.on('mouseenter', 'cadastral-fill', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })

      mapInstance.on('mouseleave', 'cadastral-fill', () => {
        mapInstance.getCanvas().style.cursor = ''
      })
    })

    return () => {}
  }, [])

  // Update selected parcel styling
  useEffect(() => {
    if (!map.current || !initialized.current) return

    try {
      map.current.setPaintProperty('cadastral-fill', 'fill-color', [
        'case',
        ['==', ['get', 'cadastral_id'], selectedParcel || ''],
        '#ff00ff',
        [
          'case',
          ['has', 'dpe_energy'],
          [
            'case',
            ['==', ['get', 'dpe_energy'], 'A'], '#00ff00',
            ['==', ['get', 'dpe_energy'], 'B'], '#7fff00',
            ['==', ['get', 'dpe_energy'], 'C'], '#ffff00',
            ['==', ['get', 'dpe_energy'], 'D'], '#ffa500',
            ['==', ['get', 'dpe_energy'], 'E'], '#ff8000',
            ['==', ['get', 'dpe_energy'], 'F'], '#ff4500',
            ['==', ['get', 'dpe_energy'], 'G'], '#ff0000',
            '#00ffff'
          ],
          '#00ffff'
        ]
      ])

      map.current.setPaintProperty('cadastral-line', 'line-color', [
        'case',
        ['==', ['get', 'cadastral_id'], selectedParcel || ''],
        '#ff00ff',
        '#ffffff'
      ])
    } catch (error) {
      console.log('Style update skipped')
    }
  }, [selectedParcel])

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          🇫🇷 STATIC FRENCH CADASTRAL DATA
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">LEGEND</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 mr-2"></div>
            <span className="text-white">DPE A-B</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 mr-2"></div>
            <span className="text-white">DPE C-D</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 mr-2"></div>
            <span className="text-white">DPE E-G</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-pink-400 mr-2"></div>
            <span className="text-white">Selected</span>
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
