// barracudatool/src/components/MapComponent.tsx

'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { FrenchCadastralAPI } from '../lib/french-apis'

// ✅ Updated interface to include transactions for DVF modal
interface PropertyInfo {
  cadastralId: string | null
  size: number | null
  zone: string | null
  commune?: string
  department?: string
  population?: number
  lastSaleDate?: string
  lastSalePrice?: number
  pricePerSqm?: number
  section?: string
  numero?: string
  dataSource: 'real_cadastral' | 'no_data'
  dpeRating?: {
    energy: string
    ghg: string
    date: string
    consumption?: number
  }
  transactions?: Array<{
    sale_date: string
    sale_price: number
    property_type: string
    surface_area: number
    municipality: string
    postal_code: string
  }>
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
  const [cadastralLayersLoaded, setCadastralLayersLoaded] = useState(false)

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return

    console.log('🗺️ INITIALIZING FRENCH PROPERTY MAP')
    
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
      console.log('✅ Map loaded - Setting up data layers')
      
      // ✅ FIXED: Try multiple cadastral data sources with proper error handling
      const addCadastralLayers = async () => {
        try {
          console.log('🔍 Attempting to load French cadastral data...')
          
          // Option 1: Try the correct MapTiler French cadastre tileset
          try {
            mapInstance.addSource('french-cadastral-parcels', {
              type: 'vector',
              url: `https://api.maptiler.com/tiles/fr-cadastre/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
              attribution: '© DGFiP - French Cadastre'
            })
            console.log('✅ MapTiler French cadastre source added')
          } catch (error) {
            console.warn('⚠️ MapTiler cadastre failed, trying alternative...')
            
            // Option 2: Try OpenStreetMap administrative boundaries as fallback
            mapInstance.addSource('french-administrative', {
              type: 'vector',
              url: `https://api.maptiler.com/tiles/openmaptiles/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
              attribution: '© OpenStreetMap contributors'
            })
            console.log('✅ Using OpenStreetMap administrative boundaries')
          }

          // Add layers with error handling
          const addLayerSafely = (layerConfig: any) => {
            try {
              mapInstance.addLayer(layerConfig)
              return true
            } catch (error) {
              console.warn(`⚠️ Failed to add layer ${layerConfig.id}:`, error)
              return false
            }
          }

          // Parcel boundaries (try both source types)
          const parcelLinesAdded = addLayerSafely({
            id: 'cadastral-parcel-lines',
            type: 'line',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles', // Try the documented layer name
            minzoom: 15,
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

          // If parcelles layer doesn't work, try administrative boundaries
          if (!parcelLinesAdded) {
            addLayerSafely({
              id: 'administrative-boundaries',
              type: 'line',
              source: 'french-administrative',
              'source-layer': 'boundary',
              filter: ['==', 'admin_level', 8], // Municipality level
              minzoom: 12,
              paint: {
                'line-color': '#00ffff',
                'line-width': 2,
                'line-opacity': 0.6
              }
            })
          }

          // Parcel fills
          const parcelFillsAdded = addLayerSafely({
            id: 'cadastral-parcel-fills',
            type: 'fill',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles',
            minzoom: 16,
            paint: {
              'fill-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#ff00ff',
                '#00ffff'
              ],
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.4,
                0.1
              ]
            }
          })

          // Alternative: Municipality fills if parcels don't work
          if (!parcelFillsAdded) {
            addLayerSafely({
              id: 'municipality-fills',
              type: 'fill',
              source: 'french-administrative',
              'source-layer': 'boundary',
              filter: ['==', 'admin_level', 8],
              minzoom: 10,
              paint: {
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  '#ff00ff',
                  'transparent'
                ],
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  0.3,
                  0.1
                ]
              }
            })
          }

          // Labels
          addLayerSafely({
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

          setCadastralLayersLoaded(true)
          console.log('✅ Cadastral layers setup complete')

        } catch (error) {
          console.error('❌ Failed to setup cadastral layers:', error)
          setCadastralLayersLoaded(false)
        }
      }

      // Execute cadastral layers setup
      addCadastralLayers()

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

      // Enhanced error handling
      mapInstance.on('error', (e) => {
        console.error('🚨 Map error:', e.error)
        // Don't crash the app on map errors
      })

      mapInstance.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId === 'french-cadastral-parcels') {
          console.log('✅ French cadastral source loaded successfully')
        }
        if (e.isSourceLoaded && e.sourceId === 'french-administrative') {
          console.log('✅ Administrative boundaries loaded successfully')
        }
      })

      // Hover effects (try both layer types)
      const setupHoverEffects = () => {
        const layersToHandle = ['cadastral-parcel-fills', 'municipality-fills']
        
        layersToHandle.forEach(layerId => {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.on('mouseenter', layerId, (e) => {
              mapInstance.getCanvas().style.cursor = 'pointer'
              if (e.features && e.features.length > 0) {
                const sourceLayer = layerId === 'cadastral-parcel-fills' ? 'parcelles' : 'boundary'
                const source = layerId === 'cadastral-parcel-fills' ? 'french-cadastral-parcels' : 'french-administrative'
                
                mapInstance.setFeatureState(
                  { source, sourceLayer, id: e.features[0].id },
                  { hover: true }
                )
              }
            })

            mapInstance.on('mouseleave', layerId, () => {
              mapInstance.getCanvas().style.cursor = ''
              const sourceLayer = layerId === 'cadastral-parcel-fills' ? 'parcelles' : 'boundary'
              const source = layerId === 'cadastral-parcel-fills' ? 'french-cadastral-parcels' : 'french-administrative'
              
              mapInstance.removeFeatureState({ source, sourceLayer })
            })

            // Click handlers
            mapInstance.on('click', layerId, (e) => {
              if (e.features && e.features.length > 0) {
                console.log(`🏘️ Clicked on ${layerId}:`, e.features[0].properties)
              }
            })
          }
        })
      }

      // Setup hover effects after a short delay to ensure layers are loaded
      setTimeout(setupHoverEffects, 1000)
    })

   // In MapComponent.tsx - updated click handler
mapInstance.on('click', async (e) => {
  const { lng, lat } = e.lngLat
  
  console.log(`🎯 Fetching REAL data for: ${lng.toFixed(6)}, ${lat.toFixed(6)}`)
  setLoading(true)

  // ✅ MUST click on a cadastral parcel for real data
  const features = mapInstance.queryRenderedFeatures(e.point, {
    layers: ['cadastral-parcel-fills']
  });
  
  const cadastralFeature = features.find(f => f.source === 'french-cadastral-parcels');
  
  if (!cadastralFeature) {
    console.log('❌ No cadastral parcel clicked - showing error message');
    
    const errorPoint = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat]
      },
      properties: {
        label: 'Click on a\ncadastral parcel\nfor real data'
      }
    }

    const source = mapInstance.getSource('clicked-points') as any
    source?.setData({
      type: 'FeatureCollection',
      features: [errorPoint]
    })
    
    setLoading(false)
    return;
  }

  try {
    const propertyData = await FrenchCadastralAPI.getCompleteParcelData(lng, lat, cadastralFeature)
    
    if (!propertyData || !propertyData.parcel || !propertyData.parcel.surface_area) {
      throw new Error('No real parcel data available');
    }

    const { parcel, latest_sale, transactions } = propertyData
    
    const propertyInfo: PropertyInfo = {
      cadastralId: parcel.cadastral_id,
      size: parcel.surface_area,
      zone: parcel.zone_type,
      commune: parcel.commune_name,
      department: `Dept. ${parcel.department}`,
      population: parcel.population,
      section: parcel.section,  // ✅ Now included in interface
      numero: parcel.numero,    // ✅ Now included in interface
      lastSaleDate: latest_sale?.sale_date,
      lastSalePrice: latest_sale?.sale_price,
      pricePerSqm: latest_sale && latest_sale.surface_area ? 
        Math.round(latest_sale.sale_price / latest_sale.surface_area) : undefined,
      dataSource: 'real_cadastral',  // ✅ Now required
      transactions: transactions || []  // ✅ Include full transactions for DVF modal
    }

    // ✅ Create marker with REAL data only
    const labelParts = [
      parcel.commune_name || 'Unknown',
      `${parcel.section}${parcel.numero}`,
      `${parcel.surface_area} m² (REAL)`,
    ]
    
    if (latest_sale?.sale_price) {
      labelParts.push(`€${latest_sale.sale_price.toLocaleString()}`)
    } else {
      labelParts.push('No sales data')
    }

    const clickedPoint = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat]
      },
      properties: {
        label: labelParts.join('\n')
      }
    }

    const source = mapInstance.getSource('clicked-points') as any
    source?.setData({
      type: 'FeatureCollection',
      features: [clickedPoint]
    })

    if (onPropertySelect) {
      onPropertySelect(propertyInfo)
    }

    console.log('✅ REAL property data loaded:', propertyInfo)
  } catch (error) {
    console.error('❌ Error fetching REAL data:', error)
    
    const errorPoint = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat]
      },
      properties: {
        label: 'No real data\navailable for\nthis parcel'
      }
    }

    const source = mapInstance.getSource('clicked-points') as any
    source?.setData({
      type: 'FeatureCollection',
      features: [errorPoint]
    })
  } finally {
    setLoading(false)
  }
})

    return () => {}
  }, [onPropertySelect])

  return (
    <div className="map-wrapper">
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-2 rounded">
        <div className="text-neon-green font-retro text-xs">
          {loading ? '🔄 LOADING FRENCH DATA...' : '🇫🇷 FRENCH PROPERTY MAP'}
        </div>
        <div className="text-neon-cyan font-retro text-xs mt-1">
          Zoom: {currentZoom.toFixed(1)} • {currentZoom >= 15 ? 'PARCELS VISIBLE' : 'ZOOM IN FOR PARCELS'}
        </div>
        {!cadastralLayersLoaded && (
          <div className="text-neon-orange font-retro text-xs mt-1">
            ⚠️ Cadastral layers loading...
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">DATA SOURCES</div>
        <div className="space-y-1 text-xs text-white">
          <div>✅ geo.api.gouv.fr - Communes</div>
          <div>{cadastralLayersLoaded ? '✅' : '⚠️'} French Cadastre - Parcels</div>
          <div>⚠️ DVF Sales - Limited availability</div>
          <div>✅ DPE Estimates</div>
          <div className="text-neon-cyan mt-2">
            {currentZoom >= 15 ? '🎯 Click anywhere for property data' : '🔍 Zoom in and click for details'}
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
