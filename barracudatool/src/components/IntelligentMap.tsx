'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import { OfficialFrenchAPIs } from '../services/officialFrenchApis'
import { IntelligentDPEService } from '../services/intelligentDpeService'
import { AddressStandardizer } from '../services/addressStandardizer'
import { DataQualityScoring } from '../lib/dataQualityScoring'
import type { PropertyData } from '../app/intelligent-property/page'

// ADDED: Proper typing for cadastral data
interface CadastralData {
  parcelId: string
  lat: number
  lon: number
  area: number
  commune: string
  department: string
  section: string
  numero: string
  geometry: any
  constructionYear?: number
  buildingType?: string
  floors?: number
}

interface DataLayers {
  cadastral: boolean
  dpe: boolean
  sales: boolean
  buildings: boolean
}

interface IntelligentMapProps {
  onPropertySelect: (property: PropertyData | null) => void
  dataLayers: DataLayers
  searchMode: 'precision' | 'comprehensive'
  setIsLoading: (loading: boolean) => void
}

export default function IntelligentMap({ 
  onPropertySelect, 
  dataLayers, 
  searchMode, 
  setIsLoading 
}: IntelligentMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const initialized = useRef(false)
  const [currentZoom, setCurrentZoom] = useState(12)
  const [systemStatus, setSystemStatus] = useState('Initializing...')

  useEffect(() => {
    if (initialized.current || !mapContainer.current) return

    console.log('🚀 INITIALIZING INTELLIGENT PROPERTY SYSTEM')
    setSystemStatus('Loading Official French APIs...')
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566], // Paris center
      zoom: 12,
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

    mapInstance.on('load', async () => {
      setSystemStatus('Setting up intelligence layers...')
      await setupIntelligenceLayers(mapInstance)
      setSystemStatus('Ready - Click on cadastral parcels')
    })

    mapInstance.on('zoom', () => {
      setCurrentZoom(mapInstance.getZoom())
    })

    // Intelligent parcel click handler
    mapInstance.on('click', async (e) => {
      await handleIntelligentParcelClick(e, mapInstance)
    })

    return () => {}
  }, [onPropertySelect, dataLayers, searchMode])

  const setupIntelligenceLayers = async (mapInstance: maptilersdk.Map) => {
    try {
      console.log('🗺️ Setting up official French cadastral layers')

      // Use MapTiler's French cadastre layer instead of direct IGN WMTS
      mapInstance.addSource('french-cadastre', {
        type: 'vector',
        url: `https://api.maptiler.com/tiles/fr-cadastre/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
        attribution: '© IGN - Plan Cadastral'
      })

      // Cadastral parcel boundaries
      mapInstance.addLayer({
        id: 'cadastral-parcels',
        type: 'line',
        source: 'french-cadastre',
        'source-layer': 'parcelles',
        minzoom: 14,
        paint: {
          'line-color': '#00ffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 1,
            18, 2
          ],
          'line-opacity': 0.8
        }
      })

      // Parcel fills for clicking
      mapInstance.addLayer({
        id: 'cadastral-fills',
        type: 'fill',
        source: 'french-cadastre',
        'source-layer': 'parcelles',
        minzoom: 15,
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

      // Add hover effects
      mapInstance.on('mouseenter', 'cadastral-fills', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer'
        if (e.features && e.features.length > 0) {
          mapInstance.setFeatureState(
            { source: 'french-cadastre', sourceLayer: 'parcelles', id: e.features[0].id },
            { hover: true }
          )
        }
      })

      mapInstance.on('mouseleave', 'cadastral-fills', () => {
        mapInstance.getCanvas().style.cursor = ''
        mapInstance.removeFeatureState({ source: 'french-cadastre', sourceLayer: 'parcelles' })
      })

      // Selected parcel highlight
      mapInstance.addSource('selected-parcel', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      mapInstance.addLayer({
        id: 'selected-parcel-outline',
        type: 'line',
        source: 'selected-parcel',
        paint: {
          'line-color': '#ff00ff',
          'line-width': 3,
          'line-opacity': 1
        }
      })

      mapInstance.addLayer({
        id: 'selected-parcel-fill',
        type: 'fill',
        source: 'selected-parcel',
        paint: {
          'fill-color': '#ff00ff',
          'fill-opacity': 0.2
        }
      })

      // Quality indicators
      mapInstance.addSource('quality-indicators', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      mapInstance.addLayer({
        id: 'quality-markers',
        type: 'circle',
        source: 'quality-indicators',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'case',
            ['>=', ['get', 'confidence'], 90], '#00ff00', // Green for 90%+
            ['>=', ['get', 'confidence'], 70], '#ffff00', // Yellow for 70%+
            '#ff0000' // Red for <70%
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      console.log('✅ Intelligence layers ready')
    } catch (error) {
      console.error('❌ Failed to setup layers:', error)
      setSystemStatus('Error loading cadastral layers')
    }
  }

  const handleIntelligentParcelClick = async (e: any, mapInstance: maptilersdk.Map) => {
    const { lng, lat } = e.lngLat
    console.log(`🎯 Intelligent analysis at: ${lng.toFixed(6)}, ${lat.toFixed(6)}`)
    
    setIsLoading(true)
    setSystemStatus('Analyzing parcel...')
    onPropertySelect(null) // Clear previous selection

    try {
      // Validate coordinates first
      if (lng < -5 || lng > 10 || lat < 41 || lat > 52) {
        throw new Error('Coordinates outside France - click within French territory')
      }

      // Step 1: Get cadastral information
      setSystemStatus('Getting cadastral data from IGN...')
      const rawCadastralData = await OfficialFrenchAPIs.getCadastralParcel(lng, lat)
      
      if (!rawCadastralData) {
        throw new Error('No cadastral parcel found at this location')
      }

      console.log('📋 Cadastral data:', rawCadastralData)

      // FIXED: Properly type and merge building information
      let cadastralData: CadastralData = {
        ...rawCadastralData,
        constructionYear: undefined,
        buildingType: undefined,
        floors: undefined
      }

      // Step 1.5: Get building information and merge it
      setSystemStatus('Getting building information...')
      try {
        const buildingInfo = await OfficialFrenchAPIs.getBuildingInformation(cadastralData.parcelId)
        if (buildingInfo) {
          cadastralData = {
            ...cadastralData,
            constructionYear: buildingInfo.constructionYear,
            buildingType: buildingInfo.buildingType,
            floors: buildingInfo.floors
          }
          console.log('🏠 Building info merged:', buildingInfo)
        }
      } catch (error) {
        console.warn('Building info fetch failed:', error)
      }

      // Step 2: Standardize address
      setSystemStatus('Standardizing address with BAN...')
      const standardizedAddress = await AddressStandardizer.standardizeParcelAddress(cadastralData)
      
      // Step 3: Intelligent DPE matching
      setSystemStatus('Finding DPE matches with ADEME...')
      const dpeResults = await IntelligentDPEService.findIntelligentMatches(cadastralData, searchMode)
      
      // Step 4: Get sales history
      setSystemStatus('Retrieving sales history...')
      const salesHistory = await OfficialFrenchAPIs.getSalesHistory(cadastralData.parcelId)
      
      // Step 5: Calculate data quality scores
      setSystemStatus('Calculating confidence scores...')
      const dataQuality = DataQualityScoring.calculateOverallQuality(cadastralData, dpeResults, salesHistory)
      
      // Step 6: Build comprehensive property data
      const propertyData: PropertyData = {
        // Cadastral Information
        parcelId: cadastralData.parcelId,
        coordinates: { lat: cadastralData.lat, lon: cadastralData.lon },
        area: cadastralData.area,
        commune: cadastralData.commune,
        department: cadastralData.department,
        section: cadastralData.section,
        numero: cadastralData.numero,
        
        // Address Data
        standardizedAddress: standardizedAddress?.address,
        postalCode: standardizedAddress?.postalCode,
        
        // Building Information (now properly typed)
        constructionYear: cadastralData.constructionYear,
        buildingType: cadastralData.buildingType,
        floors: cadastralData.floors,
        
        // DPE Information
        dpeMatches: dpeResults.matches,
        exactDpe: dpeResults.exactMatch,
        
        // Sales Information
        salesHistory: salesHistory,
        
        // Data Quality
        dataQuality: dataQuality
      }

      // Update map visualization
      updateMapVisualization(mapInstance, propertyData)
      
      // Send to parent component
      onPropertySelect(propertyData)
      setSystemStatus(`Analysis complete - ${dataQuality.overall}% confidence`)
      
      console.log('✅ Intelligent analysis complete:', propertyData)

    } catch (error) {
      console.error('❌ Intelligence analysis failed:', error)
      setSystemStatus(`Error: ${(error as Error).message}`)
      
      // Show error on map with user-friendly message
      const errorMarker = {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [lng, lat]
        },
        properties: {
          confidence: 0,
          error: true,
          message: (error as Error).message
        }
      }

      const source = mapInstance.getSource('quality-indicators') as any
      source?.setData({
        type: 'FeatureCollection',
        features: [errorMarker]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateMapVisualization = (mapInstance: maptilersdk.Map, propertyData: PropertyData) => {
    // Highlight selected parcel
    if (propertyData.coordinates) {
      const parcelFeature = {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [propertyData.coordinates.lon, propertyData.coordinates.lat]
        },
        properties: {
          parcelId: propertyData.parcelId
        }
      }

      const selectedSource = mapInstance.getSource('selected-parcel') as any
      selectedSource?.setData({
        type: 'FeatureCollection',
        features: [parcelFeature]
      })
    }

    // Add quality indicator
    const qualityMarker = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [propertyData.coordinates.lon, propertyData.coordinates.lat]
      },
      properties: {
        confidence: propertyData.dataQuality.overall,
        dpeCount: propertyData.dpeMatches.length,
        hasExactDpe: !!propertyData.exactDpe
      }
    }

    const qualitySource = mapInstance.getSource('quality-indicators') as any
    qualitySource?.setData({
      type: 'FeatureCollection',
      features: [qualityMarker]
    })
  }

  return (
    <div className="map-wrapper h-full relative">
      {/* Status Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-green p-3 rounded">
        <div className="text-neon-green font-retro text-xs mb-2">
          🧠 INTELLIGENT PROPERTY SYSTEM
        </div>
        <div className="text-neon-cyan font-retro text-xs">
          Status: {systemStatus}
        </div>
        <div className="text-white font-retro text-xs mt-1">
          Zoom: {currentZoom.toFixed(1)} • {currentZoom >= 14 ? 'PARCELS VISIBLE' : 'ZOOM IN FOR PARCELS'}
        </div>
      </div>

      {/* Data Sources Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-surface/90 border-2 border-neon-purple p-3 rounded">
        <div className="text-neon-purple font-retro text-xs mb-2">📊 OFFICIAL DATA SOURCES</div>
        <div className="space-y-1 text-xs">
          <div className="text-neon-green">✅ IGN - Cadastral Authority</div>
          <div className="text-neon-green">✅ ADEME - Energy Certificates</div>
          <div className="text-neon-green">✅ BAN - Address Database</div>
          <div className="text-neon-green">✅ DVF - Sales Transactions</div>
        </div>
        <div className="text-neon-cyan text-xs mt-2">
          🎯 {searchMode === 'precision' ? 'PRECISION MODE' : 'COMPREHENSIVE MODE'}
        </div>
      </div>

      {/* Confidence Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-surface/90 border-2 border-neon-yellow p-3 rounded">
        <div className="text-neon-yellow font-retro text-xs mb-2">🎯 CONFIDENCE SCALE</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-white">90%+ Exact Match</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-white">70%+ Good Match</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-white">&lt;70% Uncertain</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={mapContainer}
        className="w-full h-full rounded-lg"
      />
    </div>
  )
}
