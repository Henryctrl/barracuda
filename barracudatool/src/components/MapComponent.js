'use client'
import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
// Import CSS directly in the component that needs it
import '@maptiler/sdk/dist/maptiler-sdk.css'
import * as turf from '@turf/turf'

export default function MapComponent() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [selectedRegion, setSelectedRegion] = useState(null)

  useEffect(() => {
    if (map.current) return
    
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [2.3522, 48.8566],
      zoom: 6
    })

    map.current.addControl(new maptilersdk.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      console.log('Map loaded successfully!')
      
      // Add French regions
      map.current.addSource('france-admin', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson'
      })

      map.current.addLayer({
        id: 'france-regions-fill',
        type: 'fill',
        source: 'france-admin',
        paint: {
          'fill-color': '#00ffff',
          'fill-opacity': 0.1
        }
      })

      map.current.addLayer({
        id: 'france-regions-line',
        type: 'line',
        source: 'france-admin',
        paint: {
          'line-color': '#00ffff',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      // Click handlers
      map.current.on('click', 'france-regions-fill', (e) => {
        const regionName = e.features[0].properties.nom
        setSelectedRegion(regionName)
        console.log('Selected region:', regionName)
      })

      // Right-click for radius
      map.current.on('contextmenu', (e) => {
        e.preventDefault()
        const radius = 10
        const circle = turf.circle([e.lngLat.lng, e.lngLat.lat], radius, { units: 'kilometers' })
        
        if (map.current.getSource('radius-search')) {
          map.current.getSource('radius-search').setData(circle)
        } else {
          map.current.addSource('radius-search', {
            type: 'geojson',
            data: circle
          })
          map.current.addLayer({
            id: 'radius-circle',
            type: 'fill',
            source: 'radius-search',
            paint: {
              'fill-color': '#ff00ff',
              'fill-opacity': 0.2
            }
          })
        }
        console.log('10km radius search placed')
      })

      map.current.on('mouseenter', 'france-regions-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })

      map.current.on('mouseleave', 'france-regions-fill', () => {
        map.current.getCanvas().style.cursor = ''
      })
    })

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '500px',
        position: 'relative'
      }}
    >
      {selectedRegion && (
        <div 
          className="absolute top-4 left-4 z-10 bg-surface/90 border-2 border-neon-cyan p-3 rounded-lg"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="text-neon-cyan font-retro text-sm">
            Selected: <span className="text-white">{selectedRegion}</span>
          </div>
          <button 
            onClick={() => setSelectedRegion(null)}
            className="text-neon-pink text-xs hover:brightness-125 mt-1"
          >
            Clear
          </button>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 bg-surface/90 border-2 border-neon-yellow p-2 rounded text-xs text-neon-yellow font-retro">
        Right-click for radius search
      </div>

      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '500px',
          borderRadius: '8px',
          border: '4px solid rgba(0, 255, 255, 0.5)'
        }}
      />
    </div>
  )
}
