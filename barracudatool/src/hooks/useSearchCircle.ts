// src/hooks/useSearchCircle.ts
import { useEffect, useRef } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import turfCircle from '@turf/circle';
import type { Feature, Polygon } from 'geojson';

const SOURCE_ID = 'search-area-source';
const CIRCLE_LAYER_ID = 'search-area-circle-layer';
const BORDER_LAYER_ID = 'search-area-border-layer';
// FIX: Removed unused CENTER_MARKER_ID

export function useSearchCircle(
  map: maptilersdk.Map | null,
  isSearchMode: boolean,
  center: [number, number],
  radiusKm: number,
  setCenter: (newCenter: [number, number]) => void
) {
  const centerMarker = useRef<maptilersdk.Marker | null>(null);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Add or remove the marker based on search mode
    if (isSearchMode && !centerMarker.current) {
      const markerElement = document.createElement('div');
      markerElement.className = "w-6 h-6 bg-accent-magenta rounded-full border-2 border-white shadow-glow-magenta cursor-move";
      
      centerMarker.current = new maptilersdk.Marker({
        element: markerElement,
        draggable: true,
      })
      .setLngLat(center)
      .addTo(map);

      centerMarker.current.on('dragend', () => {
        if (centerMarker.current) {
          const { lng, lat } = centerMarker.current.getLngLat();
          setCenter([lng, lat]);
        }
      });
    } else if (!isSearchMode && centerMarker.current) {
      centerMarker.current.remove();
      centerMarker.current = null;
    }
    
    // Draw or remove the circle polygon based on search mode
    const source = map.getSource(SOURCE_ID) as maptilersdk.GeoJSONSource;
    if (isSearchMode) {
        const circlePolygon = turfCircle(center, radiusKm, { steps: 64, units: 'kilometers' }) as Feature<Polygon>;
        if (source) {
            source.setData(circlePolygon);
        } else {
            map.addSource(SOURCE_ID, { type: 'geojson', data: circlePolygon });
            map.addLayer({ id: CIRCLE_LAYER_ID, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': '#ff00ff', 'fill-opacity': 0.15 } });
            map.addLayer({ id: BORDER_LAYER_ID, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#ff00ff', 'line-width': 2, 'line-dasharray': [2, 2] } });
        }
        if (centerMarker.current) {
            centerMarker.current.setLngLat(center);
        }
    } else {
        if (source) {
            // Clear the data instead of removing the source to prevent style errors
            source.setData({ type: 'FeatureCollection', features: [] });
        }
    }

  }, [map, isSearchMode, center, radiusKm, setCenter]);
}
