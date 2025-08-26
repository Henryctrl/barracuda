'use client'
import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

export default function MapComponent() {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return
    
    // Non-null assertion for API key
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY

    map.current = new maptilersdk.Map({
      container: mapContainer.current, // This will work since we check it exists
      style: maptilersdk.MapStyle.STREETS,
      center: [2.3522, 48.8566],
      zoom: 6
    })

    map.current.addControl(new maptilersdk.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      console.log('Map loaded successfully!')
      
      // Add a test marker to confirm it's working
      map.current.addSource('test-marker', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [2.3522, 48.8566]
          },
          properties: {
            name: 'Paris'
          }
        }
      })

      map.current.addLayer({
        id: 'test-point',
        type: 'circle',
        source: 'test-marker',
        paint: {
          'circle-radius': 8,
          'circle-color': '#00ffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })
    })

    return () => map.current?.remove()
  }, [])

  return (
    <div className="w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg border-4 border-neon-cyan/50"
        style={{ 
          minHeight: '400px' // Ensure minimum height
        }}
      />
    </div>
  )
}
