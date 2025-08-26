'use client'
import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'

export default function TestMap() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Use non-null assertion for API key and container
    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const map = new maptilersdk.Map({
      container: mapContainer.current!,
      style: maptilersdk.MapStyle.STREETS,
      center: [0, 0],
      zoom: 2
    })

    return () => map.remove()
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
