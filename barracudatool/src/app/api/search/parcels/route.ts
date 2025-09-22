import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius'); // in meters
  const minSize = searchParams.get('minSize');
  const maxSize = searchParams.get('maxSize');

  if (!lat || !lon || !radius || !minSize || !maxSize) {
    return NextResponse.json({ error: 'Missing required search parameters' }, { status: 400 });
  }

  // =================================================================
  // TODO: BACKEND DATABASE LOGIC FOR PARCEL SEARCH
  // 1. Connect to your PostGIS database.
  // 2. Write a spatial query to find parcels within the given radius of the lat/lon.
  //    Example using ST_DWithin:
  //    `SELECT id, sterr as contenance, ST_AsGeoJSON(geom) as geom, ST_AsGeoJSON(ST_Centroid(geom)) as center 
  //     FROM your_parcels_table
  //     WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography, ${radius})
  //     AND sterr >= ${minSize} AND sterr <= ${maxSize};`
  // 3. Parse the results and return them.
  // =================================================================

  // For now, returning mock data:
  const mockParcels = [
    { id: 'AB01_123', contenance: Number(minSize) + 50, center: [Number(lon) + 0.001, Number(lat) + 0.001] },
    { id: 'CD02_456', contenance: Number(maxSize) - 50, center: [Number(lon) - 0.001, Number(lat) - 0.001] },
  ];

  return NextResponse.json(mockParcels);
}
