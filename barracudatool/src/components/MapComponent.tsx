'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { FrenchCadastralAPI } from '../lib/french-apis'
import { EnhancedDPEForCadastral } from '../services/enhancedDpeForCadastral' // ADD THIS IMPORT

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
    yearBuilt?: string
    surfaceArea?: number
    annualCost?: number
    dpeId?: string
    address?: string
    isActive?: boolean
  }
  nearbyDpeCount?: number
  // ADD THESE NEW FIELDS:
  allDpeCandidates?: Array<{
    id: string
    address: string
    energy_class: string
    ghg_class: string
    surface?: number
    annual_cost?: number
    establishment_date?: string
    score: number
    reason?: string
  }>
  transactions?: Array<{
    sale_date: string
    sale_price: number
    property_type: string
    surface_area: number
    municipality: string
    postal_code: string
  }>
  hasSales?: boolean
  salesCount?: number
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

    console.log('🗺️ INITIALIZING FRENCH PROPERTY MAP WITH EXACT PLOT + DPE DETECTION')
    
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
      console.log('✅ Map loaded - Setting up exact plot + DPE detection layers')
      
      const addCadastralLayers = async () => {
        try {
          console.log('🔍 Attempting to load French cadastral data for exact plot matching...')
          
          try {
            mapInstance.addSource('french-cadastral-parcels', {
              type: 'vector',
              url: `https://api.maptiler.com/tiles/fr-cadastre/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
              attribution: '© DGFiP - French Cadastre'
            })
            console.log('✅ MapTiler French cadastre source added')
          } catch (error) {
            console.warn('⚠️ MapTiler cadastre failed, trying alternative...')
            
            mapInstance.addSource('french-administrative', {
              type: 'vector',
              url: `https://api.maptiler.com/tiles/openmaptiles/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
              attribution: '© OpenStreetMap contributors'
            })
            console.log('✅ Using OpenStreetMap administrative boundaries')
          }

          const addLayerSafely = (layerConfig: any) => {
            try {
              mapInstance.addLayer(layerConfig)
              return true
            } catch (error) {
              console.warn(`⚠️ Failed to add layer ${layerConfig.id}:`, error)
              return false
            }
          }

          // Parcel boundaries for exact plot detection
          const parcelLinesAdded = addLayerSafely({
            id: 'cadastral-parcel-lines',
            type: 'line',
            source: 'french-cadastral-parcels',
            'source-layer': 'parcelles',
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

          if (!parcelLinesAdded) {
            addLayerSafely({
              id: 'administrative-boundaries',
              type: 'line',
              source: 'french-administrative',
              'source-layer': 'boundary',
              filter: ['==', 'admin_level', 8],
              minzoom: 12,
              paint: {
                'line-color': '#00ffff',
                'line-width': 2,
                'line-opacity': 0.6
              }
            })
          }

          // Parcel fills for exact clicking
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

          // Labels for parcel identification
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
          console.log('✅ Cadastral layers for exact plot detection setup complete')

        } catch (error) {
          console.error('❌ Failed to setup cadastral layers:', error)
          setCadastralLayersLoaded(false)
        }
      }

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

      mapInstance.on('error', (e) => {
        console.error('🚨 Map error:', e.error)
      })

      mapInstance.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId === 'french-cadastral-parcels') {
          console.log('✅ French cadastral source loaded successfully')
        }
        if (e.isSourceLoaded && e.sourceId === 'french-administrative') {
          console.log('✅ Administrative boundaries loaded successfully')
        }
      })

      // Hover effects
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

            mapInstance.on('click', layerId, (e) => {
              if (e.features && e.features.length > 0) {
                console.log(`🏘️ Clicked on ${layerId}:`, e.features[0].properties)
              }
            })
          }
        })
      }

      setTimeout(setupHoverEffects, 1000)
    })

    // ✨ ENHANCED: Exact plot click handler with EXACT DPE matching
    mapInstance.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      
      console.log(`🎯 Checking exact plot for sales + DPE: ${lng.toFixed(6)}, ${lat.toFixed(6)}`)
      setLoading(true)

      // Must click on a cadastral parcel for exact plot data
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
            label: '❌ Click on a\ncadastral parcel\nfor exact plot data'
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
        // Extract cadastral ID from clicked feature
        const cadastralId = cadastralFeature.properties?.id || 
                           cadastralFeature.properties?.cadastral_id || 
                           `${cadastralFeature.properties?.section || ''}${cadastralFeature.properties?.numero || ''}`;
        
        console.log(`🏠 Clicked on exact parcel: ${cadastralId}`);
        
        // Get enhanced property data with sales/DVF
        const propertyData = await FrenchCadastralAPI.getEnhancedPropertyData(lng, lat, cadastralFeature)
        
        if (!propertyData || !propertyData.parcel || !propertyData.parcel.surface_area) {
          throw new Error('No real parcel data available');
        }

        const { parcel, latest_sale, transactions, has_sales, sales_count } = propertyData
        
                // ✨ ENHANCED DPE LOOKUP - Get EXACT match instead of nearby results
                let enhancedDPE = null;
                let nearbyDpeCount = 0;
                let allCandidates = []; // Add this line
                
                if (dataLayers?.dpe) {
                  console.log('🔍 Getting EXACT DPE match for parcel...');
                  
                  // Build property info for DPE search
                  const propertyInfoForDPE = {
                    cadastralId: parcel.cadastral_id || cadastralId,
                    commune: parcel.commune_name,
                    department: parcel.department?.toString(),
                    section: parcel.section,
                    numero: parcel.numero,
                    size: parcel.surface_area
                  };
                  
                  const dpeResult = await EnhancedDPEForCadastral.getExactDPEForProperty(propertyInfoForDPE);
                  
                  if (dpeResult.success && dpeResult.hasExactMatch && dpeResult.dpeRating) {
                    enhancedDPE = dpeResult.dpeRating;
                    console.log('✅ EXACT DPE MATCH FOUND:', enhancedDPE.dpeId);
                  } else {
                    console.log('❌ No exact DPE match found');
                  }
                  
                  nearbyDpeCount = dpeResult.nearbyDpeCount || 0;
                  allCandidates = dpeResult.allDpeCandidates || []; // Add this line
                }
                
                const propertyInfo: PropertyInfo = {
                  cadastralId: parcel.cadastral_id || cadastralId,
                  size: parcel.surface_area,
                  zone: parcel.zone_type,
                  commune: parcel.commune_name,
                  department: `Dept. ${parcel.department}`,
                  population: parcel.population,
                  section: parcel.section,
                  numero: parcel.numero,
                  lastSaleDate: latest_sale?.sale_date,
                  lastSalePrice: latest_sale?.sale_price,
                  pricePerSqm: latest_sale && latest_sale.surface_area ? 
                    Math.round(latest_sale.sale_price / latest_sale.surface_area) : undefined,
                  dataSource: 'real_cadastral',
                  transactions: transactions || [],
                  hasSales: has_sales,
                  salesCount: sales_count,
                  // ✨ ENHANCED DPE DATA with all candidates
                  dpeRating: enhancedDPE || undefined,
                  nearbyDpeCount,
                  allDpeCandidates: allCandidates // Use the local variable instead of dpeResult
                }
        
        

        // Create marker with exact sale + DPE status
        const labelParts = [
          parcel.commune_name || 'Unknown',
          `${parcel.section || ''}${parcel.numero || ''}`,
          `${parcel.surface_area} m² (REAL)`,
        ]
        
        if (has_sales && latest_sale) {
          labelParts.push(`✅ SOLD: €${latest_sale.sale_price.toLocaleString()}`);
          labelParts.push(`Date: ${latest_sale.sale_date}`);
          if (sales_count && sales_count > 1) {
            labelParts.push(`(${sales_count} sales total)`);
          }
        } else {
          labelParts.push('❌ NO SALES RECORDED');
        }

        // Add EXACT DPE status
        if (enhancedDPE) {
          labelParts.push(`⚡ DPE: ${enhancedDPE.energy}/${enhancedDPE.ghg} (EXACT MATCH)`);
          if (enhancedDPE.consumption) {
            labelParts.push(`${enhancedDPE.consumption} kWh/m²`);
          }
        } else {
          labelParts.push('⚡ NO EXACT DPE MATCH');
          if (nearbyDpeCount > 0) {
            labelParts.push(`(${nearbyDpeCount} nearby)`);
          }
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

        console.log(`✅ ${has_sales ? 'PLOT SOLD' : 'NO SALES'} + ${enhancedDPE ? 'EXACT DPE' : 'NO EXACT DPE'} - Property:`, propertyInfo)
      } catch (error) {
        console.error('❌ Error checking exact plot sales + DPE:', error)
        
        const errorPoint = {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
          },
          properties: {
            label: '❌ No real data\navailable for\nthis exact plot'
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
  }, [onPropertySelect, dataLayers?.dpe]) // Add dataLayers.dpe to dependencies

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
